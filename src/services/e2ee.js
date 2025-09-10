import { Logger, byte2int, getIntBytes } from './utils.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { sharedKey } = require('curve25519-js');
const crypto = require('node:crypto');


export class E2EEStorage {
    static _storageManager = null;
    static _hasShownDisabledMessage = false;
    
    static initializeWithStorageManager(storageManager) {
        this._storageManager = storageManager;
    }
    
    static _logE2EEDisabled() {
        if (!this._hasShownDisabledMessage) {
            Logger.info('E2EE', '💡 E2EE is disabled. Enable E2EE in bot config if you want message encryption.');
            this._hasShownDisabledMessage = true;
        }
    }
    
    static clearCache() {
        this._hasShownDisabledMessage = false;
        Logger.debug('E2EE', 'E2EE cache cleared');
    }
    
    static async _generateE2EEKeyOnDemand(selfMid, talkService) {
        Logger.info('E2EE', 'Generating E2EE key on-demand...');
        
        const crypto = require('crypto');
        const { generateKeyPair } = require('curve25519-js');
        
        const seed = crypto.randomBytes(32);
        const keyPair = generateKeyPair(seed);
        const privKey = Buffer.from(keyPair.private);
        const pubKey = Buffer.from(keyPair.public);
        
        const e2eePublicKey = {
            version: 1,
            keyId: -1,
            keyData: pubKey,
            createdTime: -1
        };
        
        const registerResult = await talkService._thriftCall('registerE2EEPublicKey', 0, e2eePublicKey);
        
        if (registerResult && registerResult.keyId) {
            const keyData = {
                keyId: registerResult.keyId,
                privKey: privKey.toString('base64'),
                pubKey: pubKey.toString('base64'),
                e2eeVersion: 1
            };
            
            this.saveE2EEKey(selfMid, keyData);
            this.saveE2EEKey(registerResult.keyId, keyData);
            
            Logger.success('E2EE', `E2EE key generated on-demand: ${registerResult.keyId}`);
            return keyData;
        } else {
            throw new Error('Failed to register E2EE key with server');
        }
    }

    static getStorageData() {
        if (this._storageManager && this._storageManager.initialized) {
            return this._storageManager.loadData() || {};
        }
        this._logE2EEDisabled();
        return {};
    }
    
    static saveStorageData(data) {
        if (this._storageManager && this._storageManager.initialized) {
            return this._storageManager.saveData(data);
        }
        this._logE2EEDisabled();
        return false;
    }
    
    static getStorageValue(key) {
        const storage = this.getStorageData();
        return storage[key] || null;
    }
    
    static setStorageValue(key, value) {
        if (this._storageManager && this._storageManager.initialized) {
            return this._storageManager.saveData(key, value);
        }
        this._logE2EEDisabled();
        return false;
    }
    
    static removeStorageValue(key) {
        if (this._storageManager && this._storageManager.initialized) {
            return this._storageManager.deleteData(key);
        }
        this._logE2EEDisabled();
        return false;
    }

    static getE2EEKey(keyId) {
        const storage = this.getStorageData();
        
        let keyData = storage[keyId];
        
        if (!keyData) {
            keyData = storage[`key_${keyId}`];
        }
        
        if (!keyData) {
            keyData = storage[`e2eeKeys:${keyId}`];
        }
        
        if (!keyData) return null;
        
        try {
            return JSON.parse(keyData);
        } catch (error) {
            Logger.error('Key parse error:', error.message);
            return null;
        }
    }
    
    static getE2EEPublicKey(keyId) {
        const storage = this.getStorageData();
        let publicKeyData = storage[`publicKey_${keyId}`];
        if (!publicKeyData) {
            publicKeyData = storage[keyId]; // Fallback
        }
        
        if (!publicKeyData) return null;
        
        try {
            return Buffer.from(publicKeyData, 'base64');
        } catch (error) {
            Logger.error('Public key parse error:', error.message);
            return null;
        }
    }
    
