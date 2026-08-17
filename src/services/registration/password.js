import crypto from 'node:crypto';

const MAX_MEMORY = 512 * 1024 * 1024;

export function validateRegistrationPassword(password) {
    if (typeof password !== 'string' || password.length < 8) {
        throw new Error('Password must contain at least 8 characters');
    }
    const categories = [
        /[A-Z]/.test(password),
        /[a-z]/.test(password),
        /[0-9]/.test(password),
        /[^A-Za-z0-9]/.test(password)
    ].filter(Boolean).length;
    if (categories < 3) {
        throw new Error('Password must include at least three of: uppercase, lowercase, number, symbol');
    }
    return password;
}

export function parseScryptNrp(nrp) {
    if (typeof nrp !== 'string' || !/^[0-9a-f]+$/i.test(nrp)) {
        throw new TypeError('Scrypt nrp must be hexadecimal');
    }
    const packed = Number.parseInt(nrp, 16);
    const logN = (packed >>> 16) & 0xffff;
    const r = (packed >>> 8) & 0xff;
    const p = packed & 0xff;
    const N = 2 ** logN;
    if (!Number.isSafeInteger(N) || N <= 1 || N >= 65536 || r < 1 || p < 1) {
        throw new RangeError('Unsupported Scrypt parameters');
    }
    return { N, r, p };
}

function scrypt(password, salt, length, options) {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, length, options, (error, key) => error ? reject(error) : resolve(key));
    });
}

export async function deriveRegistrationPassword(password, parameters) {
    validateRegistrationPassword(password);
    const { hmacKey, salt, nrp } = parameters;
    const dkLen = Number(parameters.dkLen);
    const { N, r, p } = parseScryptNrp(nrp);
    if (!Number.isSafeInteger(dkLen) || dkLen < 1) throw new RangeError('Invalid Scrypt output length');
    const hmacInput = crypto
        .createHmac('sha256', Buffer.from(hmacKey, 'base64'))
        .update(password, 'utf8')
        .digest();
    const requiredMemory = 128 * N * r + 128 * r * p + 1024 * 1024;
    const maxmem = Math.max(64 * 1024 * 1024, requiredMemory);
    if (maxmem > MAX_MEMORY) throw new RangeError('Server Scrypt parameters exceed the memory limit');
    const key = await scrypt(hmacInput, Buffer.from(salt, 'base64'), dkLen, { N, r, p, maxmem });
    return `$s0$${nrp}$${salt}$${key.toString('base64')}`;
}
