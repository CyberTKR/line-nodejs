import { PublicBot } from '../src/index.js';

const commands = {
    hello: ({ bot, message }) => bot.send(message.target, 'hello'),
    ping: ({ bot, message }) => bot.send(message.target, 'pong')
};

const bot = new PublicBot({ commands, logLevel: 'INFO' });
bot.onReady((profile) => console.log(`${profile.displayName} PublicBot started (op 25 + 26)`));
bot.onError((error) => console.error('BOT ERROR:', error.message));
await bot.runForever();
