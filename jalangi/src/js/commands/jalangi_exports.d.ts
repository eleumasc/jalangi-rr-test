import { Metadata, Rewriter } from "rewriting-proxy";

export function initOutputDir(): string;

export function getHeaderCode(root?: string): string;

export const rewriter: Rewriter;
