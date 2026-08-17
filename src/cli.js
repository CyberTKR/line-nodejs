import { LineClient } from './core/LineClient.js';
import { PublicBot } from './bots/PublicBot.js';
import { SelfBot } from './bots/SelfBot.js';
import { Config } from './utils/Config.js';
import { RegistrationClient } from './services/registration/RegistrationClient.js';
import readline from 'node:readline/promises';

function parse(argv) {
    const options = {};
    const args = [];
    for (let index = 0; index < argv.length; index++) {
        const value = argv[index];
        if (!value.startsWith('--')) {
            args.push(value);
            continue;
        }
        const [rawName, inline] = value.slice(2).split('=', 2);
        const name = rawName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        options[name] = inline ?? argv[++index];
    }
    return { command: args.shift() || 'help', args, options };
}

function clientOptions(options, extra = {}) {
    return {
        device: options.app?.toUpperCase(),
        session: options.session,
        logLevel: options.logLevel || 'INFO',
        ...extra
    };
}

function usage() {
    console.log(`line-nodejs

Usage:
  line-nodejs qr [--app androidsecondary] [--session PATH]
  line-nodejs token TOKEN [--session PATH]
  line-nodejs register [--phone NUMBER] [--region TW]
  line-nodejs profile
  line-nodejs chats
  line-nodejs send TARGET_CHATID TEXT
  line-nodejs listen
  line-nodejs public-bot
  line-nodejs self-bot
  line-nodejs services

Environment:
  LINE_AUTH_TOKEN, LINE_SESSION, LINE_APP_PROFILE, LINE_APPLICATION,
  LINE_USER_AGENT, LINE_HOST, LINE_LANGUAGE, LOG_LEVEL`);
}

export async function main(argv = process.argv.slice(2)) {
    const { command, args, options } = parse(argv);
    if (command === 'help' || command === '--help' || command === '-h') {
        usage();
        return;
    }

    if (command === 'services') {
        console.log('talk | sync | qr | call | liff | square | relation | obs | e2ee');
        return;
    }

    if (command === 'register') {
        const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
        try {
            const phone = options.phone || await terminal.question('Phone number: ');
            const region = options.region || await terminal.question('Region code: ');
            const displayName = options.displayName || await terminal.question('Display name (LINE User): ') || 'LINE User';
            const password = options.password || process.env.LINE_REGISTRATION_PASSWORD || await terminal.question('New LINE password (visible): ');
            const registration = new RegistrationClient({
                session: options.session,
                onProgress: (event) => {
                    const prefix = typeof event.step === 'number' ? `[${event.step}/${event.total}] ` : '';
                    console.log(`${prefix}${event.message}`);
                }
            });
            try {
                const result = await registration.registerPhone({
                    phone,
                    region,
                    displayName,
                    password,
                    verificationMethod: options.verificationMethod || 'sms',
                    onPin: () => terminal.question('PIN code: ')
                });
                console.log(`Registered ${result.displayName} (${result.mid})`);
                console.log('Credentials and session saved under .line-nodejs with mode 0600');
            } finally {
                registration.close();
            }
        } finally {
            terminal.close();
        }
        return;
    }

    if (command === 'public-bot' || command === 'self-bot') {
        const BotClass = command === 'public-bot' ? PublicBot : SelfBot;
        const bot = new BotClass(clientOptions(options));
        bot.onReady((profile) => console.log(`Logged in as ${profile.displayName}`));
        bot.onError((error) => console.error(error.message));
        await bot.runForever();
        return;
    }

    const client = new LineClient(clientOptions(options));
    if (command === 'qr') {
        const profile = await client.loginWithQr();
        console.log(`Logged in as ${profile.displayName}`);
        return;
    }
    if (command === 'token') {
        const token = args[0] || process.env.LINE_AUTH_TOKEN;
        if (!token) throw new Error('Token is required');
        const profile = await client.loginWithToken(token);
        console.log(`Logged in as ${profile.displayName}`);
        return;
    }

    const profile = await client.authenticate();
    if (command === 'profile') {
        console.log(JSON.stringify(profile, null, 2));
        return;
    }
    if (command === 'chats') {
        console.log(JSON.stringify(await client.getAllChatMids(), null, 2));
        return;
    }
    if (command === 'send') {
        const [target, ...text] = args;
        if (!target || text.length === 0) throw new Error('Usage: line-nodejs send TARGET_CHATID TEXT');
        console.log(JSON.stringify(await client.send(target, text.join(' ')), null, 2));
        return;
    }
    if (command === 'listen') {
        client.onMessage((message) => console.log(JSON.stringify(message)));
        await client.listen();
        return;
    }
    throw new Error(`Unknown command: ${command}`);
}

export { Config };
