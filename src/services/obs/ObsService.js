export class ObsService {
    constructor(config, getMid = () => '') {
        this.config = config;
        this.getMid = getMid;
        this.host = 'https://obs.line-apps.com';
    }

    async downloadObject(objectId, options = {}) {
        const service = options.service || 'talk';
        const namespace = options.namespace || 'm';
        const response = await fetch(`${this.host}/oa/r/${service}/${namespace}/${objectId}`, {
            headers: {
                'user-agent': this.config.userAgent,
                'x-line-application': this.config.systemType,
                'x-line-access': this.config.authToken || '',
                'x-line-mid': this.getMid() || '',
                'x-lhm': 'GET',
                'x-lpv': '1',
                ...(options.headers || {})
            },
            signal: AbortSignal.timeout(options.timeout || 30000)
        });
        if (!response.ok) throw new Error(`OBS HTTP ${response.status}`);
        return Buffer.from(await response.arrayBuffer());
    }

    downloadMessage(message) {
        const metadata = message.contentMetadata || message.metadata || {};
        return this.downloadObject(metadata.OID || message.id, {
            service: message.toType === 4 ? 'g2' : 'talk',
            namespace: metadata.SID || 'm'
        });
    }
}

export default ObsService;
