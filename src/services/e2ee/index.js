import { E2EEManager } from './E2EEManager.js';
import { E2EEKeyStore } from './KeyStore.js';

let activeStorage = null;

export class E2EEStorage {
    static initializeWithStorageManager(storage) {
        activeStorage = storage;
    }

    static store() {
        if (!activeStorage?.initialized) throw new Error('E2EE storage is not initialized');
        return new E2EEKeyStore(activeStorage);
    }

    static getE2EEKey(identifier) {
        if (!activeStorage?.initialized) return null;
        const key = this.store().getKey(identifier);
        if (!key) return null;
        return {
            keyId: key.keyId,
            e2eeVersion: key.version,
            privKey: key.privateKey,
            pubKey: key.publicKey
        };
    }

    static saveE2EEKey(identifier, key) {
        return this.store().saveKey(identifier, key);
    }
}

export class E2EEHandler {
    constructor(client, storage = activeStorage) {
        this.manager = new E2EEManager(client, storage);
    }

    encryptText(to, text) {
        return this.manager.encryptText(to, text);
    }

    decryptMessage(message) {
        return this.manager.decryptText(message);
    }

    saveOwnKey(mid, key) {
        return this.manager.saveOwnKey(mid, key);
    }

    static isEncrypted(message) {
        const chunks = message?.chunks || message?.[20];
        return Array.isArray(chunks) && chunks.length >= 5;
    }
}

export { E2EEManager, E2EEKeyStore };
export * from './Crypto.js';
