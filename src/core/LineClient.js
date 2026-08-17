import { Bot } from './Bot.js';

export class LineClient extends Bot {
    constructor(options = {}) {
        super({ ...options, autoListen: options.autoListen ?? false });
    }

    async authenticate() {
        return this.start();
    }

    async loginWithQr() {
        this.hasToken = false;
        this.config.authToken = null;
        this.client.authToken = null;
        return this.qrLogin();
    }

    async loginWithToken(token) {
        if (token) {
            this.hasToken = true;
            this.config.authToken = token;
            this.client.authToken = token;
        }
        return this.tokenLogin();
    }

    async listen(handler, options = {}) {
        if (handler) this.onMessage(handler);
        if (!this.started) await this.authenticate();
        this.replayHistory = options.replayHistory ?? this.replayHistory;
        return this.startListening();
    }
}

export default LineClient;
