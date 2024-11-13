"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jalangi_exports_1 = __importDefault(require("jalangi/src/js/commands/jalangi_exports"));
const TraceReceiver_1 = __importDefault(require("./TraceReceiver"));
const playwright_1 = require("playwright");
const rewrite_1 = require("./rewrite");
const rewriting_proxy_1 = require("rewriting-proxy");
function main(args) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = args[0];
        const outputDir = jalangi_exports_1.default.initOutputDir();
        const headerCode = jalangi_exports_1.default.getHeaderCode("jalangi");
        const browser = yield playwright_1.chromium.launch({
            headless: false,
        });
        try {
            const page = yield browser.newPage();
            const traceReceiver = new TraceReceiver_1.default(outputDir);
            yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                yield page.exposeFunction("$$__playwrightLog", (msg) => {
                    traceReceiver.processMessage(msg);
                });
                yield page.exposeFunction("$$__terminate", () => {
                    resolve();
                });
                yield page.route(() => true, (route, request) => __awaiter(this, void 0, void 0, function* () {
                    if (request.resourceType() === "document") {
                        (0, rewrite_1.rewrite)(route, (buf) => (0, rewriting_proxy_1.rewriteHTML)(buf, request.url(), jalangi_exports_1.default.rewriter, `<script>${headerCode}</script>`, undefined, // headerURLs,
                        undefined // rewriteOptions
                        ));
                    }
                    else if (request.resourceType() === "script") {
                        (0, rewrite_1.rewrite)(route, (buf) => (0, rewriting_proxy_1.rewriteExternalScript)(buf, request.url(), jalangi_exports_1.default.rewriter));
                    }
                    else {
                        route.continue();
                    }
                }));
                yield page.goto(url);
            }));
            traceReceiver.end();
        }
        finally {
            browser.close();
        }
        process.exit(0);
    });
}
main(process.argv.slice(2));
