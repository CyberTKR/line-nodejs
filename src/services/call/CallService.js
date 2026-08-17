import { RpcService } from '../core/RpcService.js';
import { field, Type } from '../core/fields.js';

export class CallService extends RpcService {
    constructor(server) {
        super(server, '/V4', { timeout: 60000 });
        this.requestId = 0;
    }

    acquireCallRoute(to, callType = 1, environment = {}) {
        return this.call('acquireCallRoute', [
            field.string(2, to),
            field.i32(3, callType),
            field.map(4, Type.STRING, Type.STRING, environment)
        ]);
    }

    acquireGroupCallRoute(chatMid, options = {}) {
        return this.call('acquireGroupCallRoute', [
            field.string(2, chatMid),
            field.i32(3, options.mediaType ?? 1),
            field.bool(4, options.initialHost ?? true),
            field.list(5, Type.STRING, options.capabilities || [])
        ]);
    }

    getGroupCall(chatMid) {
        return this.call('getGroupCall', [field.string(2, chatMid)]);
    }

    getMediaCall(chatMid) {
        return this.call('getMediaCall', [field.struct(2, [field.string(1, chatMid)])]);
    }

    inviteIntoGroupCall(chatMid, memberMids, mediaType = 1) {
        return this.call('inviteIntoGroupCall', [
            field.string(2, chatMid),
            field.list(3, Type.STRING, memberMids),
            field.i32(4, mediaType)
        ]);
    }

    getGroupCallUrls() {
        return this.call('getGroupCallUrls', [field.struct(2)]);
    }

    createGroupCallUrl(title) {
        return this.call('createGroupCallUrl', [field.struct(2, [field.string(1, title)])]);
    }

    deleteGroupCallUrl(urlId) {
        return this.call('deleteGroupCallUrl', [field.struct(2, [field.string(1, urlId)])]);
    }

    updateGroupCallUrl(urlId, title) {
        return this.call('updateGroupCallUrl', [field.struct(2, [
            field.string(1, urlId),
            field.struct(2, [field.string(1, title)])
        ])]);
    }

    getGroupCallUrlInfo(urlId) {
        return this.call('getGroupCallUrlInfo', [field.struct(2, [field.string(1, urlId)])]);
    }

    joinChatByCallUrl(urlId) {
        this.requestId += 1;
        return this.call('joinChatByCallUrl', [field.struct(2, [
            field.string(1, urlId),
            field.i32(2, this.requestId)
        ])]);
    }

    kickoutFromGroupCall(chatMid, targetMids) {
        return this.call('kickoutFromGroupCall', [field.struct(2, [
            field.string(1, chatMid),
            field.list(2, Type.STRING, targetMids)
        ])]);
    }
}

export default CallService;
