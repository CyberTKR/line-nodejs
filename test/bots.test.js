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

test('send automatically uses E2EE for a known encrypted target', async () => {
    const bot = new PublicBot({ token: 'test', registerDefaults: false });
    bot.client.selfMid = 'uself';
    bot.e2eeHandler = {
        encryptText: async (to) => ({ to, chunks: [1, 2, 3, 4, 5], contentMetadata: { e2eeVersion: '2' } })
    };
    bot.e2eeRequiredTargets.add('cgroup');
    let sent;
    bot.client.talkService.sendMessage = async (message) => {
        sent = message;
        return message;
    };

    await bot.send('cgroup', 'hello');
    assert.deepEqual(sent.chunks, [1, 2, 3, 4, 5]);
    assert.equal(sent.contentMetadata.e2eeVersion, '2');
    assert.equal(sent.toType, 2);
});

test('send retries with E2EE when LINE requires encryption', async () => {
    const bot = new PublicBot({ token: 'test', registerDefaults: false });
    bot.client.selfMid = 'uself';
    bot.e2eeHandler = {
        encryptText: async (to) => ({ to, chunks: [1, 2, 3, 4, 5], contentMetadata: { e2eeVersion: '2' } })
    };
    let attempts = 0;
    bot.client.talkService.sendMessage = async (message) => {
        attempts += 1;
        if (!message.chunks) {
            const error = new Error('E2EE is required');
            error.code = 82;
            throw error;
        }
        return message;
    };

    const sent = await bot.send('upeer', 'hello');
    assert.equal(attempts, 2);
    assert.equal(sent.chunks.length, 5);
    assert.equal(bot.e2eeRequiredTargets.has('upeer'), true);
});
