import { tokenize } from "./tokenizer";
import { buildAST } from "./ast";
import { parseData } from "./data-parser";
import type { ASTNode } from "./ast";

// ─── Diagnostic ───────────────────────────────────────────────────

export type Severity = "error" | "warning";

export interface LintDiagnostic {
  /** 0-based character offset in the source (start of the ${ token) */
  from: number;
  /** 0-based character offset (end of the ${ … } token) */
  to: number;
  severity: Severity;
  message: string;
}

// ─── Linter ───────────────────────────────────────────────────────

export function lint(source: string): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];

  // ── Pass 1: token-level checks (unclosed blocks, end without open) ──

  const tokens = tokenize(source);

  // Reconstruct character offsets for each isle token
  // The tokenizer discards positions — we re-scan to recover them
  interface PositionedIsle {
    body: string;
    from: number;
    to: number;
  }

  const isles: PositionedIsle[] = [];
  let i = 0;
  while (i < source.length) {
    const start = source.indexOf("${", i);
    if (start === -1) break;
    const end = source.indexOf("}", start + 2);
    if (end === -1) {
      diagnostics.push({
        from: start,
        to: source.length,
        severity: "error",
        message: "Bloque ${ sin cerrar — falta }",
      });
      break;
    }
    isles.push({ body: source.slice(start + 2, end).trim(), from: start, to: end + 1 });
    i = end + 1;
  }

  // Stack-based open/close check
  type StackEntry = { kind: "for" | "if" | "data"; from: number; to: number };
  const stack: StackEntry[] = [];

  // Closed data blocks: [contentStart, contentEnd] in source
  const dataRanges: Array<{ from: number; to: number }> = [];

  for (const isle of isles) {
    const { body, from, to } = isle;

    if (body.startsWith("for "))  { stack.push({ kind: "for",  from, to }); continue; }
    if (body.startsWith("if ") && !body.startsWith("else if ")) {
      stack.push({ kind: "if", from, to });
      continue;
    }
    if (body === "data") {
      stack.push({ kind: "data", from, to });
      continue;
    }

    if (body === "else" || body.startsWith("else if ")) {
      if (stack.length === 0 || stack[stack.length - 1].kind !== "if") {
        diagnostics.push({ from, to, severity: "error", message: "else sin if que lo preceda" });
      }
      continue;
    }

    if (body === "end data") {
      if (stack.length === 0 || stack[stack.length - 1].kind !== "data") {
        diagnostics.push({ from, to, severity: "error", message: "${ end data } sin ${ data } que cerrar" });
      } else {
        const closed = stack.pop()!;
        dataRanges.push({ from: closed.to, to: from });
      }
      continue;
    }

    if (body === "end" || body.startsWith("end ")) {
      if (stack.length === 0) {
        diagnostics.push({ from, to, severity: "error", message: "${ end } sin bloque que cerrar" });
      } else {
        const closed = stack.pop()!;
        if (closed.kind === "data") {
          diagnostics.push({ from, to, severity: "error", message: "Usa ${ end data } para cerrar ${ data }" });
          stack.push(closed); // put it back — not actually closed
        }
      }
      continue;
    }
  }

  // Anything left open
  for (const entry of stack) {
    diagnostics.push({
      from: entry.from,
      to: entry.to,
      severity: "error",
      message: "Bloque ${ " + entry.kind + " } abierto sin ${ end }",
    });
  }

  // ── Pass 1.5: check unclosed [ ] inside data blocks ───────────────

  for (const range of dataRanges) {
    const raw = source.slice(range.from, range.to);
    checkDataBrackets(raw, range.from, diagnostics);
  }

  // ── Pass 2: semantic checks (undefined variables) ─────────────────

  // Build the set of defined variable roots from data blocks + set nodes
  const defined = new Set<string>();

  // Walk AST to collect definitions and usages
  try {
    const ast = buildAST(tokens);
    collectDefined(ast, defined);

    // Now check variable usages
    checkVariables(ast, defined, source, isles, diagnostics);
  } catch {
    // If AST building fails, skip semantic checks
  }

  return diagnostics;
}

