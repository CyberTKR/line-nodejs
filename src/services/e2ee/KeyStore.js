export class E2EEKeyStore {
    constructor(storage) {
        this.storage = storage;
    }

    getKey(identifier) {
        return this._get(`e2ee.key.${identifier}`) || this._legacy(identifier);
    }

    saveKey(identifier, key) {
        this._set(`e2ee.key.${identifier}`, this._normalizeKey(key));
        if (key.keyId !== undefined) this._set(`e2ee.key.${key.keyId}`, this._normalizeKey(key));
        return key;
    }

    getPublicKey(mid, keyId) {
        const value = this._get(`e2ee.public.${mid}.${keyId}`) || this._get(`e2ee.public.${keyId}`);
        return value ? Buffer.from(value, 'base64') : null;
    }

    savePublicKey(mid, keyId, keyData) {
        const encoded = Buffer.from(keyData).toString('base64');
        this._set(`e2ee.public.${mid}.${keyId}`, encoded);
        this._set(`e2ee.public.${keyId}`, encoded);
    }

    getGroupKey(chatMid) {
        const value = this._get(`e2ee.group.${chatMid}`);
        if (!value?.privateKey) return null;
        return { ...value, privateKey: Buffer.from(value.privateKey, 'base64') };
    }

    saveGroupKey(chatMid, value) {
        this._set(`e2ee.group.${chatMid}`, {
            keyId: Number(value.keyId),
            version: Number(value.version || 2),
            privateKey: Buffer.from(value.privateKey).toString('base64')
        });
    }

    clearGroupKey(chatMid) {
        this.storage.deleteData(`e2ee.group.${chatMid}`);
    }

    _normalizeKey(key) {
        return {
            keyId: Number(key.keyId),
            version: Number(key.version || key.e2eeVersion || 1),
            privateKey: key.privateKey || key.privKey,
            publicKey: key.publicKey || key.pubKey
        };
    }

    _legacy(identifier) {
        const candidates = [identifier, `key_${identifier}`, `e2eeKeys:${identifier}`];
        for (const key of candidates) {
            const value = this.storage.loadData(String(key));
            if (!value) continue;
            try {
                return this._normalizeKey(typeof value === 'string' ? JSON.parse(value) : value);
            } catch {
                continue;
            }
        }
        return null;
    }

    _get(key) {
        return this.storage.loadData(key, null);
    }

    _set(key, value) {
        if (!this.storage.initialized) throw new Error('E2EE storage is not initialized');
        this.storage.saveData(key, value);
    }
}

export default E2EEKeyStore;
