import type { Token } from "./tokenizer";
import type { ASTNode, Condition, IfBranch } from "./ast-types";

// Re-export types so existing imports from "./ast" still work
export type { ASTNode, Condition, IfBranch } from "./ast-types";

// ─── Frame stack ──────────────────────────────────────────────────
//
// Tracks what block we're currently inside so we know where to
// append child nodes, and how to handle else/else-if/end.

type Frame =
  | { kind: "root"; children: ASTNode[] }
  | { kind: "for";  children: ASTNode[] }
  | { kind: "if";   node: Extract<ASTNode, { type: "if" }>; branch: IfBranch }
  | { kind: "component"; children: ASTNode[] }
  | { kind: "document"; children: ASTNode[] };

// ─── Helpers ──────────────────────────────────────────────────────

function parseSingleCondition(expr: string): Condition | null {
  const m = expr.trim().match(/^(@[\w.]+|\w[\w.]*)\s+(is not|is)\s+(.+)$/);
  if (!m) return null;
  return { path: m[1], operator: m[2] as Condition["operator"], value: m[3].trim() };
}

function parseCondition(expr: string): Condition | Condition[] | null {
  if (expr.includes(" or ")) {
    const parts = expr.split(/\s+or\s+/);
    const conditions = parts.map(parseSingleCondition).filter((c): c is Condition => c !== null);
    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0];
    return conditions;
  }
  return parseSingleCondition(expr);
}

function parseInlineValue(val: string): ASTNode {
  const trimmed = val.trim();
  // Quoted → always literal text
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return { type: "text", value: trimmed.slice(1, -1) };
  }
  // Unquoted @var or bare local (e.g. client.revenue)
  if (trimmed.startsWith("@") || /^\w[\w.]*$/.test(trimmed)) {
    return { type: "variable", path: trimmed };
  }
  return { type: "text", value: trimmed };
}

function parseConfig(body: string): Record<string, string> {
  const options: Record<string, string> = {};
  for (const m of body.matchAll(/@([\w]+)(?::([\w-]+))?/g)) {
    options[m[1]] = m[2] ?? "true";
  }
  return options;
}

// ─── Builder ──────────────────────────────────────────────────────

