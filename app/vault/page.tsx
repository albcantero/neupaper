"use client";

import { useState } from "react";
import { NEU_EDITOR_BG } from "@/lib/editor/neu-theme";
import { VaultSidebar } from "@/components/vault/Sidebar";
import { Editor } from "@/components/vault/Editor";
import { EditorTabs, EDITOR_FONTS } from "@/components/vault/EditorTabs";
import { Preview } from "@/components/vault/Preview";
import { useEditorSettings } from "@/lib/hooks/use-editor-settings";
import { useVaultFiles } from "@/lib/hooks/use-vault-files";
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
  const [handleHovered, setHandleHovered] = useState(false);
  const { settings, update, reset } = useEditorSettings();
  const vault = useVaultFiles();

  return (
    <SidebarProvider className="min-h-0 flex-1 overflow-hidden font-[family-name:var(--font-vault)]" style={{ "--sidebar": "var(--background)" } as React.CSSProperties}>
      <VaultSidebar
        files={vault.allFiles}
        openFiles={vault.openFiles}
        activeId={vault.activeId}
        onSelect={vault.select}
        onCloseTab={vault.closeTab}
        onCreate={vault.create}
        onDelete={vault.remove}
        onDuplicate={vault.duplicate}
        onNewInFolder={vault.newInFolder}
        onRenameFolder={vault.renameFolder}
        onNewFolderIn={vault.newFolderIn}
        onDuplicateFolder={vault.duplicateFolder}
        onDeleteFolder={vault.deleteFolder}
        onRename={vault.rename}
        onCreateVaultFile={vault.createVaultFile}
      />
      <SidebarInset className="overflow-hidden">
        {vault.activeFile ? (
          <ResizablePanelGroup orientation="horizontal" className="flex-1 h-full">
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className={`h-full pt-2 pb-2 pl-2 transition-all duration-200 ${handleHovered ? "pr-3" : "pr-1"}`}>
              <Card className="flex flex-col gap-0 py-0 h-full overflow-hidden">
                <EditorTabs
                  openFiles={vault.openFiles}
                  activeId={vault.activeId}
                  activeFile={vault.activeFile}
                  onSelect={vault.setActiveId}
                  onClose={vault.closeTab}
                  settings={settings}
                  onSettingChange={update}
                  onSettingsReset={reset}
                />
                <div className="flex-1 min-h-0 overflow-hidden pb-2" style={{ backgroundColor: NEU_EDITOR_BG }}>
                  <Editor
                    key={vault.activeFile.id}
                    content={vault.activeFile.content}
                    onChange={vault.changeContent}
                    fontFamily={EDITOR_FONTS.find((f) => f.id === settings.font)?.family}
                    fontSize={settings.fontSize}
                    ligatures={settings.ligatures}
                    altChars={settings.altChars}
                    invisibles={settings.invisibles}
                    powerful={settings.powerful}
                    advices={settings.advices}
                    dataFiles={vault.dataFiles}
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
                <Card className="flex flex-col gap-0 py-0 h-full overflow-hidden">
                  <Preview content={vault.liveContent} components={vault.components} dataFiles={vault.dataFiles} />
                </Card>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background h-full p-8">
            <Card className="flex items-center justify-center w-full h-full">
              <p className="text-muted-foreground">
                Selecciona un archivo o crea uno nuevo
              </p>
            </Card>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
