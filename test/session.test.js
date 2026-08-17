import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SessionStore } from '../src/storage/SessionStore.js';

test('session store saves atomically with private permissions', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'line-nodejs-'));
    const file = path.join(directory, 'session.json');
    const store = new SessionStore(file);
    store.save({ authToken: 'secret', revision: 42 });
    assert.deepEqual(store.load().authToken, 'secret');
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    store.save({ revision: 43 });
    assert.equal(store.load().revision, 43);
    store.clear();
    assert.equal(fs.existsSync(file), false);
    fs.rmSync(directory, { recursive: true, force: true });
});
