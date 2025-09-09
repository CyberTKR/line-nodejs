import { Logger } from '../utils.js';
import ThriftUtils from '../../utils/ThriftUtils.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export class TalkService {
    constructor(server, config) {
        this.server = server;
        this.config = config;
        this.retryConfig = {
            maxRetries: 1,
            baseDelay: 1000,
            maxDelay: 10000
        };
    }

    async _thriftCall(methodName, ...args) {
        const TalkService = require('./talk_thrift/TalkService.cjs');
        const connection = ThriftUtils.createTalkConnection(this.config);
        const client = require('thrift').createHttpClient(TalkService, connection);

        try {
            const result = await ThriftUtils.executeThriftCall(
                client[methodName].bind(client),
                args,
                { 
                    methodName, 
                    maxRetries: this.retryConfig.maxRetries,
                    baseDelay: this.retryConfig.baseDelay,
                    maxDelay: this.retryConfig.maxDelay
                }
            );
            
            ThriftUtils.safeCloseConnection(connection, 'TALK');
            return result;
            
        } catch (lastError) {
            ThriftUtils.safeCloseConnection(connection, 'TALK');
            
            if (methodName.includes('E2EE') && (lastError.name === 'TalkException' || lastError.message.includes('TalkException'))) {
                // Logger.debug(`E2EE operation ${methodName} not available - this is normal for some accounts`);
            } else {
                Logger.error(`${methodName} failed after ${this.retryConfig.maxRetries} attempts:`, lastError.message);
            }
            throw lastError;
        }
    }

    async sendMessage(message) {
        const isGroupMessage = message.toType === 2 || message.to.length === 33;
        const messageObj = {
            to: message.to || '',
            toType: message.toType || (isGroupMessage ? 2 : 0),
            text: message.text || ''
        };
        if (message.contentMetadata) {
            messageObj.contentMetadata = message.contentMetadata;
        }
        if (isGroupMessage) {
            messageObj.chunks = [];
        }
        try {
            return await this._thriftCall('sendMessage', 0, messageObj);
        } catch (error) {
            if (error.message.includes('TalkException') && isGroupMessage && messageObj.chunks) {
                delete messageObj.chunks;
                return await this._thriftCall('sendMessage', 0, messageObj);
            }
            throw error;
        }
    }

    async getProfile(mid = null) {
        return await this._thriftCall('getProfile', 0);
    }

    async getChats(chatIds, options = {}) {
        
        if (!Array.isArray(chatIds) || chatIds.length === 0) {
            throw new Error('chatIds must be a non-empty array');
        }

        const getChatsRequest = {
            chatMids: chatIds,
            withInvitees: options.withInvitees !== undefined ? options.withInvitees : true,
            withMembers: options.withMembers !== undefined ? options.withMembers : true
        };

        return await this._thriftCall('getChats', getChatsRequest);
    }

    async getAllChatMids(withMemberChats = true, withInvitedChats = true) {
        const request = {
            withMemberChats: withMemberChats,
            withInvitedChats: withInvitedChats
        };
        return await this._thriftCall('getAllChatMids', request, 0);
    }

    async deleteOtherFromChat(chatId,targetUserMids) {
        const request = {
            reqSeq: 0,
            chatMid: chatId,
            targetUserMids: targetUserMids
        };
        return await this._thriftCall('deleteOtherFromChat', request, 0);
    }

    async acceptChatInvitation(chatId) {
        const request = { 
            reqSeq: 0, 
            chatMid: chatId 
        };
        return await this._thriftCall('acceptChatInvitation', request);
    }

    async deleteSelfFromChat(chatId) {
        const request = {
            reqSeq: 0,
            chatMid: chatId
        };

        return await this._thriftCall('deleteSelfFromChat', request);
    }

    async negotiateE2EEPublicKey(params) {
        const { mid } = params;
        return await this._thriftCall('negotiateE2EEPublicKey', mid);
    }

    async getLastE2EEGroupSharedKey(options) {
        return await this._thriftCall('getLastE2EEGroupSharedKey', options.keyVersion, options.chatMid);
    }

    async registerE2EEPublicKey(reqSeq, publicKey) {
        return await this._thriftCall('registerE2EEPublicKey', reqSeq, publicKey);
    }

    async callMethod(methodName, args = [], options = {}) {

        try {
            const result = await this.server.talkRequest(methodName, args, options);
            return result;
        } catch (error) {
            Logger.error(`Talk method ${methodName} failed:`, error.message);
            throw error;
        }
    }
    setRetryConfig(config) {
        this.retryConfig = { ...this.retryConfig, ...config };
    }
}

export default TalkService;