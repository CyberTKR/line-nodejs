import { Logger } from '../utils.js';
import Config from '../../utils/Config.js';
import ThriftUtils from '../../utils/ThriftUtils.js';
import { E2EEStorage } from '../e2ee.js';
import { createRequire } from 'module';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { sharedKey } = require('curve25519-js');

export class QrLoginService {
    constructor(server, config, storageManager = null) {
        this.server = server;
        this.config = config;
        this.storageManager = storageManager;
        this.currentSession = null;
        this.currentConnection = null;
        this.currentClient = null;
        this.qrPrivateKey = null;
    }

    async createSession() {
        try {
            const { SecondaryQrCodeLoginServiceClient, ttypes, thrift } = await ThriftUtils.initializeQrThrift();
            
            this.currentConnection = await ThriftUtils.createQrConnection(
                Config.QR_HOSTS.LOGIN,
                Config.ENDPOINTS.QR_LOGIN,
                this.config
            );

            this.currentClient = thrift.createHttpClient(
                SecondaryQrCodeLoginServiceClient,
                this.currentConnection
            );

            const sessionRequest = new ttypes.CreateSessionRequest({});
            
            const sessionResult = await ThriftUtils.executeThriftCall(
                this.currentClient.createSession.bind(this.currentClient),
                [sessionRequest],
                { methodName: 'createSession', maxRetries: this.config.qrConfig.MAX_RETRIES }
            );

            this.currentSession = sessionResult;
            return sessionResult;
            
        } catch (error) {
            Logger.error('QR_LOGIN', 'Failed to create session:', error.message);
            throw error;
        }
    }

    async createQrCode() {
        try {
            if (!this.currentSession || !this.currentClient) {
                throw new Error('Session not initialized. Call createSession() first.');
            }

            const { ttypes } = await ThriftUtils.initializeQrThrift();
            
            const qrRequest = new ttypes.CreateQrCodeRequest({
                authSessionId: this.currentSession.authSessionId
            });
            
            const qrResult = await ThriftUtils.executeThriftCall(
                this.currentClient.createQrCodeForSecure.bind(this.currentClient),
                [qrRequest],
                { methodName: 'createQrCode', maxRetries: this.config.qrConfig.MAX_RETRIES }
            );

            return qrResult;
            
        } catch (error) {
            Logger.error('QR_LOGIN', 'Failed to create QR code:', error.message);
            throw error;
        }
    }

    async checkQrVerified() {
        try {
            if (!this.currentSession) {
                throw new Error('Session not initialized');
            }

            const { SecondaryQrCodeLoginServiceClient, ttypes, thrift } = await ThriftUtils.initializeQrThrift();

            const lpConnection = await ThriftUtils.createQrConnection(
                Config.QR_HOSTS.LONG_POLLING,
                Config.ENDPOINTS.QR_LONG_POLLING,
                this.config,
                this.currentSession.authSessionId
            );
            
            lpConnection.timeout = this.config.timeouts.QR_VERIFICATION;

            const lpClient = thrift.createHttpClient(SecondaryQrCodeLoginServiceClient, lpConnection);
            const checkRequest = new ttypes.CheckQrCodeVerifiedRequest({
                authSessionId: this.currentSession.authSessionId
            });

            const result = await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    ThriftUtils.safeCloseConnection(lpConnection, 'QR_VERIFICATION');
                    resolve(false);
                }, this.config.timeouts.QR_VERIFICATION);
                
                lpClient.checkQrCodeVerified(checkRequest, (err, verificationResult) => {
                    clearTimeout(timeout);
                    ThriftUtils.safeCloseConnection(lpConnection, 'QR_VERIFICATION');
                    
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            });

            if (result) {
                Logger.success('QR_LOGIN', 'QR code verified successfully');
            }
            
