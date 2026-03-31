import { tokenize } from "./tokenizer";
import { buildAST } from "./ast";
import { evaluate, type DataObject } from "./evaluator";

/**
 * Post-evaluation pass: resolves <ComponentName prop=value> calls.
 *
 * ${ get prop } is a macro — it expands BEFORE tokenization so it can
 * appear inside other ${ } blocks (e.g. ${ for item in ${ get list } }).
 *
 * After macro expansion, the component body is run through the full
 * parser pipeline (tokenize → AST → evaluate) with the document's
 * data context, so loops, conditionals, and @variables all work.
 *
 * Resolves recursively (up to 10 levels) so nested components work:
 * e.g. Header.isle can use ${ <Badge> } inside its body.
 */

const COMPONENT_RE = /<([A-Z][a-zA-Z0-9]*)((?:\s+[\w-]+=(?:"[^"]*"|[^\s>]*))*)\s*>/g;
/** Max recursion depth for nested component resolution — prevents infinite loops (A uses B, B uses A) */
const MAX_DEPTH = 10;

export function resolveComponents(
  markdown: string,
  components: Record<string, string>,
  ctx: DataObject = {},
): string {
  let result = markdown;

  if (Object.keys(components).length > 0) {
    for (let depth = 0; depth < MAX_DEPTH; depth++) {
      let changed = false;
      result = result.replace(
        COMPONENT_RE,
        (match, name: string, propsStr: string) => {
          const resolved = resolveOne(match, name, propsStr, components, ctx);
          if (resolved !== match) changed = true;
          return resolved;
        },
      );
      if (!changed) break;
    }
  }

  // Remove unresolved component tags so they don't leak as unknown HTML
  result = result.replace(COMPONENT_RE, "");

  return result;
}

function resolveOne(
  match: string,
  name: string,
  propsStr: string,
  components: Record<string, string>,
  ctx: DataObject,
): string {
  const isleSrc = components[name];
  if (!isleSrc) return match;

  // Extract body between ${ create <Name> ... } and ${ end <Name> }
  const createRe = new RegExp(
    `\\$\\{\\s*create\\s+<${name}>(?:\\s+props\\(([^)]*)\\))?\\s*\\}([\\s\\S]*?)\\$\\{\\s*end\\s+<${name}>\\s*\\}`,
  );
  const bodyMatch = isleSrc.match(createRe);
  if (!bodyMatch) return match;

  let body = bodyMatch[2];

  // Parse props from the call site
  const props: Record<string, string> = {};
  if (propsStr) {
    for (const m of propsStr.matchAll(/([\w-]+)=(?:"([^"]*)"|(\S+))/g)) {
      props[m[1]] = m[2] ?? m[3];
    }
  }

  // Decode __children__ (from open/close component calls)
  if (props.__children__) {
    try {
      props.children = decodeURIComponent(props.__children__);
    } catch {
      props.children = props.__children__;
    }
    delete props.__children__;
  }

  // Macro expansion: substitute ${ get propName } with prop values.
  // Pass 1: ${ get } nested inside another ${ } block — emit raw value
  body = body.replace(
    /(\$\{[^}]*?)\$\{\s*get\s+(\w+)\s*\}([^}]*\})/g,
    (_, before: string, propName: string, after: string) => {
      return before + (props[propName] ?? "") + after;
    },
  );

  // Pass 2: standalone ${ get X } — wrap @ references in ${ }
  body = body.replace(
    /\$\{\s*get\s+(\w+)\s*\}/g,
    (_, propName: string) => {
      const val = props[propName] ?? "";
      return val.startsWith("@") ? `\${ ${val} }` : val;
    },
  );

  // Run the expanded body through the full parser pipeline
  try {
    const tokens = tokenize(body);
    const ast = buildAST(tokens);
    const result = evaluate(ast, structuredClone(ctx));
    return result.trim();
  } catch {
    return body.trim();
  }
}
