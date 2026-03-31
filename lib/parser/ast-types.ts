// ─── Node types ───────────────────────────────────────────────────

export type Condition = {
  path: string;               // "@cliente.tipo" | "item.nombre"
  operator: "is" | "is not";
  value: string;
};

export type IfBranch = {
  condition: Condition | Condition[] | null; // null = else, array = OR conditions
  children: ASTNode[];
};

export type ASTNode =
  | { type: "text";      value: string }
  | { type: "comment" }
  | { type: "pagebreak" }
  | { type: "config";    options: Record<string, string> }
  | { type: "load";      file: string }
  | { type: "import";    name: string }
  | { type: "data";      raw: string }
  | { type: "variable";  path: string }
  | { type: "set";       path: string; value: string }
  | { type: "for";       item: string; list: string; separator: string; children: ASTNode[] }
  | { type: "if";        branches: IfBranch[] }
  | { type: "component"; name: string; props: string; children: ASTNode[] }
  | { type: "document";  children: ASTNode[] };
