import test from 'node:test';
import assert from 'node:assert/strict';
import * as library from '../src/index.js';

test('public package exports the client and bot classes', () => {
    for (const name of ['LineClient', 'Bot', 'PublicBot', 'SelfBot', 'Config', 'TalkService']) {
        assert.equal(typeof library[name], 'function');
    }
});
