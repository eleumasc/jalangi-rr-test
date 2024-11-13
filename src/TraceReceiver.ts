import path from "path";
import { writeFileSync } from "fs";

export default class TraceReceiver {
  protected buf: string = "";
  protected fileIndex: number = 1;

  constructor(readonly outputDir: string) {}

  processMessage(msg: string) {
    if (msg === "reset") {
      this.reset();
    } else if (msg === "restart") {
      console.log("restart requested");
    } else {
      this.push(msg);
    }
  }

  push(chunk: string) {
    this.buf += chunk;
  }

  reset() {
    if (this.buf) {
      writeFileSync(
        path.join(this.outputDir, `jalangi_trace${this.fileIndex}`),
        this.buf
      );
      this.buf = "";
      this.fileIndex += 1;
    }
  }

  end() {
    this.reset();
  }
}
