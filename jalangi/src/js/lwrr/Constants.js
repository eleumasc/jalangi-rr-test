var Constants = {};

module.exports = Constants;

Constants.SPECIAL_PROP1 = Symbol();
Constants.SPECIAL_PROP2 = Symbol();
Constants.SPECIAL_PROP3 = Symbol();
Constants.SPECIAL_PROP4 = Symbol();

Constants.T_NULL = 0;
Constants.T_NUMBER = 1;
Constants.T_BOOLEAN = 2;
var T_STRING = (Constants.T_STRING = 3);
Constants.T_OBJECT = 4;
Constants.T_FUNCTION = 5;
Constants.T_UNDEFINED = 6;
Constants.T_ARRAY = 7;

var F_TYPE = (Constants.F_TYPE = 0);
var F_VALUE = (Constants.F_VALUE = 1);
Constants.F_IID = 2;
Constants.F_SEQ = 3;
Constants.F_FUNNAME = 4;

Constants.UNKNOWN = -1;

Constants.N_LOG_FUNCTION_ENTER = 4;
Constants.N_LOG_SCRIPT_ENTER = 6;
Constants.N_LOG_GETFIELD = 8;
Constants.N_LOG_ARRAY_LIT = 10;
Constants.N_LOG_OBJECT_LIT = 11;
Constants.N_LOG_FUNCTION_LIT = 12;
Constants.N_LOG_RETURN = 13;
Constants.N_LOG_REGEXP_LIT = 14;
Constants.N_LOG_READ = 17;
Constants.N_LOG_LOAD = 18;
Constants.N_LOG_HASH = 19;
Constants.N_LOG_SPECIAL = 20;
Constants.N_LOG_STRING_LIT = 21;
Constants.N_LOG_NUMBER_LIT = 22;
Constants.N_LOG_BOOLEAN_LIT = 23;
Constants.N_LOG_UNDEFINED_LIT = 24;
Constants.N_LOG_NULL_LIT = 25;
Constants.N_LOG_GETFIELD_OWN = 26;
Constants.N_LOG_OPERATION = 27;

//-------------------------------- End constants ---------------------------------

//-------------------------------------- Constant functions -----------------------------------------------------------

Constants.DefineProperty = Object.defineProperty;
var HasOwnProperty = (Constants.HasOwnProperty = Function.prototype.call.bind(
  Object.prototype.hasOwnProperty
));

Constants.SPECIAL_PROP_INIT_DESCRIPTOR = {
  configurable: false,
  enumerable: false,
  value: undefined,
  writable: true,
};

Constants.hasGetterSetter = function (obj, prop, isGetter) {
  if (typeof Object.getOwnPropertyDescriptor !== "function") {
    return true;
  }
  while (obj !== null) {
    if (typeof obj !== "object" && typeof obj !== "function") {
      return false;
    }
    var desc = Object.getOwnPropertyDescriptor(obj, prop);
    if (desc !== undefined) {
      if (isGetter && typeof desc.get === "function") {
        return true;
      }
      if (!isGetter && typeof desc.set === "function") {
        return true;
      }
    } else if (HasOwnProperty(obj, prop)) {
      return false;
    }
    obj = obj.__proto__;
  }
  return false;
};

Constants.encodeNaNandInfForJSON = function (key, value) {
  if (value === Infinity) {
    return "Infinity";
  } else if (value !== value) {
    return "NaN";
  }
  return value;
};

Constants.decodeNaNandInfForJSON = function (key, value) {
  if (value === "Infinity") {
    return Infinity;
  } else if (value === "NaN") {
    return NaN;
  } else {
    return value;
  }
};

Constants.fixForStringNaN = function (record) {
  if (record[F_TYPE] == T_STRING) {
    if (record[F_VALUE] !== record[F_VALUE]) {
      record[F_VALUE] = "NaN";
    } else if (record[F_VALUE] === Infinity) {
      record[F_VALUE] = "Infinity";
    }
  }
};
