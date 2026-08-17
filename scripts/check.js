import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function files(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) return files(target);
        return target.endsWith('.js') ? [target] : [];
    });
}

for (const file of ['src', 'examples', 'bin', 'scripts', 'test'].flatMap((dir) => fs.existsSync(dir) ? files(dir) : [])) {
    const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
}
