import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';

export function parseWebAuthDetails(rawException) {
    const details = rawException?.[11];
    const baseUrl = details?.[1];
    const authorization = details?.[2];
    if (typeof baseUrl !== 'string' || typeof authorization !== 'string') return null;
    let parsed;
    try {
        parsed = new URL(baseUrl);
    } catch {
        return null;
    }
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'w.line.me' || !authorization.trim()) return null;
    return { baseUrl: parsed.toString(), authorization };
}

function browserExecutable(configured) {
    const candidates = [
        configured,
        process.env.LINE_BROWSER_EXECUTABLE,
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser'
    ].filter(Boolean);
    return candidates.find((candidate) => fs.existsSync(candidate));
}

function devToolsUrl(child, timeout = 15000) {
    return new Promise((resolve, reject) => {
        let output = '';
        const timer = setTimeout(() => reject(new Error('Chrome DevTools did not start in time')), timeout);
        const finish = (error, value) => {
            clearTimeout(timer);
            child.stderr?.off('data', onData);
            child.off('exit', onExit);
            error ? reject(error) : resolve(value);
        };
        const onData = (chunk) => {
            output = (output + chunk.toString()).slice(-32768);
            const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
            if (match) finish(null, match[1]);
        };
        const onExit = (code) => finish(new Error(`Chrome exited before verification (code=${code})`));
        child.stderr?.on('data', onData);
        child.once('exit', onExit);
    });
}

function cdpConnection(url) {
    const socket = new WebSocket(url);
    const pending = new Map();
    const listeners = new Set();
    let nextId = 1;
    const opened = new Promise((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
    });
    socket.on('message', (data) => {
        let message;
        try {
            message = JSON.parse(String(data));
        } catch {
            return;
        }
        if (message.id && pending.has(message.id)) {
            const entry = pending.get(message.id);
            pending.delete(message.id);
            message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result || {});
            return;
        }
        for (const listener of listeners) listener(message);
    });
    return {
        opened,
        async send(method, params = {}, sessionId = undefined) {
            await opened;
            const id = nextId++;
            return new Promise((resolve, reject) => {
                pending.set(id, { resolve, reject });
                socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
            });
        },
        listen(handler) {
            listeners.add(handler);
            return () => listeners.delete(handler);
        },
        close() {
            socket.close();
        }
    };
}

export class HumanVerifier {
    constructor(options = {}) {
        this.executable = browserExecutable(options.browserExecutable);
        this.timeout = Number(options.timeout || process.env.LINE_HUMAN_VERIFICATION_TIMEOUT_MS || 300000);
        this.browserArgs = options.browserArgs || [];
        this.proxy = options.proxy || process.env.LINE_BROWSER_PROXY || null;
    }

    async verify(details) {
        if (!this.executable) throw new Error('Chrome/Chromium was not found; set LINE_BROWSER_EXECUTABLE');
        const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'line-human-verification-'));
        const args = [
            '--remote-debugging-port=0',
            `--user-data-dir=${profile}`,
            '--no-first-run',
            '--no-default-browser-check',
            ...(this.proxy ? [`--proxy-server=${this.proxy}`] : []),
            ...this.browserArgs,
            '--new-window',
            'about:blank'
        ];
        const child = spawn(this.executable, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let cdp;
        try {
            cdp = cdpConnection(await devToolsUrl(child));
            await cdp.opened;
            const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
            const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
            await cdp.send('Page.enable', {}, sessionId);
            await cdp.send('Network.enable', {}, sessionId);
            await cdp.send('Fetch.enable', {
                patterns: [{ urlPattern: `${details.baseUrl}*`, resourceType: 'Document', requestStage: 'Request' }]
            }, sessionId);
            return await new Promise((resolve, reject) => {
                let injected = false;
                let settled = false;
                const timer = setTimeout(() => finish(new Error('Human verification timed out')), this.timeout);
                const finish = (error, value) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    remove();
                    error ? reject(error) : resolve(value);
                };
                const remove = cdp.listen((message) => {
                    if (message.sessionId !== sessionId) return;
                    if (message.method === 'Fetch.requestPaused') {
                        const request = message.params.request;
                        const initial = !injected && request.url.startsWith(details.baseUrl);
                        const headers = initial ? [
                            ...Object.entries(request.headers || {})
                                .filter(([name]) => name.toLowerCase() !== 'authorization')
                                .map(([name, value]) => ({ name, value: String(value) })),
                            { name: 'Authorization', value: details.authorization }
                        ] : undefined;
                        if (initial) injected = true;
                        cdp.send('Fetch.continueRequest', {
                            requestId: message.params.requestId,
                            ...(headers ? { headers } : {})
                        }, sessionId).catch(finish);
                        return;
                    }
                    const url = message.method === 'Network.requestWillBeSent'
                        ? message.params.request?.url
                        : message.method === 'Page.frameNavigated'
                            ? message.params.frame?.url
                            : message.method === 'Page.navigatedWithinDocument'
                                ? message.params.url
                                : null;
                    if (url === 'lineconnect://accepted') finish(null, true);
                    if (url === 'lineconnect://closeBrowser' || url === 'lineconnect://fatalError') {
                        finish(new Error('LINE human verification was cancelled or failed'));
                    }
                });
                cdp.send('Page.navigate', { url: details.baseUrl }, sessionId).catch(finish);
            });
        } finally {
            if (cdp) {
                try {
                    await cdp.send('Browser.close');
                } catch {
                    child.kill('SIGTERM');
                }
                cdp.close();
            } else {
                child.kill('SIGTERM');
            }
            fs.rmSync(profile, { recursive: true, force: true });
        }
    }
}

export default HumanVerifier;
