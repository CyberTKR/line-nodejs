import test from 'node:test';
import assert from 'node:assert/strict';
import { TalkService } from '../src/services/talk/TalkService.js';

function service() {
    const calls = [];
    const server = { getReqseq: () => 7 };
    const talk = Object.create(TalkService.prototype);
    talk.server = server;
    talk.config = { language: 'en_EN' };
    talk._thriftCall = async (...args) => {
        calls.push(args);
        return args;
    };
    return { talk, calls };
}

test('inviteIntoChat normalizes one or more target MIDs', async () => {
    const { talk, calls } = service();
    await talk.inviteIntoChat('c1', 'u1');
    assert.deepEqual(calls[0], ['inviteIntoChat', { reqSeq: 7, chatMid: 'c1', targetUserMids: ['u1'] }]);
});

test('sendMessage selects a fresh request sequence', async () => {
    const { talk, calls } = service();
    await talk.sendMessage({ to: 'u1', text: 'hello', toType: 0 });
    assert.equal(calls[0][0], 'sendMessage');
    assert.equal(calls[0][1], 7);
    assert.equal(calls[0][2].toType, 0);
});

test('extended message methods map to generated Talk calls', async () => {
    const { talk, calls } = service();
    await talk.unsendMessage('m1');
    await talk.react('m2', 3);
    await talk.getPreviousMessages({ messageBoxId: 'b1' });
    assert.deepEqual(calls[0], ['unsendMessage', 7, 'm1']);
    assert.equal(calls[1][0], 'react');
    assert.equal(calls[1][1].messageId, 'm2');
    assert.deepEqual(calls[2], ['getPreviousMessagesV2WithRequest', { messageBoxId: 'b1' }, 0]);
});
