import { CommandBot } from './CommandBot.js';

export class SelfBot extends CommandBot {
    constructor(options = {}) {
        super({ ...options, acceptedTypes: ['send'] });
    }
}

export default SelfBot;