    static saveE2EEPublicKey(keyId, keyData) {
        const storage = this.getStorageData();
        storage[`publicKey_${keyId}`] = keyData;
        return this.saveStorageData(storage);
    }
    
    
    static saveE2EEKey(keyId, keyData) {
        const storage = this.getStorageData();
        const keyDataStr = JSON.stringify(keyData);
        
        if (keyId.length === 33) {
            storage[keyId] = keyDataStr;
        } else {
            storage[keyData.keyId || keyId] = keyDataStr;
        }
        
        return this.saveStorageData(storage);
    }

    static async getE2EELocalPublicKey(mid, keyId, talkService) {
        if (keyId !== undefined) {
            const key = this.getE2EEPublicKey(keyId);
            if (key) {
                return key;
            }
        }
        
        if (!talkService) {
            Logger.error('No talkService provided for API call');
            return null;
        }
        
        try {
            const negotiateResult = await talkService.negotiateE2EEPublicKey({ mid });
            
            if (negotiateResult && negotiateResult.publicKey) {
                const fetchedKeyId = negotiateResult.publicKey.keyId;
                const keyData = negotiateResult.publicKey.keyData;
                
                if (!keyId || fetchedKeyId === keyId) {
                    const keyDataBase64 = Buffer.isBuffer(keyData) 
                        ? keyData.toString('base64')
                        : Buffer.from(keyData).toString('base64');
                        
                    this.saveE2EEPublicKey(fetchedKeyId, keyDataBase64);
                    
                    const keyBuffer = Buffer.isBuffer(keyData) 
                        ? keyData 
                        : Buffer.from(keyData);
                    return keyBuffer;
                } else {
                    Logger.warn('Key ID mismatch:', { expected: keyId, got: fetchedKeyId });
                    return null;
                }
            } else {
                Logger.error('API returned empty result');
                return null;
            }
        } catch (apiError) {
            Logger.error('API call failed:', apiError.message);
            return null;
        }
    }
}

export class E2EECrypto {
    static generateSharedSecret(privateKey, publicKey) {
        return sharedKey(
            Uint8Array.from(privateKey),
            Uint8Array.from(publicKey)
        );
    }
    
    static getSHA256Sum(...args) {
        const hash = crypto.createHash('sha256');
        for (let arg of args) {
            if (typeof arg === 'string') {
                arg = Buffer.from(arg);
            }
            hash.update(arg);
        }
        return hash.digest();
    }
    
    static xor(buf) {
        const bufLength = Math.floor(buf.length / 2);
        const buf2 = Buffer.alloc(bufLength);
        for (let i = 0; i < bufLength; i++) {
            buf2[i] = buf[i] ^ buf[bufLength + i];
        }
        return buf2;
    }
    
    static generateAAD(a, b, c, d, e = 2, f = 0) {
        let aad = Buffer.alloc(0);
        aad = Buffer.concat([aad, Buffer.from(a)]);
        aad = Buffer.concat([aad, Buffer.from(b)]);
        aad = Buffer.concat([aad, getIntBytes(c)]);
        aad = Buffer.concat([aad, getIntBytes(d)]);
        aad = Buffer.concat([aad, getIntBytes(e)]);
        aad = Buffer.concat([aad, getIntBytes(f)]);
        return aad;
    }
    
    static removePKCS7Padding(data) {
        if (!data || data.length === 0) {
            throw new Error('Invalid data for PKCS7 padding removal');
        }
        
        const padding = data[data.length - 1];
        
        if (padding <= 0 || padding > data.length) {
            throw new Error('Invalid PKCS7 padding');
        }
        
        for (let i = data.length - 1; i >= data.length - padding; i--) {
            if (data[i] !== padding) {
                throw new Error('Invalid PKCS7 padding');
            }
        }
        
        return data.slice(0, data.length - padding);
    }
}

export class E2EEDecryptor {
    