export function buildAST(tokens: Token[]): ASTNode[] {
  const root: ASTNode[] = [];
  const frames: Frame[] = [{ kind: "root", children: root }];

  const current = (): ASTNode[] => {
    const f = frames[frames.length - 1];
    return f.kind === "if" ? f.branch.children : f.children;
  };

  let dataMode = false;
  let dataBuffer = "";

  for (const token of tokens) {
    // ── Text token ──────────────────────────────────────────────
    if (token.type === "text") {
      if (dataMode) {
        dataBuffer += token.value;
      } else {
        current().push({ type: "text", value: token.value });
      }
      continue;
    }

    const body = token.body;

    // ── Inside a ${ data } block ────────────────────────────────
    if (dataMode) {
      if (body === "end data") {
        const nodes = current();
        const dataNode = nodes[nodes.length - 1] as Extract<ASTNode, { type: "data" }>;
        dataNode.raw = dataBuffer.trim();
        dataBuffer = "";
        dataMode = false;
      }
      continue;
    }

    // ── Comment ─────────────────────────────────────────────────
    if (body.startsWith("//")) {
      current().push({ type: "comment" });
      continue;
    }

    // ── Open component ────────────────────────────────────────
    const openMatch = body.match(/^open\s+<([A-Z]\w*)>(.*)/);
    if (openMatch) {
      const node: Extract<ASTNode, { type: "component" }> = {
        type: "component",
        name: openMatch[1],
        props: openMatch[2].trim(),
        children: [],
      };
      current().push(node);
      frames.push({ kind: "component", children: node.children });
      continue;
    }

    // ── Close component ─────────────────────────────────────────
    if (/^close\s+<[A-Z]\w*>$/.test(body)) {
      if (frames.length > 1 && frames[frames.length - 1].kind === "component") {
        frames.pop();
      }
      continue;
    }

    // ── Page break ──────────────────────────────────────────────
    if (body === "pagebreak") {
      current().push({ type: "pagebreak" });
      continue;
    }

    // ── Config ──────────────────────────────────────────────────
    if (body.startsWith("config")) {
      current().push({ type: "config", options: parseConfig(body) });
      continue;
    }

    // ── Load ────────────────────────────────────────────────────
    if (body.startsWith("load ")) {
      current().push({ type: "load", file: body.slice(5).trim() });
      continue;
    }

    // ── Import ─────────────────────────────────────────────────
    const importMatch = body.match(/^import\s+<(\w+)>$/);
    if (importMatch) {
      current().push({ type: "import", name: importMatch[1] });
      continue;
    }

    // ── Document (delimits renderable content) ───────────────────
    if (body === "document") {
      const node: Extract<ASTNode, { type: "document" }> = {
        type: "document",
        children: [],
      };
      current().push(node);
      frames.push({ kind: "document", children: node.children });
      continue;
    }

    // ── Data (opens a raw block) ─────────────────────────────────
    if (body === "data") {
      current().push({ type: "data", raw: "" });
      dataMode = true;
      dataBuffer = "";
      continue;
    }

    // ── Set ─────────────────────────────────────────────────────
    if (body.startsWith("set ")) {
      const m = body.match(/^set\s+(@[\w.]+)\s*=\s*(.+)$/);
      if (m) current().push({ type: "set", path: m[1], value: m[2].trim() });
      continue;
    }

    // ── For (inline: ${ for item in @list then item.nombre separator=", " })
    if (body.startsWith("for ") && body.includes(" then ")) {
      const m = body.match(/^for\s+(\w+)\s+in\s+(@[\w.]+)\s+then\s+(.+?)(?:\s+separator=(.+?))?$/);
      if (m) {
        const thenExpr = m[3].trim();
        const child: ASTNode = thenExpr.startsWith("@") || /^\w[\w.]*$/.test(thenExpr)
          ? { type: "variable", path: thenExpr }
          : { type: "text", value: thenExpr.replace(/^["']|["']$/g, "") };
        current().push({
          type: "for",
          item: m[1],
          list: m[2],
          separator: m[4] ? m[4].trim().replace(/^["']|["']$/g, "") : "",
          children: [child],
        });
      }
      continue;
    }

    // ── For (block: ${ for item in @list } ... ${ end })
    if (body.startsWith("for ")) {
      const m = body.match(/^for\s+(\w+)\s+in\s+(@[\w.]+)(?:\s+separator=(.+?))?$/);
      if (m) {
        const node: Extract<ASTNode, { type: "for" }> = {
          type: "for",
          item: m[1],
          list: m[2],
          separator: m[3] ? m[3].trim().replace(/^["']|["']$/g, "") : "",
          children: [],
        };
        current().push(node);
        frames.push({ kind: "for", children: node.children });
      }
      continue;
    }

    // ── If (inline: ${ if @x is val then "a" else "b" }) ─────
    if (body.startsWith("if ") && !body.startsWith("else if ") && body.includes(" then ")) {
      const thenIdx = body.indexOf(" then ");
      const condition = parseCondition(body.slice(3, thenIdx));
      if (condition) {
        const rest = body.slice(thenIdx + 6);
        const elseIdx = rest.indexOf(" else ");
        const thenPart = (elseIdx === -1 ? rest : rest.slice(0, elseIdx)).trim();
        const elsePart = elseIdx === -1 ? null : rest.slice(elseIdx + 6).trim();

        const branches: IfBranch[] = [
          { condition, children: [parseInlineValue(thenPart)] },
        ];
        if (elsePart !== null) {
          branches.push({ condition: null, children: [parseInlineValue(elsePart)] });
        }
        current().push({ type: "if", branches });
      }
      continue;
    }

    // ── If (block: ${ if @x is val } ... ${ end }) ───────────
    if (body.startsWith("if ") && !body.startsWith("else if ")) {
      const condition = parseCondition(body.slice(3));
      if (condition) {
        const branch: IfBranch = { condition, children: [] };
        const node: Extract<ASTNode, { type: "if" }> = { type: "if", branches: [branch] };
        current().push(node);
        frames.push({ kind: "if", node, branch });
      }
      continue;
    }

    // ── Else if ─────────────────────────────────────────────────
    if (body.startsWith("else if ")) {
      const frame = frames[frames.length - 1];
      if (frame.kind === "if") {
        const condition = parseCondition(body.slice(8));
        if (condition) {
          const branch: IfBranch = { condition, children: [] };
          frame.node.branches.push(branch);
          frame.branch = branch;
        }
      }
      continue;
    }

    // ── Else ────────────────────────────────────────────────────
    if (body === "else") {
      const frame = frames[frames.length - 1];
      if (frame.kind === "if") {
        const branch: IfBranch = { condition: null, children: [] };
        frame.node.branches.push(branch);
        frame.branch = branch;
      }
      continue;
    }

    // ── End ─────────────────────────────────────────────────────
    if (body === "end" || body.startsWith("end ")) {
      if (frames.length > 1) {
        const topKind = frames[frames.length - 1].kind;
        // Generic ${ end } can't close component or document frames
        if (body === "end" && (topKind === "component" || topKind === "document")) {
          // ignore — need ${ close <X> } or ${ end document }
        } else if (topKind !== "component") {
          frames.pop();
        }
      }
      continue;
    }

    // ── Component call ─────────────────────────────────────────
    if (/^<[A-Z]/.test(body)) {
      current().push({ type: "text", value: body });
      continue;
    }

    // ── Variable ────────────────────────────────────────────────
    if (body.startsWith("@") || /^\w[\w.]*$/.test(body)) {
      current().push({ type: "variable", path: body });
      continue;
    }
  }

  return root;
}
