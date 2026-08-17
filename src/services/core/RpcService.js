export class RpcService {
    constructor(server, path, options = {}) {
        this.server = server;
        this.path = path;
        this.timeout = options.timeout || 30000;
    }

    call(method, fields = [], options = {}) {
        return this.server.callThriftAPI(this.path, method, fields, {
            timeout: options.timeout || this.timeout,
            ...options
        });
    }
}

export default RpcService;
