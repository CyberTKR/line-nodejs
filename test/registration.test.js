import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveRegistrationPassword, parseScryptNrp, validateRegistrationPassword } from '../src/services/registration/password.js';
import { parseWebAuthDetails } from '../src/services/registration/HumanVerifier.js';

test('registration password requires three character categories', () => {
    assert.equal(validateRegistrationPassword('Strong123'), 'Strong123');
    assert.throws(() => validateRegistrationPassword('onlylowercase'), /three/);
    assert.throws(() => validateRegistrationPassword('Short1!'), /8 characters/);
});

test('registration password derivation follows server Scrypt parameters', async () => {
    assert.deepEqual(parseScryptNrp('0e0801'), { N: 16384, r: 8, p: 1 });
    const value = await deriveRegistrationPassword('Strong123', {
        hmacKey: Buffer.from('hmac').toString('base64'),
        salt: Buffer.from('salt').toString('base64'),
        nrp: '0e0801',
        dkLen: 32
    });
    assert.match(value, /^\$s0\$0e0801\$/);
});

test('human verification only accepts official HTTPS LINE pages', () => {
    assert.deepEqual(parseWebAuthDetails({ 11: { 1: 'https://w.line.me/sec/v3/recaptcha', 2: 'Bearer secret' } }), {
        baseUrl: 'https://w.line.me/sec/v3/recaptcha',
        authorization: 'Bearer secret'
    });
    assert.equal(parseWebAuthDetails({ 11: { 1: 'https://example.com', 2: 'secret' } }), null);
});
