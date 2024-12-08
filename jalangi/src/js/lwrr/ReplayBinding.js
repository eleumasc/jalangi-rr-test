var Constants = require("./Constants");
var Globals = require("./Globals");

global.window = {
  String: String,
  Array: Array,
  Error: Error,
  Number: Number,
  Date: Date,
  Boolean: Boolean,
  RegExp: RegExp,
};

exports.createReplayBinding = function (analysis, replayEngine, shadowMemory) {
  var HOP = Constants.HOP;
  var EVAL_ORIG = eval;

  var SPECIAL_PROP1 = Constants.SPECIAL_PROP1;
  var SPECIAL_PROP2 = Constants.SPECIAL_PROP2;
  var SPECIAL_PROP3 = Constants.SPECIAL_PROP3;

  var N_LOG_FUNCTION_LIT = Constants.N_LOG_FUNCTION_LIT,
    N_LOG_RETURN = Constants.N_LOG_RETURN,
    N_LOG_OPERATION = Constants.N_LOG_OPERATION;

  Globals.isInstrumentedCaller = false;
  Globals.isConstructorCall = false;
  Globals.isMethodCall = false;

  //-------------------------------------- Symbolic functions -----------------------------------------------------------

  function getSymbolicFunctionToInvokeAndLog(f, isConstructor) {
    if (
      f === Array ||
      f === Error ||
      f === String ||
      f === Number ||
      f === Date ||
      f === Boolean ||
      f === RegExp
    ) {
      return [f, true];
    } else if (
      f === console.log ||
      (typeof arguments[0] === "string" && f === RegExp.prototype.test) ||
      f === String.prototype.indexOf ||
      f === String.prototype.lastIndexOf ||
      f === String.prototype.substring ||
      f === String.prototype.substr ||
      f === String.prototype.charCodeAt ||
      f === String.prototype.charAt ||
      f === String.prototype.replace ||
      f === String.fromCharCode ||
      f === Math.abs ||
      f === Math.acos ||
      f === Math.asin ||
      f === Math.atan ||
      f === Math.atan2 ||
      f === Math.ceil ||
      f === Math.cos ||
      f === Math.exp ||
      f === Math.floor ||
      f === Math.log ||
      f === Math.max ||
      f === Math.min ||
      f === Math.pow ||
      f === Math.round ||
      f === Math.sin ||
      f === Math.sqrt ||
      f === Math.tan ||
      f === parseInt
    ) {
      return [f, false];
    } else if (f === Object.defineProperty) {
      return [f, false];
    }
    return [null, true];
  }

  //----------------------------------- Begin Jalangi Library backend ---------------------------------

  // stack of return values from instrumented functions.
  // we need to keep a stack since a function may return and then
  // have another function call in a finally block (see test
  // call_in_finally.js)
  var returnVal = [];
  var exceptionVal;
  var scriptCount = 0;
  var lastVal;
  var switchKey;
  var switchKeyStack = [];
  var argIndex;

  function clientAnalysisException(e) {
    console.error("client analysis exception");
    console.error(e.stack);
    process.exit(1);
  }

  function invokeEval(base, f, args) {
    replayEngine.RR_evalBegin();
    shadowMemory.evalBegin();
    try {
      return f(
        // TODO: remove sandbox
        sandbox.instrumentCode(args[0], {
          wrapProgram: false,
          isEval: true,
        }).code
      );
    } finally {
      replayEngine.RR_evalEnd();
      shadowMemory.evalEnd();
    }
  }

  function invokeFun(iid, base, f, args, isConstructor, isMethod) {
    var g,
      invoke,
      val,
      ic,
      tmpIsConstructorCall,
      tmpIsInstrumentedCaller,
      tmpIsMethodCall;

    tmpIsConstructorCall = Globals.isConstructorCall;
    Globals.isConstructorCall = isConstructor;
    tmpIsMethodCall = Globals.isMethodCall;
    Globals.isMethodCall = isMethod;

    var arr = getSymbolicFunctionToInvokeAndLog(f, isConstructor);
    tmpIsInstrumentedCaller = Globals.isInstrumentedCaller;
    ic = Globals.isInstrumentedCaller =
      f === undefined || HOP(f, SPECIAL_PROP2) || typeof f !== "function";

    invoke = arr[0] || Globals.isInstrumentedCaller;
    g = arr[0] || f;

    pushSwitchKey();
    try {
      if (g === EVAL_ORIG) {
        val = invokeEval(base, g, args);
      } else if (invoke) {
        if (isConstructor) {
          val = Reflect.construct(g, args);
        } else {
          val = Reflect.apply(g, base, args);
        }
      } else {
        replayEngine.RR_replay();
        val = undefined;
      }
    } finally {
      popSwitchKey();
      Globals.isInstrumentedCaller = tmpIsInstrumentedCaller;
      Globals.isConstructorCall = tmpIsConstructorCall;
      Globals.isMethodCall = tmpIsMethodCall;
    }

    if (!ic && arr[1]) {
      val = replayEngine.RR_L(iid, val, N_LOG_RETURN);
    }
    if (analysis.invokeFun) {
      try {
        val = analysis.invokeFun(iid, f, base, args, val, isConstructor);
      } catch (e) {
        clientAnalysisException(e);
      }
      replayEngine.RR_updateRecordedObject(val);
    }
    return val;
  }

  function G(iid, base, offset) {
    if (
      offset === SPECIAL_PROP1 ||
      offset === SPECIAL_PROP2 ||
      offset === SPECIAL_PROP3
    ) {
      return undefined;
    }

    var val = base[offset];

    val = replayEngine.RR_G(iid, base, offset, val);
    if (analysis.getField && offset !== "__proto__") {
      try {
        val = analysis.getField(iid, base, offset, val);
      } catch (e) {
        clientAnalysisException(e);
      }
      replayEngine.RR_updateRecordedObject(val);
    }

    replayEngine.RR_replay();
    replayEngine.RR_Load(iid);

    return val;
  }

  // putField (property write)
  function P(iid, base, offset, val) {
    if (
      offset === SPECIAL_PROP1 ||
      offset === SPECIAL_PROP2 ||
      offset === SPECIAL_PROP3
    ) {
      return undefined;
    }

    // window.location.hash = hash calls a function out of nowhere.
    // fix needs a call to RR_replay and setting isInstrumentedCaller to false
    // the following patch is not elegant
    var tmpIsInstrumentedCaller = Globals.isInstrumentedCaller;
    Globals.isInstrumentedCaller = false;

    base[offset] = val;

    replayEngine.RR_P(iid, base, offset, val);
    if (analysis.putField) {
      try {
        val = analysis.putField(iid, base, offset, val);
      } catch (e) {
        clientAnalysisException(e);
      }
    }

    replayEngine.RR_replay();
    replayEngine.RR_Load(iid);

    // the following patch is not elegant
    Globals.isInstrumentedCaller = tmpIsInstrumentedCaller;
    return val;
  }

  // Function call (e.g., f())
  function F(iid, f, isConstructor) {
    return function () {
      return invokeFun(iid, this, f, arguments, isConstructor, false);
    };
  }

  // Method call (e.g., e.f())
  function M(iid, base, offset, isConstructor) {
    return function () {
      var f = G(iid + 2, base, offset);
      return invokeFun(iid, base, f, arguments, isConstructor, true);
    };
  }

  // Function enter
  function Fe(iid, val, thisArg, args) {
    argIndex = 0;
    replayEngine.RR_Fe(iid, val, thisArg);
    shadowMemory.functionEnter(val);
    returnVal.push(undefined);
    exceptionVal = undefined;
  }

  // Function exit
  function Fr(iid) {
    var tmp;
    replayEngine.RR_Fr(iid);
    shadowMemory.functionReturn();
    // if there was an uncaught exception, throw it
    // here, to preserve exceptional control flow
    if (exceptionVal !== undefined) {
      tmp = exceptionVal;
      exceptionVal = undefined;
      throw tmp;
    }
    return false;
  }

  // Uncaught exception
  function Ex(iid, e) {
    exceptionVal = e;
  }

  // Return statement
  function Rt(iid, val) {
    returnVal.pop();
    returnVal.push(val);
    if (analysis.return_) {
      try {
        val = analysis.return_(val);
      } catch (e) {
        clientAnalysisException(e);
      }
    }
    return val;
  }

  // Actual return from function, invoked from 'finally' block
  // added around every function by instrumentation.  Reads
  // the return value stored by call to Rt()
  function Ra() {
    var ret = returnVal.pop();
    exceptionVal = undefined;
    return ret;
  }

  // Script enter
  function Se(iid, val) {
    scriptCount += 1;
    replayEngine.RR_Se(iid, val);
    shadowMemory.scriptEnter();
  }

  // Script exit
  function Sr(iid) {
    var tmp;

    scriptCount -= 1;

    replayEngine.RR_Sr(iid);
    shadowMemory.scriptReturn();

    if (exceptionVal !== undefined) {
      tmp = exceptionVal;
      exceptionVal = undefined;
      if (scriptCount > 0) {
        throw tmp;
      }
    }
  }

  // Ignore argument (identity)
  function I(val) {
    return val;
  }

  // object/function/regexp/array Literal
  function T(iid, val, type, hasGetterSetter) {
    replayEngine.RR_T(iid, val, type, hasGetterSetter);
    shadowMemory.defineFunction(val, type);

    if (type === N_LOG_FUNCTION_LIT) {
      if (
        Object &&
        Object.defineProperty &&
        typeof Object.defineProperty === "function"
      ) {
        Object.defineProperty(val, SPECIAL_PROP2, {
          enumerable: false,
          writable: true,
        });
      }
      val[SPECIAL_PROP2] = true;
    }

    return val;
  }

  // hash in for-in
  // E.g., given code 'for (p in x) { ... }',
  // H is invoked with the value of x
  function H(iid, val) {
    val = replayEngine.RR_H(iid, val);

    return val;
  }

  // variable read
  function R(iid, name, val, isGlobal) {
    if (name === "this" || isGlobal) {
      val = replayEngine.RR_R(iid, name, val);
    }

    return val;
  }

  // variable write
  function W(iid, name, val, lhs, isGlobal) {
    if (isGlobal) {
      replayEngine.RR_W(iid, name, val);
    }
    return val;
  }

  // variable declaration (Init)
  function N(iid, name, val, isArgumentSync, isLocalSync, isCatchParam) {
    if (isArgumentSync) {
      argIndex += 1;
    }
    val = replayEngine.RR_N(iid, name, val, isArgumentSync);
    if (!isLocalSync && !isCatchParam) {
      shadowMemory.initialize(name);
    }
    return val;
  }

  // Modify and assign +=, -= ...
  function A(iid, base, offset, op) {
    var lhs = G(iid, base, offset);
    return function (rhs) {
      var val = B(iid, op, lhs, rhs);
      return P(iid, base, offset, val);
    };
  }

  // Binary operation
  function B(iid, op, lhs, rhs) {
    var ret;
    var isArithmetic = false;

    switch (op) {
      case "+":
        isArithmetic = true;
        ret = lhs + rhs;
        break;
      case "-":
        isArithmetic = true;
        ret = lhs - rhs;
        break;
      case "*":
        isArithmetic = true;
        ret = lhs * rhs;
        break;
      case "/":
        isArithmetic = true;
        ret = lhs / rhs;
        break;
      case "%":
        isArithmetic = true;
        ret = lhs % rhs;
        break;
      case "<<":
        isArithmetic = true;
        ret = lhs << rhs;
        break;
      case ">>":
        isArithmetic = true;
        ret = lhs >> rhs;
        break;
      case ">>>":
        isArithmetic = true;
        ret = lhs >>> rhs;
        break;
      case "<":
        isArithmetic = true;
        ret = lhs < rhs;
        break;
      case ">":
        isArithmetic = true;
        ret = lhs > rhs;
        break;
      case "<=":
        isArithmetic = true;
        ret = lhs <= rhs;
        break;
      case ">=":
        isArithmetic = true;
        ret = lhs >= rhs;
        break;
      case "==":
        ret = lhs == rhs;
        break;
      case "!=":
        ret = lhs != rhs;
        break;
      case "===":
        ret = lhs === rhs;
        break;
      case "!==":
        ret = lhs !== rhs;
        break;
      case "&":
        isArithmetic = true;
        ret = lhs & rhs;
        break;
      case "|":
        isArithmetic = true;
        ret = lhs | rhs;
        break;
      case "^":
        isArithmetic = true;
        ret = lhs ^ rhs;
        break;
      case "instanceof":
        ret = lhs instanceof rhs;
        ret = replayEngine.RR_L(iid, ret, N_LOG_RETURN);
        break;
      case "delete":
        ret = delete lhs[rhs];
        ret = replayEngine.RR_L(iid, ret, N_LOG_RETURN);
        break;
      case "in":
        ret = lhs in rhs;
        ret = replayEngine.RR_L(iid, ret, N_LOG_RETURN);
        break;
      case "&&":
        ret = lhs && rhs;
        break;
      case "||":
        ret = lhs || rhs;
        break;
      case "regexin":
        ret = rhs.test(lhs);
        break;
      default:
        throw new Error(op + " at " + iid + " not found");
    }

    var isLhsOrRhsObject =
      typeof lhs === "object" ||
      typeof lhs === "function" ||
      typeof rhs === "object" ||
      typeof rhs === "function";
    if (isArithmetic && isLhsOrRhsObject) {
      ret = replayEngine.RR_L(iid, ret, N_LOG_OPERATION);
    }

    return ret;
  }

  // Unary operation
  function U(iid, op, lhs) {
    var ret;
    var isArithmetic = false;

    switch (op) {
      case "+":
        isArithmetic = true;
        ret = +lhs;
        break;
      case "-":
        isArithmetic = true;
        ret = -lhs;
        break;
      case "~":
        isArithmetic = true;
        ret = ~lhs;
        break;
      case "!":
        ret = !lhs;
        break;
      case "typeof":
        ret = typeof lhs;
        break;
      default:
        throw new Error(op + " at " + iid + " not found");
    }

    var isLhsObject = typeof lhs === "object" || typeof lhs === "function";
    if (isArithmetic && isLhsObject) {
      ret = replayEngine.RR_L(iid, ret, N_LOG_OPERATION);
    }

    return ret;
  }

  function pushSwitchKey() {
    switchKeyStack.push(switchKey);
  }

  function popSwitchKey() {
    switchKey = switchKeyStack.pop();
  }

  function last() {
    return lastVal;
  }

  // Switch key
  // E.g., for 'switch (x) { ... }',
  // C1 is invoked with value of x
  function C1(iid, lhs) {
    switchKey = lhs;

    return lhs;
  }

  // case label inside switch
  function C2(iid, lhs) {
    B(iid, "===", switchKey, lhs);

    return lhs;
  }

  // Expression in conditional
  function C(iid, lhs) {
    lastVal = lhs;

    return lhs;
  }

  //----------------------------------- End Jalangi Library backend ---------------------------------

  // -------------------- Monkey patch some methods ------------------------
  var GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
  Object.getOwnPropertyNames = function () {
    var val = GET_OWN_PROPERTY_NAMES.apply(Object, arguments);
    var idx = val.indexOf(SPECIAL_PROP1);
    if (idx > -1) {
      val.splice(idx, 1);
    }
    idx = val.indexOf(SPECIAL_PROP2);
    if (idx > -1) {
      val.splice(idx, 1);
    }
    idx = val.indexOf(SPECIAL_PROP3);
    if (idx > -1) {
      val.splice(idx, 1);
    }
    return val;
  };

  return {
    U: U,
    B: B,
    C: C,
    C1: C1,
    C2: C2,
    _: last,
    H: H,
    I: I,
    G: G,
    P: P,
    R: R,
    W: W,
    N: N,
    T: T,
    F: F,
    M: M,
    A: A,
    Fe: Fe,
    Fr: Fr,
    Se: Se,
    Sr: Sr,
    Rt: Rt,
    Ra: Ra,
    Ex: Ex,
  };
};

//@todo:@assumption arguments.callee is available
//@todo:@assumptions SPECIAL_PROP1 = "*JRR$*" is added to every object, but its enumeration is avoided in instrumented code
//@todo:@assumptions ReferenceError when accessing an undeclared uninitialized variable won't be thrown
//@todo:@assumption window.x is not initialized in node.js replay mode when var x = e is done in the global scope, but handled using syncValues
//@todo:@assumption eval is not renamed
//@todo: with needs to be handled
//@todo: new Function and setTimeout
//@todo: @assumption implicit call of toString and valueOf on objects during type conversion
// could lead to inaccurate replay if the object fields are not synchronized
//@todo: @assumption JSON.stringify of any float could be inaccurate, so logging could be inaccurate
//@todo: implicit type conversion from objects/arrays/functions during binary and unary operations could break record/replay

// change line: 1 to line: 8 in node_modules/source-map/lib/source-map/source-node.js
