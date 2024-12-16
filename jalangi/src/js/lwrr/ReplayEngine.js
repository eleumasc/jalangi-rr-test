var path = require("path");
var Constants = require("./Constants");
var Globals = require("./Globals");
var TraceReader = require("./TraceReader");

exports.ReplayEngine = function (traceFilename) {
  var traceDirname = path.dirname(traceFilename);

  var traceReader = TraceReader.fromFile(traceFilename);

  var SPECIAL_PROP_INIT_DESCRIPTOR = Constants.SPECIAL_PROP_INIT_DESCRIPTOR;
  var DefineProperty = Constants.DefineProperty;

  var SPECIAL_PROP1 = Constants.SPECIAL_PROP1;
  var SPECIAL_PROP2 = Constants.SPECIAL_PROP2;
  var SPECIAL_PROP3 = Constants.SPECIAL_PROP3;
  var SPECIAL_PROP4 = Constants.SPECIAL_PROP4;

  var T_NULL = Constants.T_NULL,
    T_NUMBER = Constants.T_NUMBER,
    T_BOOLEAN = Constants.T_BOOLEAN,
    T_STRING = Constants.T_STRING,
    T_OBJECT = Constants.T_OBJECT,
    T_FUNCTION = Constants.T_FUNCTION,
    T_UNDEFINED = Constants.T_UNDEFINED,
    T_ARRAY = Constants.T_ARRAY;

  var F_TYPE = Constants.F_TYPE,
    F_VALUE = Constants.F_VALUE,
    F_IID = Constants.F_IID,
    F_FUNNAME = Constants.F_FUNNAME;

  var N_LOG_FUNCTION_ENTER = Constants.N_LOG_FUNCTION_ENTER,
    N_LOG_SCRIPT_ENTER = Constants.N_LOG_SCRIPT_ENTER,
    N_LOG_GETFIELD = Constants.N_LOG_GETFIELD,
    N_LOG_ARRAY_LIT = Constants.N_LOG_ARRAY_LIT,
    N_LOG_OBJECT_LIT = Constants.N_LOG_OBJECT_LIT,
    N_LOG_FUNCTION_LIT = Constants.N_LOG_FUNCTION_LIT,
    N_LOG_RETURN = Constants.N_LOG_RETURN,
    N_LOG_REGEXP_LIT = Constants.N_LOG_REGEXP_LIT,
    N_LOG_READ = Constants.N_LOG_READ,
    N_LOG_LOAD = Constants.N_LOG_LOAD,
    N_LOG_SPECIAL = Constants.N_LOG_SPECIAL,
    N_LOG_GETFIELD_OWN = Constants.N_LOG_GETFIELD_OWN;

  var HasOwnProperty = Constants.HasOwnProperty;
  var hasGetterSetter = Constants.hasGetterSetter;

  var freshLitId = 2;
  var topFrame = { this: undefined };
  var frameStack = [topFrame];
  var evalFrameStack = [];

  var objectMap = [];
  var createdMockObject = false;

  var enumTypeId = {
    number: T_NUMBER,
    boolean: T_BOOLEAN,
    string: T_STRING,
    object: T_OBJECT,
    function: T_FUNCTION,
    undefined: T_UNDEFINED,
  };

  function toTypeId(val) {
    var typeId = enumTypeId[typeof val];
    if (typeId === T_OBJECT) {
      if (!val) {
        return T_NULL;
      } else if (Array.isArray(val)) {
        return T_ARRAY;
      }
    }
    return typeId;
  }

  function setLiteralId(val, HasGetterSetter) {
    var id;
    var oldVal = val;
    val = oldVal;
    if (!HasOwnProperty(val, SPECIAL_PROP1) || !val[SPECIAL_PROP1]) {
      DefineProperty(val, SPECIAL_PROP1, SPECIAL_PROP_INIT_DESCRIPTOR);
      if (Array.isArray(val)) val[SPECIAL_PROP1] = [];
      else val[SPECIAL_PROP1] = {};
      val[SPECIAL_PROP1][SPECIAL_PROP1] = id = freshLitId;
      freshLitId += 2;
      // changes due to getter or setter method
      for (var offset in val) {
        if (
          offset !== SPECIAL_PROP1 &&
          offset !== SPECIAL_PROP2 &&
          HasOwnProperty(val, offset)
        ) {
          if (!HasGetterSetter || !hasGetterSetter(val, offset, true))
            val[SPECIAL_PROP1][offset] = val[offset];
        }
      }
    }
    if (traceReader.hasFutureReference(id)) objectMap[id] = oldVal;
    val[SPECIAL_PROP1][SPECIAL_PROP4] = oldVal;
  }

  function getActualValue(recordedValue, recordedType) {
    if (recordedType === T_UNDEFINED) {
      return undefined;
    } else if (recordedType === T_NULL) {
      return null;
    } else {
      return recordedValue;
    }
  }

  function syncValue(recordedArray, replayValue, iid) {
    var oldReplayValue = replayValue,
      tmp;

    var recordedValue = recordedArray[F_VALUE],
      recordedType = recordedArray[F_TYPE];

    if (
      recordedType === T_UNDEFINED ||
      recordedType === T_NULL ||
      recordedType === T_NUMBER ||
      recordedType === T_STRING ||
      recordedType === T_BOOLEAN
    ) {
      if ((tmp = getActualValue(recordedValue, recordedType)) !== replayValue) {
        return tmp;
      } else {
        return oldReplayValue;
      }
    } else {
      var obj = objectMap[recordedValue];
      var type = toTypeId(replayValue);

      if (obj === undefined) {
        if (
          type === recordedType &&
          !(
            HasOwnProperty(replayValue, SPECIAL_PROP1) &&
            replayValue[SPECIAL_PROP1]
          )
        ) {
          obj = replayValue;
        } else {
          if (recordedType === T_OBJECT) {
            obj = {};
          } else if (recordedType === T_ARRAY) {
            obj = [];
          } else {
            obj = function () {};
          }
        }
        DefineProperty(obj, SPECIAL_PROP1, SPECIAL_PROP_INIT_DESCRIPTOR); // FIXME: throws an error in case of frozen objects and some DOM objects
        obj[SPECIAL_PROP1] = {};
        obj[SPECIAL_PROP1][SPECIAL_PROP1] = recordedValue;
        createdMockObject = true;
        var tmp2 = obj === replayValue ? oldReplayValue : obj;
        if (
          recordedValue !== Constants.UNKNOWN &&
          traceReader.hasFutureReference(recordedValue)
        )
          objectMap[recordedValue] = tmp2;
        obj[SPECIAL_PROP1][SPECIAL_PROP4] = tmp2;
      } else if (traceReader.canDeleteReference(recordedArray)) {
        objectMap[recordedValue] = undefined;
      }

      return obj === replayValue ? oldReplayValue : obj;
    }
  }

  function checkPath(ret, iid, fun) {
    if (ret === undefined || ret[F_IID] !== iid) {
      if (fun === N_LOG_RETURN) {
        throw undefined; // a native function call has thrown an exception
      } else {
        throw new Error(
          "Path deviation at record = [" +
            ret +
            "] iid = " +
            iid +
            " seq = " +
            (traceReader.getSequence() - 1)
        );
      }
    }
  }

  function getFrameContainingVar(name) {
    var tmp = topFrame;
    while (tmp && !HasOwnProperty(tmp, name)) {
      tmp = tmp[SPECIAL_PROP3];
    }
    if (tmp) {
      return tmp;
    } else {
      return frameStack[0]; // global scope
    }
  }

  this.RR_evalBegin = function () {
    evalFrameStack.push(topFrame);
    topFrame = frameStack[0];
  };

  this.RR_evalEnd = function () {
    topFrame = evalFrameStack.pop();
  };

  this.syncPrototypeChain = function (iid, obj) {
    var proto = Object.getPrototypeOf(obj);
    var oid = this.RR_Load(
      iid,
      proto && HasOwnProperty(proto, SPECIAL_PROP1) && proto[SPECIAL_PROP1]
        ? proto[SPECIAL_PROP1][SPECIAL_PROP1]
        : undefined,
      undefined
    );
    if (oid) {
      Object.setPrototypeOf(obj, objectMap[oid]);
    }
  };

  /**
   * getField
   */
  this.RR_G = function (iid, base, offset, val) {
    var rec = traceReader.getCurrent();
    if (rec === undefined) {
      traceReader.next();
      return val;
    } else {
      val = this.RR_L(iid, val, N_LOG_GETFIELD);
      // only add direct object properties
      if (rec[F_FUNNAME] === N_LOG_GETFIELD_OWN) {
        base[offset] = val;
      }
      return val;
    }
  };

  this.RR_P = function () {};

  this.RR_W = function (iid, name, val) {
    getFrameContainingVar(name)[name] = val;
  };

  this.RR_N = function (iid, name, val, isArgumentSync) {
    if (!isArgumentSync || Globals.isInstrumentedCaller) {
      return (topFrame[name] = val);
    } else {
      topFrame[name] = undefined;
      return this.RR_R(iid, name, val, true);
    }
  };

  this.RR_R = function (iid, name, val, useTopFrame) {
    var ret, trackedVal, trackedFrame;

    if (useTopFrame || name === "this") {
      trackedFrame = topFrame;
    } else {
      trackedFrame = getFrameContainingVar(name);
    }
    trackedVal = trackedFrame[name];

    if (traceReader.getCurrent() === undefined) {
      traceReader.next();
      if (
        name === "this" &&
        Globals.isInstrumentedCaller &&
        !Globals.isConstructorCall &&
        Globals.isMethodCall
      ) {
        ret = val;
      } else {
        ret = trackedVal;
      }
    } else {
      ret = trackedFrame[name] = this.RR_L(iid, val, N_LOG_READ);
    }
    return ret;
  };

  this.RR_Load = function (iid, val) {
    var ret;

    if (traceReader.getCurrent() === undefined) {
      traceReader.next();
      ret = val;
    } else {
      ret = this.RR_L(iid, val, N_LOG_LOAD);
    }
    return ret;
  };

  this.RR_Fe = function (iid, val, dis) {
    var ret;
    frameStack.push((topFrame = { this: undefined }));
    topFrame[SPECIAL_PROP3] = val[SPECIAL_PROP3];
    if (!Globals.isInstrumentedCaller) {
      ret = traceReader.next();
      checkPath(ret, iid);
      syncValue(ret, val, iid);
      ret = traceReader.next();
      checkPath(ret, iid);
      syncValue(ret, dis, iid);
    }
  };

  this.RR_Fr = function () {
    frameStack.pop();
    topFrame = frameStack[frameStack.length - 1];
  };

  this.RR_Se = function (iid) {
    var ret;
    frameStack.push((topFrame = { this: undefined }));
    topFrame[SPECIAL_PROP3] = frameStack[0];
    ret = traceReader.next();
    checkPath(ret, iid);
  };

  this.RR_Sr = function () {
    frameStack.pop();
    topFrame = frameStack[frameStack.length - 1];
  };

  this.RR_H = function (iid, val) {
    var ret;
    ret = traceReader.next();
    checkPath(ret, iid);
    val = ret[F_VALUE];
    ret = Object.create(null);
    for (i in val) {
      if (HasOwnProperty(val, i)) {
        ret[i] = 1;
      }
    }
    val = ret;
    return val;
  };

  this.RR_L = function (iid, val, fun) {
    var ret, old;
    ret = traceReader.getCurrent();
    checkPath(ret, iid, fun);
    traceReader.next();
    old = createdMockObject;
    createdMockObject = false;
    val = syncValue(ret, val, iid);
    if (createdMockObject) this.syncPrototypeChain(iid, val);
    createdMockObject = old;
    return val;
  };

  this.RR_T = function (iid, val, fun, hasGetterSetter) {
    if (
      fun === N_LOG_ARRAY_LIT ||
      fun === N_LOG_FUNCTION_LIT ||
      fun === N_LOG_OBJECT_LIT ||
      fun === N_LOG_REGEXP_LIT
    ) {
      setLiteralId(val, hasGetterSetter);
      if (fun === N_LOG_FUNCTION_LIT) {
        DefineProperty(val, SPECIAL_PROP3, SPECIAL_PROP_INIT_DESCRIPTOR);
        val[SPECIAL_PROP3] = topFrame;
      }
    }
  };

  this.RR_replay = function () {
    while (true) {
      var ret = traceReader.getCurrent();
      if (typeof ret !== "object") {
        return;
      }
      var f, prefix;
      if (ret[F_FUNNAME] === N_LOG_SPECIAL) {
        prefix = ret[F_VALUE];
        ret = traceReader.next();
      }
      if (ret[F_FUNNAME] === N_LOG_FUNCTION_ENTER) {
        f = syncValue(ret, undefined, 0);
        ret = traceReader.next(); // FIXME: it was getNext (not getAndNext)
        var thisArg = syncValue(ret, undefined, 0);
        Reflect.apply(f, thisArg, []);
      } else if (ret[F_FUNNAME] === N_LOG_SCRIPT_ENTER) {
        var filename = path.join(traceDirname, syncValue(ret, undefined, 0));
        require(filename);
      } else {
        return;
      }
    }
  };
};
