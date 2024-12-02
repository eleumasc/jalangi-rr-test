import { existsSync, lstatSync, readFileSync } from "fs";
import path from "path";
import { Route } from "playwright";

export default interface RouteHandler {
  handle(route: Route, transformBody: BodyTransformer): Promise<void>;
}

export type BodyTransformer = (body: string) => string;

export class FetchRouteHandler {
  async handle(route: Route, transformBody: BodyTransformer): Promise<void> {
    try {
      const response = await route.fetch();
      const body = await response.text();
      const bodyTransformed = transformBody(body);
      route.fulfill({ response, body: bodyTransformed });
    } catch (e) {
      route.fulfill({ status: 500 });
    }
  }
}

export class LocalRouteHandler {
  constructor(readonly root: string, readonly fallback: RouteHandler) {}

  async handle(route: Route, transformBody: BodyTransformer): Promise<void> {
    const requestUrl = new URL(route.request().url());

    if (requestUrl.origin !== "https://testsite.local") {
      await this.fallback.handle(route, transformBody);
      return;
    }

    try {
      let filepath = path.join(this.root, requestUrl.pathname);

      if (!existsSync(filepath)) {
        route.fulfill({ status: 404 });
        return;
      }

      const stats = lstatSync(filepath);
      if (stats.isDirectory()) {
        filepath = path.join(filepath, "index.html");

        if (!existsSync(filepath)) {
          route.fulfill({ status: 404 });
          return;
        }
      }

      const body = readFileSync(filepath).toString();
      const bodyTransformed = transformBody(body);
      route.fulfill({ status: 200, body: bodyTransformed });
    } catch (e) {
      route.fulfill({ status: 500 });
    }
  }
}
