import { tokenize } from "./tokenizer";
import { buildAST } from "./ast";
import { parseData } from "./data-parser";
import { rootFromPath, isExternal } from "./utils";
import type { ASTNode } from "./ast";

// ─── Diagnostic ───────────────────────────────────────────────────
// Messages are in Spanish by design — target audience is Spanish-first.
// Future: extract to i18n keys when multi-language support is needed.

export type Severity = "error" | "warning";

export interface LintDiagnostic {
  from: number;
  to: number;
  severity: Severity;
  message: string;
}

interface PositionedIsle {
  body: string;
  from: number;
  to: number;
}

// ─── Linter ───────────────────────────────────────────────────────

export function lint(source: string, dataFiles: Record<string, string> = {}): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
  const tokens = tokenize(source);
  const isles = scanIslePositions(source, diagnostics);

  const dataRanges = passStructural(isles, dataFiles, diagnostics);

  for (const range of dataRanges) {
    checkDataBrackets(source.slice(range.from, range.to), range.from, diagnostics);
  }

  passSemantic(tokens, isles, diagnostics);

  return diagnostics;
}

// ─── Pass 1: scan isle positions ─────────────────────────────────

function scanIslePositions(source: string, diagnostics: LintDiagnostic[]): PositionedIsle[] {
  const isles: PositionedIsle[] = [];
  let i = 0;
  while (i < source.length) {
    const start = source.indexOf("${", i);
    if (start === -1) break;
    const end = source.indexOf("}", start + 2);
    if (end === -1) {
      diagnostics.push({ from: start, to: source.length, severity: "error", message: "Bloque ${ sin cerrar — falta }" });
      break;
    }
    isles.push({ body: source.slice(start + 2, end).trim(), from: start, to: end + 1 });
    i = end + 1;
  }
  return isles;
}

// ─── Pass 2: structural checks (blocks, imports, loads) ──────────

type StackEntry = {
  kind: "for" | "if" | "data" | "create" | "open" | "document";
  from: number;
  to: number;
  name?: string;
  props?: string[];
};

function passStructural(
  isles: PositionedIsle[],
  dataFiles: Record<string, string>,
  diagnostics: LintDiagnostic[],
): Array<{ from: number; to: number }> {
  const stack: StackEntry[] = [];
  const dataRanges: Array<{ from: number; to: number }> = [];
  const importedComponents = new Set<string>();
  const loadedVars = new Map<string, string>();

  for (const { body, from, to } of isles) {
    // ${ create <Name> } or ${ create <Name> props(...) }
    const createMatch = body.match(/^create\s+<(\w+)>(?:\s+props\(([^)]*)\))?/);
    if (createMatch) {
      const declaredProps = createMatch[2]
        ? createMatch[2].split(",").map((p) => p.trim()).filter(Boolean)
        : undefined;
      stack.push({ kind: "create", from, to, name: createMatch[1], props: declaredProps });
      continue;
    }

    // ${ import <Name> }
    const importMatch = body.match(/^import\s+<(\w+)>$/);
    if (importMatch) { importedComponents.add(importMatch[1]); continue; }

    // ${ <ComponentName ...> }
    const componentCallMatch = body.match(/^<([A-Z]\w*)/);
    if (componentCallMatch) {
      const compName = componentCallMatch[1];
      if (!importedComponents.has(compName)) {
        diagnostics.push({ from, to, severity: "error", message: `Componente <${compName}> usado sin $\{ import <${compName}> }` });
      }
      continue;
    }

    // ${ open <Name> ... }
    const openMatch = body.match(/^open\s+<(\w+)>/);
    if (openMatch) { stack.push({ kind: "open", from, to, name: openMatch[1] }); continue; }

    // ${ close <Name> }
    const closeMatch = body.match(/^close\s+<(\w+)>$/);
    if (closeMatch) {
      const closeName = closeMatch[1];
      if (stack.length === 0 || stack[stack.length - 1].kind !== "open" || stack[stack.length - 1].name !== closeName) {
        diagnostics.push({ from, to, severity: "error", message: `$\{ close <${closeName}> } sin $\{ open <${closeName}> } que cerrar` });
      } else {
        stack.pop();
      }
      continue;
    }

    // ${ load file.data }
    const loadMatch = body.match(/^load\s+(.+)$/);
    if (loadMatch) {
      const fileName = loadMatch[1].trim();
      const fileContent = dataFiles[fileName];
      if (fileContent) {
        const parsed = parseData(fileContent);
        for (const key of Object.keys(parsed)) {
          if (loadedVars.has(key)) {
            const prevFile = loadedVars.get(key)!;
            diagnostics.push({ from, to, severity: "warning", message: `Variable "${key}" ya definida en ${prevFile} — ${fileName} la sobreescribe` });
          }
          loadedVars.set(key, fileName);
        }
      }
      continue;
    }

    if (body.startsWith("for ")) {
      if (!body.includes(" then ")) { stack.push({ kind: "for", from, to }); }
      continue;
    }
    if (body.startsWith("if ") && !body.startsWith("else if ")) {
      if (!body.includes(" then ")) { stack.push({ kind: "if", from, to }); }
      continue;
    }
    if (body === "data") { stack.push({ kind: "data", from, to }); continue; }
    // ${ document } is silently ignored — no longer required
    if (body === "document") { stack.push({ kind: "document", from, to }); continue; }

    // ${ get propName }
    const getMatch = body.match(/^get\s+(\w+)$/);
    if (getMatch) {
      const propName = getMatch[1];
      const createFrame = [...stack].reverse().find((s) => s.kind === "create");
      if (createFrame && createFrame.props && !createFrame.props.includes(propName)) {
        diagnostics.push({ from, to, severity: "warning", message: `"${propName}" no está declarada en props(${createFrame.props.join(", ")})` });
      }
      if (!createFrame) {
        diagnostics.push({ from, to, severity: "warning", message: `$\{ get ${propName} } fuera de un componente` });
      }
      continue;
    }

    if (body === "else" || body.startsWith("else if ")) {
      if (stack.length === 0 || stack[stack.length - 1].kind !== "if") {
        diagnostics.push({ from, to, severity: "error", message: "else sin if que lo preceda" });
      }
      continue;
    }

    if (body === "end document") {
      if (stack.length === 0 || stack[stack.length - 1].kind !== "document") {
        diagnostics.push({ from, to, severity: "error", message: "${ end document } sin ${ document } que cerrar" });
      } else { stack.pop(); }
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

    const endNameMatch = body.match(/^end\s+<(\w+)>$/);
    if (endNameMatch) {
      const closeName = endNameMatch[1];
      if (stack.length === 0) {
        diagnostics.push({ from, to, severity: "error", message: `$\{ end <${closeName}> } sin $\{ create <${closeName}> } que cerrar` });
      } else {
        const top = stack[stack.length - 1];
        if (top.kind === "create" && top.name === closeName) { stack.pop(); }
        else { diagnostics.push({ from, to, severity: "error", message: `$\{ end <${closeName}> } sin $\{ create <${closeName}> } que cerrar` }); }
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
          stack.push(closed);
        } else if (closed.kind === "create") {
          diagnostics.push({ from, to, severity: "error", message: `Usa $\{ end <${closed.name}> } para cerrar $\{ create <${closed.name}> }` });
          stack.push(closed);
        }
      }
      continue;
    }
  }

  // Anything left open (document is silently ignored — no longer required)
  for (const entry of stack) {
    if (entry.kind === "document") continue;
    diagnostics.push({ from: entry.from, to: entry.to, severity: "error", message: "Bloque ${ " + entry.kind + " } abierto sin ${ end }" });
  }

  return dataRanges;
}

