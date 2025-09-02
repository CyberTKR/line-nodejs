import { Logger, sleep, getOperationTypeName } from '../utils.js';
import { E2EEHandler } from '../e2ee.js';
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
            pollingInterval: 1000,
            ...options
        };

        // Logger.polling(`Starting sync polling with interval: ${pollingInterval}ms`);
        // Logger.startup('Starting real-time polling from revision:', this.syncState.talk.revision);
        
        let consecutive410Errors = 0;
        let lastSuccessfulSync = Date.now();

        while (true) {
            try {
                const response = await this.sync({
                    ...this.syncState.talk,
                    limit: 100
                });

                // Reset error counters on successful sync
                this.errorCount = 0;
                consecutive410Errors = 0;
                lastSuccessfulSync = Date.now();
                
                // Logger.debug(`Sync response: operations=${response.operationResponse?.operations?.length || 0}`);

                if (response.fullSyncResponse) {
                    if (response.fullSyncResponse.nextRevision && 
                        typeof response.fullSyncResponse.nextRevision === 'number' &&
                        response.fullSyncResponse.nextRevision > 0) {
                        this.syncState.talk.revision = response.fullSyncResponse.nextRevision;
                        // Logger.debug('Full sync response, updated revision to:', this.syncState.talk.revision);
                    } else {
                        // Logger.debug('Full sync response with invalid nextRevision');
                    }
                    continue;
                }
                
                if (response.operationResponse) {
                    if (response.operationResponse.globalEvents?.lastRevision) {
                        this.syncState.talk.globalRev = response.operationResponse.globalEvents.lastRevision;
                        // Logger.success('Updated globalRev to:', this.syncState.talk.globalRev);
                    }
                    
                    if (response.operationResponse.individualEvents?.lastRevision) {
                        this.syncState.talk.individualRev = response.operationResponse.individualEvents.lastRevision;
                        // Logger.success('Updated individualRev to:', this.syncState.talk.individualRev);
                    }
                }

                if (response.operationResponse?.operations) {
                    for (const rawOp of response.operationResponse.operations) {
                        
                        const opType = rawOp[3] || 0;
                        const revision = rawOp[1] || 0;
                        
                        // Logger.event(`Operation: ${getOperationTypeName(opType)} (${opType}) - Rev: ${revision}`);
                        
                        if (revision > this.syncState.talk.revision) {
                            this.syncState.talk.revision = revision;
                        }
                        
                        // Handle E2EE key registration operations
                        if (opType === 72) { // REGISTER_E2EE_PUBLICKEY
                            Logger.warn('🔄 E2EE key registration detected - may affect future decryption');
                            if (e2eeHandler) {
                                Logger.debug('E2EE handler available - considering key sync');
                            }
                        }
                        
                        if ((opType === 25 || opType === 26) && rawOp[20]) {
                            // Logger.message('Message operation detected');
                            
                            if (E2EEHandler.isEncrypted(rawOp[20])) {
                                const enableE2EE = this.config?.enableE2EE;
                                
                                if (enableE2EE === true && e2eeHandler) {
                                    // Logger.e2ee('🔓 E2EE enabled - attempting decryption...');
                                    try {
                                        const messageForDecrypt = {
                                            from: rawOp[20][1],
                                            to: rawOp[20][2],
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
                                    // E2EE disabled - show placeholder
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
                    // Logger.warn(`HTTP 410 Gone detected (${consecutive410Errors}/5) - attempting recovery...`);
                    
                    // Progressive recovery strategy
                    if (consecutive410Errors === 1) {
                        // First 410: Simple retry with longer delay
                        // Logger.warn('First 410 error, waiting before retry...');
                        await sleep(pollingInterval * 3);
                    } else if (consecutive410Errors === 2) {
                        // Second 410: Reset sync state and try full sync
                        // Logger.warn('Second 410 error, resetting sync state');
                        this.resetSyncState();
                        await sleep(pollingInterval * 5);
                    } else if (consecutive410Errors >= 3 && consecutive410Errors <= 4) {
                        // Multiple 410s: Wait longer, force full sync
                        // Logger.warn(`Multiple 410 errors (${consecutive410Errors}), forcing full sync recovery`);
                        await this._attemptFullSyncRecovery();
                        await sleep(pollingInterval * 10);
                    } else {
                        // Too many 410s: Circuit breaker pattern
                        // Logger.error('Too many consecutive 410 errors, entering recovery mode');
                        await sleep(pollingInterval * 30);
                        this.resetSyncState();
                        consecutive410Errors = 0; // Reset to allow retry
                    }
                } else if (error.message && (error.message.includes('timeout') || error.message.includes('ECONNRESET'))) {
                    Logger.warn('Network error detected, backing off...');
                    await sleep(pollingInterval * 5);
                } else {
                    Logger.error('Error in sync polling:', error.message);
                    if (onError) {
                        onError(error);
                    }
                    await sleep(pollingInterval * 2);
                }
            }

            // Health check: If no successful sync for too long, reset
            const timeSinceLastSuccess = Date.now() - lastSuccessfulSync;
            if (timeSinceLastSuccess > 300000) { // 5 minutes
                Logger.warn('No successful sync for 5 minutes, resetting state');
                this.resetSyncState();
                consecutive410Errors = 0;
                lastSuccessfulSync = Date.now();
            }

            const backoffDelay = this._calculateBackoffDelay(pollingInterval, consecutive410Errors);
            await sleep(backoffDelay);
            
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
        
        // Special handling for 410 errors
        if (consecutive410Errors > 0) {
            const maxBackoff = baseDelay * 20; // Higher max for 410 errors
            const backoffDelay = Math.min(baseDelay * Math.pow(2, consecutive410Errors), maxBackoff);
            // Logger.debug(`410 backoff delay: ${backoffDelay}ms (410 error count: ${consecutive410Errors})`);
            return backoffDelay;
        }
        
        const maxBackoff = baseDelay * 10;
        const backoffDelay = Math.min(baseDelay * Math.pow(2, this.errorCount), maxBackoff);
        
        Logger.debug(`Backoff delay: ${backoffDelay}ms (error count: ${this.errorCount})`);
        return backoffDelay;
    }

    async _attemptFullSyncRecovery() {
        try {
            Logger.info('Attempting full sync recovery...');
            
            // Force a full sync by resetting to 0
            const previousState = { ...this.syncState.talk };
            this.resetSyncState();
            
            // Try to get a fresh sync response
            const response = await this.sync({
                revision: 0,
                globalRev: 0,
                individualRev: 0,
                limit: 1 // Just get minimal response to reestablish connection
            });
            
            if (response.fullSyncResponse && response.fullSyncResponse.nextRevision) {
                Logger.success('Full sync recovery successful');
                return true;
            } else if (response.operationResponse) {
                // Update with any available revision info
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