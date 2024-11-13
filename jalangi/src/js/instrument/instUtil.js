/*
 * Copyright 2013 Samsung Information Systems America, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Author: Manu Sridharan

/*jslint node: true */
var fs = require("fs");
var path = require("path");
var urlParser = require("url");

function rootSource(src) {
  return (root) => (root ? path.join(root, src) : src);
}

function nodeSource(src) {
  return (_) => path.join("node_modules", src);
}

/**
 * which source files are required for Jalangi to run in the browser?
 */
var headerSources2 = [
  rootSource("src/js/Constants.js"),
  rootSource("src/js/Config.js"),
  rootSource("src/js/Globals.js"),
  rootSource("src/js/TraceWriter.js"),
  rootSource("src/js/iidToLocation.js"),
  rootSource("src/js/analysis2.js"),
  nodeSource("escodegen/escodegen.browser.js"),
  nodeSource("acorn/acorn.js"),
  rootSource("src/js/utils/astUtil.js"),
  rootSource("src/js/instrument/esnstrument.js"),
];

var headerSources = [
  rootSource("src/js/Constants.js"),
  rootSource("src/js/Config.js"),
  rootSource("src/js/Globals.js"),
  rootSource("src/js/TraceWriter.js"),
  rootSource("src/js/TraceReader.js"),
  rootSource("src/js/SMemory.js"),
  rootSource("src/js/iidToLocation.js"),
  rootSource("src/js/RecordReplayEngine.js"),
  rootSource("src/js/analysis.js"),
  nodeSource("escodegen/escodegen.browser.min.js"),
  nodeSource("acorn/acorn.js"),
  rootSource("src/js/utils/astUtil.js"),
  rootSource("src/js/instrument/esnstrument.js"),
];

/**
 * concatenates required scripts for Jalangi to run in the browser into a single string
 */
var headerCode = "";

function setHeaders(flag) {
  if (flag) {
    headerSources = headerSources2;
    exports.headerSources = headerSources;
  }
}

function headerCodeInit(root) {
  headerSources.forEach(function (src) {
    headerCode += fs.readFileSync(src(root));
  });
}

function getHeaderCode(root) {
  if (!headerCode) {
    headerCodeInit(root);
  }
  return headerCode;
}

/**
 * returns an HTML string of <script> tags, one of each header file, with the
 * absolute path of the header file
 */
function getHeaderCodeAsScriptTags(root) {
  var ret = "";
  headerSources.forEach(function (src) {
    var resolved = path.resolve(src(root));
    ret += '<script src="' + resolved + '"></script>';
  });
  return ret;
}

var inlineRegexp = /#(inline|event-handler|js-url)/;

/**
 * Does the url (obtained from rewriting-proxy) represent an inline script?
 */
function isInlineScript(url) {
  return inlineRegexp.test(url);
}

/**
 * generate a filename for a script with the given url
 */
function createFilenameForScript(url) {
  // TODO make this much more robust
  var parsed = urlParser.parse(url);
  if (inlineRegexp.test(url)) {
    return parsed.hash.substring(1) + ".js";
  } else {
    return parsed.pathname.substring(parsed.pathname.lastIndexOf("/") + 1);
  }
}

exports.setHeaders = setHeaders;
exports.getHeaderCode = getHeaderCode;
exports.getHeaderCodeAsScriptTags = getHeaderCodeAsScriptTags;
exports.isInlineScript = isInlineScript;
exports.headerSources = headerSources;
exports.createFilenameForScript = createFilenameForScript;
