var Constants = require("./Constants");

exports.ShadowMemory = function () {
  var SPECIAL_PROP1 = Constants.SPECIAL_PROP1 + "M";
  var SPECIAL_PROP3 = Constants.SPECIAL_PROP3 + "M";
  var N_LOG_FUNCTION_LIT = Constants.N_LOG_FUNCTION_LIT;
  var objectId = 1;
  var scriptCount = 0;
  var HOP = Constants.HOP;

  var frame = Object.create(null);

  var frameStack = [frame];
  var evalFrames = [];

  function createShadowObject(val) {
    var type = typeof val;
    if (
      (type === "object" || type === "function") &&
      val !== null &&
      !HOP(val, SPECIAL_PROP1)
    ) {
      if (
        Object &&
        Object.defineProperty &&
        typeof Object.defineProperty === "function"
      ) {
        Object.defineProperty(val, SPECIAL_PROP1, {
          enumerable: false,
          writable: true,
        });
      }
      try {
        val[SPECIAL_PROP1] = Object.create(null);
        val[SPECIAL_PROP1][SPECIAL_PROP1] = objectId;
        objectId = objectId + 2;
      } catch (e) {
        // cannot attach special field in some DOM Objects.  So ignore them.
      }
    }
  }

  this.getShadowObject = function (val) {
    var value;
    createShadowObject(val);
    var type = typeof val;
    if (
      (type === "object" || type === "function") &&
      val !== null &&
      HOP(val, SPECIAL_PROP1)
    ) {
      value = val[SPECIAL_PROP1];
    } else {
      value = undefined;
    }
    return value;
  };

  this.getFrame = function (name) {
    var tmp = frame;
    while (tmp && !HOP(tmp, name)) {
      tmp = tmp[SPECIAL_PROP3];
    }
    if (tmp) {
      return tmp;
    } else {
      return frameStack[0]; // return global scope
    }
  };

  this.getParentFrame = function (otherFrame) {
    if (otherFrame) {
      return otherFrame[SPECIAL_PROP3];
    } else {
      return null;
    }
  };

  this.getCurrentFrame = function () {
    return frame;
  };

  this.getClosureFrame = function (fun) {
    return fun[SPECIAL_PROP3];
  };

  this.getShadowObjectID = function (obj) {
    return obj[SPECIAL_PROP1];
  };

  this.defineFunction = function (val, type) {
    if (type === N_LOG_FUNCTION_LIT) {
      if (
        Object &&
        Object.defineProperty &&
        typeof Object.defineProperty === "function"
      ) {
        Object.defineProperty(val, SPECIAL_PROP3, {
          enumerable: false,
          writable: true,
        });
      }
      val[SPECIAL_PROP3] = frame;
    }
  };

  this.evalBegin = function () {
    evalFrames.push(frame);
    frame = frameStack[0];
  };

  this.evalEnd = function () {
    frame = evalFrames.pop();
  };

  this.initialize = function (name) {
    frame[name] = undefined;
  };

  this.functionEnter = function (val) {
    frameStack.push((frame = Object.create(null)));
    if (
      Object &&
      Object.defineProperty &&
      typeof Object.defineProperty === "function"
    ) {
      Object.defineProperty(frame, SPECIAL_PROP3, {
        enumerable: false,
        writable: true,
      });
    }
    frame[SPECIAL_PROP3] = val[SPECIAL_PROP3];
  };

  this.functionReturn = function () {
    frameStack.pop();
    frame = frameStack[frameStack.length - 1];
  };

  this.scriptEnter = function () {
    scriptCount++;
    if (scriptCount > 1) {
      frameStack.push((frame = Object.create(null)));
      frame[SPECIAL_PROP3] = frameStack[0];
    }
  };

  this.scriptReturn = function () {
    if (scriptCount > 1) {
      frameStack.pop();
      frame = frameStack[frameStack.length - 1];
    }
    scriptCount--;
  };
};
