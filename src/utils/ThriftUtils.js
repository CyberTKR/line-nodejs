import { createRequire } from 'module';
import NetworkUtils from './NetworkUtils.js';
import { Logger } from '../services/core/utils.js';

const require = createRequire(import.meta.url);
const { Client: SecondaryQrCodeLoginServiceClient } = require('../services/auth/generated/SecondaryQrCodeLoginService.cjs');
const ttypes = require('../services/auth/generated/types.cjs');
const thrift = require('thrift');

export class ThriftUtils {
    static async initializeQrThrift() {
        try {
            return { SecondaryQrCodeLoginServiceClient, ttypes, thrift };
        } catch (error) {
            Logger.error('THRIFT_UTILS', 'Failed to initialize QR thrift:', error.message);
            throw error;
        }
    }

    static async createQrConnection(host, path, config, authSessionId = null) {
        const { thrift } = await this.initializeQrThrift();
        
        return thrift.createHttpConnection(host, 443, {
            transport: thrift.THttpTransport,
            protocol: thrift.TCompactProtocol,
            path: path,
            headers: NetworkUtils.createQrHeaders(config, authSessionId),
            https: true
        });
    }

    static createTalkConnection(config, timeout = null) {
        
        const connectionOptions = {
            transport: thrift.TBufferedTransport,
            protocol: thrift.TCompactProtocol,
            path: '/S4',
            https: true,
            headers: NetworkUtils.createTalkHeaders(config)
        };

        if (timeout) {
            connectionOptions.timeout = timeout;
        }

        return thrift.createHttpConnection(config.endpoint, 443, connectionOptions);
    }

    static async executeThriftCall(clientMethod, args = [], options = {}) {
        const { 
            maxRetries = 1, 
            baseDelay = 1000, 
            maxDelay = 10000,
            methodName = 'thriftCall'
        } = options;

        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await new Promise((resolve, reject) => {
                    const callback = (err, response) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(response);
                        }
                    };
                    
                    try {
                        clientMethod(...args, callback);
                    } catch (callError) {
                        reject(callError);
                    }
                });
                
                return result;
                
            } catch (error) {
                lastError = error;
                
                if (this.isRetryableError(error) && attempt < maxRetries) {
                    const delay = this.calculateRetryDelay(attempt, baseDelay, maxDelay);
                    Logger.warn('THRIFT_UTILS', `${methodName} failed, retrying in ${delay}ms...`);
                    await this.sleep(delay);
                    continue;
                }
                
                break;
            }
        }
        
        Logger.error('THRIFT_UTILS', `${methodName} failed after ${maxRetries} attempts:`, lastError.message);
        throw lastError;
    }

    static isRetryableError(error) {
        const retryablePatterns = [
            'HTTP 410',
            'HTTP 5',
            'timeout',
            'ECONNRESET',
            'ECONNREFUSED',
            'ETIMEDOUT',
            'TalkException'
        ];
        
        return retryablePatterns.some(pattern => 
            error.message && error.message.includes(pattern)
        );
    }

    static calculateRetryDelay(attempt, baseDelay, maxDelay) {
        const delay = Math.min(
            baseDelay * Math.pow(2, attempt - 1),
            maxDelay
        );
        return delay + Math.random() * 1000;
    }

    static async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static safeCloseConnection(connection, context = 'CONNECTION') {
        try {
            if (connection && typeof connection.end === 'function') {
                connection.end();
                Logger.debug('THRIFT_UTILS', `${context} connection closed successfully`);
            }
        } catch (error) {
            Logger.debug('THRIFT_UTILS', `${context} connection cleanup error:`, error.message);
        }
    }
}

export default ThriftUtils;
