export interface NeuFile {
  id: string;
  name: string;
  path: string; // "factura.md" for root, "components/ui/Table.isle" for nested
  content: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "neupaper:files";

function readAll(): NeuFile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const files: NeuFile[] = raw ? JSON.parse(raw) : [];
    // Migration: old files without path get path = name
    return files.map((f) => ({ ...f, path: f.path ?? f.name }));
  } catch {
    return [];
  }
}

function writeAll(files: NeuFile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

/** Root .md files (no subdirectory) */
export function getFiles(): NeuFile[] {
  return readAll().filter((f) => !f.path.includes("/"));
}

/** Files inside components/ and data/ */
export function getVaultFiles(): NeuFile[] {
  return readAll().filter((f) => f.path.includes("/"));
}

export function createFile(name: string): NeuFile {
  const fileName = name.endsWith(".md") ? name : `${name}.md`;
  const file: NeuFile = {
    id: crypto.randomUUID(),
    name: fileName,
    path: fileName,
    content: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  writeAll([...readAll(), file]);
  return file;
}

export function createVaultFile(path: string, content = ""): NeuFile {
  const name = path.split("/").pop()!;
  const file: NeuFile = {
    id: crypto.randomUUID(),
    name,
    path,
    content,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  writeAll([...readAll(), file]);
  return file;
}

export function updateFile(
  id: string,
  updates: Partial<Pick<NeuFile, "name" | "content">>
): NeuFile | null {
  const all = readAll();
  const idx = all.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  if (updates.name !== undefined) {
    all[idx].name = updates.name;
    // For root files update path too
    if (!all[idx].path.includes("/")) all[idx].path = updates.name;
  }
  if (updates.content !== undefined) all[idx].content = updates.content;
  all[idx].updatedAt = Date.now();
  writeAll(all);
  return all[idx];
}

const DEFAULT_VAULT_STRUCTURE: { path: string; content: string }[] = [
  { path: "components/built-in/Table.isle", content: "" },
  { path: "components/built-in/TotalRow.isle", content: "" },
  { path: "components/built-in/Sum.isle", content: "" },
  { path: "components/built-in/Header.isle", content: "" },
  { path: "components/built-in/Footer.isle", content: "" },
  { path: "components/built-in/PageBreak.isle", content: "" },
  { path: "components/built-in/Divider.isle", content: "" },
  { path: "components/built-in/Firma.isle", content: "" },
  { path: "components/built-in/Sello.isle", content: "" },
  { path: "components/built-in/Condiciones.isle", content: "" },
  { path: "components/built-in/QR.isle", content: "" },
  { path: "components/built-in/Badge.isle", content: "" },
  { path: "components/built-in/Highlight.isle", content: "" },
  { path: "components/built-in/Note.isle", content: "" },
  { path: "components/Saludo.isle", content: "" },
  { path: "components/Firma.isle", content: "" },
  { path: "data/clientes.data", content: "" },
  { path: "data/facturas.data", content: "" },
];

/** Seeds the vault with the default structure on first visit. */
export function initVault(): void {
  if (typeof window === "undefined") return;
  // Migration: remove legacy components/ui/ files (renamed to components/built-in/)
  const all = readAll();
  const withoutLegacy = all.filter((f) => !f.path.startsWith("components/ui/"));
  if (withoutLegacy.length !== all.length) writeAll(withoutLegacy);

  const existing = readAll();
  const existingPaths = new Set(existing.map((f) => f.path));
  const toCreate = DEFAULT_VAULT_STRUCTURE.filter(
    (f) => !existingPaths.has(f.path)
  );
  if (toCreate.length === 0) return;
  const newFiles: NeuFile[] = toCreate.map((f) => ({
    id: crypto.randomUUID(),
    name: f.path.split("/").pop()!,
    path: f.path,
    content: f.content,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));
  writeAll([...existing, ...newFiles]);
}

export function renameFolder(oldPath: string, newName: string): void {
  const all = readAll();
  const parentPath = oldPath.includes("/") ? oldPath.split("/").slice(0, -1).join("/") : "";
  const newPath = parentPath ? `${parentPath}/${newName}` : newName;
  const updated = all.map((f) => {
    if (f.path.startsWith(`${oldPath}/`)) {
      const relative = f.path.slice(oldPath.length + 1);
      const updatedPath = `${newPath}/${relative}`;
      return { ...f, path: updatedPath, name: updatedPath.split("/").pop()! };
    }
    return f;
  });
  writeAll(updated);
}

export function deleteFile(id: string): boolean {
  const all = readAll();
  const filtered = all.filter((f) => f.id !== id);
  if (filtered.length === all.length) return false;
  writeAll(filtered);
  return true;
}
