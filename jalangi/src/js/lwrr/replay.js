var path = require("path");
var { setJalangiBinding } = require("./Jalangi");
var { createReplayBinding } = require("./ReplayBinding");
var { ReplayEngine } = require("./ReplayEngine");
var { ShadowMemory } = require("./ShadowMemory");
var { TraceReader } = require("./TraceReader");

function replay(args) {
  var analysis = {}; // TODO: EmptyAnalysis
  if (args.analysis) {
    var Analysis = require(path.resolve(args.analysis));
    if (Analysis && typeof Analysis === "function") {
      analysis = new Analysis();
    }
  }

  var replayEngine = new ReplayEngine(new TraceReader(args.tracefile));
  setJalangiBinding(
    createReplayBinding(analysis, replayEngine, new ShadowMemory())
  );

  replayEngine.RR_replay();

  process.exit();
}

exports.replay = replay;