// ─── Collect all defined variable roots ───────────────────────────

function collectDefined(nodes: ASTNode[], defined: Set<string>): void {
  for (const node of nodes) {
    if (node.type === "data") {
      const parsed = parseData(node.raw);
      for (const key of Object.keys(parsed)) defined.add(key);
    }
    if (node.type === "set") {
      defined.add(node.path.replace(/^@/, "").split(".")[0]);
    }
    if (node.type === "for") {
      // The list variable must be defined; the item var is local (skip)
      collectDefined(node.children, defined);
    }
    if (node.type === "if") {
      for (const branch of node.branches) collectDefined(branch.children, defined);
    }
  }
}

// ─── Check variable usages ─────────────────────────────────────────

function checkVariables(
  nodes: ASTNode[],
  defined: Set<string>,
  source: string,
  isles: Array<{ body: string; from: number; to: number }>,
  diagnostics: LintDiagnostic[],
  loopLocals: Set<string> = new Set(),
): void {
  for (const node of nodes) {
    if (node.type === "variable") {
      const root = node.path.replace(/^@/, "").split(".")[0];
      const isExternal = node.path.startsWith("@");
      // Only warn about @variables (external), not loop locals
      if (isExternal && !defined.has(root) && !loopLocals.has(root)) {
        const isle = findIsle(node.path, isles);
        if (isle) {
          diagnostics.push({
            from: isle.from,
            to: isle.to,
            severity: "warning",
            message: `Variable @${root} no está definida`,
          });
        }
      }
    }

    if (node.type === "for") {
      const listRoot = node.list.replace(/^@/, "").split(".")[0];
      if (!defined.has(listRoot) && !loopLocals.has(listRoot)) {
        const isle = findIsle(node.list, isles);
        if (isle) {
          diagnostics.push({
            from: isle.from,
            to: isle.to,
            severity: "warning",
            message: `Variable @${listRoot} no está definida`,
          });
        }
      }
      const newLocals = new Set(loopLocals);
      newLocals.add(node.item);
      checkVariables(node.children, defined, source, isles, diagnostics, newLocals);
    }

    if (node.type === "if") {
      for (const branch of node.branches) {
        if (branch.condition) {
          const root = branch.condition.path.replace(/^@/, "").split(".")[0];
          const isExternal = branch.condition.path.startsWith("@");
          if (isExternal && !defined.has(root) && !loopLocals.has(root)) {
            const isle = findIsle(branch.condition.path, isles);
            if (isle) {
              diagnostics.push({
                from: isle.from,
                to: isle.to,
                severity: "warning",
                message: `Variable @${root} no está definida`,
              });
            }
          }
        }
        checkVariables(branch.children, defined, source, isles, diagnostics, loopLocals);
      }
    }
  }
}

// ─── Check unclosed [ ] brackets inside a data block ─────────────

function checkDataBrackets(raw: string, offset: number, diagnostics: LintDiagnostic[]): void {
  const opens: number[] = [];

  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "[") {
      opens.push(offset + i);
    } else if (raw[i] === "]") {
      if (opens.length > 0) {
        opens.pop();
      } else {
        diagnostics.push({
          from: offset + i,
          to: offset + i + 1,
          severity: "error",
          message: "] sin [ que lo abra en el bloque de datos",
        });
      }
    }
  }

  for (const pos of opens) {
    diagnostics.push({
      from: pos,
      to: pos + 1,
      severity: "error",
      message: "Lista [ sin cerrar — falta ]",
    });
  }
}

// ─── Find isle position by matching body content ───────────────────

function findIsle(
  path: string,
  isles: Array<{ body: string; from: number; to: number }>,
): { from: number; to: number } | undefined {
  // Match isle whose body contains the path
  return isles.find((isle) => isle.body.includes(path));
}
