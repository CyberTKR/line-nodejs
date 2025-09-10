import { EventEmitter } from 'events';
import { Logger } from './utils.js';
import Config from '../utils/Config.js';
import { createLineServer } from './server.js';
import { SyncService } from './modules/sync.js';
import { TalkService } from './modules/talk.js';
import { QrLoginService } from './modules/qr_login.js';
import { E2EEHandler } from './e2ee.js';

export class Polling {
    constructor(client) {
        this.client = client;
        this.syncService = client.syncService;
        this.e2eeHandler = new E2EEHandler(this.client);
    }
    async *listenEvents(options = {}) {
        
        for await (const event of this.syncService.listenEvents(options, this.e2eeHandler)) {
            yield event;
        }
    }

}
export class BaseClient extends EventEmitter {
    constructor(config, storageManager = null) {
        super();
        
        if (typeof config === 'string' || !config) {
            const authToken = typeof config === 'string' ? config : null;
            const device = arguments[1] || 'IOS';
            
            const deviceConfig = Config.DEVICE_CONFIGS[device];
            if (!deviceConfig) {
                throw new Error(`Unsupported device type: ${device}. Available: ${Object.keys(Config.DEVICE_CONFIGS).join(', ')}`);
            }
            config = {
                endpoint: Config.DEFAULT_ENDPOINT,
                userAgent: deviceConfig.userAgent,
                systemType: deviceConfig.systemType,
                device: device,
                pollingInterval: Config.POLLING.INTERVAL,
                authToken: authToken || null
            };
        }
        
        this.config = config;
        this.selfMid = null;
        this.profile = null;
        
        this.server = createLineServer(config);
        
        this.syncService = new SyncService(this.server, config);
        this.talkService = new TalkService(this.server, config);
        this.qrService = new QrLoginService(this.server, config, storageManager);
    }
    async initializeProfile() {
        try {
            Logger.startup('🔄 Initializing bot profile...');
            this.profile = await this.talkService.getProfile();
            this.selfMid = this.profile.mid;
            return this.profile;
        } catch (error) {
            Logger.error('❌ Profile initialization failed:', error.message);
            return null;
        }
    }
    createPolling() {
        return new Polling(this);
    }
    get authToken() {
        return this.config.authToken;
    }
    set authToken(token) {
        this.config.authToken = token;
        this.server.setAuthToken(token);
    }
    async *qrLoginFlow() {
        try {
            Logger.info('QR_FLOW', 'Delegating to QrLoginService...');
            
            // Mark as QR login
            this.isQrLogin = true;
            
            for await (const step of this.qrService.qrLoginFlow()) {
                if (step.step === 'qr_code' && this.qrService.qrPrivateKey) {
                    this.qrPrivateKey = this.qrService.qrPrivateKey;
                }
                
                yield step;
            }
            
        } catch (error) {
            Logger.error('QR_FLOW', 'QR login flow failed:', error.message);
            yield { step: 'error', error: error.message };
            throw error;
        }
    }

    async loadCertificate() {
        return await this.qrService.loadCertificate();
    }

    async saveCertificate(certificate) {
        return await this.qrService.saveCertificate(certificate);
    }


}

export default BaseClient;