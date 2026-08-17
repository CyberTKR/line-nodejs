#!/usr/bin/env node
import { main } from '../src/cli.js';

main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    if (process.env.LOG_LEVEL === 'DEBUG') console.error(error.stack);
    process.exitCode = 1;
});
