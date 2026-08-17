import { thrift } from './thrift.js';

const Type = thrift.Thrift.Type;

export const field = {
    bool: (id, value) => [Type.BOOL, id, Boolean(value)],
    byte: (id, value) => [Type.BYTE, id, Number(value)],
    i16: (id, value) => [Type.I16, id, Number(value)],
    i32: (id, value) => [Type.I32, id, Number(value)],
    i64: (id, value) => [Type.I64, id, value],
    double: (id, value) => [Type.DOUBLE, id, Number(value)],
    string: (id, value) => [Type.STRING, id, String(value)],
    binary: (id, value) => [Type.STRING, id, Buffer.from(value)],
    struct: (id, fields = []) => [Type.STRUCT, id, fields],
    list: (id, elementType, values = []) => [Type.LIST, id, [elementType, values]],
    map: (id, keyType, valueType, value = {}) => [Type.MAP, id, [keyType, valueType, value]]
};

export { Type };
