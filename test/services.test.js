import test from 'node:test';
import assert from 'node:assert/strict';
import { CallService } from '../src/services/call/CallService.js';
import { LiffService } from '../src/services/liff/LiffService.js';
import { SquareService } from '../src/services/square/SquareService.js';
import { ThriftDeserializer, ThriftHandler } from '../src/services/core/thrift.js';
import { field, Type } from '../src/services/core/fields.js';

function server() {
    const calls = [];
    return {
        calls,
        callThriftAPI: async (...args) => {
            calls.push(args);
            return args;
        }
    };
}

test('CallService maps group call requests to /V4', async () => {
    const mock = server();
    const service = new CallService(mock);
    await service.inviteIntoGroupCall('c1', ['u1', 'u2']);
    assert.equal(mock.calls[0][0], '/V4');
    assert.equal(mock.calls[0][1], 'inviteIntoGroupCall');
});

test('LIFF and Square services use their own endpoints', async () => {
    const mock = server();
    await new LiffService(mock).issueView('liff-id', { chatMid: 'c1' });
    await new SquareService(mock).sendText('s1', 'hello');
    assert.equal(mock.calls[0][0], '/LIFF1');
    assert.equal(mock.calls[1][0], '/SQ1');
});

test('raw thrift serializer handles string maps and struct lists', () => {
    const payload = [
        field.map(1, Type.STRING, Type.STRING, { key: 'value' }),
        field.list(2, Type.STRUCT, [[field.string(1, 'u1')]])
    ];
    const encoded = ThriftHandler.serialize(payload, 'testMethod');
    assert.ok(Buffer.isBuffer(encoded));
    assert.ok(encoded.length > 20);
});

test('raw thrift responses preserve non-SYNC service results', () => {
    assert.deepEqual(
        ThriftDeserializer.mapToStructuredResponse({ 0: { 1: 'access-token', 2: 3600 } }),
        { 1: 'access-token', 2: 3600 }
    );
});

test('SYNC responses keep their named operation fields', () => {
    const operations = [{ 3: 26 }];
    assert.deepEqual(
        ThriftDeserializer.mapToStructuredResponse({ 0: { 1: { 1: operations, 2: false } } }),
        { operationResponse: { operations, hasMoreOps: false } }
    );
});
