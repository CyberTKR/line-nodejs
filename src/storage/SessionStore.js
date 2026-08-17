import fs from 'node:fs';
import path from 'node:path';

export class SessionStore {
    constructor(filePath = process.env.LINE_SESSION || '.line-nodejs/session.json') {
        this.path = path.resolve(filePath);
    }

    load() {
        if (!fs.existsSync(this.path)) return {};
        const value = JSON.parse(fs.readFileSync(this.path, 'utf8'));
        return value && typeof value === 'object' ? value : {};
    }

    save(patch) {
        const next = { ...this.load(), ...patch, updatedAt: new Date().toISOString() };
        fs.mkdirSync(path.dirname(this.path), { recursive: true, mode: 0o700 });
        const temporary = `${this.path}.${process.pid}.tmp`;
        fs.writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
        fs.renameSync(temporary, this.path);
        fs.chmodSync(this.path, 0o600);
        return next;
    }

    clear() {
        if (fs.existsSync(this.path)) fs.unlinkSync(this.path);
    }
}

export default SessionStore;
