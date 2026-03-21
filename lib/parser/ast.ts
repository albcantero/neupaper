import type { Token } from "./tokenizer";

// ─── Node types ───────────────────────────────────────────────────

export type Condition = {
  path: string;               // "@cliente.tipo" | "item.nombre"
  operator: "is" | "is not";
  value: string;
};

export type IfBranch = {
  condition: Condition | null; // null = else branch
  children: ASTNode[];
};

export type ASTNode =
  | { type: "text";      value: string }
  | { type: "comment" }
  | { type: "pagebreak" }
  | { type: "config";    options: Record<string, string> }
  | { type: "load";      file: string }
  | { type: "data";      raw: string }
  | { type: "variable";  path: string }
  | { type: "set";       path: string; value: string }
  | { type: "for";       item: string; list: string; separator: string; children: ASTNode[] }
  | { type: "if";        branches: IfBranch[] };

// ─── Frame stack ──────────────────────────────────────────────────
//
// Tracks what block we're currently inside so we know where to
// append child nodes, and how to handle else/else-if/end.

type Frame =
  | { kind: "root"; children: ASTNode[] }
  | { kind: "for";  children: ASTNode[] }
  | { kind: "if";   node: Extract<ASTNode, { type: "if" }>; branch: IfBranch };

// ─── Helpers ──────────────────────────────────────────────────────

function parseCondition(expr: string): Condition | null {
  // "@x is not valor" | "@x is valor" | "item.prop is valor"
  const m = expr.match(/^(@[\w.]+|\w[\w.]*)\s+(is not|is)\s+(.+)$/);
  if (!m) return null;
  return { path: m[1], operator: m[2] as Condition["operator"], value: m[3].trim() };
}

function parseInlineValue(val: string): ASTNode {
  const unquoted = val.replace(/^["']|["']$/g, "");
  if (unquoted.startsWith("@")) {
    return { type: "variable", path: unquoted };
  }
  return { type: "text", value: unquoted };
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

  // Returns the children array where new nodes should be appended
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
        // Write accumulated raw content into the DataNode
        const nodes = current();
        const dataNode = nodes[nodes.length - 1] as Extract<ASTNode, { type: "data" }>;
        dataNode.raw = dataBuffer.trim();
        dataBuffer = "";
        dataMode = false;
      }
      // All other isle tokens inside data are ignored (including ${ end })
      continue;
    }

    // ── Comment ─────────────────────────────────────────────────
    if (body.startsWith("//")) {
      current().push({ type: "comment" });
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

    // ── For ─────────────────────────────────────────────────────
    if (body.startsWith("for ")) {
      // "for item in @lista" | "for item in @lista separator=", ""
      const m = body.match(/^for\s+(\w+)\s+in\s+(@[\w.]+)(?:\s+separator=(.+))?$/);
      if (m) {
        const node: Extract<ASTNode, { type: "for" }> = {
          type: "for",
          item: m[1],
          list: m[2],
          separator: m[3] ? m[3].replace(/^["']|["']$/g, "") : "",
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
        const rest = body.slice(thenIdx + 6); // after " then "
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
      if (frames.length > 1) frames.pop();
      continue;
    }

    // ── Variable ────────────────────────────────────────────────
    // "@variable", "@variable.prop", "item", "item.prop"
    if (body.startsWith("@") || /^\w[\w.]*$/.test(body)) {
      current().push({ type: "variable", path: body });
      continue;
    }
  }

  return root;
}
