
import { Logger, bigInt, isBinary } from './utils.js';
import { ServiceError } from '../../errors.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const thrift = require('thrift');

export class ThriftSerializer {
    static writeThrift(value, methodName, protocol = thrift.TCompactProtocol) {
        let myBuf = Buffer.from([]);
        const buftra = new thrift.TBufferedTransport(
            myBuf,
            (outBuf) => {
                if (!outBuf) return;
                myBuf = Buffer.concat([myBuf, outBuf]);
            }
        );
        
        const myprot = new protocol(buftra);
        this.writeStruct(myprot, value);
        myprot.flush();
        buftra.flush();
        
        if (myBuf.length === 1 && myBuf[0] === 0) {
            myBuf = Buffer.from([]);
        }

        const header = Buffer.from([0x82, 0x21, 0, methodName.length, ...Buffer.from(methodName)]);
        const writedBinary = Buffer.concat([
            header,
            myBuf,
            Buffer.from([0])
        ]);

        return writedBinary;
    }
    
    static writeStruct(output, value = []) {
        if (!value.length) {
            return;
        }
        output.writeStructBegin("");

        value.forEach((e) => {
            if (e === null || e === undefined) {
                return;
            }
            this.writeValue(output, e[0], e[1], e[2]);
        });

        output.writeFieldStop();
        output.writeStructEnd();
    }
    
    static writeValue(output, ftype, fid, val) {
        if (val === undefined || val === null) {
            return;
        }


        if (typeof ftype === 'string') {
            Logger.error('THRIFT', `Invalid thrift type format - got string '${ftype}', expected number. Field ID: ${fid}`);
            

            if (ftype === 'u') {

                ftype = thrift.Thrift.Type.STRING;
                Logger.debug('THRIFT', `Converting type 'u' to STRING type (${ftype})`);
            }
        }

        output.writeFieldBegin("", ftype, fid);
        this.writeData(output, ftype, val);
        output.writeFieldEnd();
    }

    static writeData(output, ftype, val) {
        switch (ftype) {
            case thrift.Thrift.Type.BOOL:
                output.writeBool(val);
                break;
            case thrift.Thrift.Type.BYTE:
                output.writeByte(val);
                break;
            case thrift.Thrift.Type.I16:
                output.writeI16(val);
                break;
            case thrift.Thrift.Type.I32:
                output.writeI32(val);
                break;
            case thrift.Thrift.Type.I64:
                output.writeI64(val);
                break;
            case thrift.Thrift.Type.STRING:
                output.writeString(val);
                break;
            case thrift.Thrift.Type.STRUCT:
                this.writeStruct(output, val);
                break;
            case thrift.Thrift.Type.MAP:
                this.writeMap(output, val);
                break;
            case thrift.Thrift.Type.LIST:
                this.writeList(output, val);
                break;
            case thrift.Thrift.Type.DOUBLE:
                output.writeDouble(val);
                break;
            default:
                Logger.error('THRIFT', `Unsupported thrift type: ${ftype} (${typeof ftype}) for fid: ${fid}`);
                Logger.debug('THRIFT', `Available thrift types: ${Object.keys(thrift.Thrift.Type).join(', ')}`);
                throw new Error(`Unsupported thrift type: ${ftype}`);
        }

    }
    
    static writeMap(output, mapData) {
        const keyType = mapData[0];
        const valueType = mapData[1];
        const data = mapData[2];
        
        const entries = Object.entries(data || {});
        output.writeMapBegin(keyType, valueType, entries.length);
        
        for (const [key, value] of entries) {
            const mapKey = keyType === thrift.Thrift.Type.STRING ? key : Number(key);
            this.writeData(output, keyType, mapKey);
            this.writeData(output, valueType, value);
        }
        
        output.writeMapEnd();
    }
    
    static writeList(output, listData) {
        const elementType = listData[0];
        const data = listData[1];
        
        const actualData = Array.isArray(data) ? data : [];
        
        output.writeListBegin(elementType, actualData.length);
        
        for (const item of actualData) {
            this.writeData(output, elementType, item);
        }
        
        output.writeListEnd();
    }
}

