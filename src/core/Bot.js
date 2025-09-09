import { EventEmitter } from 'events';
import crypto from 'crypto';
import { createRequire } from 'module';
import Logger from '../utils/Logger.js';
import Config from '../utils/Config.js';
import StorageManager from '../storage/StorageManager.js';
import { BaseClient } from '../services/client.js';
import { E2EEHandler, E2EEStorage } from '../services/e2ee.js';
import QrCodeGenerator from '../utils/QrCodeGenerator.js';

const require = createRequire(import.meta.url);
const { generateKeyPair } = require('curve25519-js/lib/index.js');

export class Bot extends EventEmitter {
    constructor(options = {}) {
        super();
        
        if (typeof options === 'string') {
            options = { token: options };
        }
        
        const {
            token = null,
            device = null,
            storage = null,
            enableE2EE = true,
            language = 'en_EN'
        } = options;
        this.hasToken = !!token;
        this.config = Config.createClientConfig({
            authToken: token,
            device,
            enableE2EE,
            language
        });

        this.storage = new StorageManager(storage);
        this.client = new BaseClient(this.config, this.storage);
        this.profile = null;
        this.started = false;
        this.enableE2EE = enableE2EE;
        this.e2eeHandler = null;
        this.botData = {};
        this.processedMessages = new Set();
        this.qrGenerator = new QrCodeGenerator();
    }

    async start() {
        if (this.hasToken) {
            return await this.tokenLogin();
        } else {
            return await this.qrLogin();
        }
    }

    async tokenLogin() {
        if (this.started) {
            Logger.warn('STARTUP', 'Bot already started');
            return this.profile;
        }
        try {
            Logger.startup('Starting bot...');
            this.profile = await this.client.initializeProfile();
            Logger.success('STARTUP', `Bot profile loaded: ${this.profile.displayName} (${this.profile.mid})`);
            await this._initializeBotSystems();
            this.emit('ready', this.profile);
            return this.profile;

        } catch (error) {
            Logger.error('STARTUP', 'Bot start failed:', error.message);
            throw error;
        }
    }

    async qrLogin() {
        if (this.started) {
            Logger.warn('QR_STARTUP', 'Bot already started');
            return this.profile;
        }

        try {
            Logger.startup('🔐 Starting bot with QR login...');

            const qrFlow = this.client.qrLoginFlow();
            let loginResult = null;

            for await (const step of qrFlow) {
                QrCodeGenerator.formatProgress(step.step, step.message, step.data);
                
                if (step.step === 'qr_code') {
                    await this.qrGenerator.generateConsoleQR(step.data.url);
                    // Also save QR code as image file with sequential numbering
                    const fs = await import('fs');
                    const path = await import('path');
                    
                    const qrDir = './.images/qr/';
                    if (!fs.existsSync(qrDir)) {
                        fs.mkdirSync(qrDir, { recursive: true });
                    }
                    
                    // Find next available number
                    let counter = 1;
                    let filename;
                    do {
                        filename = `qrcode_${counter}.png`;
                        counter++;
                    } while (fs.existsSync(path.join(qrDir, filename)));
                    
                    await this.qrGenerator.generateImageQR(step.data.url, path.join(qrDir, filename));
                }
                
                if (step.step === 'login_complete') {
                    loginResult = step.data;
                }
                
                this.emit('qrStep', step);
            }

            if (!loginResult) {
                throw new Error('QR login failed - no result received');
            }

            let authToken = null;
            if (loginResult.tokenV3IssueResult) {
                authToken = loginResult.tokenV3IssueResult.accessToken;
            }

            if (!authToken) {
                throw new Error('No auth token received from QR login');
            }

            this.config.authToken = authToken;
            this.client.config.authToken = authToken;
            this.client.server.headers['x-line-access'] = authToken;

            Logger.success('QR_LOGIN', `Auth token obtained: ${authToken.substring(0, 20)}...`);

            this.profile = await this.client.initializeProfile();
            Logger.success('QR_STARTUP', `Bot profile loaded: ${this.profile.displayName} (${this.profile.mid})`);

            await this._initializeBotSystems();
            this.emit('ready', this.profile);
            return this.profile;

        } catch (error) {
            Logger.error('QR_STARTUP', 'QR login startup failed:', error.message);
            this.emit('qrError', error);
            throw error;
        }
    }

