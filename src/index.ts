import jalangiExports from "jalangi/src/js/commands/jalangi_exports";
import TraceReceiver from "./TraceReceiver";
import { chromium } from "playwright";
import { rewrite } from "./rewrite";
import { rewriteExternalScript, rewriteHTML } from "rewriting-proxy";

async function main(args: string[]) {
  const url = args[0];

  const outputDir = jalangiExports.initOutputDir();
  const headerCode = jalangiExports.getHeaderCode("jalangi");

  const browser = await chromium.launch({
    headless: false,
  });
  try {
    const page = await browser.newPage();

    const traceReceiver = new TraceReceiver(outputDir);

    await new Promise<void>(async (resolve) => {
      await page.exposeFunction("$$__playwrightLog", (msg: string) => {
        traceReceiver.processMessage(msg);
      });

      await page.exposeFunction("$$__terminate", () => {
        resolve();
      });

      await page.route(
        () => true,
        async (route, request) => {
          if (request.resourceType() === "document") {
            rewrite(route, (buf) =>
              rewriteHTML(
                buf,
                request.url(),
                jalangiExports.rewriter,
                `<script>${headerCode}</script>`,
                undefined, // headerURLs,
                undefined // rewriteOptions
              )
            );
          } else if (request.resourceType() === "script") {
            rewrite(route, (buf) =>
              rewriteExternalScript(buf, request.url(), jalangiExports.rewriter)
            );
          } else {
            route.continue();
          }
        }
      );

      await page.goto(url);
    });

    traceReceiver.end();
  } finally {
    browser.close();
  }

  process.exit(0);
}

main(process.argv.slice(2));