export class ThriftDeserializer {
    static readThriftResponse(buffer) {
        try {
            const transport = new thrift.TFramedTransport(buffer);
            const prot = new thrift.TCompactProtocol(transport);
            
            const msgInfo = prot.readMessageBegin();
            const rawResponse = this.readStruct(prot);
            prot.readMessageEnd();

            if (msgInfo.type === thrift.Thrift.MessageType.EXCEPTION) {
                const cause = new Error(String(rawResponse[1] || 'Thrift application exception'));
                cause.code = rawResponse[2];
                cause.details = rawResponse;
                throw new ServiceError(msgInfo.name, cause);
            }
            if (!Object.prototype.hasOwnProperty.call(rawResponse, 0) && rawResponse[1] !== undefined) {
                const details = rawResponse[1];
                const reason = details && typeof details === 'object' ? details[2] : details;
                const cause = new Error(String(reason || 'LINE service exception'));
                cause.code = details && typeof details === 'object' ? details[1] : undefined;
                cause.details = details;
                throw new ServiceError(msgInfo.name, cause);
            }
            
            const structuredResponse = this.mapToStructuredResponse(rawResponse);
            
            return {
                methodName: msgInfo.name,
                messageType: msgInfo.type,
                sequenceId: msgInfo.seqid,
                data: structuredResponse
            };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            Logger.error('Failed to parse response:', error.message);
            return null;
        }
    }
    
    static mapToStructuredResponse(rawData) {
        if (!Object.prototype.hasOwnProperty.call(rawData, 0)) return rawData;

        const success = rawData[0];
        if (!success || typeof success !== 'object' || Buffer.isBuffer(success)) return success;

        const operation = success[1];
        const fullSync = success[2];
        const partialSync = success[3];
        const isSyncResponse =
            Boolean(operation && typeof operation === 'object' && Array.isArray(operation[1])) ||
            Boolean(fullSync && typeof fullSync === 'object') ||
            Boolean(partialSync && typeof partialSync === 'object');

        if (!isSyncResponse) return success;

        const structured = {};
        if (operation && typeof operation === 'object') {
            structured.operationResponse = {};
            if (Array.isArray(operation[1])) structured.operationResponse.operations = operation[1];
            if (operation[2] !== undefined) structured.operationResponse.hasMoreOps = operation[2];
            if (operation[3] && typeof operation[3] === 'object') {
                structured.operationResponse.globalEvents = {
                    events: operation[3][1] || {},
                    lastRevision: operation[3][2]
                };
            }
            if (operation[4] && typeof operation[4] === 'object') {
                structured.operationResponse.individualEvents = {
                    events: operation[4][1] || [],
                    lastRevision: operation[4][2]
                };
            }
        }
        if (fullSync && typeof fullSync === 'object') {
            structured.fullSyncResponse = {
                nextRevision: fullSync[2] ?? fullSync.nextRevision
            };
        }
        if (partialSync && typeof partialSync === 'object') {
            structured.partialFullSyncResponse = partialSync;
        }
        return structured;
    }
    
    static readStruct(prot) {
        const returnData = {};
        prot.readStructBegin();
        
        while (true) {
            const { ftype, fid } = prot.readFieldBegin();
            if (ftype === thrift.Thrift.Type.STOP) {
                break;
            }
            
            returnData[fid] = this.readValue(prot, ftype);
            prot.readFieldEnd();
        }
        
        prot.readStructEnd();
        return returnData;
    }
    
    static readValue(prot, ftype) {
        const Thrift = thrift.Thrift;
        
        if (ftype === Thrift.Type.STRUCT) {
            return this.readStruct(prot);
        } else if (ftype === Thrift.Type.I32) {
            return prot.readI32();
        } else if (ftype === Thrift.Type.I64) {
            return bigInt(prot.readI64().buffer);
        } else if (ftype === Thrift.Type.STRING) {
            const bin = prot.readBinary();
            if (isBinary(bin)) {
                return bin;
            } else {
                return bin.toString();
            }
        } else if (ftype === Thrift.Type.LIST) {
            const returnData = [];
            const { size, etype } = prot.readListBegin();
            for (let i = 0; i < size; ++i) {
                returnData.push(this.readValue(prot, etype));
            }
            prot.readListEnd();
            return returnData;
        } else if (ftype === Thrift.Type.MAP) {
            const returnData = {};
            const { size, ktype, vtype } = prot.readMapBegin();
            for (let i = 0; i < size; ++i) {
                const key = this.readValue(prot, ktype);
                const val = this.readValue(prot, vtype);
                returnData[key] = val;
            }
            prot.readMapEnd();
            return returnData;
        } else if (ftype === Thrift.Type.SET) {
            const returnData = [];
            const { size, etype } = prot.readSetBegin();
            for (let i = 0; i < size; ++i) {
                returnData.push(this.readValue(prot, etype));
            }
            prot.readSetEnd();
            return returnData;
        } else if (ftype === Thrift.Type.BOOL) {
            return prot.readBool();
        } else if (ftype === Thrift.Type.DOUBLE) {
            return prot.readDouble();
        } else {
            prot.skip(ftype);
            return;
        }
    }
}

export class ThriftHandler {
    static serialize(value, methodName, protocol) {
        return ThriftSerializer.writeThrift(value, methodName, protocol);
    }
    
    static deserialize(buffer) {
        return ThriftDeserializer.readThriftResponse(buffer);
    }
}

export { thrift };
export default ThriftHandler;
