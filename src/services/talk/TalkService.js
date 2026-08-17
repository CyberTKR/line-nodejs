import { Logger } from '../core/utils.js';
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
        
        this.TalkService = require('./generated/TalkService.cjs');
        this.thriftLib = require('thrift');
    }

    async _thriftCall(methodName, ...args) {
        const connection = ThriftUtils.createTalkConnection(this.config);
        const client = this.thriftLib.createHttpClient(this.TalkService, connection);

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
            } else {
                Logger.error(`${methodName} failed after ${this.retryConfig.maxRetries} attempts:`, lastError.message);
            }
            throw lastError;
        }
    }

    _thriftCallFireAndForget(methodName, ...args) {
        const connection = ThriftUtils.createTalkConnection(this.config);
        const client = this.thriftLib.createHttpClient(this.TalkService, connection);

        try {
            client[methodName](...args, (err, response) => {
                ThriftUtils.safeCloseConnection(connection, 'TALK');
            });
            
            return { sent: true };
            
        } catch (error) {
            ThriftUtils.safeCloseConnection(connection, 'TALK');
            throw error;
        }
    }

    async sendMessage(message) {
        const isGroupMessage = message.toType === 2 || message.to.length === 33;
        const messageObj = {
            to: message.to || '',
            toType: message.toType || (isGroupMessage ? 2 : 0),
            text: message.text || ''
        };
        if (message.from) messageObj.from = message.from;
        if (message.contentMetadata) {
            messageObj.contentMetadata = message.contentMetadata;
        }
        if (message.chunks) messageObj.chunks = message.chunks;
        try {
            return await this._thriftCall('sendMessage', this.server.getReqseq('message'), messageObj);
        } catch (error) {
            if (error.message.includes('TalkException') && isGroupMessage && messageObj.chunks?.length === 0) {
                delete messageObj.chunks;
                return await this._thriftCall('sendMessage', this.server.getReqseq('message'), messageObj);
            }
            throw error;
        }
    }

    async getProfile(mid = null) {
        return await this._thriftCall('getProfile', 0);
    }

    async getContact(mid) {
        return this._thriftCall('getContact', String(mid));
    }

    async getContacts(mids) {
        return this._thriftCall('getContacts', this._mids(mids));
    }

    async getContactsV2(mids, syncReason = 0) {
        return this._thriftCall('getContactsV2', { targetUserMids: this._mids(mids) }, syncReason);
    }

    async getAllContactIds() {
        return this._thriftCall('getAllContactIds');
    }

    async getBlockedContactIds() {
        return this._thriftCall('getBlockedContactIds');
    }

    async getBlockedRecommendationIds() {
        return this._thriftCall('getBlockedRecommendationIds');
    }

    async getRecommendationIds() {
        return this._thriftCall('getRecommendationIds');
    }

    async findAndAddContactsByMid(mid, type = 0, reference = '') {
        return this._thriftCall('findAndAddContactsByMid', this.server.getReqseq('contact'), String(mid), type, reference);
    }

    async findAndAddContactsByUserid(userId) {
        return this._thriftCall('findAndAddContactsByUserid', this.server.getReqseq('contact'), String(userId));
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

    async deleteOtherFromChat(chatId, targetUserMid) {
        const request = {
            reqSeq: this.server.getReqseq('chat'),
            chatMid: String(chatId),
            targetUserMids: this._mids(targetUserMid)
        };
        try {
            this._thriftCallFireAndForget('deleteOtherFromChat', request, 0);
            return { success: true, fireAndForget: true };
        } catch (error) {
            throw error;
        }
    }

    async cancelChatInvitation(chatId, targetUserMid) {
        const request = {
            reqSeq: this.server.getReqseq('chat'),
            chatMid: String(chatId),
            targetUserMids: this._mids(targetUserMid)
        };
        try {
            this._thriftCallFireAndForget('cancelChatInvitation', request, 0);
            return { success: true, fireAndForget: true };
        } catch (error) {
            throw error;
        }
    }

    async acceptChatInvitation(chatId) {
        const request = { 
            reqSeq: this.server.getReqseq('chat'),
            chatMid: chatId 
        };
        return await this._thriftCall('acceptChatInvitation', request);
    }

    async acceptChatInvitationByTicket(chatId, ticketId) {
        return this._thriftCall('acceptChatInvitationByTicket', {
            reqSeq: this.server.getReqseq('chat'),
            chatMid: String(chatId),
            ticketId: String(ticketId)
        });
    }

    async rejectChatInvitation(chatId) {
        return this._thriftCall('rejectChatInvitation', {
            reqSeq: this.server.getReqseq('chat'),
            chatMid: String(chatId)
        });
    }

    async inviteIntoChat(chatId, targetUserMids) {
        return this._thriftCall('inviteIntoChat', {
            reqSeq: this.server.getReqseq('chat'),
            chatMid: String(chatId),
            targetUserMids: this._mids(targetUserMids)
        });
    }

    async createChat(name, targetUserMids, options = {}) {
        return this._thriftCall('createChat', {
            reqSeq: this.server.getReqseq('chat'),
            type: options.type ?? 0,
            name: String(name),
            targetUserMids: this._mids(targetUserMids),
            picturePath: options.picturePath ?? null
        });
    }

    async updateChat(chat, options = {}) {
        return this._thriftCall('updateChat', {
            reqSeq: this.server.getReqseq('chat'),
            chat,
            updatedAttribute: options.updatedAttribute ?? 1
        });
    }

    async reissueChatTicket(chatId) {
        return this._thriftCall('reissueChatTicket', {
            reqSeq: this.server.getReqseq('chat'),
            chatMid: String(chatId)
        });
    }

    async findChatByTicket(ticketId) {
        return this._thriftCall('findChatByTicket', String(ticketId));
    }

    async deleteSelfFromChat(chatId) {
        const request = {
            reqSeq: this.server.getReqseq('chat'),
            chatMid: chatId
        };

        return await this._thriftCall('deleteSelfFromChat', request);
    }

    async negotiateE2EEPublicKey(params) {
        const { mid } = params;
        return await this._thriftCall('negotiateE2EEPublicKey', mid);
    }

    async getE2EEPublicKey(mid, keyVersion, keyId) {
        return this._thriftCall('getE2EEPublicKey', String(mid), Number(keyVersion), Number(keyId));
    }

    async getLastE2EEGroupSharedKey(options) {
        return await this._thriftCall('getLastE2EEGroupSharedKey', options.keyVersion, options.chatMid);
    }

    async registerE2EEPublicKey(reqSeq, publicKey) {
        return await this._thriftCall('registerE2EEPublicKey', reqSeq, publicKey);
    }

    async getLastOpRevision() {
        return this._thriftCall('getLastOpRevision');
    }

    async getPreviousMessages(request, syncReason = 0) {
        return this._thriftCall('getPreviousMessagesV2WithRequest', request, syncReason);
    }

    async getRecentMessages(messageBoxId, count = 50) {
        return this._thriftCall('getRecentMessagesV2', String(messageBoxId), Number(count));
    }

    async getMessageReadRange(chatId, syncReason = 0) {
        return this._thriftCall('getMessageReadRange', [String(chatId)], syncReason);
    }

    async sendChatChecked(chatId, messageId, sessionId = 0) {
        return this._thriftCall(
            'sendChatChecked',
            this.server.getReqseq('message'),
            String(chatId),
            String(messageId),
            sessionId
        );
    }

    async unsendMessage(messageId) {
        return this._thriftCall('unsendMessage', this.server.getReqseq('message'), String(messageId));
    }

    async react(messageId, reactionType = 2) {
        return this._thriftCall('react', {
            reqSeq: this.server.getReqseq('reaction'),
            messageId: String(messageId),
            reactionType
        });
    }

    async generateUserTicket(expirationTime = 0, maxUseCount = 1) {
        return this._thriftCall('generateUserTicket', expirationTime, maxUseCount);
    }

    async getSettings() {
        return this._thriftCall('getSettings');
    }

    async getConfigurations(revision = 0, region = this.config.language || 'en_EN', syncReason = 0) {
        return this._thriftCall('getConfigurations', revision, null, null, region, null, syncReason);
    }

    async getFollowers(request = {}) {
        return this._thriftCall('getFollowers', request);
    }

    async getFollowings(request = {}) {
        return this._thriftCall('getFollowings', request);
    }

    async follow(request = {}) {
        return this._thriftCall('follow', request);
    }

    async unfollow(request = {}) {
        return this._thriftCall('unfollow', request);
    }

    async requestResendMessage(request = {}) {
        return this._thriftCall('requestResendMessage', request);
    }

    async determineMediaMessageFlow(request = {}) {
        return this._thriftCall('determineMediaMessageFlow', request);
    }

    async updateNotificationToken(token, type = 0) {
        return this._thriftCall('updateNotificationToken', type, String(token));
    }

    async wakeUpLongPolling(clientRevision = 0) {
        return this._thriftCall('wakeUpLongPolling', clientRevision);
    }

    _mids(value) {
        const values = Array.isArray(value) ? value : [value];
        const result = values.filter(Boolean).map(String);
        if (result.length === 0) throw new TypeError('At least one MID is required');
        return result;
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
