function runAnalysis(args) {
    global.JALANGI_MODE = "replay";
    global.USE_SMEMORY = undefined;

    var path = require('path');
    var Headers = require('../Headers');

    for (var src of Headers.headerSources) {
        require('./../../../' + src);
    }
    require('../InputManager');

    if (args.analysis) {
        var Analysis = require(path.resolve(args.analysis));
        if (Analysis && typeof Analysis === 'function') {
            JRR$.analysis = new Analysis();
        }
    }

    if (JRR$.analysis && JRR$.analysis.init) {
        JRR$.analysis.init({});
    }

    try {
        JRR$.setTraceFileName(args.tracefile);
        JRR$.replay();
    } finally {
        JRR$.endExecution();
    }
    process.exit();
}

function replay(args) {
    runAnalysis(args);
}

exports.replay = replay;
