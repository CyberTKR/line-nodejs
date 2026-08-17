import { Logger, sleep, getOperationTypeName } from '../core/utils.js';
import { E2EEHandler } from '../e2ee/index.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const thrift = require('thrift');

export class SyncService {
    constructor(server, config) {
        this.server = server;
        this.config = config;
        this.syncState = { 
            talk: {
                revision: 0,
                globalRev: 0,
                individualRev: 0
            }
        };
        this.errorCount = 0;
        this.lastErrorTime = 0;
    }

    async sync(options = {}) {
        const { limit, revision, globalRev, individualRev } = {
            limit: 100,
            revision: 0,
            globalRev: 0,
            individualRev: 0,
            ...options
        };

        const safeRevision = revision || 0;
        const safeGlobalRev = globalRev || 0;
        const safeIndividualRev = individualRev || 0;

        const syncRequest = [
            [thrift.Thrift.Type.I64, 1, safeRevision],
            [thrift.Thrift.Type.I32, 2, limit],
            [thrift.Thrift.Type.I64, 3, safeGlobalRev],
            [thrift.Thrift.Type.I64, 4, safeIndividualRev]
        ];

        return this.server.syncRequest(syncRequest, {
            timeout: options.timeout || 180000
        });
    }

    async *listenEvents(options = {}, e2eeHandler = null) {
        const { signal, onError, pollingInterval } = {
            pollingInterval: 0,
            ...options
        };
        
        let consecutive410Errors = 0;
        let lastSuccessfulSync = Date.now();

        while (true) {
            try {
                const response = await this.sync({
                    ...this.syncState.talk,
                    limit: 100
                });
                this.errorCount = 0;
                consecutive410Errors = 0;
                lastSuccessfulSync = Date.now();


                if (response.fullSyncResponse) {
                    if (response.fullSyncResponse.nextRevision && 
                        typeof response.fullSyncResponse.nextRevision === 'number' &&
                        response.fullSyncResponse.nextRevision > 0) {
                        this.syncState.talk.revision = response.fullSyncResponse.nextRevision;
                    } else {
                    }
                    continue;
                }
                
                if (response.operationResponse) {
                    if (response.operationResponse.globalEvents?.lastRevision) {
                        this.syncState.talk.globalRev = response.operationResponse.globalEvents.lastRevision;
                    }
                    
                    if (response.operationResponse.individualEvents?.lastRevision) {
                        this.syncState.talk.individualRev = response.operationResponse.individualEvents.lastRevision;
                    }
                }

                if (response.operationResponse?.operations) {
                    for (const rawOp of response.operationResponse.operations) {
                        
                        const opType = rawOp[3] || 0;
                        const revision = rawOp[1] || 0;
                        if (revision > this.syncState.talk.revision) {
                            this.syncState.talk.revision = revision;
                        }
                        
                        if (opType === 72) {
                            Logger.warn('🔄 E2EE key registration detected - may affect future decryption');
                            if (e2eeHandler) {
                                Logger.debug('E2EE handler available - considering key sync');
                            }
                        }
                        
                        if ((opType === 25 || opType === 26) && rawOp[20]) {
                            
                            if (E2EEHandler.isEncrypted(rawOp[20])) {
                                const enableE2EE = this.config?.enableE2EE;
                                
                                if (enableE2EE === true && e2eeHandler) {
                                    try {
                                        const messageForDecrypt = {
                                            from: rawOp[20][1],
                                            to: rawOp[20][2],
                                            toType: rawOp[20][3],
                                            contentType: rawOp[20][15],
                                            contentMetadata: rawOp[20][18] || {},
                                            chunks: rawOp[20][20]
                                        };
                                        
                                        const decryptedText = await e2eeHandler.decryptMessage(messageForDecrypt);
                                        if (decryptedText) {
                                            rawOp[20].decryptedText = decryptedText;
                                            rawOp[20][10] = decryptedText;
                                            Logger.e2ee(`🔐 Decrypted: "${decryptedText}"`);
                                        } else {
                                            rawOp[20][10] = '[E2EE message - decryption failed]';
                                        }
                                    } catch (error) {
                                        Logger.error('E2EE decrypt error:', error.message);
                                        rawOp[20][10] = '[E2EE message - decryption error]';
                                    }
                                } else {
                                    rawOp[20][10] = '[E2EE message - decryption disabled]';
                                }
                            }
                        }
                        
                        yield rawOp;
                    }
                } else {
                    Logger.debug('No operations in response');
                }

            } catch (error) {
                this.errorCount++;
                this.lastErrorTime = Date.now();
                
                if (error.message && error.message.includes('HTTP 410')) {
                    consecutive410Errors++;
                    if (consecutive410Errors === 1) {
                        await sleep(Math.max(1000, pollingInterval * 3));
                    } else if (consecutive410Errors === 2) {
                        this.resetSyncState();
                        await sleep(Math.max(2000, pollingInterval * 5));
                    } else if (consecutive410Errors >= 3 && consecutive410Errors <= 4) {
                        await this._attemptFullSyncRecovery();
                        await sleep(Math.max(5000, pollingInterval * 10));
                    } else {
                        await sleep(Math.max(10000, pollingInterval * 30));
                        this.resetSyncState();
                        consecutive410Errors = 0;
                    }
                } else if (error.message && (error.message.includes('timeout') || error.message.includes('ECONNRESET'))) {
                    Logger.warn('Network error detected, backing off...');
                    await sleep(Math.max(1000, pollingInterval * 5));
                } else {
                    Logger.error('Error in sync polling:', error.message);
                    if (onError) {
                        onError(error);
                    }
                    await sleep(Math.max(1000, pollingInterval * 2));
                }
            }

            const timeSinceLastSuccess = Date.now() - lastSuccessfulSync;
            if (timeSinceLastSuccess > 300000) {
                Logger.warn('No successful sync for 5 minutes, resetting state');
                this.resetSyncState();
                consecutive410Errors = 0;
                lastSuccessfulSync = Date.now();
            }

            const backoffDelay = this._calculateBackoffDelay(pollingInterval, consecutive410Errors);
            if (backoffDelay > 0) await sleep(backoffDelay);
            
            if (signal?.aborted) {
                Logger.info('Sync polling aborted');
                break;
            }
        }
    }

