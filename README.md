# line-nodejs

Modular unofficial LINE client for Node.js with QR and token login, persistent sessions, SYNC4, E2EE, extended Talk APIs and bot helpers.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)](https://github.com/CyberTKR/line-nodejs/releases)

## Installation

```bash
git clone https://github.com/CyberTKR/line-nodejs.git
cd line-nodejs
npm install
```

Node.js 18 or newer is required.

## CLI

```bash
node ./bin/line-nodejs.js qr --app androidsecondary
node ./bin/line-nodejs.js token "ACCESS_TOKEN"
node ./bin/line-nodejs.js register
node ./bin/line-nodejs.js profile
node ./bin/line-nodejs.js chats
node ./bin/line-nodejs.js send TARGET_CHATID "hello"
node ./bin/line-nodejs.js listen
node ./bin/line-nodejs.js public-bot
node ./bin/line-nodejs.js self-bot
node ./bin/line-nodejs.js services
```

QR and token logins are stored in `.line-nodejs/session.json` with mode `0600`. The session path can be changed with `--session` or `LINE_SESSION`.

Supported profiles:

- `androidsecondary`
- `desktopwin`
- `desktopmac`
- `chrome` or `chromeos`
- `ios`
- `iosipad`

Application identity is configurable:

```bash
export LINE_APP_PROFILE=ANDROIDSECONDARY
export LINE_APPLICATION=$'ANDROIDSECONDARY\t26.11.0\tAndroid OS\t14'
export LINE_USER_AGENT='Line/26.11.0'
```

## Phone registration

```bash
node ./bin/line-nodejs.js register
```

The interactive command asks for the phone number, two-letter region, display name, password and SMS PIN. If LINE requires human verification, the official `w.line.me` page opens in Chrome or Chromium and the same registration session continues after completion.

The password must contain at least eight characters and at least three of these categories: uppercase, lowercase, number and symbol.

Optional arguments:

```bash
node ./bin/line-nodejs.js register \
  --phone 0812345678 \
  --region TH \
  --display-name "LINE User" \
  --verification-method sms
```

Set `LINE_BROWSER_EXECUTABLE` when Chrome cannot be discovered automatically. Registration application identity can be changed with `LINE_REGISTER_APPLICATION` and `LINE_REGISTER_USER_AGENT`.

## Client API

```javascript
import { LineClient } from './src/index.js';

const client = new LineClient();
const profile = await client.authenticate();

console.log(`Logged in as ${profile.displayName}`);
console.log(await client.getAllChatMids());

await client.send('TARGET_CHATID', 'hello');
await client.sendE2EE('TARGET_CHATID', 'encrypted hello');
await client.listen((message) => {
    console.log(message.type, message.from, message.text);
});
```

Token login:

```javascript
const client = new LineClient({ token: process.env.LINE_AUTH_TOKEN });
await client.authenticate();
```

## Public bot

`PublicBot` accepts both sent and received message operations (`op.type 25 + 26`). Commands are ordinary functions and can be changed in the example file.

```javascript
import { PublicBot } from './src/index.js';

const bot = new PublicBot({
    commands: {
        hello: ({ bot, message }) => bot.send(message.target, 'hello'),
        ping: ({ bot, message }) => bot.send(message.target, 'pong')
    }
});

bot.onReady((profile) => console.log(`${profile.displayName} PublicBot started`));
bot.onError((error) => console.error(error.message));
await bot.runForever();
```

## Self bot

`SelfBot` accepts only messages sent by the logged-in account (`op.type 25`).

```javascript
import { SelfBot } from './src/index.js';

const bot = new SelfBot({
    commands: {
        hello: ({ bot, message }) => bot.send(message.target, 'hello'),
        ping: ({ bot, message }) => bot.send(message.target, 'pong')
    }
});

await bot.runForever();
```

## Talk APIs

The high-level client includes:

- `getProfile`, `getAllChatMids`, `getChats`
- `getContact`, `getContacts`, `addFriend`
- `send`, `unsend`, `react`, `markAsRead`
- `getPreviousMessages`, `getRecentMessages`
- `acceptInvitation`, `acceptInvitationByTicket`, `rejectInvitation`
- `inviteIntoChat`, `cancelChatInvitation`, `deleteOtherFromChat`
- `reissueChatTicket`, `deleteSelfFromChat`

The complete generated Talk client remains available through:

```javascript
const talk = client.service('talk');
await talk.generateUserTicket();
await talk.getSettings();
await talk.getBlockedContactIds();
```

## Additional services

```javascript
const call = client.service('call');
const liff = client.service('liff');
const square = client.service('square');
const relation = client.service('relation');
const obs = client.service('obs');

await call.getGroupCall('TARGET_CHATID');
await liff.issueView('LIFF_ID', { chatMid: 'TARGET_CHATID' });
await square.getJoinedSquares();
const media = await obs.downloadObject('OBJECT_ID');
```

Available services: `talk`, `sync`, `qr`, `call`, `liff`, `square`, `relation`, `obs`, and `e2ee`.

## Listener behavior

The listener uses `/SYNC4` and starts from the latest operation revision by default. This prevents commands from being executed again for old messages after a restart. Set `replayHistory: true` only when older operations are intentionally required.

## Development

```bash
npm run check
npm audit
```

The check command validates JavaScript syntax and runs the Node.js test suite.

## Security

Do not commit access tokens, refresh tokens, certificates, E2EE keys or session files. See [SECURITY.md](SECURITY.md) for reporting instructions.

## Support

[![Email](https://img.shields.io/badge/Email-dev%40cybertkr.com-EA4335?logo=gmail&logoColor=white)](mailto:dev@cybertkr.com)
[![LINE](https://img.shields.io/badge/LINE-cybertkr-00C300?logo=line&logoColor=white)](https://line.me/ti/p/~cybertkr)

## Disclaimer

This project is not affiliated with or endorsed by LINE Corporation. It uses unofficial interfaces that can change without notice. Use it only with accounts and chats you are authorized to access.
