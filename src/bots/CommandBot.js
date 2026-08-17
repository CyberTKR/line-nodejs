import { Bot } from '../core/Bot.js';

export class CommandBot extends Bot {
    constructor(options = {}) {
        super({ ...options, autoListen: false });
        this.acceptedTypes = new Set(options.acceptedTypes || ['send', 'receive']);
        this.commands = new Map();
        this.commandPrefix = options.commandPrefix ?? '';
        this.caseSensitive = options.caseSensitive ?? false;
        this.registerDefaults = options.registerDefaults ?? true;
        if (this.registerDefaults) this._registerDefaults();
        for (const [name, handler] of Object.entries(options.commands || {})) {
            this.command(name, handler);
        }
        this.onText((message) => this._dispatchCommand(message));
    }

    command(name, handler) {
        const normalized = this._normalize(name);
        if (!normalized) throw new TypeError('Command name cannot be empty');
        if (typeof handler !== 'function') throw new TypeError(`Command ${name} requires a function`);
        this.commands.set(normalized, handler);
        return this;
    }

    removeCommand(name) {
        return this.commands.delete(this._normalize(name));
    }

    async runForever() {
        await this.start();
        await this.startListening();
    }

    async _dispatchCommand(message) {
        if (!this.acceptedTypes.has(message.type)) return;
        const raw = String(message.text || '').trim();
        if (this.commandPrefix && !raw.startsWith(this.commandPrefix)) return;
        const input = this.commandPrefix ? raw.slice(this.commandPrefix.length).trim() : raw;
        const [name = '', ...args] = input.split(/\s+/);
        const handler = this.commands.get(this._normalize(name));
        if (!handler) return;
        await handler({ bot: this, client: this, message, args, text: args.join(' ') });
    }

    _normalize(value) {
        const text = String(value || '').trim();
        return this.caseSensitive ? text : text.toLowerCase();
    }

    _registerDefaults() {
        this.command('hello', ({ bot, message }) => bot.send(message.target, 'hello'));
        this.command('ping', ({ bot, message }) => bot.send(message.target, 'pong'));
        this.command('help', ({ bot, message }) => {
            const names = [...bot.commands.keys()].sort().join(' | ');
            return bot.send(message.target, `Commands: ${names}`);
        });
    }
}

export default CommandBot;
