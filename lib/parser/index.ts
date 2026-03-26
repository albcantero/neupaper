import { tokenize } from "./tokenizer";
import { buildAST } from "./ast";
import { evaluate, type DataObject } from "./evaluator";

export type { DataObject, DataValue, DataArray } from "./evaluator";
export type { ASTNode } from "./ast";
export type { Token } from "./tokenizer";

/**
 * Parse a Markdown Isles source string and return clean Markdown.
 *
 * @param source  Raw .md file content (may contain ${ } blocks)
 * @param ctx     Data context — variables loaded from .data files or inline ${ data } blocks
 */
export function parse(source: string, ctx: DataObject = {}): string {
  const tokens = tokenize(source);
  const ast    = buildAST(tokens);
  return evaluate(ast, structuredClone(ctx));
}
