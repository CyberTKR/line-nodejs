import { CommandBot } from './CommandBot.js';

export class PublicBot extends CommandBot {
    constructor(options = {}) {
        super({ ...options, acceptedTypes: ['send', 'receive'] });
    }
}

export default PublicBot;
