"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
class TraceReceiver {
    constructor(outputDir) {
        this.outputDir = outputDir;
        this.buf = "";
        this.fileIndex = 1;
    }
    processMessage(msg) {
        if (msg === "reset") {
            this.reset();
        }
        else if (msg === "restart") {
            console.log("restart requested");
        }
        else {
            this.push(msg);
        }
    }
    push(chunk) {
        this.buf += chunk;
    }
    reset() {
        if (this.buf) {
            (0, fs_1.writeFileSync)(path_1.default.join(this.outputDir, `jalangi_trace${this.fileIndex}`), this.buf);
            this.buf = "";
            this.fileIndex += 1;
        }
    }
    end() {
        this.reset();
    }
}
exports.default = TraceReceiver;
