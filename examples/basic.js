import { LineClient } from '../src/index.js';

const client = new LineClient();
const profile = await client.authenticate();
console.log(`Logged in as ${profile.displayName}`);
console.log(await client.getAllChatMids());