    static async _decryptGroupE2EE(messageObj, selfMid, talkService) {
        try {
            const chunks = messageObj.chunks.map(chunk => {
                if (Buffer.isBuffer(chunk)) {
                    return chunk;
                } else {
                    return Buffer.from(chunk);
                }
            });
            
            const senderKeyId = byte2int(chunks[3]);
            const receiverKeyId = byte2int(chunks[4]);
            
            const salt = chunks[0];      
            const message = chunks[1];   
            const _sign = chunks[2];     
            
            
            try {
                const cacheKey = `groupKey_${messageObj.to}`;
                let groupPrivKey;
                let cachedGroupKey;
                
                try {
                    const cachedData = E2EEStorage.getStorageValue(cacheKey);
                    if (cachedData) {
                        cachedGroupKey = JSON.parse(cachedData);
                        
                        if (cachedGroupKey.keyId && cachedGroupKey.keyId !== receiverKeyId) {
                            Logger.warn('⚠️ Cached group key ID mismatch - clearing cache:', { 
                                cachedKeyId: cachedGroupKey.keyId, 
                                expectedKeyId: receiverKeyId 
                            });
                            E2EEStorage.removeStorageValue(cacheKey);
                            cachedGroupKey = null;
                        } else if (cachedGroupKey.keyId === receiverKeyId) {
                            groupPrivKey = Buffer.from(cachedGroupKey.privKey, 'base64');
                        }
                    }
                } catch (cacheError) {
                    Logger.debug('No cached group key found:', cacheError.message);
                }
                
                if (!groupPrivKey) {
                    let groupSharedKey;
                    try {
                        groupSharedKey = await talkService.getLastE2EEGroupSharedKey({
                            keyVersion: 2,
                            chatMid: messageObj.to
                        });
                        
                        if (!groupSharedKey) {
                            Logger.warn('No group shared key found for:', messageObj.to);
                            return null;
                        }
                        
                        Logger.debug('Group shared key retrieved:', {
                            creator: groupSharedKey.creator,
                            creatorKeyId: groupSharedKey.creatorKeyId,
                            receiverKeyId: groupSharedKey.receiverKeyId,
                            hasEncryptedKey: !!groupSharedKey.encryptedSharedKey
                        });
                        
                    } catch (gskError) {
                        Logger.warn('Group shared key error:', gskError.message);
                        return null;
                    }
                    
                    const groupReceiverKeyId = groupSharedKey.receiverKeyId;
                
                let selfKeyData = E2EEStorage.getE2EEKey(groupReceiverKeyId);
                
                if (!selfKeyData) {
                    Logger.debug('Group receiver key not found, checking if newer key is needed');
                    
                    const botKeyData = E2EEStorage.getE2EEKey(selfMid);
                    if (botKeyData && groupSharedKey.creatorKeyId > botKeyData.keyId) {
                        Logger.warn('🔄 Newer group key detected - need to sync keys');
                        Logger.debug('Group creator key:', groupSharedKey.creatorKeyId, 'Bot key:', botKeyData.keyId);
                        
                        const storageData = E2EEStorage.getStorageData();
                        const groupKeyCacheKeys = Object.keys(storageData).filter(k => k.startsWith('groupKey_'));
                        for (const cacheKey of groupKeyCacheKeys) {
                            Logger.debug('Clearing outdated group key cache:', cacheKey);
                            E2EEStorage.removeStorageValue(cacheKey);
                        }
                    }
                    
                    Logger.debug('Group receiver key not found, trying available keys');
                    const storageData = E2EEStorage.getStorageData();
                    const availableKeys = Object.keys(storageData).filter(k => k.startsWith('e2eeKeys:'));
                    
                    let latestKey = null;
                    let latestKeyId = 0;
                    
                    for (const keyEntry of availableKeys) {
                        const keyData = storageData[keyEntry];
                        if (keyData) {
                            try {
                                const parsedKey = JSON.parse(keyData);
                                if (parsedKey && parsedKey.privKey && parsedKey.keyId > latestKeyId) {
                                    latestKey = parsedKey;
                                    latestKeyId = parsedKey.keyId;
                                }
                            } catch (e) {
                                continue;
                            }
                        }
                    }
                    
                    if (latestKey) {
                        selfKeyData = latestKey;
                        Logger.debug('Using latest available key:', latestKey.keyId);
                    } else {
                        Logger.error('No E2EE keys found for group decryption');
                        return null;
                    }
                } else {
                }
                
                const selfPrivKey = Buffer.from(selfKeyData.privKey, 'base64');
                
                const creator = groupSharedKey.creator;
                const creatorKeyResult = await talkService.negotiateE2EEPublicKey({ mid: creator });
                
                if (!creatorKeyResult || !creatorKeyResult.publicKey) {
                    Logger.warn('Could not get creator public key for:', creator);
                    return null;
                }
                
                const creatorPubKey = Buffer.from(creatorKeyResult.publicKey.keyData);
                Logger.debug('Creator public key retrieved:', creator);
                
                const sharedSecret = E2EECrypto.generateSharedSecret(selfPrivKey, creatorPubKey);
                
                Logger.debug('Shared secret generated:', {
                    length: sharedSecret.length,
                    type: sharedSecret.constructor.name,
                    first4Bytes: Array.from(sharedSecret.slice(0, 4)),
                    isBuffer: Buffer.isBuffer(sharedSecret)
                });
                
                const sharedSecretBuffer = Buffer.isBuffer(sharedSecret) ? sharedSecret : Buffer.from(sharedSecret);
                
                const aes_key = E2EECrypto.getSHA256Sum(sharedSecretBuffer, Buffer.from('Key'));
                const aes_iv = E2EECrypto.xor(E2EECrypto.getSHA256Sum(sharedSecretBuffer, Buffer.from('IV')));
                
                
                
                const encryptedSharedKey = Buffer.from(groupSharedKey.encryptedSharedKey);
                
                try {
                    const decipher = crypto.createDecipheriv('aes-256-cbc', aes_key, aes_iv);
                    const decryptedSharedKey = Buffer.concat([
                        decipher.update(encryptedSharedKey),
                        decipher.final()
                    ]);
                    
                    Logger.debug('Group shared key decrypted:', decryptedSharedKey.length, 'bytes');
                    
                    const base64GroupKey = decryptedSharedKey.toString('base64');
                    groupPrivKey = decryptedSharedKey; // Use the raw decrypted buffer directly like LineJS
                    
                    
                    const cacheData = {
                        privKey: base64GroupKey, // Store as base64 like LineJS
                        keyId: groupSharedKey.groupKeyId
                    };
                    E2EEStorage.setStorageValue(cacheKey, JSON.stringify(cacheData));
                    Logger.success('💾 Cached group key for future use:', { 
                        groupId: messageObj.to,
                        keyId: cacheData.keyId,
                        groupKeyLength: groupPrivKey.length,
                        groupKeyFirst8Bytes: groupPrivKey.toString('hex').slice(0, 16)
                    });
                    
                } catch (groupDecryptError) {
                    Logger.error('Group shared key decryption failed:', groupDecryptError.message);
                    
                    if (groupSharedKey.creator === selfMid && selfKeyData.keyId !== groupReceiverKeyId) {
                        Logger.debug('Trying decryption with self key instead');
                        try {
                            const selfMainKey = E2EEStorage.getE2EEKey(selfMid);
                            if (selfMainKey) {
                                const altPrivKey = Buffer.from(selfMainKey.privKey, 'base64');
                                const altSharedSecret = E2EECrypto.generateSharedSecret(altPrivKey, creatorPubKey);
                                const altAesKey = E2EECrypto.getSHA256Sum(Buffer.from(altSharedSecret), Buffer.from('Key'));
                                const altAesIv = E2EECrypto.xor(E2EECrypto.getSHA256Sum(Buffer.from(altSharedSecret), Buffer.from('IV')));
                                
                                const altDecipher = crypto.createDecipheriv('aes-256-cbc', altAesKey, altAesIv);
                                const altDecryptedSharedKey = Buffer.concat([
                                    altDecipher.update(encryptedSharedKey),
                                    altDecipher.final()
                                ]);
                                
                                const altBase64GroupKey = altDecryptedSharedKey.toString('base64');
                                groupPrivKey = altDecryptedSharedKey;
                                
                                Logger.success('Alternative key decryption successful');
                            }
                        } catch (altError) {
                            Logger.debug('Alternative key also failed:', altError.message);
                            return null;
                        }
                    } else {
                        return null;
                    }
                }
                
                } // End of if (!groupPrivKey) block
                
                if (!groupPrivKey) {
                    Logger.error('Group private key not generated');
                    return null;
                }
                
                let senderPubKey;
                if (messageObj.from === selfMid) {
                    senderPubKey = Buffer.from(selfKeyData.pubKey, 'base64');
                } else {
                    const senderKeyResult = await talkService.negotiateE2EEPublicKey({ mid: messageObj.from });
                    if (senderKeyResult && senderKeyResult.publicKey) {
                        senderPubKey = Buffer.from(senderKeyResult.publicKey.keyData);
                    } else {
                        Logger.warn('Could not get sender public key for:', messageObj.from);
                        return null;
                    }
                }
                
                
                
                let privK, pubK;
                
                privK = groupPrivKey;
                
                if (messageObj.from === selfMid) {
                    const selfKeyForGroup = E2EEStorage.getE2EEKey(selfMid) || 
                                          Object.values(E2EEStorage.getStorageData())
                                                .filter(item => item && typeof item === 'string' && item.includes('pubKey'))
                                                .map(item => JSON.parse(item))[0];
                    
                    if (selfKeyForGroup) {
                        pubK = Buffer.from(selfKeyForGroup.pubKey, 'base64');
                        Logger.debug('Self-sent group message: using self public key');
                    } else {
                        Logger.warn('Self key not found for group self-sent, using fallback');
                        pubK = senderPubKey; // fallback
                    }
                } else {
                    pubK = senderPubKey;
                }
                
                
                const messageSharedSecret = E2EECrypto.generateSharedSecret(privK, pubK);
                
                const messageAesKey = E2EECrypto.getSHA256Sum(Buffer.from(messageSharedSecret), salt, 'Key');
                const messageAesIv = E2EECrypto.xor(E2EECrypto.getSHA256Sum(Buffer.from(messageSharedSecret), salt, 'IV'));
                
                
                
                let decrypted;
                
                try {
                    const senderKeyId = byte2int(chunks[3]);
                    Logger.debug('Attempting V2 group decryption first', { senderKeyId, receiverKeyId });
                    decrypted = E2EEDecryptor.decryptE2EEMessageV2(
                        messageObj.to,
                        messageObj.from, 
                        chunks,
                        privK,
                        pubK,
                        2,
                        0
                    );
                    return decrypted.text || '';
                } catch (v2Error) {
                    Logger.debug('V2 group decryption failed, trying V1:', v2Error.message);
                }
                
                try {
                    decrypted = E2EEDecryptor.decryptE2EEMessageV1(chunks, messageAesKey, messageAesIv);
                    if (typeof decrypted === 'object' && decrypted.text) {
                        return decrypted.text;
                    } else if (typeof decrypted === 'string') {
                        return decrypted;
                    }
                    return decrypted || '';
                } catch (v1Error) {
                    Logger.debug('V1 group decryption also failed:', v1Error.message);
                }
                
            } catch (v1Error) {
                Logger.debug('E2EE V1 decrypt failed:', v1Error.message);
            }
            
            try {
                const base64Decoded = Buffer.from(message.toString('base64'), 'base64');
                const textAttempt = base64Decoded.toString('utf8');
                if (textAttempt.length > 0 && /^[a-zA-Z0-9\s!.,?]+$/.test(textAttempt)) {
                    Logger.debug('Base64 decode success:', textAttempt);
                    return textAttempt;
                }
            } catch (b64Error) {
                Logger.debug('Base64 decode failed:', b64Error.message);
            }
            
            return null;
            
        } catch (error) {
            Logger.error('Group E2EE decryption error:', error.message);
            return null;
        }
    }
    