    _calculateBackoffDelay(baseDelay, consecutive410Errors = 0) {
        if (this.errorCount === 0 && consecutive410Errors === 0) {
            return baseDelay;
        }
        
        if (consecutive410Errors > 0) {
            const maxBackoff = Math.max(1000, baseDelay * 20);
            const backoffDelay = Math.min(baseDelay * Math.pow(2, consecutive410Errors), maxBackoff);
            return backoffDelay;
        }
        
        const maxBackoff = Math.max(1000, baseDelay * 10);
        const backoffDelay = Math.min(baseDelay * Math.pow(2, this.errorCount), maxBackoff);
        
        Logger.debug(`Backoff delay: ${backoffDelay}ms (error count: ${this.errorCount})`);
        return backoffDelay;
    }

    async _attemptFullSyncRecovery() {
        try {
            Logger.info('Attempting full sync recovery...');
            
            const previousState = { ...this.syncState.talk };
            this.resetSyncState();
            
            const response = await this.sync({
                revision: 0,
                globalRev: 0,
                individualRev: 0,
                limit: 1 
            });
            
            if (response.fullSyncResponse && response.fullSyncResponse.nextRevision) {
                Logger.success('Full sync recovery successful');
                return true;
            } else if (response.operationResponse) {
                if (response.operationResponse.globalEvents?.lastRevision) {
                    this.syncState.talk.globalRev = response.operationResponse.globalEvents.lastRevision;
                }
                if (response.operationResponse.individualEvents?.lastRevision) {
                    this.syncState.talk.individualRev = response.operationResponse.individualEvents.lastRevision;
                }
                Logger.success('Partial sync recovery successful');
                return true;
            } else {
                Logger.warn('Full sync recovery failed, restoring previous state');
                this.syncState.talk = previousState;
                return false;
            }
        } catch (error) {
            Logger.error('Full sync recovery failed:', error.message);
            return false;
        }
    }

    getSyncState() {
        return { ...this.syncState.talk };
    }

    setSyncState(state) {
        this.syncState.talk = { ...this.syncState.talk, ...state };
        Logger.debug('Sync state updated:', this.syncState.talk);
    }

    resetSyncState() {
        this.syncState.talk = {
            revision: 0,
            globalRev: 0,
            individualRev: 0
        };
        this.errorCount = 0;
        Logger.info('Sync state reset');
    }

    getErrorStats() {
        return {
            errorCount: this.errorCount,
            lastErrorTime: this.lastErrorTime,
            timeSinceLastError: this.lastErrorTime ? Date.now() - this.lastErrorTime : null
        };
    }
}

export default SyncService;
