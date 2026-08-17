import { BaseClient } from '@evex/linejs/base';
import { Protocols } from '@evex/linejs/thrift';
import crypto from 'node:crypto';
import https from 'node:https';
import xxhashInit from 'xxhash-wasm';

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsMC6HAYeMq4R59e2yRw6
W1OWT2t9aepiAp4fbSCXzRj7A29BOAFAvKlzAub4oxN13Nt8dbcB+ICAufyDnN5N
d3+vXgDxEXZ/sx2/wuFbC3B3evSNKR4hKcs80suRs8aL6EeWi+bAU2oYIc78Bbqh
Nzx0WCzZSJbMBFw1VlsU/HQ/XdiUufopl5QSa0S246XXmwJmmXRO0v7bNvrxaNV0
cbviGkOvTlBt1+RerIFHMTw3SwLDnCOolTz3CuE5V2OrPZCmC0nlmPRzwUfxoxxs
/6qFdpZNoORH/s5mQenSyqPkmH8TBOlHJWPH3eN1k6aZIlK5S54mcUb/oNRRq9wD
1wIDAQAB
-----END PUBLIC KEY-----`;

const IV = Buffer.from([78, 9, 72, 62, 56, 245, 255, 114, 128, 18, 123, 158, 251, 92, 45, 51]);

export class PaisError extends Error {
    constructor(method, code, message, raw) {
        super(`${method}: ${message || `LINE registration error ${code}`}`);
        this.name = 'PaisError';
        this.method = method;
        this.code = code;
        this.raw = raw;
    }
}

export class LegyTransportError extends Error {
    constructor(method, status, innerStatus, message) {
        super(`${method}: ${message}`);
        this.name = 'LegyTransportError';
        this.method = method;
        this.status = status;
        this.innerStatus = innerStatus;
    }
}

function encodeHeaders(headers) {
    const parts = [];
    const entries = Object.entries(headers);
    parts.push(Buffer.from([entries.length >> 8, entries.length & 255]));
    for (const [name, value] of entries) {
        const key = Buffer.from(name, 'ascii');
        const content = Buffer.from(String(value), 'ascii');
        parts.push(Buffer.from([key.length >> 8, key.length & 255]), key);
        parts.push(Buffer.from([content.length >> 8, content.length & 255]), content);
    }
    const body = Buffer.concat(parts);
    return Buffer.concat([Buffer.from([body.length >> 8, body.length & 255]), body]);
}

function decodeHeaders(data) {
    let offset = 0;
    const readI16 = () => {
        if (offset + 2 > data.length) throw new Error('LEGY response header is truncated');
        const value = data.readUInt16BE(offset);
        offset += 2;
        return value;
    };
    const dataOffset = readI16() + 2;
    const count = readI16();
    const headers = {};
    for (let index = 0; index < count; index++) {
        const keyLength = readI16();
        const key = data.subarray(offset, offset + keyLength).toString('ascii');
        offset += keyLength;
        const valueLength = readI16();
        headers[key] = data.subarray(offset, offset + valueLength).toString('ascii');
        offset += valueLength;
    }
    if (dataOffset > data.length) throw new Error('LEGY response body is truncated');
    return { headers, data: data.subarray(dataOffset) };
}

function pad(data) {
    const size = 16 - (data.length % 16);
    return Buffer.concat([data, Buffer.alloc(size, size)]);
}

function unpad(data) {
    const size = data[data.length - 1];
    if (!size || size > 16 || size > data.length) throw new Error('Invalid LEGY padding');
    for (let index = data.length - size; index < data.length; index++) {
        if (data[index] !== size) throw new Error('Invalid LEGY padding');
    }
    return data.subarray(0, data.length - size);
}

export class LegyTransport {
    constructor(options = {}) {
        this.application = options.application || 'ANDROID\t26.11.0\tAndroid OS\t16';
        this.userAgent = options.userAgent || 'Line/26.11.0';
        this.language = options.language || 'en_US';
        this.url = new URL(options.url || 'https://gf.line.naver.jp/enc');
        this.timeout = options.timeout || 30000;
        this.key = crypto.randomBytes(16);
        this.xlcs = `0008${crypto.publicEncrypt({
            key: PUBLIC_KEY,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha1'
        }, this.key).toString('base64')}`;
        this.base = new BaseClient({ device: 'ANDROID' });
        this.hash = null;
        this.agent = new https.Agent({ keepAlive: true, maxSockets: 4 });
    }

    async request(args, method, options = {}) {
        if (!this.hash) this.hash = await xxhashInit();
        const protocolType = options.protocol || 3;
        const protocol = Protocols[protocolType];
        const path = options.path || '/acct/pais/v1';
        const body = Buffer.from(this.base.thrift.writeThrift(args, method, protocol));
        const headers = options.token ? { 'x-lt': options.token, 'x-lpqs': path } : { 'x-lpqs': path };
        const plaintext = Buffer.concat([Buffer.from([7]), encodeHeaders(headers), body]);
        const cipher = crypto.createCipheriv('aes-128-cbc', this.key, IV);
        const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        const payload = Buffer.concat([encrypted, this._hmac(encrypted)]);
        const response = await this._post(payload, protocolType);
        if (!response.body.length) {
            throw new LegyTransportError(method, response.status, null, 'Empty response body');
        }
        let decrypted;
        try {
            const padded = pad(response.body);
            const decipher = crypto.createDecipheriv('aes-128-cbc', this.key, IV);
            decipher.setAutoPadding(false);
            const raw = Buffer.concat([decipher.update(padded), decipher.final()]);
            decrypted = unpad(raw.subarray(0, raw.length - 16)).subarray(1);
        } catch (error) {
            throw new LegyTransportError(method, response.status, null, `Response decryption failed: ${error.message}`);
        }
        const decoded = decodeHeaders(decrypted);
        const innerStatus = decoded.headers['x-lc'];
        if (response.status !== 200 || (innerStatus && innerStatus !== '200')) {
            throw new LegyTransportError(
                method,
                response.status,
                innerStatus,
                `LINE rejected the request (HTTP ${response.status}, x-lc=${innerStatus || 'n/a'})`
            );
        }
        const parsed = this.base.thrift.readThrift(new Uint8Array(decoded.data), protocol);
        if (parsed._info?.mtype === 3) {
            throw new PaisError(method, `THRIFT_${parsed.data[2]}`, 'Thrift application exception', parsed.data);
        }
        if (parsed.data[1]) {
            const exception = parsed.data[1];
            throw new PaisError(method, exception[1], exception[2], exception);
        }
        return parsed.data[0];
    }

    pais(args, method) {
        return this.request(args, method, { protocol: 3, path: '/acct/pais/v1' });
    }

    close() {
        this.agent.destroy();
    }

    _hmac(data) {
        const outer = Buffer.alloc(16);
        const inner = Buffer.alloc(16);
        for (let index = 0; index < 16; index++) {
            outer[index] = 0x5c ^ this.key[index];
            inner[index] = 0x36 ^ this.key[index];
        }
        const innerHex = (this.hash.h32Raw(Buffer.concat([inner, data]), 0) >>> 0).toString(16).padStart(8, '0');
        const outerHex = (this.hash.h32Raw(Buffer.concat([outer, Buffer.from(innerHex, 'hex')]), 0) >>> 0)
            .toString(16)
            .padStart(8, '0');
        return Buffer.from(outerHex, 'hex');
    }

    _post(body, protocol) {
        return new Promise((resolve, reject) => {
            const request = https.request({
                hostname: this.url.hostname,
                port: 443,
                path: this.url.pathname,
                method: 'POST',
                agent: this.agent,
                timeout: this.timeout,
                headers: {
                    'x-line-application': this.application,
                    'x-le': '7',
                    'x-lap': '5',
                    'x-lpv': '1',
                    'x-lcs': this.xlcs,
                    'user-agent': this.userAgent,
                    'content-type': `application/x-thrift; protocol=${protocol === 3 ? 'TBINARY' : 'TCOMPACT'}`,
                    'x-lal': this.language,
                    'x-lhm': 'POST',
                    'x-line-chrome-version': '3.1.0',
                    'content-length': body.length
                }
            }, (response) => {
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks) }));
            });
            request.on('timeout', () => request.destroy(new Error('LEGY request timed out')));
            request.on('error', reject);
            request.end(body);
        });
    }
}

export default LegyTransport;