    static decryptE2EEMessageV2(to, from, chunks, privK, pubK, specVersion = 2, contentType = 0) {
        const salt = chunks[0];
        const message = chunks[1];
        const ciphertext = message.subarray(0, -16);
        const tag = message.subarray(-16);
        const sign = chunks[2];
        const senderKeyId = byte2int(chunks[3]);
        const receiverKeyId = byte2int(chunks[4]);
        
        const aesKey = E2EECrypto.generateSharedSecret(privK, pubK);
        const gcmKey = E2EECrypto.getSHA256Sum(Buffer.from(aesKey), salt, 'Key');
        const aad = E2EECrypto.generateAAD(to, from, senderKeyId, receiverKeyId, specVersion, contentType);

        try {
            const decipher = crypto.createDecipheriv('aes-256-gcm', gcmKey, sign);
            decipher.setAuthTag(tag);
            decipher.setAAD(aad);
            const decrypted = Buffer.concat([
                decipher.update(ciphertext),
                decipher.final()
            ]);
            return JSON.parse(decrypted.toString());
        } catch (error) {
            try {
                const decipher2 = crypto.createDecipheriv('aes-256-gcm', gcmKey, sign);
                decipher2.setAuthTag(tag);
                decipher2.setAAD(aad);
                decipher2.setAutoPadding(false);
                const decrypted = Buffer.concat([
                    decipher2.update(ciphertext),
                    decipher2.final()
                ]);
                return JSON.parse(decrypted.toString());
            } catch (retryError) {
                Logger.error('E2EE V2 decrypt failed:', retryError.message);
                throw retryError;
            }
        }
    }
    
