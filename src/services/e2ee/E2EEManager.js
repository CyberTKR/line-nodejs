import crypto from 'node:crypto';
import { E2EEKeyStore } from './KeyStore.js';
import {
    aad,
    decryptKeyChain,
    decryptV1,
    decryptV2,
    encryptV2,
    generateDeviceKey,
    int32,
    randomBytes,
    readInt32,
    sha256,
    x25519
} from './Crypto.js';

export class E2EEManager {
    constructor(client, storage) {
        this.client = client;
        this.keys = new E2EEKeyStore(storage);
        this.publicCache = new Map();
    }

    async ensureOwnKey() {
        const mid = this.client.selfMid;
        let key = this.keys.getKey(mid);
        if (key) return key;
        const generated = generateDeviceKey();
        const registered = await this.client.talkService.registerE2EEPublicKey(0, {
            version: 1,
            keyId: -1,
            keyData: generated.publicKey,
            createdTime: -1
        });
        if (!registered?.keyId) throw new Error('LINE did not register the E2EE device key');
        key = {
            keyId: Number(registered.keyId),
            version: 1,
            privateKey: generated.privateKey.toString('base64'),
            publicKey: generated.publicKey.toString('base64')
        };
        this.keys.saveKey(mid, key);
        return key;
    }

    saveOwnKey(mid, key) {
        return this.keys.saveKey(mid, key);
    }

    async encryptText(to, text) {
        const sender = this.client.selfMid;
        if (!sender) throw new Error('Account MID is unavailable for E2EE');
        const own = await this.ensureOwnKey();
        const senderKeyId = Number(own.keyId);
        const ownPrivate = Buffer.from(own.privateKey, 'base64');
        const ownPublic = Buffer.from(own.publicKey, 'base64');
        let receiverKeyId;
        let version;
        let secret;

        if (String(to).startsWith('u')) {
            const peer = await this._negotiate(to);
            receiverKeyId = peer.keyId;
            version = peer.version;
            secret = x25519(ownPrivate, peer.publicKey);
        } else {
            const group = await this._groupKey(to);
            receiverKeyId = group.keyId;
            version = group.version;
            secret = x25519(group.privateKey, ownPublic);
        }
        if (version !== 2) throw new Error(`Unsupported E2EE message version: ${version}`);
        const salt = randomBytes(16);
        const nonce = randomBytes(12);
        const associatedData = aad(to, sender, senderKeyId, receiverKeyId, version, 0);
        const payload = Buffer.from(JSON.stringify({ text }));
        return {
            from: sender,
            to,
            toType: String(to).startsWith('u') ? 0 : 2,
            text: '',
            contentType: 0,
            contentMetadata: { e2eeVersion: String(version) },
            chunks: [salt, encryptV2(secret, salt, nonce, associatedData, payload), nonce, int32(senderKeyId), int32(receiverKeyId)]
        };
    }

    async decryptMessage(message) {
        const chunks = (message.chunks || []).map((chunk) => Buffer.from(chunk));
        if (chunks.length < 5) throw new Error('E2EE message chunks are incomplete');
        const sender = message.from;
        const to = message.to;
        const senderKeyId = readInt32(chunks[3]);
        const receiverKeyId = readInt32(chunks[4]);
        const selfMid = this.client.selfMid;
        let version = Number(message.contentMetadata?.e2eeVersion || 2);
        let secret;

        if (message.toType === 0 || String(to).startsWith('u')) {
            const ownKeyId = sender === selfMid ? senderKeyId : receiverKeyId;
            const peerMid = sender === selfMid ? to : sender;
            const peerKeyId = sender === selfMid ? receiverKeyId : senderKeyId;
            const own = this.keys.getKey(ownKeyId) || this.keys.getKey(selfMid);
            if (!own) throw new Error(`E2EE device key was not found: ${ownKeyId}`);
            secret = x25519(Buffer.from(own.privateKey, 'base64'), await this._publicKey(peerMid, peerKeyId));
        } else {
            const group = await this._groupKey(to);
            if (group.keyId !== receiverKeyId) {
                this.keys.clearGroupKey(to);
                const refreshed = await this._groupKey(to);
                if (refreshed.keyId !== receiverKeyId) throw new Error('E2EE group key ID does not match');
                secret = x25519(refreshed.privateKey, await this._senderPublic(sender, senderKeyId));
                version = refreshed.version;
            } else {
                secret = x25519(group.privateKey, await this._senderPublic(sender, senderKeyId));
                version = group.version;
            }
        }

        const associatedData = aad(to, sender, senderKeyId, receiverKeyId, version, Number(message.contentType || 0));
        const plaintext = version === 2
            ? decryptV2(secret, chunks[0], chunks[2], associatedData, chunks[1])
            : decryptV1(secret, chunks[0], chunks[1]);
        return JSON.parse(plaintext.toString('utf8'));
    }

