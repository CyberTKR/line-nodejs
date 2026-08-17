import { RpcService } from '../core/RpcService.js';
import { field, Type } from '../core/fields.js';

export class SquareService extends RpcService {
    constructor(server) {
        super(server, '/SQ1');
        this.requestSequence = 0;
    }

    getJoinedSquares(continuationToken = null, limit = 50) {
        return this.call('getJoinedSquares', [
            continuationToken ? field.string(2, continuationToken) : null,
            field.i32(3, limit)
        ].filter(Boolean));
    }

    getSquare(squareMid) {
        return this.call('getSquare', [field.string(2, squareMid)]);
    }

    getSquareChat(squareChatMid) {
        return this.call('getSquareChat', [field.string(1, squareChatMid)]);
    }

    getJoinedSquareChats(continuationToken = null, limit = 50) {
        return this.call('getJoinedSquareChats', [
            continuationToken ? field.string(2, continuationToken) : null,
            field.i32(3, limit)
        ].filter(Boolean));
    }

    searchSquares(query, continuationToken = null, limit = 50) {
        return this.call('searchSquares', [
            field.string(2, query),
            continuationToken ? field.string(3, continuationToken) : null,
            field.i32(4, limit)
        ].filter(Boolean));
    }

    findByInvitationTicket(ticket) {
        return this.call('findSquareByInvitationTicket', [field.string(2, ticket)]);
    }

    joinSquare(squareMid, displayName, options = {}) {
        const member = [
            field.string(2, squareMid),
            field.string(3, displayName),
            field.bool(5, options.receiveMessages ?? false)
        ];
        const fields = [field.string(2, squareMid), field.struct(3, member)];
        if (options.squareChatMid) fields.push(field.string(4, options.squareChatMid));
        if (options.passcode) fields.push(field.struct(5, [field.struct(2, [field.string(1, options.passcode)])]));
        return this.call('joinSquare', fields);
    }

    joinSquareChat(squareChatMid) {
        return this.call('joinSquareChat', [field.string(1, squareChatMid)]);
    }

    leaveSquare(squareMid) {
        return this.call('leaveSquare', [field.string(2, squareMid)]);
    }

    inviteIntoSquareChat(squareChatMid, inviteeMids) {
        return this.call('inviteIntoSquareChat', [
            field.list(1, Type.STRING, inviteeMids),
            field.string(2, squareChatMid)
        ]);
    }

    sendText(squareChatMid, text) {
        this.requestSequence += 1;
        const message = [
            field.string(2, squareChatMid),
            field.string(10, text),
            field.i32(15, 0),
            field.map(18, Type.STRING, Type.STRING, {})
        ];
        return this.call('sendMessage', [
            field.i32(1, this.requestSequence),
            field.string(2, squareChatMid),
            field.struct(3, [field.struct(1, message), field.i32(3, 4)])
        ]);
    }

    markAsRead(squareChatMid, messageId) {
        return this.call('markAsRead', [field.string(2, squareChatMid), field.string(4, messageId)]);
    }

    reactToMessage(squareChatMid, messageId, reactionType = 2) {
        this.requestSequence += 1;
        return this.call('reactToMessage', [
            field.i32(1, this.requestSequence),
            field.string(2, squareChatMid),
            field.string(3, messageId),
            field.i32(4, reactionType)
        ]);
    }
}

export default SquareService;
