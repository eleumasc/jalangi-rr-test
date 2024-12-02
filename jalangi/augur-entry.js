process.chdir(__dirname);

var args = {
    tracefile: '/tmp/instScripts/site0/jalangi_trace1',
    analysis: 'src/js/analyses/AugurAssessment.js',
};

require('./src/js/commands/lw-replay.js').replay(args);
