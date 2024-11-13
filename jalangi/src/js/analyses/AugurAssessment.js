(function (sandbox) {
  var document = (global.document = global.document || {});
  var fetch = (global.fetch = global.fetch || function fetch() {});

  function __AUGUR_SOURCE__(x, _type) {
    return x;
  }

  function __AUGUR_SINK__(_x, _type) {}

  function MakeTainted() {
    this.makeConcolic = function (idx, val, getNextSymbol) {
      return val;
    };

    this.literal = function (iid, val) {
      return val;
    };

    this.invokeFun = function (iid, f, base, args, val, isConstructor) {
      if (f === fetch) {
        __AUGUR_SINK__(args[0] /* url */, "fetch");
      }

      return val;
    };

    this.getField = function (iid, base, offset, val) {
      if (base === document && offset === "cookie") {
        __AUGUR_SOURCE__(val, "document.cookie");
      }

      return val;
    };

    this.putFieldPre = function (iid, base, offset, val) {
      return val;
    };

    this.putField = function (iid, base, offset, val) {
      return val;
    };

    this.read = function (iid, name, val, isGlobal) {
      return val;
    };

    this.write = function (iid, name, val, oldValue) {
      return val;
    };

    this.binary = function (iid, op, left, right, result_c) {
      return result_c;
    };

    this.unary = function (iid, op, left, result_c) {
      return result_c;
    };

    this.conditional = function (iid, left, result_c) {
      return left;
    };

    this.functionExit = function (iid) {
      return false;
      /* a return of false means that do not backtrack inside the function */
    };

    this.return_ = function (val) {
      return val;
    };

    this.instrumentCode = function (iid, code) {
      return code;
    };
  }

  sandbox.analysis = new MakeTainted();
})(J$);
