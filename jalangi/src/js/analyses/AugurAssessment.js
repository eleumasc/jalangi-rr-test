(function (sandbox) {
  var document = (global.document = global.document || {});
  var fetch = (global.fetch = global.fetch || function fetch() {});

  function __AUGUR_SOURCE__(x) {
    console.log(`__AUGUR_SOURCE__ ${JSON.stringify(x)}\n`);
    return x;
  }

  function __AUGUR_SINK__(x) {
    console.log(`__AUGUR_SINK__ ${JSON.stringify(x)}\n`);
  }

  function AugurAssessment() {
    this.invokeFun = function (iid, f, base, args, val, isConstructor) {
      if (f === fetch) {
        __AUGUR_SINK__(args[0] /* url */);
      }

      console.log("invokeFun", f.name);

      return val;
    };

    this.getField = function (iid, base, offset, val) {
      if (base === document && offset === "cookie") {
        return __AUGUR_SOURCE__(val);
      }

      return val;
    };
  }

  sandbox.analysis = new AugurAssessment();
})(JRR$);
