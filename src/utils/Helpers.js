export const byte2int = (buffer) => {
    return Number(BigInt('0x' + Buffer.from(buffer).toString('hex')));
};

export const getIntBytes = (num) => {
    const hex = num.toString(16).padStart(16, '0');
    return Buffer.from(hex, 'hex');
};

export const safeJSONParse = (text, fallback = null) => {
    try {
        return JSON.parse(text);
    } catch (error) {
        return fallback;
    }
};

export const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export default {
    byte2int,
    getIntBytes,
    safeJSONParse,
    sleep
};