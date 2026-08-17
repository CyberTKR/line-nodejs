import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { E2EEHandler, E2EEStorage, aad, decryptV2, sha256, x25519 } from '../src/services/e2ee/index.js';
import { StorageManager } from '../src/storage/StorageManager.js';
import { byte2int } from '../src/services/core/utils.js';

const require = createRequire(import.meta.url);
const { generateKeyPair } = require('curve25519-js');

test('E2EE v2 encrypts a private text message with authenticated chunks', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'line-e2ee-'));
    const storage = new StorageManager(path.join(directory, 'keys.json'));
    storage.initialize('uself', { displayName: 'self' });
    E2EEStorage.initializeWithStorageManager(storage);
    const own = generateKeyPair(Buffer.alloc(32, 1));
    const peer = generateKeyPair(Buffer.alloc(32, 2));
    E2EEStorage.saveE2EEKey('uself', {
        keyId: 10,
        privKey: Buffer.from(own.private).toString('base64'),
        pubKey: Buffer.from(own.public).toString('base64'),
        e2eeVersion: 2
    });
    const client = {
        selfMid: 'uself',
        talkService: {
            negotiateE2EEPublicKey: async () => ({
                e2eeVersion: 2,
                publicKey: { keyId: 20, keyData: Buffer.from(peer.public) }
            })
        }
    };
    const encrypted = await new E2EEHandler(client).encryptText('upeer', 'hello');
    assert.equal(encrypted.contentMetadata.e2eeVersion, '2');
    assert.equal(byte2int(encrypted.chunks[3]), 10);
    assert.equal(byte2int(encrypted.chunks[4]), 20);

    const secret = x25519(
        Buffer.from(peer.private),
        Buffer.from(own.public)
    );
    assert.equal(sha256(secret, encrypted.chunks[0], Buffer.from('Key')).length, 32);
    const plaintext = decryptV2(
        secret,
        encrypted.chunks[0],
        encrypted.chunks[2],
        aad('upeer', 'uself', 10, 20, 2, 0),
        encrypted.chunks[1]
    );
    assert.deepEqual(JSON.parse(plaintext.toString()), { text: 'hello' });
    fs.rmSync(directory, { recursive: true, force: true });
});
