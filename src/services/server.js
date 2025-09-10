import { Logger } from './utils.js';
import Config from '../utils/Config.js';
import { ThriftHandler, thrift } from './thrift.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const https = require('https');

export class LineServer {
    constructor(config) {
        this.config = config;
        this.headers = this.createDefaultHeaders();
        this.reqseqs = {}; // Sequence ID tracking
        Logger.startup('LineServer created');
    }

    createDefaultHeaders() {
        return {
            'Host': this.config.endpoint,
            'accept': 'application/x-thrift',
            'user-agent': this.config.userAgent,
            'x-line-application': this.config.systemType,
            'content-type': 'application/x-thrift',
            'x-lal': this.config.language || 'en_EN',
            'x-lpv': '1',
            'x-lhm': 'POST',
            'accept-encoding': 'gzip',
            'x-line-access': this.config.authToken
        };
    }

    async request(path, data, options = {}) {
        const {
            ttype = 4,
            encType = null,
            headers = null,
            access_token = null,
            expectedRespCode = [200],
            timeout = 180000,
            methodName = 'request'
        } = options;

        const requestHeaders = {
            ...this.headers,
            ...(headers || {})
        };

        if (access_token) {
            requestHeaders['x-line-access'] = access_token;
        }

        let finalPath = path;
        
        requestHeaders["content-type"] = "application/x-thrift";

        requestHeaders["x-lal"] = this.config.language || 'en_EN';

        let requestData;
        if (Buffer.isBuffer(data)) {
            requestData = data;
        } else if (Array.isArray(data)) {
            requestData = ThriftHandler.serialize(data, methodName);
        } else if (typeof data === 'object') {
            requestData = Buffer.from(JSON.stringify(data));
        } else {
            throw new Error('Invalid data type');
        }

        const url = `https://${this.config.endpoint}${finalPath}`;
        
        return new Promise((resolve, reject) => {
            
            const req = https.request(url, {
                method: 'POST',
                headers: requestHeaders,
                timeout
            }, (res) => {
                let responseData = Buffer.alloc(0);

                res.on('data', (chunk) => {
                    responseData = Buffer.concat([responseData, chunk]);
                });

                res.on('end', () => {
                    if (!expectedRespCode.includes(res.statusCode)) {
                        const error = new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`);
                        reject(error);
                        return;
                    }

                    if (res.headers['x-lc'] && res.headers['x-lc'] !== '200') {
                        const errorCode = res.headers['x-lc'];
                        const errorReason = res.headers['x-lcr'] || 'Unknown error';
                        const error = new Error(`LINE Error ${errorCode}: ${errorReason}`);
                        Logger.error('LINE API error:', error.message);
                        reject(error);
                        return;
                    }

                    try {
                        let parsedResponse;
                        
                        if (res.headers['content-type']?.includes('application/x-thrift')) {
                            parsedResponse = ThriftHandler.deserialize(responseData);
                            if (!parsedResponse) {
                                throw new Error('Failed to parse thrift response');
                            }
                            if (methodName === 'negotiateE2EEPublicKey') {
                                Logger.debug('Raw thrift response for negotiateE2EEPublicKey:', parsedResponse);
                                Logger.debug('Parsed data keys:', Object.keys(parsedResponse.data || {}));
                            }
                            
                            resolve(parsedResponse.data);
                        } else {
                            const textResponse = responseData.toString();
                            try {
                                parsedResponse = JSON.parse(textResponse);
                                resolve(parsedResponse);
                            } catch {
                                resolve(textResponse);
                            }
                        }
                        
                    } catch (parseError) {
                        Logger.error('Response parse error:', parseError.message);
                        reject(parseError);
                    }
                });
            });

            req.on('error', (error) => {
                Logger.error('Request error:', error.message);
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.write(requestData);
            req.end();
        });
    }

    async callThriftAPI(path, methodName, args = [], options = {}) {
        return this.request(path, args, {
            methodName,
            ttype: 4,
            ...options
        });
    }

    async syncRequest(syncRequest, options = {}) {
        const syncArgs = [
            [thrift.Thrift.Type.STRUCT, 1, syncRequest]
        ];

        return this.callThriftAPI('/SYNC4', 'sync', syncArgs, {
            timeout: options.timeout || 180000,
            ...options
        });
    }

    async talkRequest(methodName, args = [], options = {}) {
        return this.callThriftAPI('/S4', methodName, args, options);
    }

    setAuthToken(token) {
        this.config.authToken = token;
        this.headers['x-line-access'] = token;
        Logger.success('Auth token updated');
    }

    updateHeaders(newHeaders) {
        this.headers = { ...this.headers, ...newHeaders };
        Logger.debug('Headers updated');
    }

    getReqseq(name = 'talk') {
        if (!this.reqseqs[name]) {
            this.reqseqs[name] = 0;
        }
        const seq = this.reqseqs[name];
        this.reqseqs[name]++;
        Logger.debug(`Generated sequence ID for ${name}: ${seq}`);
        return seq;
    }
}

export function createLineServer(config) {
    return new LineServer(config);
}

export default LineServer;