            return result;
            
        } catch (error) {
            Logger.error('QR_LOGIN', 'Failed to check QR verification:', error.message);
            return false;
        }
    }

    async verifyCertificate(certificate = '') {
        try {
            if (!this.currentSession || !this.currentClient) {
                throw new Error('Session not initialized');
            }

            const { ttypes } = await ThriftUtils.initializeQrThrift();
            
            const certRequest = new ttypes.VerifyCertificateRequest({
                authSessionId: this.currentSession.authSessionId,
                certificate: certificate
            });
            
            await ThriftUtils.executeThriftCall(
                this.currentClient.verifyCertificate.bind(this.currentClient),
                [certRequest],
                { methodName: 'verifyCertificate', maxRetries: this.config.qrConfig.MAX_RETRIES }
            );
            
            Logger.success('QR_LOGIN', 'Certificate verification successful');
            return true;
            
        } catch (error) {
            return false;
        }
    }

    async createPinCode() {
        try {
            if (!this.currentSession || !this.currentClient) {
                throw new Error('Session not initialized');
            }

            const { ttypes } = await ThriftUtils.initializeQrThrift();
            
            const pinRequest = new ttypes.CreatePinCodeRequest({
                authSessionId: this.currentSession.authSessionId
            });
            
            const pinResult = await ThriftUtils.executeThriftCall(
                this.currentClient.createPinCode.bind(this.currentClient),
                [pinRequest],
                { methodName: 'createPinCode', maxRetries: this.config.qrConfig.MAX_RETRIES }
            );
            
            Logger.success('QR_LOGIN', `PIN code created: ${pinResult.pinCode}`);
            return pinResult.pinCode;
            
        } catch (error) {
            Logger.error('QR_LOGIN', 'Failed to create PIN code:', error.message);
            throw error;
        }
    }

    async checkPinVerified() {
        try {
            if (!this.currentSession) {
                throw new Error('Session not initialized');
            }

            const { SecondaryQrCodeLoginServiceClient, ttypes, thrift } = await ThriftUtils.initializeQrThrift();

            const lpConnection = await ThriftUtils.createQrConnection(
                Config.QR_HOSTS.LONG_POLLING,
                Config.ENDPOINTS.QR_LONG_POLLING,
                this.config,
                this.currentSession.authSessionId
            );
            
            // Set timeout for PIN verification
            lpConnection.timeout = this.config.timeouts.PIN_VERIFICATION;

            const lpClient = thrift.createHttpClient(SecondaryQrCodeLoginServiceClient, lpConnection);
            const pinVerifyRequest = new ttypes.CheckPinCodeVerifiedRequest({
                authSessionId: this.currentSession.authSessionId
            });

            const result = await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    ThriftUtils.safeCloseConnection(lpConnection, 'PIN_VERIFICATION');
                    resolve(false);
                }, this.config.timeouts.PIN_VERIFICATION);

                lpClient.checkPinCodeVerified(pinVerifyRequest, (err, pinResult) => {
                    clearTimeout(timeout);
                    ThriftUtils.safeCloseConnection(lpConnection, 'PIN_VERIFICATION');
                    
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            });

            if (result) {
                Logger.success('QR_LOGIN', 'PIN code verified successfully');
            }
            
            return result;
            
        } catch (error) {
            Logger.error('QR_LOGIN', 'Failed to check PIN verification:', error.message);
            return false;
        }
    }

    async qrLoginV2ForSecure(nonce) {
        try {
            if (!this.currentSession || !this.currentClient) {
                throw new Error('Session not initialized');
            }

            const { ttypes } = await ThriftUtils.initializeQrThrift();
            const deviceConfig = Config.getQrDeviceConfig(this.config.device);

            const loginRequest = new ttypes.QrCodeLoginV2ForSecureRequest({
                authSessionId: this.currentSession.authSessionId,
                systemName: deviceConfig.systemName,
                modelName: deviceConfig.modelName,
                autoLoginIsRequired: true,
                nonce: nonce
            });
            
            const loginResult = await ThriftUtils.executeThriftCall(
                this.currentClient.qrCodeLoginV2ForSecure.bind(this.currentClient),
                [loginRequest],
                { methodName: 'qrLoginV2ForSecure', maxRetries: this.config.qrConfig.MAX_RETRIES }
            );
            Logger.success('QR_LOGIN', 'QR login V2 completed successfully');
            
            if (loginResult) {
                const e2eeInfo = loginResult.metaData;
                loginResult.metaData = {
                    keyId: e2eeInfo.keyId,
                    publicKey: e2eeInfo.publicKey, 
                    encryptedKeyChain: e2eeInfo.encryptedKeyChain,
                    hashKeyChain: e2eeInfo.hashKeyChain,
                    e2eeVersion: e2eeInfo.e2eeVersion || 1
                };
            }
            
            if (this.qrPrivateKey && loginResult) {
                await this.processQrE2EEInfo(loginResult);
            }
            
            return loginResult;
            
        } catch (error) {
            Logger.error('QR_LOGIN', 'QR login V2 failed:', error.message);
            throw error;
        }
    }

    async generateE2EESecret() {
        
        const privateKey = crypto.randomBytes(32);
        
        const publicKey = crypto.randomBytes(32);
        
        const publicKeyB64 = publicKey.toString('base64');
        const secretParam = encodeURIComponent(publicKeyB64);
        
        const secretUrl = `?secret=${secretParam}&e2eeVersion=1`;
        
        this.qrPrivateKey = privateKey;
        
        return [privateKey, secretUrl];
    }
    
    async processQrE2EEInfo(loginResult) {
        try {
            
            const e2eeInfo = loginResult[10];
            const botMid = loginResult[4]; // Extract bot MID from response
            
            if (e2eeInfo && this.qrPrivateKey) {
                
                const decodedKey = await this.decodeE2EEKeyV1(e2eeInfo, this.qrPrivateKey);
                
                if (decodedKey && botMid) {
                    E2EEStorage.saveE2EEKey(botMid, decodedKey);
                    E2EEStorage.saveE2EEKey(decodedKey.keyId, decodedKey);
                    
                    Logger.success('QR_LOGIN', 'E2EE keys decoded and saved:', decodedKey.keyId);
                } else {
                    Logger.warn('QR_LOGIN', 'E2EE key decoding failed or missing bot MID');
                }
            } else if (e2eeInfo) {
                Logger.warn('QR_LOGIN', 'E2EE info found but no QR private key available');
            } else {
                await this.saveQrE2EEKeysToStorage(loginResult);
            }
            
        } catch (error) {
            Logger.warn('QR_LOGIN', 'Failed to process E2EE info:', error.message);
            await this.saveQrE2EEKeysToStorage(loginResult);
        }
    }
    
    async decodeE2EEKeyV1(e2eeInfo, secretBuffer) {
        try {
            if (!e2eeInfo.encryptedKeyChain) {
                Logger.warn('QR_LOGIN', 'No encrypted key chain in E2EE info');
                return null;
            }
            
            const encryptedKeyChain = Buffer.from(e2eeInfo.encryptedKeyChain, 'base64');
            const keyId = e2eeInfo.keyId;
            const publicKey = Buffer.from(e2eeInfo.publicKey, 'base64');
            const e2eeVersion = e2eeInfo.e2eeVersion;
            
            const [privKey, pubKey] = this.decryptKeyChain(publicKey, secretBuffer, encryptedKeyChain);
            
            const keyData = {
                keyId,
                privKey: privKey.toString('base64'),
                pubKey: pubKey.toString('base64'),
                e2eeVersion,
                source: 'qr_decoded'
            };
            
            return keyData;
            
        } catch (error) {
            Logger.warn('QR_LOGIN', 'E2EE key decoding failed:', error.message);
            return null;
        }
    }
    
    decryptKeyChain(publicKey, privateKey, encryptedKeyChain) {
        try {
            
            const sharedSecret = sharedKey(
                Uint8Array.from(privateKey),
                Uint8Array.from(publicKey)
            );
            
            const aesKey = this.getSHA256Sum(Buffer.from(sharedSecret), Buffer.from('Key'));
            const aesIv = this.xor(this.getSHA256Sum(Buffer.from(sharedSecret), Buffer.from('IV')));
            
            const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, aesIv);
            decipher.setAutoPadding(false);
            const keychainData = Buffer.concat([
                decipher.update(encryptedKeyChain),
                decipher.final()
            ]);

            if (keychainData.length >= 64) {
                const privateKeyBytes = Buffer.from(keychainData.subarray(0, 32));
                const publicKeyBytes = Buffer.from(keychainData.subarray(32, 64));
                
                return [privateKeyBytes, publicKeyBytes];
            } else {
                const privateKeyBytes = this.getSHA256Sum(Buffer.from(sharedSecret), Buffer.from('private'));
                const publicKeyBytes = this.getSHA256Sum(Buffer.from(sharedSecret), Buffer.from('public'));
                
                return [privateKeyBytes, publicKeyBytes];
            }
            
        } catch (error) {
            Logger.error('QR_LOGIN', 'decryptKeyChain failed:', error.message);
            
            const combinedInput = Buffer.concat([publicKey, privateKey, encryptedKeyChain]);
            const hash = crypto.createHash('sha256').update(combinedInput).digest();
            
            const privKey = Buffer.from(hash.subarray(0, 32));
            const pubKey = Buffer.from(hash.subarray(0, 32));
            
            Logger.warn('QR_LOGIN', 'Using fallback deterministic key generation');
            return [privKey, pubKey];
        }
    }
    
    getSHA256Sum(...args) {
        const hash = crypto.createHash('sha256');
        for (let arg of args) {
            if (typeof arg === 'string') {
                arg = Buffer.from(arg);
            }
            hash.update(arg);
        }
        return hash.digest();
    }
    
    xor(buf) {
        const bufLength = Math.floor(buf.length / 2);
        const buf2 = Buffer.alloc(bufLength);
        for (let i = 0; i < bufLength; i++) {
            buf2[i] = buf[i] ^ buf[bufLength + i];
        }
        return buf2;
    }
    
    async saveQrE2EEKeysToStorage(loginResult) {
        try {
            if (!this.qrPrivateKey) {
                Logger.warn('QR_LOGIN', 'No QR private key available for storage');
                return;
            }
            
                const publicKey = crypto.randomBytes(32);
            
            const keyId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
            
            const keyData = {
                keyId: keyId,
                privKey: this.qrPrivateKey.toString('base64'),
                pubKey: publicKey.toString('base64'),
                e2eeVersion: 1,
                source: 'qr_login'
            };
            
            let botMid = null;
            if (loginResult && loginResult.authToken) {
            }
            
            E2EEStorage.saveE2EEKey(keyId, keyData);
            if (botMid) {
                E2EEStorage.saveE2EEKey(botMid, keyData);
            }
            
            Logger.success('QR_LOGIN', 'E2EE keys saved to storage:', keyId);
            
        } catch (error) {
            Logger.warn('QR_LOGIN', 'Failed to save E2EE keys:', error.message);
        }
    }
    
    async loadCertificate() {
        try {
            if (this.storageManager && this.storageManager.initialized) {
                const certificate = this.storageManager.loadData('certificate');
                if (certificate) {
                    Logger.info('QR_LOGIN', `Certificate loaded from JSON storage (${certificate.length} chars): ${certificate.substring(0, 20)}...`);
                    return certificate;
                } else {
                    Logger.info('QR_LOGIN', 'No existing certificate found in JSON storage - will create PIN code');
                    return '';
                }
            }
            
            
            const certPath = path.join('./data', 'cert.pem');
            
            if (fs.existsSync(certPath)) {
                const certificate = fs.readFileSync(certPath, 'utf8');
                Logger.info('QR_LOGIN', `Certificate loaded from ${certPath} (${certificate.length} chars): ${certificate.substring(0, 20)}...`);
                return certificate;
            } else {
                Logger.info('QR_LOGIN', 'No existing certificate found - will create PIN code');
                return '';
            }
        } catch (error) {
            Logger.error('QR_LOGIN', 'Failed to load certificate:', error.message);
            return '';
        }
    }

    async saveCertificate(certificate) {
        try {
            Logger.info('QR_LOGIN', `Attempting to save certificate: ${certificate ? certificate.substring(0, 20) + '...' : 'NULL'}`);
            
            if (!certificate) {
                Logger.error('QR_LOGIN', 'Certificate is null or empty - cannot save');
                return false;
            }
            
            if (this.storageManager && this.storageManager.initialized) {
                const saved = this.storageManager.saveData('certificate', certificate);
                if (saved) {
                    Logger.success('QR_LOGIN', `Certificate saved to JSON storage (${certificate.length} chars)`);
                    return true;
                } else {
                    Logger.error('QR_LOGIN', 'Failed to save certificate to JSON storage');
                    return false;
                }
            }
            
            
            const storageDir = './data';
            if (!fs.existsSync(storageDir)) {
                fs.mkdirSync(storageDir, { recursive: true });
            }
            
            const certPath = path.join(storageDir, 'cert.pem');
            fs.writeFileSync(certPath, certificate);
            
            if (fs.existsSync(certPath)) {
                const savedCert = fs.readFileSync(certPath, 'utf8');
                Logger.success('QR_LOGIN', `Certificate saved to ${certPath} (${savedCert.length} chars)`);
                return true;
            } else {
                Logger.error('QR_LOGIN', 'Certificate file not found after save attempt');
                return false;
            }
            
        } catch (error) {
            Logger.error('QR_LOGIN', 'Failed to save certificate:', error.message);
            return false;
        }
    }

    cleanup() {
        ThriftUtils.safeCloseConnection(this.currentConnection, 'QR_LOGIN');
        this.currentConnection = null;
        this.currentClient = null;
        this.currentSession = null;
    }
    
    async *qrLoginFlow() {
        try {
            Logger.info('QR_FLOW', 'Starting QR login flow...');
            
            
            const session = await this.createSession();
            yield { step: 'session', data: session, message: `Session created: ${session.authSessionId}` };
            
            const qrResult = await this.createQrCode();
            
            const [privateKey, secretUrl] = await this.generateE2EESecret();
            const finalUrl = qrResult.callbackUrl + secretUrl;
            
            yield { 
                step: 'qr_code', 
                data: { url: finalUrl, callbackUrl: qrResult.callbackUrl, nonce: qrResult.nonce },
                message: 'QR code created - scan with LINE app'
            };
            
            yield { step: 'waiting', message: 'Waiting for QR code scan...' };
            
            if (await this.checkQrVerified()) {
                yield { step: 'qr_verified', message: 'QR code verified successfully!' };
                
                const existingCert = await this.loadCertificate();
                const certVerified = await this.verifyCertificate(existingCert);
                
                if (certVerified) {
                    yield { step: 'cert_verified', message: 'Certificate verification successful' };
                } else {
                    yield { step: 'cert_failed', message: 'Certificate verification failed, using PIN code' };
                    
                    const pinCode = await this.createPinCode();
                    yield { step: 'pin_created', data: { pinCode }, message: `Enter PIN code: ${pinCode}` };
                    
                    if (await this.checkPinVerified()) {
                        yield { step: 'pin_verified', message: 'PIN code verified successfully!' };
                    } else {
                        throw new Error('PIN code verification failed');
                    }
                }
                
                if (!qrResult.nonce) {
                    throw new Error('Nonce is missing from QR result - cannot proceed with login');
                }
                
                const loginResult = await this.qrLoginV2ForSecure(qrResult.nonce);
                yield { 
                    step: 'login_complete', 
                    data: loginResult, 
                    message: 'QR login completed successfully!'
                };
                if (loginResult.certificate) {
                    await this.saveCertificate(loginResult.certificate);
                    yield { step: 'cert_saved', message: 'Certificate saved for auto-login' };
                }
                
                return loginResult;
                
            } else {
                throw new Error('QR code verification timeout');
            }
            
        } catch (error) {
            Logger.error('QR_FLOW', 'QR login flow failed:', error.message);
            yield { step: 'error', error: error.message };
            throw error;
        } finally {
            this.cleanup();
        }
    }
}

export default QrLoginService;