import { createRequire } from 'module';
import NetworkUtils from './NetworkUtils.js';
import { Logger } from '../services/utils.js';

const require = createRequire(import.meta.url);
const { Client: SecondaryQrCodeLoginServiceClient } = require('../services/modules/qr_thrift/SecondaryQrCodeLoginService.cjs');
const ttypes = require('../services/modules/qr_thrift/types.cjs');
const thrift = require('thrift');

export class ThriftUtils {
    /**
     * Initialize QR Thrift dependencies
     * @returns {Object} Thrift dependencies
     */
    static async initializeQrThrift() {
        try {
            return { SecondaryQrCodeLoginServiceClient, ttypes, thrift };
        } catch (error) {
            Logger.error('THRIFT_UTILS', 'Failed to initialize QR thrift:', error.message);
            throw error;
        }
    }

    /**
     * Create a QR thrift connection
     * @param {string} host - Target host
     * @param {string} path - Request path
     * @param {Object} config - Configuration object
     * @param {string} authSessionId - Optional auth session ID
     * @returns {Object} Thrift connection
     */
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

    /**
     * Create a Talk service connection
     * @param {Object} config - Configuration object
     * @param {number} timeout - Optional timeout
     * @returns {Object} Thrift connection
     */
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

    /**
     * Execute a thrift call with proper error handling and retries
     * @param {Function} clientMethod - The client method to call
     * @param {Array} args - Arguments for the method
     * @param {Object} options - Options including retries and delays
     * @returns {Promise} Result of the thrift call
     */
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
                // Logger.debug('THRIFT_UTILS', `${methodName} attempt ${attempt}/${maxRetries}`);
                
                const result = await new Promise((resolve, reject) => {
                    const callback = (err, response) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(response);
                        }
                    };
                    
                    clientMethod(...args, callback);
                });
                
                // Logger.success('THRIFT_UTILS', `${methodName} successful`);
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

    /**
     * Check if an error is retryable
     * @param {Error} error - The error to check
     * @returns {boolean} Whether the error is retryable
     */
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

    /**
     * Calculate retry delay with exponential backoff
     * @param {number} attempt - Current attempt number
     * @param {number} baseDelay - Base delay in milliseconds
     * @param {number} maxDelay - Maximum delay in milliseconds
     * @returns {number} Calculated delay
     */
    static calculateRetryDelay(attempt, baseDelay, maxDelay) {
        const delay = Math.min(
            baseDelay * Math.pow(2, attempt - 1),
            maxDelay
        );
        return delay + Math.random() * 1000; // Add jitter
    }

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} Promise that resolves after the delay
     */
    static async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Safely close a thrift connection
     * @param {Object} connection - Thrift connection to close
     * @param {string} context - Context for logging
     */
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