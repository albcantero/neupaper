import { tokenize } from "./tokenizer";
import { buildAST, type ASTNode } from "./ast";
import { evaluate, type DataObject } from "./evaluator";
import { resolveComponents } from "./components";

export type { DataObject, DataValue, DataArray } from "./evaluator";
export type { ASTNode } from "./ast";
export type { Token } from "./tokenizer";

/** Extract imported component names from the AST */
function collectImports(nodes: ASTNode[]): Set<string> {
  const imports = new Set<string>();
  for (const node of nodes) {
    if (node.type === "import") imports.add(node.name);
  }
  return imports;
}

/** Extract config options from the AST */
function collectConfig(nodes: ASTNode[]): Record<string, string> {
  for (const node of nodes) {
    if (node.type === "config") return node.options;
  }
  return {};
}

/**
 * Parse a Markdown Isles source string and return clean Markdown.
 *
 * ${ document } is required — only content inside it is rendered.
 * Everything outside (config, load, import, data) is processed for
 * side effects only. No ${ document } = empty output.
 */
export function parse(
  source: string,
  ctx: DataObject = {},
  components: Record<string, string> = {},
  dataFiles: Record<string, string> = {},
): string {
  const tokens = tokenize(source);
  const ast    = buildAST(tokens);
  const evalCtx = structuredClone(ctx);
  const imports = collectImports(ast);

  // Evaluate non-document nodes for side effects (data, load, set)
  const preamble = ast.filter((n) => n.type !== "document");
  evaluate(preamble, evalCtx, {}, dataFiles);

  // Only render content inside ${ document } — no document = empty output
  const docNode = ast.find((n) => n.type === "document");
  let result = docNode ? evaluate([docNode], evalCtx, {}, dataFiles) : "";

  // Only pass imported components to the resolver
  const allowedComponents: Record<string, string> = {};
  for (const name of imports) {
    if (components[name]) allowedComponents[name] = components[name];
  }
  result = resolveComponents(result, allowedComponents, evalCtx);
  return result;
}

export interface ParseResult {
  html: string;
  config: Record<string, string>;
}

/** Parse and return both HTML and config options */
export function parseWithConfig(
  source: string,
  ctx: DataObject = {},
  components: Record<string, string> = {},
  dataFiles: Record<string, string> = {},
): ParseResult {
  const tokens = tokenize(source);
  const ast    = buildAST(tokens);
  const evalCtx = structuredClone(ctx);
  const imports = collectImports(ast);
  const config  = collectConfig(ast);

  const preamble = ast.filter((n) => n.type !== "document");
  evaluate(preamble, evalCtx, {}, dataFiles);

  const docNode = ast.find((n) => n.type === "document");
  let result = docNode ? evaluate([docNode], evalCtx, {}, dataFiles) : "";

  const allowedComponents: Record<string, string> = {};
  for (const name of imports) {
    if (components[name]) allowedComponents[name] = components[name];
  }
  result = resolveComponents(result, allowedComponents, evalCtx);
  return { html: result, config };
}
