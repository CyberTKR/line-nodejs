import { SelfBot } from '../src/index.js';

const bot = new SelfBot({ registerDefaults: false, logLevel: 'INFO' });

bot.onText(async (message) => {
    if (message.type !== 'send') return;

    const command = String(message.text || '').trim().toLowerCase();

    if (command === 'hello') {
        await bot.send(message.target, 'hello');
    } else if (command === 'ping') {
        await bot.send(message.target, 'pong');
    }
});

bot.onReady((profile) => console.log(`${profile.displayName} SelfBot started (op 25 only)`));
bot.onError((error) => console.error('BOT ERROR:', error.message));
await bot.runForever();
