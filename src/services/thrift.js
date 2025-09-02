/**
 * LineNode Thrift Serialization/Deserialization
 * Thrift protocol handling for LINE API communication
 */

import { Logger, bigInt, isBinary } from './utils.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const thrift = require('thrift');

/**
 * Thrift Serializer class
 * Handles writing thrift data structures
 */
export class ThriftSerializer {
    /**
     * Write thrift data to binary format (from polling-client.js:21-48)
     * @param {Array} value - Value array to serialize
     * @param {string} methodName - Method name for thrift call
     * @param {Function} protocol - Thrift protocol (default: TCompactProtocol)
     * @returns {Buffer} Serialized binary data
     */
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
    
    /**
     * Write struct to thrift protocol (from polling-client.js:50-65)
     * @param {Object} output - Thrift protocol output
     * @param {Array} value - Value array to write
     */
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
    
    /**
     * Write value to thrift protocol (from polling-client.js:67-107)
     * @param {Object} output - Thrift protocol output
     * @param {number} ftype - Field type
     * @param {number} fid - Field ID
     * @param {any} val - Value to write
     */
    static writeValue(output, ftype, fid, val) {
        if (val === undefined || val === null) {
            return;
        }

        // Add debugging for problematic types
        if (typeof ftype === 'string') {
            Logger.error('THRIFT', `Invalid thrift type format - got string '${ftype}', expected number. Field ID: ${fid}`);
            
            // Try to handle common string type cases
            if (ftype === 'u') {
                // 'u' likely represents STRING type based on context
                ftype = thrift.Thrift.Type.STRING;
                Logger.debug('THRIFT', `Converting type 'u' to STRING type (${ftype})`);
            }
        }

        output.writeFieldBegin("", ftype, fid);

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

        output.writeFieldEnd();
    }
    
    /**
     * Write map to thrift protocol (from polling-client.js:109-123)
     * @param {Object} output - Thrift protocol output
     * @param {Array} mapData - Map data [keyType, valueType, data]
     */
    static writeMap(output, mapData) {
        const keyType = mapData[0];
        const valueType = mapData[1];
        const data = mapData[2];
        
        const entries = Object.entries(data || {});
        output.writeMapBegin(keyType, valueType, entries.length);
        
        for (const [key, value] of entries) {
            this.writeValue(output, keyType, null, parseInt(key));
            this.writeValue(output, valueType, null, value);
        }
        
        output.writeMapEnd();
    }
    
    /**
     * Write list to thrift protocol (from polling-client.js:125-139)
     * @param {Object} output - Thrift protocol output
     * @param {Array} listData - List data [elementType, data]
     */
    static writeList(output, listData) {
        const elementType = listData[0];
        const data = listData[1];
        
        const actualData = Array.isArray(data) ? data : [];
        
        output.writeListBegin(elementType, actualData.length);
        
        for (const item of actualData) {
            this.writeValue(output, elementType, null, item);
        }
        
        output.writeListEnd();
    }
}

/**
 * Thrift Deserializer class
 * Handles reading thrift data structures
 */
export class ThriftDeserializer {
    /**
     * Read thrift response from buffer (from polling-client.js:142-164)
     * @param {Buffer} buffer - Buffer containing thrift response
     * @returns {Object|null} Parsed response object or null
     */
    static readThriftResponse(buffer) {
        try {
            const transport = new thrift.TFramedTransport(buffer);
            const prot = new thrift.TCompactProtocol(transport);
            
            const msgInfo = prot.readMessageBegin();
            const rawResponse = this.readStruct(prot);
            prot.readMessageEnd();
            
            const structuredResponse = this.mapToStructuredResponse(rawResponse);
            
            return {
                methodName: msgInfo.name,
                messageType: msgInfo.type,
                sequenceId: msgInfo.seqid,
                data: structuredResponse
            };
        } catch (error) {
            Logger.error('Failed to parse response:', error.message);
            return null;
        }
    }
    
    /**
     * Map raw thrift response to structured response (from polling-client.js:167-285)
     * @param {Object} rawData - Raw thrift data
     * @returns {Object} Structured response object
     */
    static mapToStructuredResponse(rawData) {
        const structured = {};
        
        // Field 0 = success response
        if (rawData[0]) {
            // Field 1 = operationResponse
            if (rawData[0][1]) {
                structured.operationResponse = {};
                
                // Field 1 = operations list - keep raw format for bot compatibility
                if (rawData[0][1][1] && Array.isArray(rawData[0][1][1])) {
                    structured.operationResponse.operations = rawData[0][1][1]; // Keep raw operations array
                }
                
                // Field 2 = hasMoreOps
                if (rawData[0][1][2] !== undefined) {
                    structured.operationResponse.hasMoreOps = rawData[0][1][2];
                }
                
                // Field 3 = TGlobalEvents
                if (rawData[0][1][3] && typeof rawData[0][1][3] === 'object') {
                    structured.operationResponse.globalEvents = {
                        events: rawData[0][1][3][1] || {},
                        lastRevision: rawData[0][1][3][2]
                    };
                }
                
                // Field 4 = TIndividualEvents
                if (rawData[0][1][4] && typeof rawData[0][1][4] === 'object') {
                    structured.operationResponse.individualEvents = {
                        events: rawData[0][1][4][1] || [],
                        lastRevision: rawData[0][1][4][2]
                    };
                }
            }
            
            // Field 2 = fullSyncResponse
            if (rawData[0][2]) {
                structured.fullSyncResponse = {
                    nextRevision: rawData[0][2][2] || rawData[0][2].nextRevision
                };
            }
            
            // Field 3 = partialFullSyncResponse
            if (rawData[0][3]) {
                structured.partialFullSyncResponse = rawData[0][3];
            }
        }
        
        return structured;
    }
    
    /**
     * Read struct from thrift protocol (from polling-client.js:287-303)
     * @param {Object} prot - Thrift protocol
     * @returns {Object} Read struct data
     */
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
    
    /**
     * Read value from thrift protocol (from polling-client.js:323-373)
     * @param {Object} prot - Thrift protocol
     * @param {number} ftype - Field type
     * @returns {any} Read value
     */
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

/**
 * Combined Thrift handler
 * Provides both serialization and deserialization functionality
 */
export class ThriftHandler {
    /**
     * Serialize thrift data
     * @param {Array} value - Value to serialize
     * @param {string} methodName - Method name
     * @param {Function} protocol - Thrift protocol
     * @returns {Buffer} Serialized data
     */
    static serialize(value, methodName, protocol) {
        return ThriftSerializer.writeThrift(value, methodName, protocol);
    }
    
    /**
     * Deserialize thrift response
     * @param {Buffer} buffer - Buffer to deserialize
     * @returns {Object|null} Deserialized data
     */
    static deserialize(buffer) {
        return ThriftDeserializer.readThriftResponse(buffer);
    }
}

// Export all classes and main handler
export { thrift };
export default ThriftHandler;