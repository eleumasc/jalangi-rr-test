process.chdir(__dirname);

process.argv = [...process.argv, '--tracefile', '/tmp/instScripts/site0/jalangi_trace1', '--analysis', 'src/js/analyses/AugurAssessment.js'];

require('./src/js/commands/replay.js');
