import test from 'node:test';
import assert from 'node:assert/strict';
import { Config } from '../src/utils/Config.js';

test('client config defaults to Android Secondary', () => {
    const config = Config.createClientConfig();
    assert.equal(config.device, 'ANDROIDSECONDARY');
    assert.match(config.systemType, /^ANDROIDSECONDARY\t/);
});

test('client config accepts application overrides', () => {
    const config = Config.createClientConfig({
        device: 'DESKTOPMAC',
        application: 'CUSTOM\t1.0\tMAC\t14',
        userAgent: 'Custom/1.0'
    });
    assert.equal(config.systemType, 'CUSTOM\t1.0\tMAC\t14');
    assert.equal(config.userAgent, 'Custom/1.0');
});
