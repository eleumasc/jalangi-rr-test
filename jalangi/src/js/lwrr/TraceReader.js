var Constants = require("./Constants");
var LineByLine = require("./util/LineByLine");

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

class TraceReader {
  constructor(traceArray, objectMaxAgeMap) {
    this.traceArray = traceArray;
    this.objectMaxAgeMap = objectMaxAgeMap;
    this.traceIndex = 0;
    this.sequence = 0;
  }

  hasFutureReference(id) {
    return this.objectMaxAgeMap[id] >= this.sequence;
  }

  canDeleteReference(record) {
    return this.objectMaxAgeMap[record[F_VALUE]] === record[F_SEQ];
  }

  next() {
    const record = this.traceArray[this.traceIndex];
    const currentSequence = this.sequence;
    ++this.sequence;
    if (record && record[F_SEQ] === currentSequence) {
      ++this.traceIndex;
      return record;
    } else {
      return undefined;
    }
  }

  getCurrent() {
    const record = this.traceArray[this.traceIndex];
    if (record && record[F_SEQ] === this.sequence) {
      return record;
    } else {
      return undefined;
    }
  }

  getSequence() {
    return this.sequence;
  }

  static fromFile(filename) {
    const traceArray = [];
    const objectMaxAgeMap = [];

    const lineReader = new LineByLine(filename);
    let line;
    while ((line = lineReader.next())) {
      const record = JSON.parse(line.toString(), decodeNaNandInfForJSON);
      traceArray.push(record);

      const type = record[F_TYPE];
      if (
        (type === T_OBJECT || type === T_ARRAY || type === T_FUNCTION) &&
        record[F_FUNNAME] !== N_LOG_HASH &&
        record[F_VALUE] !== Constants.UNKNOWN
      ) {
        objectMaxAgeMap[record[F_VALUE]] = record[F_SEQ];
      }
      if (
        record[F_FUNNAME] === N_LOG_LOAD &&
        record[F_VALUE] !== Constants.UNKNOWN
      ) {
        objectMaxAgeMap[record[F_VALUE]] = record[F_SEQ];
      }
    }

    return new TraceReader(traceArray, objectMaxAgeMap);
  }
}

module.exports = TraceReader;
