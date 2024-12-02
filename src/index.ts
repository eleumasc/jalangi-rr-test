import jalangiExports from "jalangi/src/js/commands/jalangi_exports";
import TraceReceiver from "./TraceReceiver";
import { chromium } from "playwright";
import { FetchRouteHandler, LocalRouteHandler } from "./RouteHandler";
import { rewriteExternalScript, rewriteHTML } from "rewriting-proxy";
import path from "path";

async function main(args: string[]) {
  const url = args[0];

  const routeHandler =
    typeof args[1] !== undefined
      ? new LocalRouteHandler(path.resolve(args[1]), new FetchRouteHandler())
      : new FetchRouteHandler();

  const outputDir = jalangiExports.initOutputDir();
  const headerCode = jalangiExports.getHeaderCode("jalangi");

  const browser = await chromium.launch({
    headless: false,
  });
  try {
    const page = await browser.newPage();

    const traceReceiver = new TraceReceiver(outputDir);

    await new Promise<void>(async (resolve) => {
      await page.addInitScript(headerCode);

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
            await routeHandler.handle(route, (body) =>
              rewriteHTML(
                body,
                request.url(),
                jalangiExports.rewriter,
                undefined, // `<script>${headerCode}</script>`, // headerHTML
                undefined, // headerURLs,
                undefined // rewriteOptions
              )
            );
          } else if (request.resourceType() === "script") {
            await routeHandler.handle(route, (body) =>
              rewriteExternalScript(
                body,
                request.url(),
                jalangiExports.rewriter
              )
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
