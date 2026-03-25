"use client";

import { useState, useEffect, useCallback } from "react";
import { getFiles, getVaultFiles, createFile, createVaultFile, deleteFile, updateFile, renameFolder, initVault, type NeuFile } from "@/lib/storage";
import { NEU_EDITOR_BG } from "@/lib/editor/neu-theme";
import { VaultSidebar } from "@/components/vault/Sidebar";
import { Editor } from "@/components/vault/Editor";
import { EditorTabs, EDITOR_THEMES, EDITOR_FONTS, type EditorThemeId, type EditorFontId } from "@/components/vault/EditorTabs";
import { Preview } from "@/components/vault/Preview";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Card } from "@/components/ui/card";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export default function VaultPage() {
  const [files, setFiles] = useState<NeuFile[]>([]);
  const [vaultFiles, setVaultFiles] = useState<NeuFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [liveContent, setLiveContent] = useState("");
  const [handleHovered, setHandleHovered] = useState(false);
  const [editorTheme, setEditorTheme] = useState<EditorThemeId>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("neupaper:editor-theme") as EditorThemeId) || EDITOR_THEMES[0].id;
    }
    return EDITOR_THEMES[0].id;
  });
  const [editorFont, setEditorFont] = useState<EditorFontId>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("neupaper:editor-font") as EditorFontId) || EDITOR_FONTS[0].id;
    }
    return EDITOR_FONTS[0].id;
  });

  const handleEditorThemeChange = (theme: EditorThemeId) => {
    setEditorTheme(theme);
    localStorage.setItem("neupaper:editor-theme", theme);
  };

  const [editorFontSize, setEditorFontSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("neupaper:editor-font-size");
      return saved ? parseInt(saved, 10) : 14;
    }
    return 14;
  });

  const handleEditorFontChange = (font: EditorFontId) => {
    setEditorFont(font);
    localStorage.setItem("neupaper:editor-font", font);
  };

  const [editorLigatures, setEditorLigatures] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("neupaper:editor-ligatures") !== "false";
    }
    return true;
  });
  const [editorAltChars, setEditorAltChars] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("neupaper:editor-alt-chars") === "true";
    }
    return false;
  });

  const handleEditorFontSizeChange = (size: number) => {
    setEditorFontSize(size);
    localStorage.setItem("neupaper:editor-font-size", String(size));
  };

  const handleEditorLigaturesChange = (enabled: boolean) => {
    setEditorLigatures(enabled);
    localStorage.setItem("neupaper:editor-ligatures", String(enabled));
  };

  const refresh = () => {
    setFiles(getFiles());
    setVaultFiles(getVaultFiles());
  };

  useEffect(() => {
    initVault();
    refresh();
  }, []);

  const activeFile = [...files, ...vaultFiles].find((f) => f.id === activeId) ?? null;

  useEffect(() => {
    setLiveContent(activeFile?.content ?? "");
  }, [activeFile?.id]);

  const handleSelect = (id: string) => {
    setActiveId(id);
    setOpenIds((prev) => prev.includes(id) ? prev : [...prev, id]);
  };

  const handleCloseTab = (id: string) => {
    setOpenIds((prev) => {
      const next = prev.filter((i) => i !== id);
      if (activeId === id) {
        const closedIndex = prev.indexOf(id);
        const newActive = next[Math.min(closedIndex, next.length - 1)] ?? null;
        setActiveId(newActive);
      }
      return next;
    });
  };

  const handleCreate = () => {
    const name = `untitled-${files.length + 1}.neu`;
    const file = createFile(name);
    refresh();
    handleSelect(file.id);
  };

  const handleDelete = (id: string) => {
    deleteFile(id);
    refresh();
    setOpenIds((prev) => prev.filter((i) => i !== id));
    if (activeId === id) setActiveId(null);
  };

  const handleRename = (id: string, name: string) => {
    updateFile(id, { name });
    refresh();
  };

  const handleDuplicate = (file: NeuFile) => {
    const isRoot = !file.path.includes("/");
    if (isRoot) {
      const base = file.name.replace(/\.neu$/, "");
      const copy = createFile(`${base}-copy.neu`);
      updateFile(copy.id, { content: file.content });
    } else {
      const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
      const base = file.name.replace(ext, "");
      const dir = file.path.split("/").slice(0, -1).join("/");
      createVaultFile(`${dir}/${base}-copy${ext}`, file.content);
    }
    refresh();
  };

  const handleRenameFolder = (oldPath: string, newName: string) => {
    renameFolder(oldPath, newName);
    refresh();
  };

  const handleNewFolderIn = (parentPath: string): string => {
    const ext = parentPath.startsWith("components") ? ".isle" : ".data";
    const newFolderPath = parentPath ? `${parentPath}/new-folder` : "new-folder";
    createVaultFile(`${newFolderPath}/untitled${ext}`);
    refresh();
    return newFolderPath;
  };

  const handleDeleteFolder = (folderPath: string) => {
    const folderFiles = allFiles.filter((f) => f.path.startsWith(`${folderPath}/`));
    folderFiles.forEach((f) => deleteFile(f.id));
    setOpenIds((prev) => prev.filter((id) => !folderFiles.some((f) => f.id === id)));
    if (activeId && folderFiles.some((f) => f.id === activeId)) setActiveId(null);
    refresh();
  };

  const handleDuplicateFolder = (folderPath: string) => {
    const folderFiles = allFiles.filter((f) => f.path.startsWith(`${folderPath}/`));
    const newFolderPath = `${folderPath}-copy`;
    folderFiles.forEach((f) => {
      const relative = f.path.slice(folderPath.length);
      createVaultFile(`${newFolderPath}${relative}`, f.content);
    });
    refresh();
  };

  const handleNewInFolder = (folderPath: string) => {
    const isComponents = folderPath.startsWith("components");
    const ext = isComponents ? ".isle" : ".data";
    const file = createVaultFile(`${folderPath}/untitled${ext}`);
    refresh();
    handleSelect(file.id);
  };

  const handleCreateVaultFile = (path: string) => {
    const file = createVaultFile(path);
    refresh();
    handleSelect(file.id);
  };

  const handleContentChange = useCallback(
    (content: string) => {
      setLiveContent(content);
      if (!activeId) return;
      updateFile(activeId, { content });
    },
    [activeId]
  );

  const allFiles = [...files, ...vaultFiles];
  const openFiles = openIds
    .map((id) => allFiles.find((f) => f.id === id))
    .filter((f): f is NeuFile => f !== undefined);

  return (
    <SidebarProvider className="min-h-0 flex-1 overflow-hidden font-[family-name:var(--font-vault)]" style={{ "--sidebar": "var(--background)" } as React.CSSProperties}>
      <VaultSidebar
        files={allFiles}
        openFiles={openFiles}
        activeId={activeId}
        onSelect={handleSelect}
        onCloseTab={handleCloseTab}
        onCreate={handleCreate}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onNewInFolder={handleNewInFolder}
        onRenameFolder={handleRenameFolder}
        onNewFolderIn={handleNewFolderIn}
        onDuplicateFolder={handleDuplicateFolder}
        onDeleteFolder={handleDeleteFolder}
        onRename={handleRename}
        onCreateVaultFile={handleCreateVaultFile}
      />
      <SidebarInset className="overflow-hidden">
        {activeFile ? (
          <ResizablePanelGroup orientation="horizontal" className="flex-1 h-full">
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className={`h-full pt-2 pb-2 pl-2 transition-all duration-200 ${handleHovered ? "pr-3" : "pr-1"}`}>
              <Card className="flex flex-col h-full overflow-hidden">
                <EditorTabs
                  openFiles={openFiles}
                  activeId={activeId}
                  activeFile={activeFile}
                  onSelect={setActiveId}
                  onClose={handleCloseTab}
                  editorTheme={editorTheme}
                  editorFont={editorFont}
                  onEditorThemeChange={handleEditorThemeChange}
                  editorFontSize={editorFontSize}
                  onEditorFontChange={handleEditorFontChange}
                  onEditorFontSizeChange={handleEditorFontSizeChange}
                  editorLigatures={editorLigatures}
                  editorAltChars={editorAltChars}
                  onEditorLigaturesChange={handleEditorLigaturesChange}
                  onEditorAltCharsChange={(enabled) => { setEditorAltChars(enabled); localStorage.setItem("neupaper:editor-alt-chars", String(enabled)); }}
                />
                <div className="flex-1 min-h-0 overflow-hidden pb-2" style={{ backgroundColor: NEU_EDITOR_BG }}>
                  <Editor
                    key={activeFile.id}
                    content={activeFile.content}
                    onChange={handleContentChange}
                    fontFamily={EDITOR_FONTS.find((f) => f.id === editorFont)?.family}
                    fontSize={editorFontSize}
                    ligatures={editorLigatures}
                    altChars={editorAltChars}
                  />
                </div>
              </Card>
              </div>
            </ResizablePanel>
            <ResizableHandle
              onMouseEnter={() => setHandleHovered(true)}
              onMouseLeave={() => setHandleHovered(false)}
            />
            <ResizablePanel defaultSize={50} minSize={20}>
              <div className={`h-full pt-2 pb-2 pr-2 transition-all duration-200 ${handleHovered ? "pl-3" : "pl-1"}`}>
                <Card className="flex flex-col h-full overflow-hidden">
                  <Preview content={liveContent} />
                </Card>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/30 h-full">
            <p className="text-muted-foreground">
              Selecciona un archivo o crea uno nuevo
            </p>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