// ─── Pass 3: semantic checks (undefined variables) ───────────────

function passSemantic(
  tokens: ReturnType<typeof tokenize>,
  isles: PositionedIsle[],
  diagnostics: LintDiagnostic[],
): void {
  try {
    const ast = buildAST(tokens);
    const defined = new Set<string>();
    collectDefined(ast, defined);
    checkVariables(ast, defined, isles, diagnostics);
  } catch {
    // If AST building fails, skip semantic checks
  }
}

function collectDefined(nodes: ASTNode[], defined: Set<string>): void {
  for (const node of nodes) {
    if (node.type === "data") {
      const parsed = parseData(node.raw);
      for (const key of Object.keys(parsed)) defined.add(key);
    }
    if (node.type === "set") { defined.add(rootFromPath(node.path)); }
    if (node.type === "for") { collectDefined(node.children, defined); }
    if (node.type === "if") {
      for (const branch of node.branches) collectDefined(branch.children, defined);
    }
  }
}

function checkVariables(
  nodes: ASTNode[],
  defined: Set<string>,
  isles: PositionedIsle[],
  diagnostics: LintDiagnostic[],
  loopLocals: Set<string> = new Set(),
): void {
  for (const node of nodes) {
    if (node.type === "variable") {
      const root = rootFromPath(node.path);
      if (isExternal(node.path) && !defined.has(root) && !loopLocals.has(root)) {
        const isle = findIsle(node.path, isles);
        if (isle) { diagnostics.push({ from: isle.from, to: isle.to, severity: "warning", message: `Variable @${root} no está definida` }); }
      }
    }

    if (node.type === "for") {
      const listRoot = rootFromPath(node.list);
      if (!defined.has(listRoot) && !loopLocals.has(listRoot)) {
        const isle = findIsle(node.list, isles);
        if (isle) { diagnostics.push({ from: isle.from, to: isle.to, severity: "warning", message: `Variable @${listRoot} no está definida` }); }
      }
      const newLocals = new Set(loopLocals);
      newLocals.add(node.item);
      checkVariables(node.children, defined, isles, diagnostics, newLocals);
    }

    if (node.type === "if") {
      for (const branch of node.branches) {
        if (branch.condition) {
          const conditions = Array.isArray(branch.condition) ? branch.condition : [branch.condition];
          for (const cond of conditions) {
            const root = rootFromPath(cond.path);
            if (isExternal(cond.path) && !defined.has(root) && !loopLocals.has(root)) {
              const isle = findIsle(cond.path, isles);
              if (isle) { diagnostics.push({ from: isle.from, to: isle.to, severity: "warning", message: `Variable @${root} no está definida` }); }
            }
          }
        }
        checkVariables(branch.children, defined, isles, diagnostics, loopLocals);
      }
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function checkDataBrackets(raw: string, offset: number, diagnostics: LintDiagnostic[]): void {
  const opens: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "[") { opens.push(offset + i); }
    else if (raw[i] === "]") {
      if (opens.length > 0) { opens.pop(); }
      else { diagnostics.push({ from: offset + i, to: offset + i + 1, severity: "error", message: "] sin [ que lo abra en el bloque de datos" }); }
    }
  }
  for (const pos of opens) {
    diagnostics.push({ from: pos, to: pos + 1, severity: "error", message: "Lista [ sin cerrar — falta ]" });
  }
}

function findIsle(path: string, isles: PositionedIsle[]): { from: number; to: number } | undefined {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$|\\.)`);
  return isles.find((isle) => re.test(isle.body));
}
