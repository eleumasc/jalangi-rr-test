process.chdir(__dirname);

var args = {
    tracefile: '/tmp/instScripts/site0/jalangi_trace1',
    analysis: './src/js/analyses/LwrrAugurAssessment.js',
};

require('./src/js/lwrr/replay.js').replay(args);
