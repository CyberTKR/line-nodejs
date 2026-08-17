export class NetworkUtils {
    static generateRandomIP() {
        return `${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255) + 1}`;
    }

    static createQrHeaders(config, authSessionId = null) {
        const headers = {
            'User-Agent': config.userAgent,
            'X-Line-Application': config.systemType,
            'Content-Type': 'application/x-thrift; protocol=TCOMPACT',
            'x-lal': config.language,
            'x-lhm': 'POST',
            'x-client-ip': this.generateRandomIP(),
            'x-forwarded-for': this.generateRandomIP()
        };

        if (authSessionId) {
            headers['X-Line-Access'] = authSessionId;
            headers['x-lst'] = '150000';
        }

        return headers;
    }

    static createTalkHeaders(config) {
        return {
            'X-Line-Access': config.authToken,
            'User-Agent': config.userAgent,
            'X-Line-Application': config.systemType,
            'Content-Type': 'application/x-thrift'
        };
    }
}

export default NetworkUtils;