    static decryptE2EEMessageV1(chunks, privK, pubK) {
        const salt = chunks[0];
        const message = chunks[1];
        const _sign = chunks[2];
        const aesKey = E2EECrypto.generateSharedSecret(privK, pubK);
        const aes_key = E2EECrypto.getSHA256Sum(Buffer.from(aesKey), salt, 'Key');
        const aes_iv = E2EECrypto.xor(E2EECrypto.getSHA256Sum(Buffer.from(aesKey), salt, 'IV'));
        
        
        try {
            const decipher = crypto.createDecipheriv('aes-256-cbc', aes_key, aes_iv);
            decipher.setAutoPadding(false); // LineJS uses no padding
            const decrypted = Buffer.concat([
                decipher.update(message),
                decipher.final()
            ]);
            
            Logger.debug('V1 decrypted buffer:', {
                length: decrypted.length,
                hex: decrypted.toString('hex').substring(0, 100)
            });
            
            let cleanDecrypted;
            try {
                cleanDecrypted = E2EECrypto.removePKCS7Padding(decrypted);
            } catch (paddingError) {
                Logger.debug('PKCS7 padding removal failed, using raw decrypted:', paddingError.message);
                cleanDecrypted = decrypted;
            }
            
            const textResult = cleanDecrypted.toString('utf-8');
            Logger.debug('V1 text result:', textResult.substring(0, 100));
            Logger.debug('V1 hex result:', cleanDecrypted.toString('hex'));
            
            if (!/^[\x20-\x7E\s]*$/.test(textResult)) {
                Logger.debug('V1 result not readable text, trying different approaches');
                
                const latin1Result = cleanDecrypted.toString('latin1');
                Logger.debug('V1 latin1 result:', latin1Result.substring(0, 100));
                
                try {
                    const base64Decoded = Buffer.from(cleanDecrypted.toString('base64'), 'base64');
                    const base64Text = base64Decoded.toString('utf-8');
                    Logger.debug('V1 base64 decoded:', base64Text);
                    if (/^[\x20-\x7E\s]*$/.test(base64Text)) {
                        return { text: base64Text };
                    }
                } catch (b64Error) {
                    Logger.debug('Base64 decode failed:', b64Error.message);
                }
            }
            
            try {
                return JSON.parse(textResult);
            } catch {
                return { text: textResult };
            }
        } catch (error) {
            const decipher2 = crypto.createDecipheriv('aes-256-cbc', aes_key, aes_iv);
            const decrypted = Buffer.concat([
                decipher2.update(message),
                decipher2.final()
            ]);
            const textResult = decrypted.toString('utf-8');
            try {
                return JSON.parse(textResult);
            } catch {
                return { text: textResult };
            }
        }
    }

