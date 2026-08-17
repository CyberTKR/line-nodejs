import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { generateKeyPair, sharedKey } = require('curve25519-js');

export function generateDeviceKey() {
    const pair = generateKeyPair(crypto.randomBytes(32));
    return { privateKey: Buffer.from(pair.private), publicKey: Buffer.from(pair.public) };
}

export function x25519(privateKey, publicKey) {
    return Buffer.from(sharedKey(Uint8Array.from(privateKey), Uint8Array.from(publicKey)));
}

export function sha256(...parts) {
    const hash = crypto.createHash('sha256');
    for (const part of parts) hash.update(typeof part === 'string' ? Buffer.from(part) : part);
    return hash.digest();
}

export function foldedSha256(...parts) {
    const digest = sha256(...parts);
    return Buffer.from(digest.subarray(0, 16).map((value, index) => value ^ digest[index + 16]));
}

export function int32(value) {
    const buffer = Buffer.alloc(4);
    buffer.writeInt32BE(Number(value));
    return buffer;
}

export function readInt32(value) {
    return Buffer.from(value).readInt32BE(0);
}

export function aad(to, sender, senderKeyId, receiverKeyId, version, contentType) {
    return Buffer.concat([
        Buffer.from(to),
        Buffer.from(sender),
        int32(senderKeyId),
        int32(receiverKeyId),
        int32(version),
        int32(contentType)
    ]);
}

export function decryptKeyChain(shared, encrypted) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', sha256(shared, 'Key'), foldedSha256(shared, 'IV'));
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export function encryptV2(secret, salt, nonce, associatedData, payload) {
    const cipher = crypto.createCipheriv('aes-256-gcm', sha256(secret, salt, 'Key'), nonce);
    cipher.setAAD(associatedData);
    return Buffer.concat([cipher.update(payload), cipher.final(), cipher.getAuthTag()]);
}

export function decryptV2(secret, salt, nonce, associatedData, payload) {
    if (payload.length < 16) throw new Error('E2EE ciphertext is truncated');
    const decipher = crypto.createDecipheriv('aes-256-gcm', sha256(secret, salt, 'Key'), nonce);
    decipher.setAAD(associatedData);
    decipher.setAuthTag(payload.subarray(-16));
    return Buffer.concat([decipher.update(payload.subarray(0, -16)), decipher.final()]);
}

export function decryptV1(secret, salt, payload) {
    const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        sha256(secret, salt, 'Key'),
        foldedSha256(secret, salt, 'IV')
    );
    return Buffer.concat([decipher.update(payload), decipher.final()]);
}

export function randomBytes(size) {
    return crypto.randomBytes(size);
}
