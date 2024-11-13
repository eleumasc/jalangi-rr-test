import { APIResponse, Route } from "playwright";

export async function rewrite(
  route: Route,
  callback: (buf: string, response: APIResponse) => string
): Promise<void> {
  const response = await route.fetch();
  const buf = await response.text();
  try {
    const output = callback(buf, response);
    route.fulfill({ body: output });
  } catch (e) {
    route.abort("failed");
  }
}