    static async decryptE2EETextMessage(messageObj, selfMid, talkService = null) {
        if (messageObj.from === selfMid) {
            
            const botKeyData = E2EEStorage.getE2EEKey(selfMid);
            if (botKeyData) {
            }
        }
        
        if (messageObj.to && messageObj.to.startsWith('c')) {
            
            try {
                const groupDecrypted = await E2EEDecryptor._decryptGroupE2EE(messageObj, selfMid, talkService);
                if (groupDecrypted) {
                    return groupDecrypted;
                } else {
                    return 'Group E2EE message (decryption failed)';
                }
            } catch (error) {
                Logger.error('Group E2EE error:', error.message);
                return 'Group E2EE message (decryption error)';
            }
        }
        
        
        if (!messageObj.chunks || messageObj.chunks.length < 5) {
            Logger.error('Invalid chunks data:', messageObj.chunks?.length);
            return null;
        }
        
        const chunks = messageObj.chunks.map((chunk, index) => {
            if (typeof chunk === 'string') {
                return Buffer.from(chunk, 'utf-8');
            } else if (chunk instanceof Buffer) {
                return chunk;
            } else {
                return Buffer.from(chunk);
            }
        });
        
        const senderKeyId = byte2int(chunks[3]);
        const receiverKeyId = byte2int(chunks[4]);
        
        const storageData = E2EEStorage.getStorageData();
        const availableKeys = Object.keys(storageData).filter(k => k.startsWith('e2eeKeys:'));
        
        let selfKeyData = E2EEStorage.getE2EEKey(selfMid);
        
        if (!selfKeyData) {
            Logger.warn('⚠️ E2EE key missing - attempting to generate');
            
            try {
                await E2EEStorage._generateE2EEKeyOnDemand(selfMid, talkService);
                selfKeyData = E2EEStorage.getE2EEKey(selfMid);
                
                if (!selfKeyData) {
                    Logger.warn('E2EE key generation failed, cannot decrypt message');
                    return { success: false, content: messageObj.text || 'Encrypted message (no key)' };
                }
                
                Logger.success('E2EE', 'Key generated, retrying...');
                return await E2EEDecryptor.decryptE2EETextMessage(messageObj, selfMid, talkService);
                
            } catch (keyGenError) {
                Logger.warn('Failed to generate E2EE key on-demand:', keyGenError.message);
                return { success: false, content: messageObj.text || 'Encrypted message (no key)' };
            }
        } else {
        }
        
        if (!selfKeyData) {
            Logger.error('No E2EE keys available in storage');
            return null;
        }
        
        const from = messageObj.from;
        const to = messageObj.to; 
        const isSelf = (from === selfMid);
        
        let actualSelfKey = selfKeyData;
        let otherPubK;
        
        if (isSelf) {
            
            let usableKey = E2EEStorage.getE2EEKey(receiverKeyId);
            if (!usableKey) {
                usableKey = E2EEStorage.getE2EEKey(senderKeyId);
            }
            if (!usableKey) {
                usableKey = selfKeyData;
            }
            
            if (usableKey && usableKey.privKey) {
                actualSelfKey = usableKey;
                
                
                let useReceiverPrivate = false;
                let targetPublicKeyId;
                
                const receiverPrivateKey = E2EEStorage.getE2EEKey(receiverKeyId);
                if (receiverPrivateKey && receiverPrivateKey.privKey) {
                    actualSelfKey = receiverPrivateKey;
                    targetPublicKeyId = senderKeyId;
                    useReceiverPrivate = true;
                } else {
                    targetPublicKeyId = receiverKeyId;
                }
                
                
                const otherDeviceKey = E2EEStorage.getE2EEPublicKey(targetPublicKeyId);
                if (otherDeviceKey) {
                    otherPubK = otherDeviceKey;
                } else {
                    
                    if (targetPublicKeyId === receiverKeyId) {
                        otherPubK = await E2EEStorage.getE2EELocalPublicKey(to, targetPublicKeyId, talkService);
                    } else {
                        otherPubK = await E2EEStorage.getE2EELocalPublicKey(from, targetPublicKeyId, talkService);
                    }
                }
                
                if (!otherPubK) {
                    otherPubK = Buffer.from(actualSelfKey.pubKey, 'base64');
                }
            } else {
                actualSelfKey = selfKeyData;
                otherPubK = Buffer.from(actualSelfKey.pubKey, 'base64');
            }
        } else {
            otherPubK = await E2EEStorage.getE2EELocalPublicKey(from, senderKeyId, talkService);
        }
        
        if (!otherPubK) {
            Logger.warn('Could not get public key for target, using self key as fallback');
            otherPubK = Buffer.from(actualSelfKey.pubKey, 'base64');
        }

        const selfPrivK = Buffer.from(actualSelfKey.privKey, 'base64');
        const selfPubK = Buffer.from(actualSelfKey.pubKey, 'base64');

        let decrypted = null;
        
        try {
            decrypted = this.decryptE2EEMessageV2(
                messageObj.to,
                messageObj.from,
                chunks,
                selfPrivK,
                otherPubK,
                2,
                0
            );
            return decrypted.text || '';
        } catch (v2Error) {
            
            let decrypted = null;
            try {
                decrypted = this.decryptE2EEMessageV1(chunks, selfPrivK, otherPubK);
                if (typeof decrypted === 'object' && decrypted.text) {
                    return decrypted.text;
                } else if (typeof decrypted === 'string') {
                    return decrypted;
                }
                return decrypted || '';
            } catch (v1Error) {
                
                if (messageObj.from === selfMid) {
                    
                    try {
                        
                        const phoneSharedSecret = E2EECrypto.generateSharedSecret(selfPrivK, otherPubK);
                        const phonePrivateKey = E2EECrypto.getSHA256Sum(Buffer.from(phoneSharedSecret), 'phone_key');
                        
                        const botPubK = Buffer.from(selfKeyData.pubKey, 'base64');
                        const phoneDecrypted = this.decryptE2EEMessageV1(chunks, phonePrivateKey, botPubK);
                        
                        if (phoneDecrypted && phoneDecrypted.text) {
                            return phoneDecrypted.text;
                        }
                    } catch (phoneError) {
                    }
                    
                    try {
                        const botPubK = Buffer.from(selfKeyData.pubKey, 'base64');
                        const botDecrypted = this.decryptE2EEMessageV1(chunks, selfPrivK, botPubK);
                        if (botDecrypted && botDecrypted.text) {
                            return botDecrypted.text;
                        }
                    } catch (swapError) {
                    }
                    
                    if (otherPubK && actualSelfKey.keyId !== selfKeyData.keyId) {
                        try {
                            const reversePubK = Buffer.from(actualSelfKey.pubKey, 'base64');
                            const reversePrivK = Buffer.from(selfKeyData.privKey, 'base64');
                            const reverseDecrypted = this.decryptE2EEMessageV1(chunks, reversePrivK, reversePubK);
                            if (reverseDecrypted && reverseDecrypted.text) {
                                return reverseDecrypted.text;
                            }
                        } catch (reverseError) {
                        }
                    }
                    
                    return '📱➡️🤖 Self-sent message (multi-device E2EE limitation)';
                }
                
                Logger.warn('⚠️ E2EE decryption failed');
                return null;
            }
        }
    }
}

export class E2EEHandler {
    constructor(client) {
        this.client = client;
    }
    
    async decryptMessage(messageObj) {
        try {
            return await E2EEDecryptor.decryptE2EETextMessage(
                messageObj, 
                this.client.selfMid, 
                this.client.talkService
            );
        } catch (error) {
            Logger.error('E2EE decryption failed:', error.message);
            return null;
        }
    }
    
    static isEncrypted(messageObj) {
        return messageObj[20] && Array.isArray(messageObj[20]) && messageObj[20].length >= 5;
    }
}

export default E2EEHandler;