    async decryptText(message) {
        return String((await this.decryptMessage(message)).text || '');
    }

    async _senderPublic(mid, keyId) {
        if (mid === this.client.selfMid) {
            const own = this.keys.getKey(keyId) || this.keys.getKey(mid);
            if (!own) throw new Error(`Sender E2EE key was not found: ${keyId}`);
            return Buffer.from(own.publicKey, 'base64');
        }
        return this._publicKey(mid, keyId);
    }

    async _publicKey(mid, keyId, version = 1) {
        const cacheId = `${mid}:${keyId}:${version}`;
        if (this.publicCache.has(cacheId)) return this.publicCache.get(cacheId);
        const stored = this.keys.getPublicKey(mid, keyId);
        if (stored) return stored;
        const result = await this.client.talkService.getE2EEPublicKey(mid, version, keyId);
        const data = result?.keyData || result?.publicKey?.keyData;
        if (!data) throw new Error(`E2EE public key was not found: ${mid}/${keyId}`);
        const key = Buffer.from(data);
        this.keys.savePublicKey(mid, keyId, key);
        this.publicCache.set(cacheId, key);
        return key;
    }

    async _negotiate(mid) {
        const result = await this.client.talkService.negotiateE2EEPublicKey({ mid });
        const key = result?.publicKey;
        if (!key?.keyId || !key?.keyData) throw new Error(`E2EE negotiation failed: ${mid}`);
        return {
            keyId: Number(key.keyId),
            publicKey: Buffer.from(key.keyData),
            version: Number(result.e2eeVersion || key.version || 2)
        };
    }

    async _groupKey(chatMid) {
        const cached = this.keys.getGroupKey(chatMid);
        if (cached) return cached;
        const group = await this.client.talkService.getLastE2EEGroupSharedKey({ keyVersion: 2, chatMid });
        if (!group?.encryptedSharedKey) throw new Error(`E2EE group key is unavailable: ${chatMid}`);
        const own = this.keys.getKey(Number(group.receiverKeyId)) || await this.ensureOwnKey();
        const creator = await this._publicKey(group.creator, Number(group.creatorKeyId));
        const privateKey = decryptKeyChain(
            x25519(Buffer.from(own.privateKey, 'base64'), creator),
            Buffer.from(group.encryptedSharedKey)
        );
        const result = {
            keyId: Number(group.groupKeyId),
            privateKey,
            version: Number(group.e2eeVersion || 2)
        };
        this.keys.saveGroupKey(chatMid, result);
        return result;
    }

    static decryptMedia(data, keyMaterial) {
        const material = typeof keyMaterial === 'string' ? Buffer.from(keyMaterial, 'base64') : Buffer.from(keyMaterial);
        if (material.length !== 32 || data.length < 32) throw new Error('Invalid E2EE media material');
        const derived = crypto.hkdfSync('sha256', material, Buffer.alloc(0), Buffer.from('FileEncryption'), 76);
        const key = Buffer.from(derived).subarray(0, 32);
        const macKey = Buffer.from(derived).subarray(32, 64);
        const nonce = Buffer.from(derived).subarray(64, 76);
        const ciphertext = data.subarray(0, -32);
        const signature = data.subarray(-32);
        const actual = crypto.createHmac('sha256', macKey).update(ciphertext).digest();
        if (!crypto.timingSafeEqual(signature, actual)) throw new Error('E2EE media signature is invalid');
        const decipher = crypto.createDecipheriv('aes-256-ctr', key, Buffer.concat([nonce, Buffer.alloc(4)]));
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    }
}

export default E2EEManager;
