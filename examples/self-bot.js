import { SelfBot } from '../src/index.js';

const commands = {
    hello: ({ bot, message }) => bot.send(message.target, 'hello'),
    ping: ({ bot, message }) => bot.send(message.target, 'pong')
};

const bot = new SelfBot({ commands, logLevel: 'INFO' });
bot.onReady((profile) => console.log(`${profile.displayName} SelfBot started (op 25 only)`));
bot.onError((error) => console.error('BOT ERROR:', error.message));
await bot.runForever();
