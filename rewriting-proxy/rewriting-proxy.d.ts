type Rewriter = (src: string, metadata: Metadata) => string;

type Metadata = {
  type: string;
  url: string;
  source: string;
};

export function start(options: any): void;

export function rewriteHTML(
  html: string,
  url: string,
  rewriter: Rewriter,
  headerHTML?: string,
  headerURLs?: string[],
  options?: any
): string;

export function rewriteExternalScript(
  src: string,
  url: string,
  rewriteFunc: Rewriter
): string;
