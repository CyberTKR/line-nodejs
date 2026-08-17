import test from 'node:test';
import assert from 'node:assert/strict';
import { PublicBot } from '../src/bots/PublicBot.js';
import { SelfBot } from '../src/bots/SelfBot.js';

test('PublicBot accepts sent and received operations', async () => {
    const seen = [];
    const bot = new PublicBot({ token: 'test', registerDefaults: false });
    bot.command('ping', ({ message }) => seen.push(message.type));
    await bot._dispatchCommand({ type: 'send', text: 'ping', to: 'c1' });
    await bot._dispatchCommand({ type: 'receive', text: 'ping', to: 'c1' });
    assert.deepEqual(seen, ['send', 'receive']);
});

test('SelfBot accepts only sent operations', async () => {
    const seen = [];
    const bot = new SelfBot({ token: 'test', registerDefaults: false });
    bot.command('ping', ({ message }) => seen.push(message.type));
    await bot._dispatchCommand({ type: 'receive', text: 'ping', to: 'c1' });
    await bot._dispatchCommand({ type: 'send', text: 'ping', to: 'c1' });
    assert.deepEqual(seen, ['send']);
});
