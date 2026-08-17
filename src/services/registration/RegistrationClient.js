import { LINEStruct } from '@evex/linejs/thrift';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { SessionStore } from '../../storage/SessionStore.js';
import { HumanVerifier, parseWebAuthDetails } from './HumanVerifier.js';
import { LegyTransport, PaisError } from './LegyTransport.js';
import { deriveRegistrationPassword, validateRegistrationPassword } from './password.js';

const ERROR_MESSAGES = new Map([
    [0, 'LINE reported a temporary server error'],
    [1, 'The requested registration method is unavailable for this region or number'],
    [5, 'Human verification is required'],
    [7, 'The registration request was rejected or rate-limited'],
    [8, 'The registration session is no longer valid']
]);

function tokenFromAuthKey(authKey) {
    const [mid, ...parts] = String(authKey).split(':');
    const key = Buffer.from(parts.join(':'), 'base64');
    const issuedAt = `${Buffer.from(`iat: ${Math.floor(Date.now() / 1000) * 60}\n`).toString('base64')}.`;
    const digest = crypto.createHmac('sha1', key).update(issuedAt).digest('base64');
    return `${mid}:${issuedAt}.${digest}`;
}

export class CredentialStore {
    constructor(filePath = '.line-nodejs/credentials.jsonl') {
        this.path = path.resolve(filePath);
    }

    append(record) {
        fs.mkdirSync(path.dirname(this.path), { recursive: true, mode: 0o700 });
        fs.appendFileSync(this.path, `${JSON.stringify(record)}\n`, { mode: 0o600 });
        fs.chmodSync(this.path, 0o600);
    }
}

export class RegistrationClient {
    constructor(options = {}) {
        this.application = options.application || process.env.LINE_REGISTER_APPLICATION || 'ANDROID\t26.11.0\tAndroid OS\t16';
        this.userAgent = options.userAgent || process.env.LINE_REGISTER_USER_AGENT || 'Line/26.11.0';
        this.deviceModel = options.deviceModel || process.env.LINE_DEVICE_MODEL || 'SM-S928B';
        this.transport = options.transport || new LegyTransport({
            application: this.application,
            userAgent: this.userAgent,
            language: options.language || 'en_US'
        });
        this.humanVerifier = options.humanVerifier || new HumanVerifier(options.browser || {});
        this.credentials = options.credentials || new CredentialStore(options.credentialsPath);
        this.session = options.sessionStore || new SessionStore(options.session);
        this.progress = options.onProgress || (() => {});
    }

