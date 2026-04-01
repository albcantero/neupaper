import type { ASTNode, IfBranch, Condition } from "./ast";
import { parseData } from "./data-parser";
import { splitPath } from "./utils";

// ─── Data context ─────────────────────────────────────────────────
//
// A nested object — values are strings, numbers, booleans, or nested
// objects/arrays (list items keyed "1", "2", … per the .data format).

export type DataValue = string | number | boolean | DataObject | DataArray;
export type DataObject = { [key: string]: DataValue };
export type DataArray  = DataValue[];

// ─── Resolve a dotted path against the context ────────────────────
//
// "@cliente.nombre"   → ctx["cliente"]["nombre"]
// "@lineas.1.nombre"  → ctx["lineas"][0]["nombre"]  (1-indexed)
// "item"              → locals["item"]
// "item.nombre"       → locals["item"]["nombre"]

function resolve(
  path: string,
  ctx: DataObject,
  locals: DataObject,
): DataValue | undefined {
  const parts = splitPath(path);

  // Start from locals if the root key is there, otherwise from ctx
  let current: DataValue | undefined =
    parts[0] in locals ? locals[parts[0]] : ctx[parts[0]];

  for (let i = 1; i < parts.length; i++) {
    if (current == null || typeof current !== "object") return undefined;
    const key = parts[i];
    if (Array.isArray(current)) {
      // 1-indexed numeric access
      const idx = parseInt(key, 10);
      current = isNaN(idx) ? undefined : current[idx - 1];
    } else {
      current = (current as DataObject)[key];
    }
  }

  return current;
}

function stringify(v: DataValue | undefined): string {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// ─── Evaluate a branch condition ──────────────────────────────────

function testSingle(c: Condition, ctx: DataObject, locals: DataObject): boolean {
  const val = stringify(resolve(c.path, ctx, locals));
  const match = val === c.value;
  return c.operator === "is" ? match : !match;
}

function testCondition(
  branch: IfBranch,
  ctx: DataObject,
  locals: DataObject,
): boolean {
  if (!branch.condition) return true; // else branch
  if (Array.isArray(branch.condition)) {
    // OR: any condition matches → true
    return branch.condition.some((c) => testSingle(c, ctx, locals));
  }
  return testSingle(branch.condition, ctx, locals);
}

// ─── Resolve list variable to array ──────────────────────────────

function resolveList(path: string, ctx: DataObject, locals: DataObject): DataValue[] {
  const val = resolve(path, ctx, locals);
  if (Array.isArray(val)) return val;
  if (val != null && typeof val === "object" && !Array.isArray(val)) {
    // Object with numeric keys {"1":…,"2":…} → ordered array
    const obj = val as DataObject;
    const keys = Object.keys(obj)
      .filter((k) => /^\d+$/.test(k))
      .sort((a, b) => parseInt(a) - parseInt(b));
    if (keys.length > 0) return keys.map((k) => obj[k]);
    // Generic object — values as array
    return Object.values(obj);
  }
  return [];
}

// ─── Core evaluator ───────────────────────────────────────────────

/**
 * Evaluate an AST into a Markdown string.
 * WARNING: Mutates `ctx` (data/load/set merge into it).
 * Callers should pass a cloned context if the original must be preserved.
 */
export function evaluate(
  nodes: ASTNode[],
  ctx: DataObject,
  locals: DataObject = {},
  dataFiles: Record<string, string> = {},
): string {
  let out = "";

  for (const node of nodes) {
    switch (node.type) {
      // ── Passthrough ───────────────────────────────────────────
      case "text":
        out += node.value;
        break;

      case "comment":
        // Silently dropped
        break;

      case "pagebreak":
        out += '\n<div class="neu-pagebreak"></div>\n';
        break;

      case "config":
        // Consumed by the preview layer (font, theme), not emitted
        break;

      case "import":
        // Declarative — component resolution handles this
        break;

      case "load": {
        // Load external .data file and merge into ctx
        const fileContent = dataFiles[node.file];
        if (fileContent) {
          const parsed = parseData(fileContent);
          Object.assign(ctx, parsed);
        }
        break;
      }

      // ── Inline data block ─────────────────────────────────────
      case "data": {
        // Parse the raw .data content and merge into ctx
        const parsed = parseData(node.raw);
        Object.assign(ctx, parsed);
        break;
      }

      // ── Variable substitution ─────────────────────────────────
      case "variable": {
        const val = resolve(node.path, ctx, locals);
        out += stringify(val);
        break;
      }

      // ── Set ───────────────────────────────────────────────────
      case "set": {
        const parts = splitPath(node.path);
        const key = parts.join(".");
        if (parts.length === 1) {
          ctx[key] = node.value;
        } else {
          // Nested set — walk down to the parent
          let obj: DataObject = ctx;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!(parts[i] in obj) || typeof obj[parts[i]] !== "object") {
              obj[parts[i]] = {};
            }
            obj = obj[parts[i]] as DataObject;
          }
          obj[parts[parts.length - 1]] = node.value;
        }
        break;
      }

      // ── For loop ──────────────────────────────────────────────
      case "for": {
        const list = resolveList(node.list, ctx, locals);
        const parts: string[] = [];

        for (const item of list) {
          const itemLocals: DataObject = {
            ...locals,
            [node.item]:
              item != null && typeof item === "object" && !Array.isArray(item)
                ? (item as DataObject)
                : { "": stringify(item) },
          };

          // If item is a primitive, also expose it directly as the loop var
          if (item == null || typeof item !== "object") {
            itemLocals[node.item] = item ?? "";
          }

          // Strip the single leading newline that comes from the line break
          // after ${ for ... } so rows aren't separated by blank lines
          const result = evaluate(node.children, ctx, itemLocals, dataFiles);
          parts.push(result.startsWith("\n") ? result.slice(1) : result);
        }

        out += parts.join(node.separator);
        break;
      }

      // ── If / else if / else ───────────────────────────────────
      case "if": {
        for (const branch of node.branches) {
          if (testCondition(branch, ctx, locals)) {
            const result = evaluate(branch.children, ctx, locals, dataFiles);
            out += result;
            break;
          }
        }
        break;
      }

      // ── Document ─────────────────────────────────────────────
      case "document": {
        out += evaluate(node.children, ctx, locals, dataFiles);
        break;
      }

      // ── Component with children (open/close) ─────────────────
      case "component": {
        const childrenHtml = evaluate(node.children, ctx, locals, dataFiles);
        // Emit as a component call that resolveComponents will pick up
        // __children__ is a reserved prop carrying the evaluated body
        const propsStr = node.props ? ` ${node.props}` : "";
        out += `<${node.name}${propsStr} __children__="${encodeURIComponent(childrenHtml)}">`;
        break;
      }
    }
  }

  return out;
}