    async _initializeBotSystems() {
        this.storage.initialize(this.profile.mid, this.profile);
        
        // Check if this was QR login (new token from QR) or existing token
        const isQrLogin = this.client.isQrLogin || false;
        
        if (isQrLogin) {
            const cleared = this.storage.clearData();
            if (cleared) {
                Logger.info('BOT_INIT', 'QR login detected - cleared storage for fresh start');
            }
        } else if (this.config.authToken) {
            Logger.info('BOT_INIT', 'Token login - preserving existing storage');
        } else {
            Logger.info('BOT_INIT', 'No authentication method detected');
        }
        
        this.botData = this.storage.loadData() || {};
        if (this.enableE2EE) {
            Logger.info('E2EE enabled - setting up encryption handler...');
            E2EEStorage.initializeWithStorageManager(this.storage);
            this.e2eeHandler = new E2EEHandler(this.client);
            await this._setupE2EE();
        } else {
            this.e2eeHandler = null;
        }

        this._setupEventHandlers();
        this._startPolling();

        this.started = true;
        this.startTime = Date.now();
        Logger.success('STARTUP', 'Bot started successfully!');
    }

    async stop() {
        if (!this.started) {
            Logger.warn('STARTUP', 'Bot not started');
            return;
        }

        try {
            Logger.info('STARTUP', 'Stopping bot...');

            this.started = false;
            this.startTime = null;
            Logger.success('STARTUP', 'Bot stopped successfully');

            this.emit('stopped');

        } catch (error) {
            Logger.error('STARTUP', 'Bot stop failed:', error.message);
            throw error;
        }
    }
    async send(to, text, options = {}) {
        try {
            return await this.client.sendMessage(to, text, options);
        } catch (error) {
            Logger.error('MESSAGE', 'Send message failed:', error.message);
            throw error;
        }
    }

    async acceptInvitation(groupId) {
        try {
            return await this.client.acceptChatInvitation(groupId);
        } catch (error) {
            Logger.error('INVITE', 'Accept invitation failed:', error.message);
            throw error;
        }
    }

    async deleteSelfFromChat(chatId) {
        try {
            Logger.info('BOT', `Leaving chat: ${chatId}`);
            return await this.client.deleteSelfFromChat(chatId);
        } catch (error) {
            Logger.error('BOT', 'Delete self from chat failed:', error.message);
            throw error;
        }
    }

    async getProfile() {
        if (this.profile) {
            return this.profile;
        }
        
        try {
            this.profile = await this.client.getProfile();
            return this.profile;
        } catch (error) {
            Logger.error('PROFILE', 'Get profile failed:', error.message);
            throw error;
        }
    }

    async getChats(chatIds) {
        try {
            // If single string is passed, convert to array
            const chatIdArray = Array.isArray(chatIds) ? chatIds : [chatIds];
            return await this.client.talkService.getChats(chatIdArray);
        } catch (error) {
            Logger.error('GET_CHATS', 'Get chats failed:', error.message);
            throw error;
        }
    }

    async getAllChatMids(withMemberChats = true, withInvitedChats = true) {
        try {
            return await this.client.talkService.getAllChatMids(withMemberChats, withInvitedChats);
        } catch (error) {
            Logger.error('GET_ALL_CHAT_MIDS', 'Get all chat mids failed:', error.message);
            throw error;
        }
    }

    async deleteOtherFromChat(chatId,targetUserMids) {
        try {
            return await this.client.deleteOtherFromChat(chatId,targetUserMids);
        } catch (error) {
            Logger.error('DELETE_OTHER_FROM_CHAT', 'Delete other from chat failed:', error.message);
            throw error;
        }
    }




    onReady(handler) {
        this.on('ready', handler);
    }

    onText(handler) {
        this.textHandler = handler;
    }

    onMessage(handler) {
        this.messageHandler = handler;
    }

    onImage(handler) {
        this.imageHandler = handler;
    }

    onVideo(handler) {
        this.videoHandler = handler;
    }

    onInvite(handler) {
        this.inviteHandler = handler;
    }

    onRead(handler) {
        this.readHandler = handler;
    }

    onJoin(handler) {
        this.joinHandler = handler;
    }

    onLeave(handler) {
        this.leaveHandler = handler;
    }

    onError(handler) {
        this.errorHandler = handler;
        this.on('error', handler);
    }


    async _setupE2EE() {
        try {
            const keyData = E2EEStorage.getE2EEKey(this.profile.mid);
            if (keyData && keyData.privKey && keyData.pubKey) {
                Logger.success('E2EE', `Using existing E2EE key: ${keyData.keyId}`);
            } else {
                Logger.info('E2EE', 'No E2EE keys found, will generate on-demand when needed');
            }
        } catch (error) {
            Logger.warn('E2EE', 'E2EE setup failed:', error.message);
        }
    }