    async registerPhone(options) {
        const phone = String(options.phone || '').replace(/[\s()-]/g, '');
        const region = String(options.region || '').trim().toUpperCase();
        const displayName = String(options.displayName || 'LINE User').trim();
        const password = validateRegistrationPassword(String(options.password || ''));
        if (!phone) throw new Error('Phone number is required');
        if (!/^[A-Z]{2}$/.test(region)) throw new Error('Region must be a two-letter country code');
        if (!displayName) throw new Error('Display name is required');
        if (typeof options.onPin !== 'function') throw new Error('onPin callback is required');

        const deviceUid = crypto.randomUUID().replaceAll('-', '');
        this._step(1, 'Opening registration session');
        const opened = await this.transport.pais(
            LINEStruct.openSession_args({ request: { metaData: {} } }),
            'openSession'
        );
        const authSessionId = typeof opened === 'string' ? opened : opened[1];

        this._step(2, 'Retrieving country information');
        const country = await this._retryTemporary(() => this.transport.pais(
            LINEStruct.getCountryInfo_args({ authSessionId }),
            'getCountryInfo'
        ), 'getCountryInfo');

        this._step(3, 'Checking phone registration availability');
        const allowed = await this.transport.pais(
            LINEStruct.getAllowedRegistrationMethod_args({ authSessionId, countryCode: region }),
            'getAllowedRegistrationMethod'
        );
        const registrationMethod = typeof allowed === 'number' ? allowed : allowed[1];
        if (registrationMethod !== 1) {
            throw new PaisError('getAllowedRegistrationMethod', 1, `Phone registration is unavailable for ${region}`, allowed);
        }

        this._step(4, 'Retrieving phone verification methods');
        const methodsResult = await this.transport.pais(
            LINEStruct.getPhoneVerifMethodForRegistration_args({
                request: {
                    authSessionId,
                    device: { udid: deviceUid, deviceModel: this.deviceModel },
                    userPhoneNumber: { phoneNumber: phone, countryCode: region }
                }
            }),
            'getPhoneVerifMethodForRegistration'
        );
        const methods = Array.from(methodsResult[1] || []);
        const formattedPhone = methodsResult[2];
        if (!methods.length || !formattedPhone) throw new Error('LINE returned no phone verification method');
        const requested = String(options.verificationMethod || 'sms').toLowerCase() === 'voice' ? 2 : 1;
        const verificationMethod = methods.includes(requested) ? requested : methods[0];

        this._step(5, `Requesting ${verificationMethod === 2 ? 'voice call' : 'SMS'} PIN`);
        const requestPin = () => this.transport.pais(
            LINEStruct.requestToSendPhonePinCode_args({
                request: {
                    authSessionId,
                    userPhoneNumber: { phoneNumber: formattedPhone, countryCode: region },
                    verifMethod: verificationMethod
                }
            }),
            'requestToSendPhonePinCode'
        );
        try {
            await requestPin();
        } catch (error) {
            const details = error instanceof PaisError && Number(error.code) === 5
                ? parseWebAuthDetails(error.raw)
                : null;
            if (!details) throw this._friendly(error);
            this.progress({ step: 'human_verification', message: 'Complete verification in the official LINE page' });
            await this.humanVerifier.verify(details);
            await requestPin();
        }

        const pin = String(await options.onPin({ phone: formattedPhone, region, methods })).trim();
        if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN must contain 4 to 8 digits');
        this._step(6, 'Verifying phone PIN');
        const verified = await this.transport.pais(
            LINEStruct.verifyPhonePinCode_args({
                request: {
                    authSessionId,
                    userPhoneNumber: { phoneNumber: phone, countryCode: region },
                    pinCode: pin
                }
            }),
            'verifyPhonePinCode'
        );
        if (verified[3] === false) throw new Error('LINE did not allow registration for this phone session');

        this._step(7, 'Validating profile');
        await this.transport.pais(
            LINEStruct.validateProfile_args({ authSessionId, displayName }),
            'validateProfile'
        );

        this._step(8, 'Retrieving password parameters');
        const passwordResult = await this.transport.pais(
            LINEStruct.getPasswordHashingParametersForPwdReg_args({ request: { authSessionId } }),
            'getPasswordHashingParametersForPwdReg'
        );
        const hashing = passwordResult[1];
        const scrypt = hashing[2];

        this._step(9, 'Deriving registration password');
        const hashedPassword = await deriveRegistrationPassword(password, {
            hmacKey: hashing[1],
            salt: scrypt[1],
            nrp: scrypt[2],
            dkLen: scrypt[3]
        });

        this._step(10, 'Setting registration password');
        await this.transport.pais(
            LINEStruct.setHashedPassword_args({ request: { authSessionId, password: hashedPassword } }),
            'setHashedPassword'
        );

        this._step(11, 'Registering account');
        const registered = await this.transport.pais(
            LINEStruct.registerPrimaryUsingPhoneWithTokenV3_args({ authSessionId }),
            'registerPrimaryUsingPhoneWithTokenV3'
        );
        const authKey = registered[1];
        const token = registered[2];
        const result = {
            mid: registered[3],
            authKey,
            primaryToken: tokenFromAuthKey(authKey),
            accessToken: token[1],
            refreshToken: token[2],
            expiresIn: token[3],
            loginSessionId: token[5],
            displayName,
            phone,
            region,
            deviceModel: this.deviceModel,
            deviceUid,
            application: this.application,
            userAgent: this.userAgent
        };
        this.credentials.append({ ...result, savedAt: new Date().toISOString() });
        this.session.save({
            authToken: result.accessToken,
            refreshToken: result.refreshToken,
            mid: result.mid,
            device: 'ANDROIDSECONDARY'
        });
        this.progress({ step: 'complete', message: 'Registration completed', mid: result.mid });
        return result;
    }

    close() {
        this.transport.close();
    }

    _step(number, message) {
        this.progress({ step: number, total: 11, message });
    }

    async _retryTemporary(operation, method) {
        let lastError;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (!(error instanceof PaisError) || Number(error.code) !== 0 || attempt === 3) break;
                this.progress({ step: 'retry', message: `${method} temporary error; retrying`, attempt });
                await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
            }
        }
        throw this._friendly(lastError);
    }

    _friendly(error) {
        if (!(error instanceof PaisError)) return error;
        const message = ERROR_MESSAGES.get(Number(error.code));
        if (!message) return error;
        return new PaisError(error.method, error.code, message, error.raw);
    }
}

export default RegistrationClient;
