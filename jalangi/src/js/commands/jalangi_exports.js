var esnstrument = require("../instrument/esnstrument.js");
var fs = require("fs");
var path = require("path");
var mkdirp = require("mkdirp");
var instUtil = require("../instrument/instUtil.js");

// CONFIGURATION VARS

/**
 * where should output files be written to disk?
 */
var outputDir = "/tmp/instScripts";

/**
 * should inline scripts be ignored?
 */
var ignoreInline = false;

/**
 * performs Jalangi instrumentation, and writes associated data to disk.  Saves
 * the original script foo.js and the instrumented script foo_jalangi_.js
 */
function rewriter(src, metadata) {
  var url = metadata.url;
  if (ignoreInline && instUtil.isInlineScript(url)) {
    console.log("ignoring inline script " + url);
    return src;
  }
  console.log("instrumenting " + url);
  var basename = instUtil.createFilenameForScript(url);
  var filename = path.join(outputDir, basename);
  // TODO check for file conflicts and handle appropriately
  fs.writeFileSync(filename, src);

  var instFileName = basename.replace(new RegExp(".js$"), "_jalangi_.js");

  var options = {
    wrapProgram: true,
    filename: basename,
    instFileName: instFileName,
    dirIIDFile: outputDir,
    metadata: true,
  };
  var instrumented = esnstrument.instrumentCodeDeprecated(src, options).code;
  fs.writeFileSync(path.join(outputDir, instFileName), instrumented);
  return instrumented;
}

/**
 * create a fresh directory in which to dump instrumented scripts
 */
function initOutputDir() {
  var scriptDirToTry = "";
  for (var i = 0; i < 100; i++) {
    scriptDirToTry = outputDir + "/site" + i;
    if (!fs.existsSync(scriptDirToTry)) {
      break;
    }
  }
  // create the directory, including parents
  mkdirp.sync(scriptDirToTry);

  console.log("writing output to " + scriptDirToTry);
  outputDir = scriptDirToTry;

  return outputDir;
}

exports.initOutputDir = initOutputDir;

exports.getHeaderCode = function (root) {
  return instUtil.getHeaderCode(root);
};

exports.rewriter = rewriter;
