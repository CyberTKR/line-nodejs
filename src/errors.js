export class LineError extends Error {
    constructor(message, options = {}) {
        super(message, options);
        this.name = 'LineError';
    }
}

export class AuthenticationError extends LineError {
    constructor(message, options = {}) {
        super(message, options);
        this.name = 'AuthenticationError';
    }
}

export class ServiceError extends LineError {
    constructor(method, cause) {
        super(`${method}: ${cause?.message || cause}`, { cause });
        this.name = 'ServiceError';
        this.method = method;
    }
}
