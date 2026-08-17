import { RpcService } from '../core/RpcService.js';
import { field, Type } from '../core/fields.js';

export class LiffService extends RpcService {
    constructor(server) {
        super(server, '/LIFF1');
    }

    issueView(liffId, options = {}) {
        const context = options.chatMid
            ? [field.struct(2, [field.string(1, options.chatMid)])]
            : [];
        const request = [
            field.string(1, liffId),
            field.struct(2, context),
            field.string(3, options.language || 'en_US')
        ];
        return this.call(options.subLiff ? 'issueSubLiffView' : 'issueLiffView', [field.struct(1, request)]);
    }

    getViewWithoutUserContext(liffId) {
        return this.call('getLiffViewWithoutUserContext', [field.struct(1, [field.string(1, liffId)])]);
    }

    revokeTokens(accessTokens) {
        if (!accessTokens?.length) throw new TypeError('accessTokens cannot be empty');
        return this.call('revokeTokens', [field.struct(1, [field.list(1, Type.STRING, accessTokens)])]);
    }
}

export default LiffService;
