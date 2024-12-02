if (typeof JRR$ === "undefined") {
  JRR$ = {};
}

window = {
  String: String,
  Array: Array,
  Error: Error,
  Number: Number,
  Date: Date,
  Boolean: Boolean,
  RegExp: RegExp,
};

(function (sandbox) {
  var Constants = sandbox.Constants;
  var Globals = sandbox.Globals;
  var SMemory = sandbox.SMemory;
  var RecordReplayEngine = sandbox.RecordReplayEngine;

  var getConcrete = Constants.getConcrete;
  var HOP = Constants.HOP;
  var EVAL_ORIG = eval;

  var SPECIAL_PROP = Constants.SPECIAL_PROP;
  var SPECIAL_PROP2 = Constants.SPECIAL_PROP2;
  var SPECIAL_PROP3 = Constants.SPECIAL_PROP3;

  var N_LOG_FUNCTION_LIT = Constants.N_LOG_FUNCTION_LIT,
    N_LOG_RETURN = Constants.N_LOG_RETURN,
    N_LOG_OPERATION = Constants.N_LOG_OPERATION;

  Globals.mode = Constants.MODE_REPLAY;

  Globals.isInstrumentedCaller = false;
  Globals.isConstructorCall = false;
  Globals.isMethodCall = false;

  var rrEngine = new RecordReplayEngine();
  var smemory = new SMemory();

  //-------------------------------------- Symbolic functions -----------------------------------------------------------

  function modelFunction(f) {
    return function () {
      var len = arguments.length;
      for (var i = 0; i < len; i += 1) {
        arguments[i] = getConcrete(arguments[i]);
      }
      return f.apply(getConcrete(this), arguments);
    };
  }

  function concretize(obj) {
    for (var key in obj) {
      if (HOP(obj, key)) {
        obj[key] = getConcrete(obj[key]);
      }
    }
  }

  function modelDefineProperty(f) {
    return function () {
      var len = arguments.length;
      for (var i = 0; i < len; i += 1) {
        arguments[i] = getConcrete(arguments[i]);
      }
      if (len > 2) {
        concretize(arguments[2]);
      }
      return f.apply(getConcrete(this), arguments);
    };
  }

  function getSymbolicFunctionToInvokeAndLog(f, isConstructor) {
    if (
      f === Array ||
      f === Error ||
      f === String ||
      f === Number ||
      f === Date ||
      f === Boolean ||
      f === RegExp ||
      f === sandbox.addAxiom ||
      f === sandbox.readInput
    ) {
      return [f, true];
    } else if (
      f === console.log ||
      (typeof getConcrete(arguments[0]) === "string" &&
        f === RegExp.prototype.test) || // fixes bug in minPathDev.js
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
      return [modelFunction(f), false];
    } else if (f === Object.defineProperty) {
      return [modelDefineProperty(f), false];
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
    if (rrEngine) {
      rrEngine.RR_evalBegin();
    }
    if (smemory) {
      smemory.evalBegin();
    }
    try {
      return f(
        sandbox.instrumentCode(getConcrete(args[0]), {
          wrapProgram: false,
          isEval: true,
        }).code
      );
    } finally {
      if (rrEngine) {
        rrEngine.RR_evalEnd();
      }
      if (smemory) {
        smemory.evalEnd();
      }
    }
  }

  function invokeFun(iid, base, f, args, isConstructor, isMethod) {
    var g,
      invoke,
      val,
      ic,
      tmp_rrEngine,
      tmpIsConstructorCall,
      tmpIsInstrumentedCaller,
      tmpIsMethodCall;

    var fConcrete = getConcrete(f);

    tmpIsConstructorCall = Globals.isConstructorCall;
    Globals.isConstructorCall = isConstructor;
    tmpIsMethodCall = Globals.isMethodCall;
    Globals.isMethodCall = isMethod;

    var arr = getSymbolicFunctionToInvokeAndLog(fConcrete, isConstructor);
    tmpIsInstrumentedCaller = Globals.isInstrumentedCaller;
    ic = Globals.isInstrumentedCaller =
      fConcrete === undefined ||
      HOP(fConcrete, SPECIAL_PROP2) ||
      typeof fConcrete !== "function";

    invoke = arr[0] || Globals.isInstrumentedCaller;
    g = arr[0] || fConcrete;

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
        if (rrEngine) {
          rrEngine.RR_replay();
        }
        val = undefined;
      }
    } finally {
      popSwitchKey();
      Globals.isInstrumentedCaller = tmpIsInstrumentedCaller;
      Globals.isConstructorCall = tmpIsConstructorCall;
      Globals.isMethodCall = tmpIsMethodCall;
    }

    if (!ic && arr[1]) {
      if (rrEngine) {
        val = rrEngine.RR_L(iid, val, N_LOG_RETURN);
      }
    }
    if (sandbox.analysis && sandbox.analysis.invokeFun) {
      tmp_rrEngine = rrEngine;
      rrEngine = null;
      try {
        val = sandbox.analysis.invokeFun(
          iid,
          f,
          base,
          args,
          val,
          isConstructor
        );
      } catch (e) {
        clientAnalysisException(e);
      }
      rrEngine = tmp_rrEngine;
      if (rrEngine) {
        rrEngine.RR_updateRecordedObject(val);
      }
    }
    return val;
  }

  function G(iid, base, offset) {
    if (
      offset === SPECIAL_PROP ||
      offset === SPECIAL_PROP2 ||
      offset === SPECIAL_PROP3
    ) {
      return undefined;
    }

    var baseConcrete = getConcrete(base);

    var val = baseConcrete[getConcrete(offset)];

    if (rrEngine) {
      val = rrEngine.RR_G(iid, baseConcrete, offset, val);
    }
    if (
      sandbox.analysis &&
      sandbox.analysis.getField &&
      getConcrete(offset) !== "__proto__"
    ) {
      var tmp_rrEngine = rrEngine;
      rrEngine = null;
      try {
        val = sandbox.analysis.getField(iid, base, offset, val);
      } catch (e) {
        clientAnalysisException(e);
      }
      rrEngine = tmp_rrEngine;
      if (rrEngine) {
        rrEngine.RR_updateRecordedObject(val);
      }
    }

    if (rrEngine) {
      rrEngine.RR_replay();
      rrEngine.RR_Load(iid);
    }

    return val;
  }

  // putField (property write)
  function P(iid, base, offset, val) {
    if (
      offset === SPECIAL_PROP ||
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

    var baseConcrete = getConcrete(base);

    if (
      typeof baseConcrete === "function" &&
      getConcrete(offset) === "prototype"
    ) {
      baseConcrete[getConcrete(offset)] = getConcrete(val);
    } else {
      baseConcrete[getConcrete(offset)] = val;
    }

    if (rrEngine) {
      rrEngine.RR_P(iid, base, offset, val);
    }
    if (sandbox.analysis && sandbox.analysis.putField) {
      try {
        val = sandbox.analysis.putField(iid, base, offset, val);
      } catch (e) {
        clientAnalysisException(e);
      }
    }

    if (rrEngine) {
      rrEngine.RR_replay();
      rrEngine.RR_Load(iid);
    }

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
    if (rrEngine) {
      rrEngine.RR_Fe(iid, val, thisArg);
    }
    if (smemory) {
      smemory.functionEnter(val);
    }
    returnVal.push(undefined);
    exceptionVal = undefined;
  }

  // Function exit
  function Fr(iid) {
    var tmp;
    if (rrEngine) {
      rrEngine.RR_Fr(iid);
    }
    if (smemory) {
      smemory.functionReturn();
    }
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
    if (sandbox.analysis && sandbox.analysis.return_) {
      try {
        val = sandbox.analysis.return_(val);
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
    if (rrEngine) {
      rrEngine.RR_Se(iid, val);
    }
    if (smemory) {
      smemory.scriptEnter();
    }
  }

  // Script exit
  function Sr(iid) {
    var tmp;

    scriptCount -= 1;

    if (rrEngine) {
      rrEngine.RR_Sr(iid);
    }
    if (smemory) {
      smemory.scriptReturn();
    }

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
    if (rrEngine) {
      rrEngine.RR_T(iid, val, type, hasGetterSetter);
    }
    if (smemory) {
      smemory.defineFunction(val, type);
    }

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
    if (rrEngine) {
      val = rrEngine.RR_H(iid, val);
    }

    return val;
  }

  // variable read
  function R(iid, name, val, isGlobal) {
    if (rrEngine && (name === "this" || isGlobal)) {
      val = rrEngine.RR_R(iid, name, val);
    }

    return val;
  }

  // variable write
  function W(iid, name, val, lhs, isGlobal) {
    if (rrEngine && isGlobal) {
      rrEngine.RR_W(iid, name, val);
    }
    return val;
  }

  // variable declaration (Init)
  function N(iid, name, val, isArgumentSync, isLocalSync, isCatchParam) {
    if (isArgumentSync) {
      argIndex += 1;
    }
    if (rrEngine) {
      val = rrEngine.RR_N(iid, name, val, isArgumentSync);
    }
    if (!isLocalSync && !isCatchParam && smemory) {
      smemory.initialize(name);
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
    var lhsConcrete = getConcrete(lhs);
    var rhsConcrete = getConcrete(rhs);
    var resultConcrete;
    var isArithmetic = false;

    switch (op) {
      case "+":
        isArithmetic = true;
        resultConcrete = lhsConcrete + rhsConcrete;
        break;
      case "-":
        isArithmetic = true;
        resultConcrete = lhsConcrete - rhsConcrete;
        break;
      case "*":
        isArithmetic = true;
        resultConcrete = lhsConcrete * rhsConcrete;
        break;
      case "/":
        isArithmetic = true;
        resultConcrete = lhsConcrete / rhsConcrete;
        break;
      case "%":
        isArithmetic = true;
        resultConcrete = lhsConcrete % rhsConcrete;
        break;
      case "<<":
        isArithmetic = true;
        resultConcrete = lhsConcrete << rhsConcrete;
        break;
      case ">>":
        isArithmetic = true;
        resultConcrete = lhsConcrete >> rhsConcrete;
        break;
      case ">>>":
        isArithmetic = true;
        resultConcrete = lhsConcrete >>> rhsConcrete;
        break;
      case "<":
        isArithmetic = true;
        resultConcrete = lhsConcrete < rhsConcrete;
        break;
      case ">":
        isArithmetic = true;
        resultConcrete = lhsConcrete > rhsConcrete;
        break;
      case "<=":
        isArithmetic = true;
        resultConcrete = lhsConcrete <= rhsConcrete;
        break;
      case ">=":
        isArithmetic = true;
        resultConcrete = lhsConcrete >= rhsConcrete;
        break;
      case "==":
        resultConcrete = lhsConcrete == rhsConcrete;
        break;
      case "!=":
        resultConcrete = lhsConcrete != rhsConcrete;
        break;
      case "===":
        resultConcrete = lhsConcrete === rhsConcrete;
        break;
      case "!==":
        resultConcrete = lhsConcrete !== rhsConcrete;
        break;
      case "&":
        isArithmetic = true;
        resultConcrete = lhsConcrete & rhsConcrete;
        break;
      case "|":
        isArithmetic = true;
        resultConcrete = lhsConcrete | rhsConcrete;
        break;
      case "^":
        isArithmetic = true;
        resultConcrete = lhsConcrete ^ rhsConcrete;
        break;
      case "instanceof":
        resultConcrete = lhsConcrete instanceof rhsConcrete;
        if (rrEngine) {
          resultConcrete = rrEngine.RR_L(iid, resultConcrete, N_LOG_RETURN);
        }
        break;
      case "delete":
        resultConcrete = delete lhsConcrete[rhsConcrete];
        if (rrEngine) {
          resultConcrete = rrEngine.RR_L(iid, resultConcrete, N_LOG_RETURN);
        }
        break;
      case "in":
        resultConcrete = lhsConcrete in rhsConcrete;
        if (rrEngine) {
          resultConcrete = rrEngine.RR_L(iid, resultConcrete, N_LOG_RETURN);
        }
        break;
      case "&&":
        resultConcrete = lhsConcrete && rhsConcrete;
        break;
      case "||":
        resultConcrete = lhsConcrete || rhsConcrete;
        break;
      case "regexin":
        resultConcrete = rhsConcrete.test(lhsConcrete);
        break;
      default:
        throw new Error(op + " at " + iid + " not found");
    }

    if (rrEngine) {
      var isLhsOrRhsObject =
        typeof lhsConcrete === "object" ||
        typeof lhsConcrete === "function" ||
        typeof rhsConcrete === "object" ||
        typeof rhsConcrete === "function";
      if (isArithmetic && isLhsOrRhsObject) {
        resultConcrete = rrEngine.RR_L(iid, resultConcrete, N_LOG_OPERATION);
      }
    }

    return resultConcrete;
  }

  // Unary operation
  function U(iid, op, lhs) {
    var lhsConcrete = getConcrete(lhs);
    var resultConcrete;
    var isArithmetic = false;

    switch (op) {
      case "+":
        isArithmetic = true;
        resultConcrete = +lhsConcrete;
        break;
      case "-":
        isArithmetic = true;
        resultConcrete = -lhsConcrete;
        break;
      case "~":
        isArithmetic = true;
        resultConcrete = ~lhsConcrete;
        break;
      case "!":
        resultConcrete = !lhsConcrete;
        break;
      case "typeof":
        resultConcrete = typeof lhsConcrete;
        break;
      default:
        throw new Error(op + " at " + iid + " not found");
    }

    if (rrEngine) {
      var isLhsObject =
        typeof lhsConcrete === "object" || typeof lhsConcrete === "function";
      if (isArithmetic && isLhsObject) {
        resultConcrete = rrEngine.RR_L(iid, resultConcrete, N_LOG_OPERATION);
      }
    }

    return resultConcrete;
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
    var lhsConcrete = getConcrete(lhs);

    switchKey = lhs;

    return lhsConcrete;
  }

  // case label inside switch
  function C2(iid, lhs) {
    var lhsConcrete = getConcrete(lhs);

    B(iid, "===", switchKey, lhs);

    return lhsConcrete;
  }

  // Expression in conditional
  function C(iid, lhs) {
    var lhsConcrete = getConcrete(lhs);

    lastVal = lhsConcrete;

    return lhsConcrete;
  }

  function endExecution() {}

  //----------------------------------- End Jalangi Library backend ---------------------------------

  // -------------------- Monkey patch some methods ------------------------
  var GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
  Object.getOwnPropertyNames = function () {
    var val = GET_OWN_PROPERTY_NAMES.apply(Object, arguments);
    var idx = val.indexOf(SPECIAL_PROP);
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

  sandbox.U = U; // Unary operation
  sandbox.B = B; // Binary operation
  sandbox.C = C; // Condition
  sandbox.C1 = C1; // Switch key
  sandbox.C2 = C2; // case label C1 === C2
  sandbox.getConcrete = getConcrete; // Get concrete value
  sandbox._ = last; // Last value passed to C

  sandbox.H = H; // hash in for-in
  sandbox.I = I; // Ignore argument
  sandbox.G = G; // getField
  sandbox.P = P; // putField
  sandbox.R = R; // Read
  sandbox.W = W; // Write
  sandbox.N = N; // Init
  sandbox.T = T; // object/function/regexp/array Literal
  sandbox.F = F; // Function call
  sandbox.M = M; // Method call
  sandbox.A = A; // Modify and assign +=, -= ...
  sandbox.Fe = Fe; // Function enter
  sandbox.Fr = Fr; // Function return
  sandbox.Se = Se; // Script enter
  sandbox.Sr = Sr; // Script return
  sandbox.Rt = Rt; // returned value
  sandbox.Ra = Ra;
  sandbox.Ex = Ex;

  sandbox.replay = rrEngine.RR_replay;
  sandbox.onflush = rrEngine.onflush;
  sandbox.record = rrEngine.record;
  sandbox.command = rrEngine.command;
  sandbox.endExecution = endExecution;
  sandbox.addRecord = rrEngine.addRecord;
  sandbox.setTraceFileName = rrEngine.setTraceFileName;
})(JRR$);

//@todo:@assumption arguments.callee is available
//@todo:@assumptions SPECIAL_PROP = "*JRR$*" is added to every object, but its enumeration is avoided in instrumented code
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