    async _generateBasicKeys() {
        try {
            
            const existingKey = E2EEStorage.getE2EEKey(this.profile.mid);
            if (existingKey) {
                return;
            }
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
            
            const registerResult = await this.client.talkService._thriftCall('registerE2EEPublicKey', 0, e2eePublicKey);
            
            if (registerResult && registerResult.keyId) {
                const keyData = {
                    keyId: registerResult.keyId,
                    privKey: privKey.toString('base64'),
                    pubKey: pubKey.toString('base64'),
                    e2eeVersion: 1
                };
                
                E2EEStorage.saveE2EEKey(this.profile.mid, keyData);
                E2EEStorage.saveE2EEKey(registerResult.keyId, keyData);
                
                
                const savedKey = E2EEStorage.getE2EEKey(this.profile.mid);
                if (savedKey) {
                    Logger.success('E2EE key verified in storage');
                } else {
                    Logger.warn('E2EE key not found in storage after save');
                }
            } else {
                Logger.error('Failed to register E2EE key with server');
            }
            
            
        } catch (error) {
            Logger.error('E2EE key registration failed:', error.message);
            Logger.warn('E2EE will not be available until key registration succeeds');
        }
    }
    _setupEventHandlers() {
        this.on('error', (error) => {
            if (this.errorHandler) {
                this.errorHandler(error);
            } else {
                Logger.error('BOT', 'Uncaught error:', error.message);
            }
        });
    }
    async _startPolling() {
        await this._startMainThreadPolling();
    }


    async _startMainThreadPolling() {
        const polling = this.client.createPolling();
        
        for await (const op of polling.listenEvents({ pollingInterval: this.config.pollingInterval })) {
            try {
                await this._handleRawOperation(op);
            } catch (error) {
                Logger.error('POLLING', 'Operation error:', error.message);
                this.emit('error', error);
            }
        }
    }

    async _handleRawOperation(op) {
        if (op[3] === 25 || op[3] === 26) {
            const msg = op[20];
            if (!msg) {
                Logger.debug('BOT', `OP.TYPE ${op[3]} without message data (probably system notification)`);
                return;
            }

            const messageData = {
                type: op[3] === 25 ? 'send' : 'receive',
                raw: op,
                from: msg[1],
                to: msg[2],
                id: msg[4],
                text: msg[10],
                contentType: msg[15],
                createdTime: op[1],
                encrypted: false
            };

            if (this.messageHandler) {
                await this.messageHandler(messageData);
            }

            if (messageData.contentType === 0 && this.textHandler) {
                if (messageData.text && typeof messageData.text === 'string' && messageData.text.trim().length > 0) {
                    await this.textHandler(messageData);
                } else {
                    Logger.debug('BOT', 'Skipping empty/invalid text message:', {
                        from: messageData.from,
                        to: messageData.to,
                        contentType: messageData.contentType,
                        textType: typeof messageData.text,
                        textLength: messageData.text?.length || 0
                    });
                }
            }

            if (messageData.contentType === 1 && this.imageHandler) {
                await this.imageHandler(messageData);
            }

            if (messageData.contentType === 2 && this.videoHandler) {
                await this.videoHandler(messageData);
            }
        }

        else if (op[3] === 124) {
            const inviteData = {
                type: 'invite',
                groupId: op[10],
                inviter: op[11],
                invited: op[12],
                createdTime: op[1],
                revision: op[1],
                raw: op
            };
            
            if (this.inviteHandler) {
                await this.inviteHandler(inviteData);
            }
        }
        
        else if (op[3] === 126) {
            Logger.debug('BOT', 'Chat invitation cancelled:', { groupId: op[10], userId: op[11] });
        }
        
        else if (op[3] === 130) {
            Logger.debug('BOT', 'Chat invitation accepted:', { groupId: op[10], userId: op[11] });
        }
        
        else if (op[3] === 60) {
            const joinData = {
                type: 'join',
                groupId: op[10],
                userId: op[11],
                createdTime: op[1],
                raw: op
            };
            
            Logger.debug('BOT', 'User joined chat:', { groupId: joinData.groupId, userId: joinData.userId });
            
            if (this.joinHandler) {
                await this.joinHandler(joinData);
            }
        }
    }
}

export default Bot;
