"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getFiles,
  getVaultFiles,
  createFile,
  createVaultFile,
  deleteFile,
  updateFile,
  renameFolder,
  initVault,
  type NeuFile,
} from "@/lib/storage";

export function useVaultFiles() {
  const [files, setFiles] = useState<NeuFile[]>([]);
  const [vaultFiles, setVaultFiles] = useState<NeuFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [liveContent, setLiveContent] = useState("");

  // Full re-read from localStorage on every mutation.
  // Intentional: localStorage is the single source of truth (see ENGINEERING.md).
  // Targeted updates would duplicate state management logic from storage.ts.
  const refresh = useCallback(() => {
    setFiles(getFiles());
    setVaultFiles(getVaultFiles());
  }, []);

  // Init vault on mount
  useEffect(() => {
    const defaultDocId = initVault();
    refresh();
    if (defaultDocId) {
      setActiveId(defaultDocId);
      setOpenIds([defaultDocId]);
    }
  }, [refresh]);

  const allFiles = useMemo(() => [...files, ...vaultFiles], [files, vaultFiles]);
  const activeFile = useMemo(() => allFiles.find((f) => f.id === activeId) ?? null, [allFiles, activeId]);
  const openFiles = useMemo(
    () => openIds.map((id) => allFiles.find((f) => f.id === id)).filter((f): f is NeuFile => f !== undefined),
    [openIds, allFiles],
  );

  // Sync liveContent when active file changes
  useEffect(() => {
    setLiveContent(activeFile?.content ?? "");
    // Only re-sync when switching files, not on every content change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile?.id]);

  const select = useCallback((id: string) => {
    setActiveId(id);
    setOpenIds((prev) => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const closeTab = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = prev.filter((i) => i !== id);
      setActiveId((currentActive) => {
        if (currentActive === id) {
          const closedIndex = prev.indexOf(id);
          return next[Math.min(closedIndex, next.length - 1)] ?? null;
        }
        return currentActive;
      });
      return next;
    });
  }, []);

  const create = useCallback(() => {
    const name = `untitled-${files.length + 1}.md`;
    const file = createFile(name);
    refresh();
    select(file.id);
  }, [files.length, refresh, select]);

  const remove = useCallback((id: string) => {
    deleteFile(id);
    refresh();
    setOpenIds((prev) => prev.filter((i) => i !== id));
    setActiveId((prev) => prev === id ? null : prev);
  }, [refresh]);

  const rename = useCallback((id: string, name: string) => {
    updateFile(id, { name });
    refresh();
  }, [refresh]);

  const duplicate = useCallback((file: NeuFile) => {
    const isRoot = !file.path.includes("/");
    if (isRoot) {
      const base = file.name.replace(/\.md$/, "");
      const copy = createFile(`${base}-copy.md`);
      updateFile(copy.id, { content: file.content });
    } else {
      const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
      const base = file.name.replace(ext, "");
      const dir = file.path.split("/").slice(0, -1).join("/");
      createVaultFile(`${dir}/${base}-copy${ext}`, file.content);
    }
    refresh();
  }, [refresh]);

  const renameFolderAction = useCallback((oldPath: string, newName: string) => {
    renameFolder(oldPath, newName);
    refresh();
  }, [refresh]);

  const newFolderIn = useCallback((parentPath: string): string => {
    const ext = parentPath.startsWith("components") ? ".isle" : ".data";
    const newFolderPath = parentPath ? `${parentPath}/new-folder` : "new-folder";
    const baseName = ext === ".isle" ? "NewComponent" : "untitled";
    const defaultContent = ext === ".isle"
      ? `\${ create <${baseName}> }\n\n\${ end <${baseName}> }`
      : `\${ data }\n\n\${ end data }`;
    createVaultFile(`${newFolderPath}/${baseName}${ext}`, defaultContent);
    refresh();
    return newFolderPath;
  }, [refresh]);

  const deleteFolder = useCallback((folderPath: string) => {
    const folderFiles = allFiles.filter((f) => f.path.startsWith(`${folderPath}/`));
    folderFiles.forEach((f) => deleteFile(f.id));
    setOpenIds((prev) => prev.filter((id) => !folderFiles.some((f) => f.id === id)));
    setActiveId((prev) => prev && folderFiles.some((f) => f.id === prev) ? null : prev);
    refresh();
  }, [allFiles, refresh]);

  const duplicateFolder = useCallback((folderPath: string) => {
    const folderFiles = allFiles.filter((f) => f.path.startsWith(`${folderPath}/`));
    const newFolderPath = `${folderPath}-copy`;
    folderFiles.forEach((f) => {
      const relative = f.path.slice(folderPath.length);
      createVaultFile(`${newFolderPath}${relative}`, f.content);
    });
    refresh();
  }, [allFiles, refresh]);

  const newInFolder = useCallback((folderPath: string) => {
    const isComponents = folderPath.startsWith("components");
    const ext = isComponents ? ".isle" : ".data";
    const baseName = ext === ".isle" ? "NewComponent" : "untitled";
    const existingNames = new Set(allFiles.map((f) => f.name));
    let name = `${baseName}${ext}`;
    let i = 1;
    while (existingNames.has(name)) {
      name = `${baseName}-${i}${ext}`;
      i++;
    }
    const componentName = name.replace(ext, "");
    const defaultContent = ext === ".isle"
      ? `\${ create <${componentName}> }\n\n\${ end <${componentName}> }`
      : `\${ data }\n\n\${ end data }`;
    const file = createVaultFile(`${folderPath}/${name}`, defaultContent);
    refresh();
    select(file.id);
  }, [refresh, select, allFiles]);

  const createVaultFileAction = useCallback((path: string) => {
    const file = createVaultFile(path);
    refresh();
    select(file.id);
  }, [refresh, select]);

  const changeContent = useCallback((content: string) => {
    setLiveContent(content);
    setActiveId((currentId) => {
      if (!currentId) return currentId;
      updateFile(currentId, { content });
      setFiles((prev) => prev.map((f) => f.id === currentId ? { ...f, content } : f));
      setVaultFiles((prev) => prev.map((f) => f.id === currentId ? { ...f, content } : f));
      return currentId;
    });
  }, []);

  // Derived maps for parser
  const components = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of getVaultFiles()) {
      if (f.name.endsWith(".isle") && f.content) {
        map[f.name.replace(".isle", "")] = f.content;
      }
    }
    return map;
    // Re-reads from localStorage for freshness; liveContent triggers rebuild when editing .isle files
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveContent, vaultFiles]);

  const dataFiles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of getVaultFiles()) {
      if (f.name.endsWith(".data") && f.content) {
        map[f.name] = f.content;
      }
    }
    return map;
    // Re-reads from localStorage for freshness; liveContent triggers rebuild when editing .data files
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveContent, vaultFiles]);

  return {
    // State
    allFiles,
    activeId,
    activeFile,
    openFiles,
    liveContent,
    components,
    dataFiles,

    // Actions
    select,
    setActiveId,
    closeTab,
    create,
    remove,
    rename,
    duplicate,
    renameFolder: renameFolderAction,
    newFolderIn,
    deleteFolder,
    duplicateFolder,
    newInFolder,
    createVaultFile: createVaultFileAction,
    changeContent,
  } as const;
}
