var Constants = require("./Constants");
var FileLineReader = require("../utils/FileLineReader");

exports.TraceReader = function (traceFilename) {
  var F_SEQ = Constants.F_SEQ;
  var F_TYPE = Constants.F_TYPE;
  var F_VALUE = Constants.F_VALUE;
  var F_FUNNAME = Constants.F_FUNNAME;
  var N_LOG_LOAD = Constants.N_LOG_LOAD;
  var N_LOG_HASH = Constants.N_LOG_HASH;

  var T_OBJECT = Constants.T_OBJECT;
  var T_FUNCTION = Constants.T_FUNCTION;
  var T_ARRAY = Constants.T_ARRAY;

  var decodeNaNandInfForJSON = Constants.decodeNaNandInfForJSON;
  var fixForStringNaN = Constants.fixForStringNaN;

  var traceArray = [];
  var traceIndex = 0;
  var currentIndex = 0;
  var frontierIndex = 0;
  var MAX_SIZE = 1024;
  var fileLineReader;
  var done = false;
  var currentRecord = null;

  this.objectIdLife = [];

  this.getTraceFilename = function () {
    return traceFilename;
  };

  this.populateObjectIdLife = function () {
    var fileLineReader = new FileLineReader(traceFilename);
    while (fileLineReader.hasNextLine()) {
      var record = JSON.parse(
        fileLineReader.nextLine(),
        decodeNaNandInfForJSON
      );
      var type = record[F_TYPE];
      if (
        (type === T_OBJECT || type === T_ARRAY || type === T_FUNCTION) &&
        record[F_FUNNAME] !== N_LOG_HASH &&
        record[F_VALUE] !== Constants.UNKNOWN
      ) {
        this.objectIdLife[record[F_VALUE]] = record[F_SEQ];
      }
      if (
        record[F_FUNNAME] === N_LOG_LOAD &&
        record[F_VALUE] !== Constants.UNKNOWN
      ) {
        this.objectIdLife[record[F_VALUE]] = record[F_SEQ];
      }
    }
    fileLineReader.close();
  };

  this.hasFutureReference = function (id) {
    var ret = this.objectIdLife[id] >= traceIndex;
    return ret;
  };

  this.canDeleteReference = function (recordedArray) {
    var ret =
      this.objectIdLife[recordedArray[F_VALUE]] === recordedArray[F_SEQ];
    return ret;
  };

  function cacheRecords() {
    var i = 0,
      flag,
      record;

    if (currentIndex >= frontierIndex) {
      if (!fileLineReader) {
        fileLineReader = new FileLineReader(traceFilename);
      }
      traceArray = [];
      while (!done && (flag = fileLineReader.hasNextLine()) && i < MAX_SIZE) {
        record = JSON.parse(fileLineReader.nextLine(), decodeNaNandInfForJSON);
        fixForStringNaN(record);
        traceArray.push(record);
        frontierIndex++;
        i++;
      }
      if (!flag && !done) {
        fileLineReader.close();
        done = true;
      }
    }
  }

  this.addRecord = function (line) {
    var record = JSON.parse(line, decodeNaNandInfForJSON);
    fixForStringNaN(record);
    traceArray.push(record);
    frontierIndex++;
  };

  this.getAndNext = function () {
    if (currentRecord !== null) {
      var ret = currentRecord;
      currentRecord = null;
      return ret;
    }
    cacheRecords();
    var record = traceArray[currentIndex % MAX_SIZE];
    if (record && record[F_SEQ] === traceIndex) {
      currentIndex++;
    } else {
      record = undefined;
    }
    traceIndex++;
    return record;
  };

  this.getNext = function () {
    if (currentRecord !== null) {
      throw new Error("Cannot do two getNext() in succession");
    }
    var tmp = this.getAndNext();
    var ret = this.getCurrent();
    currentRecord = tmp;
    return ret;
  };

  this.getCurrent = function () {
    if (currentRecord !== null) {
      return currentRecord;
    }
    cacheRecords();
    var record = traceArray[currentIndex % MAX_SIZE];
    if (!(record && record[F_SEQ] === traceIndex)) {
      record = undefined;
    }
    return record;
  };

  this.next = function () {
    if (currentRecord !== null) {
      currentRecord = null;
      return;
    }
    cacheRecords();
    var record = traceArray[currentIndex % MAX_SIZE];
    if (record && record[F_SEQ] === traceIndex) {
      currentIndex++;
    }
    traceIndex++;
  };

  this.getPreviousIndex = function () {
    if (currentRecord !== null) {
      return traceIndex - 2;
    }
    return traceIndex - 1;
  };
};
