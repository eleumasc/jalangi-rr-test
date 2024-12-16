var {
  N_LOG_FUNCTION_LIT,
  DefineProperty,
  HasOwnProperty,
  SPECIAL_PROP_INIT_DESCRIPTOR,
} = require("./Constants");

exports.ShadowMemory = function () {
  var PROP_SHADOW = Symbol();
  var PROP_PARENT = Symbol();

  var freshObjId = 1;
  var scriptsCount = 0;
  var topFrame = { __proto__: null };
  var frameStack = [topFrame];
  var evalFrameStack = [];

  this.getShadowObject = function (val) {
    var shadow;
    if ((typeof val === "object" && val) || typeof val === "function") {
      if (HasOwnProperty(val, PROP_SHADOW)) {
        return val[PROP_SHADOW];
      } else {
        DefineProperty(val, PROP_SHADOW, SPECIAL_PROP_INIT_DESCRIPTOR); // FIXME: throws an error in case of frozen objects and some DOM objects
        shadow = val[PROP_SHADOW] = { __proto__: null };
        shadow[PROP_SHADOW] = freshObjId;
        freshObjId += 2;
        return shadow;
      }
    }
  };

  this.getFrame = function (name) {
    var frame = topFrame;
    while (frame && !HasOwnProperty(frame, name)) {
      frame = frame[PROP_PARENT];
    }
    if (frame) {
      return frame;
    } else {
      return frameStack[0];
    }
  };

  this.getParentFrame = function (frame) {
    if (frame) {
      return frame[PROP_PARENT];
    } else {
      return null;
    }
  };

  this.getCurrentFrame = function () {
    return topFrame;
  };

  this.getClosureFrame = function (fun) {
    return fun[PROP_PARENT];
  };

  this.getShadowObjectID = function (obj) {
    return obj[PROP_SHADOW];
  };

  this.defineFunction = function (val, type) {
    if (type === N_LOG_FUNCTION_LIT) {
      DefineProperty(val, PROP_PARENT, SPECIAL_PROP_INIT_DESCRIPTOR);
      val[PROP_PARENT] = topFrame;
    }
  };

  this.evalBegin = function () {
    evalFrameStack.push(topFrame);
    topFrame = frameStack[0];
  };

  this.evalEnd = function () {
    topFrame = evalFrameStack.pop();
  };

  this.initialize = function (name) {
    topFrame[name] = undefined;
  };

  this.functionEnter = function (val) {
    topFrame = { __proto__: null };
    frameStack.push(topFrame);
    DefineProperty(val, PROP_PARENT, SPECIAL_PROP_INIT_DESCRIPTOR);
    topFrame[PROP_PARENT] = val[PROP_PARENT];
  };

  this.functionReturn = function () {
    frameStack.pop();
    topFrame = frameStack[frameStack.length - 1];
  };

  this.scriptEnter = function () {
    ++scriptsCount;
    if (scriptsCount > 1) {
      topFrame = { __proto__: null };
      frameStack.push(topFrame);
      topFrame[PROP_PARENT] = frameStack[0];
    }
  };

  this.scriptReturn = function () {
    if (scriptsCount > 1) {
      frameStack.pop();
      topFrame = frameStack[frameStack.length - 1];
    }
    --scriptsCount;
  };
};
