"use strict";

var thrift = require('thrift');
var Thrift = thrift.Thrift;
var Q = thrift.Q;
var Int64 = require('node-int64');


var ttypes = require('./types.cjs');

var QrCheckService_createSession_args = function(args) {
  this.request = null;
  if (args) {
    if (args.request !== undefined && args.request !== null) {
      this.request = new ttypes.CreateSessionRequest(args.request);
    }
  }
};
QrCheckService_createSession_args.prototype = {};
QrCheckService_createSession_args.prototype[Symbol.for("read")] = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.request = new ttypes.CreateSessionRequest();
        this.request[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

QrCheckService_createSession_args.prototype[Symbol.for("write")] = function(output) {
  output.writeStructBegin('QrCheckService_createSession_args');
  if (this.request !== null && this.request !== undefined) {
    output.writeFieldBegin('request', Thrift.Type.STRUCT, 1);
    this.request[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var QrCheckService_createSession_result = function(args) {
  this.success = null;
  this.e = null;
  if (args instanceof ttypes.TalkException) {
    this.e = args;
    return;
  }
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = new ttypes.CreateSessionResponse(args.success);
    }
    if (args.e !== undefined && args.e !== null) {
      this.e = args.e;
    }
  }
};
QrCheckService_createSession_result.prototype = {};
QrCheckService_createSession_result.prototype[Symbol.for("read")] = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 0:
      if (ftype == Thrift.Type.STRUCT) {
        this.success = new ttypes.CreateSessionResponse();
        this.success[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.e = new ttypes.TalkException();
        this.e[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

QrCheckService_createSession_result.prototype[Symbol.for("write")] = function(output) {
  output.writeStructBegin('QrCheckService_createSession_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRUCT, 0);
    this.success[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  if (this.e !== null && this.e !== undefined) {
    output.writeFieldBegin('e', Thrift.Type.STRUCT, 1);
    this.e[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var QrCheckService_createQrCodeForSecure_args = function(args) {
  this.request = null;
  if (args) {
    if (args.request !== undefined && args.request !== null) {
      this.request = new ttypes.CreateQrCodeRequest(args.request);
    }
  }
};
QrCheckService_createQrCodeForSecure_args.prototype = {};
QrCheckService_createQrCodeForSecure_args.prototype[Symbol.for("read")] = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.request = new ttypes.CreateQrCodeRequest();
        this.request[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

QrCheckService_createQrCodeForSecure_args.prototype[Symbol.for("write")] = function(output) {
  output.writeStructBegin('QrCheckService_createQrCodeForSecure_args');
  if (this.request !== null && this.request !== undefined) {
    output.writeFieldBegin('request', Thrift.Type.STRUCT, 1);
    this.request[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var QrCheckService_createQrCodeForSecure_result = function(args) {
  this.success = null;
  this.e = null;
  if (args instanceof ttypes.SecondaryQrCodeException) {
    this.e = args;
    return;
  }
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = new ttypes.CreateQrCodeForSecureResponse(args.success);
    }
    if (args.e !== undefined && args.e !== null) {
      this.e = args.e;
    }
  }
};
QrCheckService_createQrCodeForSecure_result.prototype = {};
QrCheckService_createQrCodeForSecure_result.prototype[Symbol.for("read")] = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 0:
      if (ftype == Thrift.Type.STRUCT) {
        this.success = new ttypes.CreateQrCodeForSecureResponse();
        this.success[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.e = new ttypes.SecondaryQrCodeException();
        this.e[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

QrCheckService_createQrCodeForSecure_result.prototype[Symbol.for("write")] = function(output) {
  output.writeStructBegin('QrCheckService_createQrCodeForSecure_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRUCT, 0);
    this.success[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  if (this.e !== null && this.e !== undefined) {
    output.writeFieldBegin('e', Thrift.Type.STRUCT, 1);
    this.e[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var QrCheckService_checkQrCodeVerified_args = function(args) {
  this.request = null;
  if (args) {
    if (args.request !== undefined && args.request !== null) {
      this.request = new ttypes.CheckQrCodeVerifiedRequest(args.request);
    }
  }
};
QrCheckService_checkQrCodeVerified_args.prototype = {};
QrCheckService_checkQrCodeVerified_args.prototype[Symbol.for("read")] = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.request = new ttypes.CheckQrCodeVerifiedRequest();
        this.request[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

QrCheckService_checkQrCodeVerified_args.prototype[Symbol.for("write")] = function(output) {
  output.writeStructBegin('QrCheckService_checkQrCodeVerified_args');
  if (this.request !== null && this.request !== undefined) {
    output.writeFieldBegin('request', Thrift.Type.STRUCT, 1);
    this.request[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var QrCheckService_checkQrCodeVerified_result = function(args) {
  this.success = null;
  this.e = null;
  if (args instanceof ttypes.TalkException) {
    this.e = args;
    return;
  }
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = new ttypes.CheckQrCodeVerifiedResponse(args.success);
    }
    if (args.e !== undefined && args.e !== null) {
      this.e = args.e;
    }
  }
};
QrCheckService_checkQrCodeVerified_result.prototype = {};
QrCheckService_checkQrCodeVerified_result.prototype[Symbol.for("read")] = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 0:
      if (ftype == Thrift.Type.STRUCT) {
        this.success = new ttypes.CheckQrCodeVerifiedResponse();
        this.success[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.e = new ttypes.TalkException();
        this.e[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

QrCheckService_checkQrCodeVerified_result.prototype[Symbol.for("write")] = function(output) {
  output.writeStructBegin('QrCheckService_checkQrCodeVerified_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRUCT, 0);
    this.success[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  if (this.e !== null && this.e !== undefined) {
    output.writeFieldBegin('e', Thrift.Type.STRUCT, 1);
    this.e[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var QrCheckService_verifyCertificate_args = function(args) {
  this.request = null;
  if (args) {
    if (args.request !== undefined && args.request !== null) {
      this.request = new ttypes.VerifyCertificateRequest(args.request);
    }
  }
};
QrCheckService_verifyCertificate_args.prototype = {};
QrCheckService_verifyCertificate_args.prototype[Symbol.for("read")] = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.request = new ttypes.VerifyCertificateRequest();
        this.request[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

QrCheckService_verifyCertificate_args.prototype[Symbol.for("write")] = function(output) {
  output.writeStructBegin('QrCheckService_verifyCertificate_args');
  if (this.request !== null && this.request !== undefined) {
    output.writeFieldBegin('request', Thrift.Type.STRUCT, 1);
    this.request[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var QrCheckService_verifyCertificate_result = function(args) {
  this.success = null;
  this.e = null;
  if (args instanceof ttypes.TalkException) {
    this.e = args;
    return;
  }
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = new ttypes.VerifyCertificateResponse(args.success);
    }
    if (args.e !== undefined && args.e !== null) {
      this.e = args.e;
    }
  }
};
QrCheckService_verifyCertificate_result.prototype = {};
QrCheckService_verifyCertificate_result.prototype[Symbol.for("read")] = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 0:
      if (ftype == Thrift.Type.STRUCT) {
        this.success = new ttypes.VerifyCertificateResponse();
        this.success[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.e = new ttypes.TalkException();
        this.e[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

QrCheckService_verifyCertificate_result.prototype[Symbol.for("write")] = function(output) {
  output.writeStructBegin('QrCheckService_verifyCertificate_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRUCT, 0);
    this.success[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  if (this.e !== null && this.e !== undefined) {
    output.writeFieldBegin('e', Thrift.Type.STRUCT, 1);
    this.e[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var QrCheckService_createPinCode_args = function(args) {
  this.request = null;
  if (args) {
    if (args.request !== undefined && args.request !== null) {
      this.request = new ttypes.CreatePinCodeRequest(args.request);
    }
  }
};
QrCheckService_createPinCode_args.prototype = {};
QrCheckService_createPinCode_args.prototype[Symbol.for("read")] = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.request = new ttypes.CreatePinCodeRequest();
        this.request[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

QrCheckService_createPinCode_args.prototype[Symbol.for("write")] = function(output) {
  output.writeStructBegin('QrCheckService_createPinCode_args');
  if (this.request !== null && this.request !== undefined) {
    output.writeFieldBegin('request', Thrift.Type.STRUCT, 1);
    this.request[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var QrCheckService_createPinCode_result = function(args) {
  this.success = null;
  this.e = null;
  if (args instanceof ttypes.TalkException) {
    this.e = args;
    return;
  }
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = new ttypes.CreatePinCodeResponse(args.success);
    }
    if (args.e !== undefined && args.e !== null) {
      this.e = args.e;
    }
  }
};
QrCheckService_createPinCode_result.prototype = {};
QrCheckService_createPinCode_result.prototype[Symbol.for("read")] = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 0:
      if (ftype == Thrift.Type.STRUCT) {
        this.success = new ttypes.CreatePinCodeResponse();
        this.success[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.e = new ttypes.TalkException();
        this.e[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

QrCheckService_createPinCode_result.prototype[Symbol.for("write")] = function(output) {
  output.writeStructBegin('QrCheckService_createPinCode_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRUCT, 0);
    this.success[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  if (this.e !== null && this.e !== undefined) {
    output.writeFieldBegin('e', Thrift.Type.STRUCT, 1);
    this.e[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var QrCheckService_checkPinCodeVerified_args = function(args) {
  this.request = null;
  if (args) {
    if (args.request !== undefined && args.request !== null) {
      this.request = new ttypes.CheckPinCodeVerifiedRequest(args.request);
    }
  }
};
QrCheckService_checkPinCodeVerified_args.prototype = {};
QrCheckService_checkPinCodeVerified_args.prototype[Symbol.for("read")] = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.request = new ttypes.CheckPinCodeVerifiedRequest();
        this.request[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

QrCheckService_checkPinCodeVerified_args.prototype[Symbol.for("write")] = function(output) {
  output.writeStructBegin('QrCheckService_checkPinCodeVerified_args');
  if (this.request !== null && this.request !== undefined) {
    output.writeFieldBegin('request', Thrift.Type.STRUCT, 1);
    this.request[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var QrCheckService_checkPinCodeVerified_result = function(args) {
  this.success = null;
  this.e = null;
  if (args instanceof ttypes.TalkException) {
    this.e = args;
    return;
  }
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = new ttypes.CheckPinCodeVerifiedResponse(args.success);
    }
    if (args.e !== undefined && args.e !== null) {
      this.e = args.e;
    }
  }
};
QrCheckService_checkPinCodeVerified_result.prototype = {};
QrCheckService_checkPinCodeVerified_result.prototype[Symbol.for("read")] = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 0:
      if (ftype == Thrift.Type.STRUCT) {
        this.success = new ttypes.CheckPinCodeVerifiedResponse();
        this.success[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.e = new ttypes.TalkException();
        this.e[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

QrCheckService_checkPinCodeVerified_result.prototype[Symbol.for("write")] = function(output) {
  output.writeStructBegin('QrCheckService_checkPinCodeVerified_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRUCT, 0);
    this.success[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  if (this.e !== null && this.e !== undefined) {
    output.writeFieldBegin('e', Thrift.Type.STRUCT, 1);
    this.e[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var QrCheckService_qrCodeLoginV2ForSecure_args = function(args) {
  this.request = null;
  if (args) {
    if (args.request !== undefined && args.request !== null) {
      this.request = new ttypes.QrCodeLoginV2ForSecureRequest(args.request);
    }
  }
};
QrCheckService_qrCodeLoginV2ForSecure_args.prototype = {};
QrCheckService_qrCodeLoginV2ForSecure_args.prototype[Symbol.for("read")] = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.request = new ttypes.QrCodeLoginV2ForSecureRequest();
        this.request[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

QrCheckService_qrCodeLoginV2ForSecure_args.prototype[Symbol.for("write")] = function(output) {
  output.writeStructBegin('QrCheckService_qrCodeLoginV2ForSecure_args');
  if (this.request !== null && this.request !== undefined) {
    output.writeFieldBegin('request', Thrift.Type.STRUCT, 1);
    this.request[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var QrCheckService_qrCodeLoginV2ForSecure_result = function(args) {
  this.success = null;
  this.e = null;
  if (args instanceof ttypes.TalkException) {
    this.e = args;
    return;
  }
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = new ttypes.QrCodeLoginV2Response(args.success);
    }
    if (args.e !== undefined && args.e !== null) {
      this.e = args.e;
    }
  }
};
QrCheckService_qrCodeLoginV2ForSecure_result.prototype = {};
QrCheckService_qrCodeLoginV2ForSecure_result.prototype[Symbol.for("read")] = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 0:
      if (ftype == Thrift.Type.STRUCT) {
        this.success = new ttypes.QrCodeLoginV2Response();
        this.success[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.e = new ttypes.TalkException();
        this.e[Symbol.for("read")](input);
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

QrCheckService_qrCodeLoginV2ForSecure_result.prototype[Symbol.for("write")] = function(output) {
  output.writeStructBegin('QrCheckService_qrCodeLoginV2ForSecure_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRUCT, 0);
    this.success[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  if (this.e !== null && this.e !== undefined) {
    output.writeFieldBegin('e', Thrift.Type.STRUCT, 1);
    this.e[Symbol.for("write")](output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var QrCheckServiceClient = function(output, pClass) {
  this.output = output;
  this.pClass = pClass;
  this._seqid = 0;
  this._reqs = {};
};
QrCheckServiceClient.prototype = {};
QrCheckServiceClient.prototype.seqid = function() { return this._seqid; };
QrCheckServiceClient.prototype.new_seqid = function() { return this._seqid += 1; };

QrCheckServiceClient.prototype.createSession = function(request, callback) {
  this._seqid = this.new_seqid();
  if (callback === undefined) {
    var _defer = Q.defer();
    this._reqs[this.seqid()] = function(error, result) {
      if (error) {
        _defer.reject(error);
      } else {
        _defer.resolve(result);
      }
    };
    this.send_createSession(request);
    return _defer.promise;
  } else {
    this._reqs[this.seqid()] = callback;
    this.send_createSession(request);
  }
};

QrCheckServiceClient.prototype.send_createSession = function(request) {
  var output = new this.pClass(this.output);
  var params = {
    request: request
  };
  var args = new QrCheckService_createSession_args(params);
  try {
    output.writeMessageBegin('createSession', Thrift.MessageType.CALL, this.seqid());
    args[Symbol.for("write")](output);
    output.writeMessageEnd();
    return this.output.flush();
  }
  catch (e) {
    delete this._reqs[this.seqid()];
    if (typeof output.reset === 'function') {
      output.reset();
    }
    throw e;
  }
};

QrCheckServiceClient.prototype.recv_createSession = function(input,mtype,rseqid) {
  var callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x[Symbol.for("read")](input);
    input.readMessageEnd();
    return callback(x);
  }
  var result = new QrCheckService_createSession_result();
  result[Symbol.for("read")](input);
  input.readMessageEnd();

  if (null !== result.e) {
    return callback(result.e);
  }
  if (null !== result.success) {
    return callback(null, result.success);
  }
  return callback('createSession failed: unknown result');
};

QrCheckServiceClient.prototype.createQrCodeForSecure = function(request, callback) {
  this._seqid = this.new_seqid();
  if (callback === undefined) {
    var _defer = Q.defer();
    this._reqs[this.seqid()] = function(error, result) {
      if (error) {
        _defer.reject(error);
      } else {
        _defer.resolve(result);
      }
    };
    this.send_createQrCodeForSecure(request);
    return _defer.promise;
  } else {
    this._reqs[this.seqid()] = callback;
    this.send_createQrCodeForSecure(request);
  }
};

QrCheckServiceClient.prototype.send_createQrCodeForSecure = function(request) {
  var output = new this.pClass(this.output);
  var params = {
    request: request
  };
  var args = new QrCheckService_createQrCodeForSecure_args(params);
  try {
    output.writeMessageBegin('createQrCodeForSecure', Thrift.MessageType.CALL, this.seqid());
    args[Symbol.for("write")](output);
    output.writeMessageEnd();
    return this.output.flush();
  }
  catch (e) {
    delete this._reqs[this.seqid()];
    if (typeof output.reset === 'function') {
      output.reset();
    }
    throw e;
  }
};

QrCheckServiceClient.prototype.recv_createQrCodeForSecure = function(input,mtype,rseqid) {
  var callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x[Symbol.for("read")](input);
    input.readMessageEnd();
    return callback(x);
  }
  var result = new QrCheckService_createQrCodeForSecure_result();
  result[Symbol.for("read")](input);
  input.readMessageEnd();

  if (null !== result.e) {
    return callback(result.e);
  }
  if (null !== result.success) {
    return callback(null, result.success);
  }
  return callback('createQrCodeForSecure failed: unknown result');
};

QrCheckServiceClient.prototype.checkQrCodeVerified = function(request, callback) {
  this._seqid = this.new_seqid();
  if (callback === undefined) {
    var _defer = Q.defer();
    this._reqs[this.seqid()] = function(error, result) {
      if (error) {
        _defer.reject(error);
      } else {
        _defer.resolve(result);
      }
    };
    this.send_checkQrCodeVerified(request);
    return _defer.promise;
  } else {
    this._reqs[this.seqid()] = callback;
    this.send_checkQrCodeVerified(request);
  }
};

QrCheckServiceClient.prototype.send_checkQrCodeVerified = function(request) {
  var output = new this.pClass(this.output);
  var params = {
    request: request
  };
  var args = new QrCheckService_checkQrCodeVerified_args(params);
  try {
    output.writeMessageBegin('checkQrCodeVerified', Thrift.MessageType.CALL, this.seqid());
    args[Symbol.for("write")](output);
    output.writeMessageEnd();
    return this.output.flush();
  }
  catch (e) {
    delete this._reqs[this.seqid()];
    if (typeof output.reset === 'function') {
      output.reset();
    }
    throw e;
  }
};

QrCheckServiceClient.prototype.recv_checkQrCodeVerified = function(input,mtype,rseqid) {
  var callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x[Symbol.for("read")](input);
    input.readMessageEnd();
    return callback(x);
  }
  var result = new QrCheckService_checkQrCodeVerified_result();
  result[Symbol.for("read")](input);
  input.readMessageEnd();

  if (null !== result.e) {
    return callback(result.e);
  }
  if (null !== result.success) {
    return callback(null, result.success);
  }
  return callback('checkQrCodeVerified failed: unknown result');
};

QrCheckServiceClient.prototype.verifyCertificate = function(request, callback) {
  this._seqid = this.new_seqid();
  if (callback === undefined) {
    var _defer = Q.defer();
    this._reqs[this.seqid()] = function(error, result) {
      if (error) {
        _defer.reject(error);
      } else {
        _defer.resolve(result);
      }
    };
    this.send_verifyCertificate(request);
    return _defer.promise;
  } else {
    this._reqs[this.seqid()] = callback;
    this.send_verifyCertificate(request);
  }
};

QrCheckServiceClient.prototype.send_verifyCertificate = function(request) {
  var output = new this.pClass(this.output);
  var params = {
    request: request
  };
  var args = new QrCheckService_verifyCertificate_args(params);
  try {
    output.writeMessageBegin('verifyCertificate', Thrift.MessageType.CALL, this.seqid());
    args[Symbol.for("write")](output);
    output.writeMessageEnd();
    return this.output.flush();
  }
  catch (e) {
    delete this._reqs[this.seqid()];
    if (typeof output.reset === 'function') {
      output.reset();
    }
    throw e;
  }
};

QrCheckServiceClient.prototype.recv_verifyCertificate = function(input,mtype,rseqid) {
  var callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x[Symbol.for("read")](input);
    input.readMessageEnd();
    return callback(x);
  }
  var result = new QrCheckService_verifyCertificate_result();
  result[Symbol.for("read")](input);
  input.readMessageEnd();

  if (null !== result.e) {
    return callback(result.e);
  }
  if (null !== result.success) {
    return callback(null, result.success);
  }
  return callback('verifyCertificate failed: unknown result');
};

QrCheckServiceClient.prototype.createPinCode = function(request, callback) {
  this._seqid = this.new_seqid();
  if (callback === undefined) {
    var _defer = Q.defer();
    this._reqs[this.seqid()] = function(error, result) {
      if (error) {
        _defer.reject(error);
      } else {
        _defer.resolve(result);
      }
    };
    this.send_createPinCode(request);
    return _defer.promise;
  } else {
    this._reqs[this.seqid()] = callback;
    this.send_createPinCode(request);
  }
};

QrCheckServiceClient.prototype.send_createPinCode = function(request) {
  var output = new this.pClass(this.output);
  var params = {
    request: request
  };
  var args = new QrCheckService_createPinCode_args(params);
  try {
    output.writeMessageBegin('createPinCode', Thrift.MessageType.CALL, this.seqid());
    args[Symbol.for("write")](output);
    output.writeMessageEnd();
    return this.output.flush();
  }
  catch (e) {
    delete this._reqs[this.seqid()];
    if (typeof output.reset === 'function') {
      output.reset();
    }
    throw e;
  }
};

QrCheckServiceClient.prototype.recv_createPinCode = function(input,mtype,rseqid) {
  var callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x[Symbol.for("read")](input);
    input.readMessageEnd();
    return callback(x);
  }
  var result = new QrCheckService_createPinCode_result();
  result[Symbol.for("read")](input);
  input.readMessageEnd();

  if (null !== result.e) {
    return callback(result.e);
  }
  if (null !== result.success) {
    return callback(null, result.success);
  }
  return callback('createPinCode failed: unknown result');
};

QrCheckServiceClient.prototype.checkPinCodeVerified = function(request, callback) {
  this._seqid = this.new_seqid();
  if (callback === undefined) {
    var _defer = Q.defer();
    this._reqs[this.seqid()] = function(error, result) {
      if (error) {
        _defer.reject(error);
      } else {
        _defer.resolve(result);
      }
    };
    this.send_checkPinCodeVerified(request);
    return _defer.promise;
  } else {
    this._reqs[this.seqid()] = callback;
    this.send_checkPinCodeVerified(request);
  }
};

QrCheckServiceClient.prototype.send_checkPinCodeVerified = function(request) {
  var output = new this.pClass(this.output);
  var params = {
    request: request
  };
  var args = new QrCheckService_checkPinCodeVerified_args(params);
  try {
    output.writeMessageBegin('checkPinCodeVerified', Thrift.MessageType.CALL, this.seqid());
    args[Symbol.for("write")](output);
    output.writeMessageEnd();
    return this.output.flush();
  }
  catch (e) {
    delete this._reqs[this.seqid()];
    if (typeof output.reset === 'function') {
      output.reset();
    }
    throw e;
  }
};

QrCheckServiceClient.prototype.recv_checkPinCodeVerified = function(input,mtype,rseqid) {
  var callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x[Symbol.for("read")](input);
    input.readMessageEnd();
    return callback(x);
  }
  var result = new QrCheckService_checkPinCodeVerified_result();
  result[Symbol.for("read")](input);
  input.readMessageEnd();

  if (null !== result.e) {
    return callback(result.e);
  }
  if (null !== result.success) {
    return callback(null, result.success);
  }
  return callback('checkPinCodeVerified failed: unknown result');
};

QrCheckServiceClient.prototype.qrCodeLoginV2ForSecure = function(request, callback) {
  this._seqid = this.new_seqid();
  if (callback === undefined) {
    var _defer = Q.defer();
    this._reqs[this.seqid()] = function(error, result) {
      if (error) {
        _defer.reject(error);
      } else {
        _defer.resolve(result);
      }
    };
    this.send_qrCodeLoginV2ForSecure(request);
    return _defer.promise;
  } else {
    this._reqs[this.seqid()] = callback;
    this.send_qrCodeLoginV2ForSecure(request);
  }
};

QrCheckServiceClient.prototype.send_qrCodeLoginV2ForSecure = function(request) {
  var output = new this.pClass(this.output);
  var params = {
    request: request
  };
  var args = new QrCheckService_qrCodeLoginV2ForSecure_args(params);
  try {
    output.writeMessageBegin('qrCodeLoginV2ForSecure', Thrift.MessageType.CALL, this.seqid());
    args[Symbol.for("write")](output);
    output.writeMessageEnd();
    return this.output.flush();
  }
  catch (e) {
    delete this._reqs[this.seqid()];
    if (typeof output.reset === 'function') {
      output.reset();
    }
    throw e;
  }
};

QrCheckServiceClient.prototype.recv_qrCodeLoginV2ForSecure = function(input,mtype,rseqid) {
  var callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x[Symbol.for("read")](input);
    input.readMessageEnd();
    return callback(x);
  }
  var result = new QrCheckService_qrCodeLoginV2ForSecure_result();
  result[Symbol.for("read")](input);
  input.readMessageEnd();

  if (null !== result.e) {
    return callback(result.e);
  }
  if (null !== result.success) {
    return callback(null, result.success);
  }
  return callback('qrCodeLoginV2ForSecure failed: unknown result');
};
exports.Client = QrCheckServiceClient;
var QrCheckServiceProcessor = function(handler) {
  this._handler = handler;
};
QrCheckServiceProcessor.prototype.process = function(input, output) {
  var r = input.readMessageBegin();
  if (this['process_' + r.fname]) {
    return this['process_' + r.fname].call(this, r.rseqid, input, output);
  } else {
    input.skip(Thrift.Type.STRUCT);
    input.readMessageEnd();
    var x = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN_METHOD, 'Unknown function ' + r.fname);
    output.writeMessageBegin(r.fname, Thrift.MessageType.EXCEPTION, r.rseqid);
    x[Symbol.for("write")](output);
    output.writeMessageEnd();
    output.flush();
  }
};
QrCheckServiceProcessor.prototype.process_createSession = function(seqid, input, output) {
  var args = new QrCheckService_createSession_args();
  args[Symbol.for("read")](input);
  input.readMessageEnd();
  if (this._handler.createSession.length === 1) {
    Q.fcall(this._handler.createSession.bind(this._handler),
      args.request
    ).then(function(result) {
      var result_obj = new QrCheckService_createSession_result({success: result});
      output.writeMessageBegin("createSession", Thrift.MessageType.REPLY, seqid);
      result_obj[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    }).catch(function (err) {
      var result;
      if (err instanceof ttypes.TalkException) {
        result = new QrCheckService_createSession_result(err);
        output.writeMessageBegin("createSession", Thrift.MessageType.REPLY, seqid);
      } else {
        result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("createSession", Thrift.MessageType.EXCEPTION, seqid);
      }
      result[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    });
  } else {
    this._handler.createSession(args.request, function (err, result) {
      var result_obj;
      if ((err === null || typeof err === 'undefined') || err instanceof ttypes.TalkException) {
        result_obj = new QrCheckService_createSession_result((err !== null || typeof err === 'undefined') ? err : {success: result});
        output.writeMessageBegin("createSession", Thrift.MessageType.REPLY, seqid);
      } else {
        result_obj = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("createSession", Thrift.MessageType.EXCEPTION, seqid);
      }
      result_obj[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    });
  }
};
QrCheckServiceProcessor.prototype.process_createQrCodeForSecure = function(seqid, input, output) {
  var args = new QrCheckService_createQrCodeForSecure_args();
  args[Symbol.for("read")](input);
  input.readMessageEnd();
  if (this._handler.createQrCodeForSecure.length === 1) {
    Q.fcall(this._handler.createQrCodeForSecure.bind(this._handler),
      args.request
    ).then(function(result) {
      var result_obj = new QrCheckService_createQrCodeForSecure_result({success: result});
      output.writeMessageBegin("createQrCodeForSecure", Thrift.MessageType.REPLY, seqid);
      result_obj[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    }).catch(function (err) {
      var result;
      if (err instanceof ttypes.SecondaryQrCodeException) {
        result = new QrCheckService_createQrCodeForSecure_result(err);
        output.writeMessageBegin("createQrCodeForSecure", Thrift.MessageType.REPLY, seqid);
      } else {
        result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("createQrCodeForSecure", Thrift.MessageType.EXCEPTION, seqid);
      }
      result[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    });
  } else {
    this._handler.createQrCodeForSecure(args.request, function (err, result) {
      var result_obj;
      if ((err === null || typeof err === 'undefined') || err instanceof ttypes.SecondaryQrCodeException) {
        result_obj = new QrCheckService_createQrCodeForSecure_result((err !== null || typeof err === 'undefined') ? err : {success: result});
        output.writeMessageBegin("createQrCodeForSecure", Thrift.MessageType.REPLY, seqid);
      } else {
        result_obj = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("createQrCodeForSecure", Thrift.MessageType.EXCEPTION, seqid);
      }
      result_obj[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    });
  }
};
QrCheckServiceProcessor.prototype.process_checkQrCodeVerified = function(seqid, input, output) {
  var args = new QrCheckService_checkQrCodeVerified_args();
  args[Symbol.for("read")](input);
  input.readMessageEnd();
  if (this._handler.checkQrCodeVerified.length === 1) {
    Q.fcall(this._handler.checkQrCodeVerified.bind(this._handler),
      args.request
    ).then(function(result) {
      var result_obj = new QrCheckService_checkQrCodeVerified_result({success: result});
      output.writeMessageBegin("checkQrCodeVerified", Thrift.MessageType.REPLY, seqid);
      result_obj[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    }).catch(function (err) {
      var result;
      if (err instanceof ttypes.TalkException) {
        result = new QrCheckService_checkQrCodeVerified_result(err);
        output.writeMessageBegin("checkQrCodeVerified", Thrift.MessageType.REPLY, seqid);
      } else {
        result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("checkQrCodeVerified", Thrift.MessageType.EXCEPTION, seqid);
      }
      result[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    });
  } else {
    this._handler.checkQrCodeVerified(args.request, function (err, result) {
      var result_obj;
      if ((err === null || typeof err === 'undefined') || err instanceof ttypes.TalkException) {
        result_obj = new QrCheckService_checkQrCodeVerified_result((err !== null || typeof err === 'undefined') ? err : {success: result});
        output.writeMessageBegin("checkQrCodeVerified", Thrift.MessageType.REPLY, seqid);
      } else {
        result_obj = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("checkQrCodeVerified", Thrift.MessageType.EXCEPTION, seqid);
      }
      result_obj[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    });
  }
};
QrCheckServiceProcessor.prototype.process_verifyCertificate = function(seqid, input, output) {
  var args = new QrCheckService_verifyCertificate_args();
  args[Symbol.for("read")](input);
  input.readMessageEnd();
  if (this._handler.verifyCertificate.length === 1) {
    Q.fcall(this._handler.verifyCertificate.bind(this._handler),
      args.request
    ).then(function(result) {
      var result_obj = new QrCheckService_verifyCertificate_result({success: result});
      output.writeMessageBegin("verifyCertificate", Thrift.MessageType.REPLY, seqid);
      result_obj[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    }).catch(function (err) {
      var result;
      if (err instanceof ttypes.TalkException) {
        result = new QrCheckService_verifyCertificate_result(err);
        output.writeMessageBegin("verifyCertificate", Thrift.MessageType.REPLY, seqid);
      } else {
        result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("verifyCertificate", Thrift.MessageType.EXCEPTION, seqid);
      }
      result[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    });
  } else {
    this._handler.verifyCertificate(args.request, function (err, result) {
      var result_obj;
      if ((err === null || typeof err === 'undefined') || err instanceof ttypes.TalkException) {
        result_obj = new QrCheckService_verifyCertificate_result((err !== null || typeof err === 'undefined') ? err : {success: result});
        output.writeMessageBegin("verifyCertificate", Thrift.MessageType.REPLY, seqid);
      } else {
        result_obj = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("verifyCertificate", Thrift.MessageType.EXCEPTION, seqid);
      }
      result_obj[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    });
  }
};
QrCheckServiceProcessor.prototype.process_createPinCode = function(seqid, input, output) {
  var args = new QrCheckService_createPinCode_args();
  args[Symbol.for("read")](input);
  input.readMessageEnd();
  if (this._handler.createPinCode.length === 1) {
    Q.fcall(this._handler.createPinCode.bind(this._handler),
      args.request
    ).then(function(result) {
      var result_obj = new QrCheckService_createPinCode_result({success: result});
      output.writeMessageBegin("createPinCode", Thrift.MessageType.REPLY, seqid);
      result_obj[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    }).catch(function (err) {
      var result;
      if (err instanceof ttypes.TalkException) {
        result = new QrCheckService_createPinCode_result(err);
        output.writeMessageBegin("createPinCode", Thrift.MessageType.REPLY, seqid);
      } else {
        result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("createPinCode", Thrift.MessageType.EXCEPTION, seqid);
      }
      result[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    });
  } else {
    this._handler.createPinCode(args.request, function (err, result) {
      var result_obj;
      if ((err === null || typeof err === 'undefined') || err instanceof ttypes.TalkException) {
        result_obj = new QrCheckService_createPinCode_result((err !== null || typeof err === 'undefined') ? err : {success: result});
        output.writeMessageBegin("createPinCode", Thrift.MessageType.REPLY, seqid);
      } else {
        result_obj = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("createPinCode", Thrift.MessageType.EXCEPTION, seqid);
      }
      result_obj[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    });
  }
};
QrCheckServiceProcessor.prototype.process_checkPinCodeVerified = function(seqid, input, output) {
  var args = new QrCheckService_checkPinCodeVerified_args();
  args[Symbol.for("read")](input);
  input.readMessageEnd();
  if (this._handler.checkPinCodeVerified.length === 1) {
    Q.fcall(this._handler.checkPinCodeVerified.bind(this._handler),
      args.request
    ).then(function(result) {
      var result_obj = new QrCheckService_checkPinCodeVerified_result({success: result});
      output.writeMessageBegin("checkPinCodeVerified", Thrift.MessageType.REPLY, seqid);
      result_obj[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    }).catch(function (err) {
      var result;
      if (err instanceof ttypes.TalkException) {
        result = new QrCheckService_checkPinCodeVerified_result(err);
        output.writeMessageBegin("checkPinCodeVerified", Thrift.MessageType.REPLY, seqid);
      } else {
        result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("checkPinCodeVerified", Thrift.MessageType.EXCEPTION, seqid);
      }
      result[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    });
  } else {
    this._handler.checkPinCodeVerified(args.request, function (err, result) {
      var result_obj;
      if ((err === null || typeof err === 'undefined') || err instanceof ttypes.TalkException) {
        result_obj = new QrCheckService_checkPinCodeVerified_result((err !== null || typeof err === 'undefined') ? err : {success: result});
        output.writeMessageBegin("checkPinCodeVerified", Thrift.MessageType.REPLY, seqid);
      } else {
        result_obj = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("checkPinCodeVerified", Thrift.MessageType.EXCEPTION, seqid);
      }
      result_obj[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    });
  }
};
QrCheckServiceProcessor.prototype.process_qrCodeLoginV2ForSecure = function(seqid, input, output) {
  var args = new QrCheckService_qrCodeLoginV2ForSecure_args();
  args[Symbol.for("read")](input);
  input.readMessageEnd();
  if (this._handler.qrCodeLoginV2ForSecure.length === 1) {
    Q.fcall(this._handler.qrCodeLoginV2ForSecure.bind(this._handler),
      args.request
    ).then(function(result) {
      var result_obj = new QrCheckService_qrCodeLoginV2ForSecure_result({success: result});
      output.writeMessageBegin("qrCodeLoginV2ForSecure", Thrift.MessageType.REPLY, seqid);
      result_obj[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    }).catch(function (err) {
      var result;
      if (err instanceof ttypes.TalkException) {
        result = new QrCheckService_qrCodeLoginV2ForSecure_result(err);
        output.writeMessageBegin("qrCodeLoginV2ForSecure", Thrift.MessageType.REPLY, seqid);
      } else {
        result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("qrCodeLoginV2ForSecure", Thrift.MessageType.EXCEPTION, seqid);
      }
      result[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    });
  } else {
    this._handler.qrCodeLoginV2ForSecure(args.request, function (err, result) {
      var result_obj;
      if ((err === null || typeof err === 'undefined') || err instanceof ttypes.TalkException) {
        result_obj = new QrCheckService_qrCodeLoginV2ForSecure_result((err !== null || typeof err === 'undefined') ? err : {success: result});
        output.writeMessageBegin("qrCodeLoginV2ForSecure", Thrift.MessageType.REPLY, seqid);
      } else {
        result_obj = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("qrCodeLoginV2ForSecure", Thrift.MessageType.EXCEPTION, seqid);
      }
      result_obj[Symbol.for("write")](output);
      output.writeMessageEnd();
      output.flush();
    });
  }
};
exports.Processor = QrCheckServiceProcessor;
