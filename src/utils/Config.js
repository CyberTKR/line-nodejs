export class Config {
    static DEFAULT_ENDPOINT = 'legy.line-apps.com';
    
    static DEVICE_CONFIGS = {
        IOS: {
            userAgent: 'Line/13.3.0 iPhone OS/15.0',
            systemType: 'IOS\t13.3.0\tiOS\t17.0.1',
            qrSystemName: 'IOS',
            qrModelName: 'iOS'
        },
        IOSIPAD: {
            userAgent: 'Line/13.3.0 iPad OS/15.0',
            systemType: 'IOSIPAD\t13.3.0\tiOS\t17.0.1',
            qrSystemName: 'IOSIPAD',
            qrModelName: 'iPad'
        },
        DESKTOPWIN: {
            userAgent: 'DESKTOP:WINDOWS:10.0.0-NT-x64(9.8.0.3597)',
            systemType: 'DESKTOPWIN\t9.8.0.3597\tWINDOWS\t10.0.0-NT-x64',
            qrSystemName: 'DESKTOPWIN',
            qrModelName: 'WINDOWS'
        },
        DESKTOPMAC: {
            userAgent: 'DESKTOP:MAC:10.15.7(8.1.1.3145)',
            systemType: 'DESKTOPMAC\t8.1.1.3145\tMAC\t10.15.7',
            qrSystemName: 'DESKTOPMAC',
            qrModelName: 'MAC'
        },
        CHROMEOS: {
            userAgent: 'Line/8.7.0',
            systemType: 'CHROMEOS\t8.7.0\tChrome_OS\t1.0.0',
            qrSystemName: 'CHROMEOS',
            qrModelName: 'Chrome_OS'
        }
    };
    
    static ENDPOINTS = {
        SYNC: '/SYNC4',
        TALK: '/S4',
        AUTH: '/RS3',
        AUTH_V4: '/RS4',
        QR_LOGIN: '/acct/lgn/sq/v1',
        QR_LONG_POLLING: '/acct/lp/lgn/sq/v1'
    };
    
    static QR_HOSTS = {
        LOGIN: 'ga2.line.naver.jp',
        LONG_POLLING: 'gw.line.naver.jp'
    };
    
    static POLLING = {
        INTERVAL: 1000,
        MAX_RETRIES: 3,
        RETRY_DELAY: 5000
    };
    
    static TIMEOUTS = {
        REQUEST: 30000,
        CONNECT: 10000,
        QR_VERIFICATION: 180000,
        PIN_VERIFICATION: 180000
    };
    
    static QR_CONFIG = {
        DEFAULT_TIMEOUT: 180000,
        MAX_RETRIES: 1,
        BASE_DELAY: 1000,
        MAX_DELAY: 10000,
        CONNECTION_CLEANUP_DELAY: 1000
    };
    
    static DEFAULT_HEADERS = {
        'User-Agent': 'DESKTOP:WINDOWS:10.0.0-NT-x64(9.8.0.3597)',
        'X-Line-Application': 'DESKTOPWIN\t9.5.0\tWINDOWS\t10.0.0-NT-x64',
        'Content-Type': 'application/x-thrift; protocol=TCOMPACT',
        'x-lal': 'tr_TR',
        'x-lhm': 'POST',
        'accept-encoding': 'gzip'
    };
    
    static E2EE = {
        SPEC_VERSION_V1: 1,
        SPEC_VERSION_V2: 2,
        DEFAULT_CONTENT_TYPE: 0,
        AES_KEY_SIZE: 32,
        GCM_IV_SIZE: 12,
        GCM_TAG_SIZE: 16
    };
    
    static createClientConfig(options = {}) {
        const {
            authToken = null,
            device = 'IOS',
            endpoint = this.DEFAULT_ENDPOINT,
            pollingInterval = this.POLLING.INTERVAL,
            enableE2EE = true,
            language = 'en_EN'
        } = options;
        
        const deviceConfig = this.DEVICE_CONFIGS[device];
        if (!deviceConfig) {
            throw new Error(`Unsupported device: ${device}. Available: ${Object.keys(this.DEVICE_CONFIGS).join(', ')}`);
        }
        
        return {
            authToken,
            device,
            endpoint,
            userAgent: deviceConfig.userAgent,
            systemType: deviceConfig.systemType,
            qrSystemName: deviceConfig.qrSystemName,
            qrModelName: deviceConfig.qrModelName,
            pollingInterval,
            enableE2EE,
            language,
            timeouts: this.TIMEOUTS,
            qrConfig: this.QR_CONFIG
        };
    }
    
    /**
     * Get QR device mapping for specific device
     * @param {string} device - Device type
     * @returns {Object} QR device configuration
     */
    static getQrDeviceConfig(device) {
        const deviceConfig = this.DEVICE_CONFIGS[device];
        if (!deviceConfig) {
            throw new Error(`Unsupported device: ${device}`);
        }
        
        return {
            systemName: deviceConfig.qrSystemName,
            modelName: deviceConfig.qrModelName
        };
    }
}

export default Config;
