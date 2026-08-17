import { PublicBot } from '../src/index.js';

const bot = new PublicBot({ registerDefaults: false, logLevel: 'INFO' });

bot.onText(async (message) => {
    const command = String(message.text || '').trim().toLowerCase();

    if (command === 'hello') {
        await bot.send(message.target, 'hello');
    } else if (command === 'ping') {
        await bot.send(message.target, 'pong');
    }
});

bot.onReady((profile) => console.log(`${profile.displayName} PublicBot started (op 25 + 26)`));
bot.onError((error) => console.error('BOT ERROR:', error.message));
await bot.runForever();
