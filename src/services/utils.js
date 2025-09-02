import ttypes from './modules/talk_thrift/ttypes.cjs';

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function byte2int(t) {
    let e = 0;
    const s = t.length;
    for (let i = 0; i < s; i++) {
        e = 256 * e + t[i];
    }
    return e;
}

export function isBinary(bin) {
    const str = bin.toString();
    if (JSON.stringify(str).includes('\\u')) {
        return true;
    }
    const bin2 = Buffer.from(str);
    return bin.toString('base64') !== bin2.toString('base64');
}

export function bigInt(bin) {
    const str = bin.toString('hex');
    const num = parseInt(str, 16);
    if (Number.MAX_SAFE_INTEGER < num) {
        return BigInt('0x' + str);
    }
    return num;
}

export function getIntBytes(i) {
    const j = 4;
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setInt32(0, i);
    return new Uint8Array(buffer);
}

export function getOperationTypeName(type) {
    const opNames = Object.keys(ttypes.OpType).reduce((acc, key) => {
        acc[ttypes.OpType[key]] = key;
        return acc;
    }, {});
    return opNames[type] || `UNKNOWN_${type}`;
}

import Logger from '../utils/Logger.js';
export { Logger };