var path = require("path");
var { setBinding } = require("./Jalangi");
var { createReplayBinding } = require("./ReplayBinding");
var { ReplayEngine } = require("./ReplayEngine");
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
  setBinding(createReplayBinding(analysis, replayEngine));

  replayEngine.RR_replay();

  process.exit();
}

exports.replay = replay;
