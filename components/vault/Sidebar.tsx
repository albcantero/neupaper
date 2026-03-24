"use client";

import { useState, useRef, useEffect } from "react";
import {
  FilePlus,
  FolderPlus,
  Waves,
  ChevronRight,
  Folder,
  FolderOpen,
  X,
  Plus,
  Minus,
  Pencil,
  Copy,
  Download,
  Trash2,
  Palette,
  Zap,
  Archive,
  BookOpen,
  Briefcase,
  Globe,
  Package,
  Rocket,
  Star,
  Box,
  Bookmark,
  FlaskConical,
  Gem,
  Volleyball,
  Landmark,
  BookUser,
  FolderHeart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { NeuFile } from "@/lib/storage";
import { fileIcon } from "@/components/vault/FileIcon";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

// ─── Vault icon picker ────────────────────────────────────────────

const VAULT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, Archive, BookOpen, Briefcase,
  Globe, Package, Rocket, Star,
  Box, Bookmark, FlaskConical, Gem,
  Volleyball, Landmark, BookUser, FolderHeart,
};

const VAULT_ICON_STORAGE_KEY = "neupaper:vault-icon";

// ─── Zip download helper ──────────────────────────────────────────

async function downloadZip(fileList: NeuFile[], zipName: string) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  fileList.forEach((f) => zip.file(f.path, f.content));
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${zipName}.zip`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Tree builder ─────────────────────────────────────────────────

interface TreeNode {
  name: string;
  path: string;
  file?: NeuFile;
  children?: TreeNode[];
}

function buildTree(files: NeuFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const file of files) {
    const parts = file.path.split("/");
    let nodes = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      if (isLast) {
        nodes.push({ name: part, path: file.path, file });
      } else {
        let folder = nodes.find((n) => n.name === part && !n.file);
        if (!folder) {
          folder = { name: part, path: parts.slice(0, i + 1).join("/"), children: [] };
          nodes.push(folder);
        }
        nodes = folder.children!;
      }
    }
  }
  root.sort((a, b) => {
    if (!a.file && b.file) return -1;
    if (a.file && !b.file) return 1;
    return 0;
  });
  return root;
}


// ─── Tree (recursive) ─────────────────────────────────────────────

interface TreeProps {
  nodes: TreeNode[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (file: NeuFile) => void;
  onNewInFolder: (folderPath: string) => void;
  onNewFolderIn: (parentPath: string) => void;
  onDuplicateFolder: (folderPath: string) => void;
  onDeleteFolder: (folderPath: string) => void;
  // file rename
  editingId: string | null;
  editValue: string;
  editingExt: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onEditChange: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onStartRename: (file: NeuFile) => void;
  // folder rename
  editingFolderPath: string | null;
  editFolderValue: string;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  onEditFolderChange: (v: string) => void;
  onCommitFolderRename: () => void;
  onCancelFolderRename: () => void;
  onStartFolderRename: (node: TreeNode) => void;
}

function Tree({ nodes, activeId, onSelect, onDelete, onDuplicate, onNewInFolder, onNewFolderIn, onDuplicateFolder, onDeleteFolder, editingId, editValue, editingExt, inputRef, onEditChange, onCommitRename, onCancelRename, onStartRename, editingFolderPath, editFolderValue, folderInputRef, onEditFolderChange, onCommitFolderRename, onCancelFolderRename, onStartFolderRename }: TreeProps) {
  const handleDownload = (file: NeuFile) => {
    const blob = new Blob([file.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFolder = (node: TreeNode) => {
    const collect = (n: TreeNode): NeuFile[] =>
      n.file ? [n.file] : (n.children ?? []).flatMap(collect);
    downloadZip(collect(node), node.name);
  };

  return (
    <>
      {nodes.map((node) => {
        if (node.file) {
          return (
            <SidebarMenuSubItem key={node.file.id}>
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <SidebarMenuSubButton
                    isActive={activeId === node.file.id}
                    onClick={() => onSelect(node.file!.id)}
                    onDoubleClick={() => onStartRename(node.file!)}
                    className="cursor-pointer"
                  >
                    {fileIcon(node.name)}
                    {editingId === node.file.id ? (
                      <span className="flex items-center flex-1 min-w-0">
                        <input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => onEditChange(e.target.value)}
                          onBlur={onCommitRename}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") onCommitRename();
                            if (e.key === "Escape") onCancelRename();
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 bg-transparent border border-ring rounded px-1 py-0 text-sm outline-none min-w-0"
                        />
                        {editingExt && (
                          <span className="text-xs text-muted-foreground ml-0.5">{editingExt}</span>
                        )}
                      </span>
                    ) : (
                      <span>{node.name}</span>
                    )}
                  </SidebarMenuSubButton>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem onClick={() => onStartRename(node.file!)}>
                    <Pencil className="h-3.5 w-3.5 mr-2 text-muted-foreground" />Rename
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => onDuplicate(node.file!)}>
                    <Copy className="h-3.5 w-3.5 mr-2 text-muted-foreground" />Duplicate
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleDownload(node.file!)}>
                    <Download className="h-3.5 w-3.5 mr-2 text-muted-foreground" />Download
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    className="text-destructive data-[highlighted]:text-destructive data-[highlighted]:bg-destructive/10"
                    onClick={() => onDelete(node.file!.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </SidebarMenuSubItem>
          );
        }

        return (
          <SidebarMenuSubItem key={node.path}>
            <ContextMenu>
              <Collapsible
                defaultOpen={node.path !== "components/built-in"}
                className="group/collapsible w-full [&[data-state=open]>button>svg:first-child]:rotate-90 [&[data-state=open]>button>svg:nth-child(2)]:hidden [&[data-state=closed]>button>svg:nth-child(3)]:hidden"
              >
                <ContextMenuTrigger asChild>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton onDoubleClick={() => onStartFolderRename(node)}>
                      <ChevronRight className="transition-transform" />
                      <Folder />
                      <FolderOpen />
                      {editingFolderPath === node.path ? (
                        <input
                          ref={folderInputRef}
                          value={editFolderValue}
                          onChange={(e) => onEditFolderChange(e.target.value)}
                          onBlur={onCommitFolderRename}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") onCommitFolderRename();
                            if (e.key === "Escape") onCancelFolderRename();
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 bg-transparent border border-ring rounded px-1 py-0 text-sm outline-none min-w-0"
                        />
                      ) : (
                        node.name
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </ContextMenuTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="mx-3 px-2">
                    <Tree
                      nodes={node.children ?? []}
                      activeId={activeId}
                      onSelect={onSelect}
                      onDelete={onDelete}
                      onDuplicate={onDuplicate}
                      onNewInFolder={onNewInFolder}
                      onNewFolderIn={onNewFolderIn}
                      onDuplicateFolder={onDuplicateFolder}
                      onDeleteFolder={onDeleteFolder}
                      editingId={editingId}
                      editValue={editValue}
                      editingExt={editingExt}
                      inputRef={inputRef}
                      onEditChange={onEditChange}
                      onCommitRename={onCommitRename}
                      onCancelRename={onCancelRename}
                      onStartRename={onStartRename}
                      editingFolderPath={editingFolderPath}
                      editFolderValue={editFolderValue}
                      folderInputRef={folderInputRef}
                      onEditFolderChange={onEditFolderChange}
                      onCommitFolderRename={onCommitFolderRename}
                      onCancelFolderRename={onCancelFolderRename}
                      onStartFolderRename={onStartFolderRename}
                    />
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
              <ContextMenuContent className="w-48">
                <ContextMenuItem onClick={() => onNewInFolder(node.path)}>
                  <FilePlus className="h-3.5 w-3.5 mr-2 text-muted-foreground" />New file here
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onNewFolderIn(node.path)}>
                  <FolderPlus className="h-3.5 w-3.5 mr-2 text-muted-foreground" />New folder here
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => onStartFolderRename(node)}>
                  <Pencil className="h-3.5 w-3.5 mr-2 text-muted-foreground" />Rename
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onDuplicateFolder(node.path)}>
                  <Copy className="h-3.5 w-3.5 mr-2 text-muted-foreground" />Duplicate
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleDownloadFolder(node)}>
                  <Download className="h-3.5 w-3.5 mr-2 text-muted-foreground" />Download
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-destructive data-[highlighted]:text-destructive data-[highlighted]:bg-destructive/10"
                  onClick={() => onDeleteFolder(node.path)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </SidebarMenuSubItem>
        );
      })}
    </>
  );
}

// ─── VaultSidebar ─────────────────────────────────────────────────

interface VaultSidebarProps {
  files: NeuFile[];
  openFiles: NeuFile[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCloseTab: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (file: NeuFile) => void;
  onNewInFolder: (folderPath: string) => void;
  onRenameFolder: (oldPath: string, newName: string) => void;
  onNewFolderIn: (parentPath: string) => string;
  onDuplicateFolder: (folderPath: string) => void;
  onDeleteFolder: (folderPath: string) => void;
  onRename: (id: string, name: string) => void;
  onCreateVaultFile: (path: string) => void;
}

export function VaultSidebar({
  files,
  openFiles,
  activeId,
  onSelect,
  onCloseTab,
  onCreate,
  onDelete,
  onDuplicate,
  onNewInFolder,
  onRenameFolder,
  onNewFolderIn,
  onDuplicateFolder,
  onDeleteFolder,
  onRename,
  onCreateVaultFile,
}: VaultSidebarProps) {
  // file rename
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingExt, setEditingExt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editingId]);

  const startRename = (file: NeuFile) => {
    const match = file.name.match(/(\.[^.]+)$/);
    const ext = match ? match[1] : "";
    setEditingId(file.id);
    setEditingExt(ext);
    setEditValue(ext ? file.name.slice(0, -ext.length) : file.name);
  };

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, `${editValue.trim()}${editingExt}`);
    }
    setEditingId(null);
  };

  // folder rename
  const [editingFolderPath, setEditingFolderPath] = useState<string | null>(null);
  const [editFolderValue, setEditFolderValue] = useState("");
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingFolderPath && folderInputRef.current) { folderInputRef.current.focus(); folderInputRef.current.select(); }
  }, [editingFolderPath]);

  const startFolderRename = (node: TreeNode) => {
    setEditingFolderPath(node.path);
    setEditFolderValue(node.name);
  };

  const commitFolderRename = () => {
    if (editingFolderPath && editFolderValue.trim()) {
      onRenameFolder(editingFolderPath, editFolderValue.trim());
    }
    setEditingFolderPath(null);
  };

  const handleNewFolderIn = (parentPath: string) => {
    const newFolderPath = onNewFolderIn(parentPath);
    setEditingFolderPath(newFolderPath);
    setEditFolderValue("new-folder");
  };

  // vault icon
  const [vaultIcon, setVaultIcon] = useState("Zap");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(VAULT_ICON_STORAGE_KEY);
    if (saved && saved in VAULT_ICONS) setVaultIcon(saved);
  }, []);

  const handleSetVaultIcon = (name: string) => {
    setVaultIcon(name);
    localStorage.setItem(VAULT_ICON_STORAGE_KEY, name);
    setIconPickerOpen(false);
  };

  const VaultIconComp = VAULT_ICONS[vaultIcon];

  // vault name
  const [vaultName, setVaultName] = useState("My Vault");
  const [editingVaultName, setEditingVaultName] = useState(false);
  const [editVaultNameValue, setEditVaultNameValue] = useState("");
  const vaultNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("neupaper:vault-name");
    if (saved) setVaultName(saved);
  }, []);

  useEffect(() => {
    if (editingVaultName && vaultNameInputRef.current) {
      vaultNameInputRef.current.focus();
      vaultNameInputRef.current.select();
    }
  }, [editingVaultName]);

  const startVaultRename = () => {
    setEditVaultNameValue(vaultName);
    setEditingVaultName(true);
  };

  const commitVaultRename = () => {
    const trimmed = editVaultNameValue.trim();
    if (trimmed) {
      setVaultName(trimmed);
      localStorage.setItem("neupaper:vault-name", trimmed);
      window.dispatchEvent(new StorageEvent("storage", { key: "neupaper:vault-name", newValue: trimmed }));
    }
    setEditingVaultName(false);
  };

  const handleDownloadAll = () => {
    downloadZip(files, vaultName);
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>

        {/* ── Open Files ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Open Files</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {openFiles.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-1">No open files.</p>
              ) : (
                openFiles.map((file) => (
                  <SidebarMenuItem key={file.id}>
                    <SidebarMenuButton
                      isActive={activeId === file.id}
                      onClick={() => onSelect(file.id)}
                      className="cursor-pointer"
                    >
                      {fileIcon(file.name)}
                      <span className="truncate min-w-0">{file.path}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      showOnHover
                      onClick={(e) => { e.stopPropagation(); onCloseTab(file.id); }}
                      title="Close"
                    >
                      <X />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Vault ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Vault</SidebarGroupLabel>
          <SidebarGroupAction onClick={onCreate} title="New file">
            <FilePlus />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="pr-2!" onDoubleClick={startVaultRename}>
                          <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                            <PopoverTrigger asChild>
                              <span
                                role="button"
                                onClick={(e) => e.stopPropagation()}
                                className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                              >
                                <VaultIconComp className="h-4 w-4" />
                              </span>
                            </PopoverTrigger>
                            <PopoverContent side="right" align="start" className="w-44 p-2">
                              <div className="grid grid-cols-4 gap-1">
                                {Object.entries(VAULT_ICONS).map(([name, Icon]) => (
                                  <button
                                    key={name}
                                    onClick={() => handleSetVaultIcon(name)}
                                    className={cn(
                                      "flex items-center justify-center rounded p-1.5 hover:bg-accent transition-colors",
                                      vaultIcon === name && "bg-accent"
                                    )}
                                    title={name}
                                  >
                                    <Icon className="h-4 w-4" />
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          {editingVaultName ? (
                            <input
                              ref={vaultNameInputRef}
                              value={editVaultNameValue}
                              onChange={(e) => setEditVaultNameValue(e.target.value)}
                              onBlur={commitVaultRename}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === "Enter") commitVaultRename();
                                if (e.key === "Escape") setEditingVaultName(false);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 bg-transparent border border-ring rounded px-1 py-0 text-sm outline-none min-w-0"
                            />
                          ) : (
                            vaultName
                          )}
                          <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
                          <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48">
                      <ContextMenuItem onClick={onCreate}>
                        <FilePlus className="h-3.5 w-3.5 mr-2 text-muted-foreground" />New file here
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => handleNewFolderIn("")}>
                        <FolderPlus className="h-3.5 w-3.5 mr-2 text-muted-foreground" />New folder here
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={startVaultRename}>
                        <Pencil className="h-3.5 w-3.5 mr-2 text-muted-foreground" />Rename
                      </ContextMenuItem>
                      <ContextMenuSub>
                        <ContextMenuSubTrigger>
                          <Palette className="h-3.5 w-3.5 mr-2 text-muted-foreground" />Change icon
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-36 p-2">
                          <div className="grid grid-cols-4 gap-1">
                            {Object.entries(VAULT_ICONS).map(([name, Icon]) => (
                              <button
                                key={name}
                                onClick={() => handleSetVaultIcon(name)}
                                className={cn(
                                  "flex items-center justify-center rounded p-1.5 hover:bg-accent transition-colors",
                                  vaultIcon === name && "bg-accent"
                                )}
                                title={name}
                              >
                                <Icon className="h-4 w-4" />
                              </button>
                            ))}
                          </div>
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                      <ContextMenuItem onClick={handleDownloadAll}>
                        <Download className="h-3.5 w-3.5 mr-2 text-muted-foreground" />Download
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                  <CollapsibleContent>
                    <SidebarMenuSub className="mx-0 pr-2 translate-x-0 border-none">
                      <Tree
                        nodes={buildTree(files)}
                        activeId={activeId}
                        onSelect={onSelect}
                        onDelete={onDelete}
                        onDuplicate={onDuplicate}
                        onNewInFolder={onNewInFolder}
                        onNewFolderIn={handleNewFolderIn}
                        onDuplicateFolder={onDuplicateFolder}
                        onDeleteFolder={onDeleteFolder}
                        editingId={editingId}
                        editValue={editValue}
                        editingExt={editingExt}
                        inputRef={inputRef}
                        onEditChange={setEditValue}
                        onCommitRename={commitRename}
                        onCancelRename={() => setEditingId(null)}
                        onStartRename={startRename}
                        editingFolderPath={editingFolderPath}
                        editFolderValue={editFolderValue}
                        folderInputRef={folderInputRef}
                        onEditFolderChange={setEditFolderValue}
                        onCommitFolderRename={commitFolderRename}
                        onCancelFolderRename={() => setEditingFolderPath(null)}
                        onStartFolderRename={startFolderRename}
                      />
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Empty area — right-click to create at vault root ── */}
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="flex-1 min-h-[40px]" />
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem onClick={onCreate}>
              <FilePlus className="h-3.5 w-3.5 mr-2 text-muted-foreground" />New file here
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleNewFolderIn("")}>
              <FolderPlus className="h-3.5 w-3.5 mr-2 text-muted-foreground" />New folder here
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

      </SidebarContent>
    </Sidebar>
  );
}
