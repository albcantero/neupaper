"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import { X, Settings } from "lucide-react";
import { fileIcon } from "@/components/file-icon";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { NeuFile } from "@/lib/storage";

interface EditorTabsProps {
  openFiles: NeuFile[];
  activeId: string | null;
  activeFile: NeuFile;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export function EditorTabs({ openFiles, activeId, activeFile, onSelect, onClose }: EditorTabsProps) {
  const [vaultName, setVaultName] = useState("My Vault");

  useEffect(() => {
    const saved = localStorage.getItem("neupaper:vault-name");
    if (saved) setVaultName(saved);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "neupaper:vault-name" && e.newValue) setVaultName(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [fadeLeft,  setFadeLeft]  = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setFadeLeft(el.scrollLeft > 1);
    setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(updateFades);
    el.addEventListener("scroll", updateFades);
    const ro = new ResizeObserver(updateFades);
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); el.removeEventListener("scroll", updateFades); ro.disconnect(); };
  }, [updateFades, openFiles]);

  const segments = activeFile.path.split("/");

  return (
    <div className="flex flex-col">
      <div className="flex items-start border-b border-border/50 px-2 py-2 bg-card">
        <SidebarTrigger className="shrink-0 mr-1 mt-[1px]" />
        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 mr-3 mt-[7px]" />

        <div className="flex-1 min-w-0 relative">
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-3 w-12 z-10 bg-gradient-to-r from-card to-transparent transition-opacity duration-200"
            style={{ opacity: fadeLeft ? 1 : 0 }}
          />
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-3 w-12 z-10 bg-gradient-to-l from-card to-transparent transition-opacity duration-200"
            style={{ opacity: fadeRight ? 1 : 0 }}
          />
          <div
            ref={scrollRef}
            className="overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:border-y-[4px] [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:[background-clip:padding-box]"
            onScroll={updateFades}
          >
            <Tabs value={activeId ?? ""} onValueChange={onSelect}>
              <TabsList className="rounded-none bg-transparent p-0 pr-px gap-1 w-max">
                {openFiles.map((file) => (
                  <TabsTrigger
                    key={file.id}
                    value={file.id}
                    className="group h-7 border border-transparent pt-0.5 shadow-none! hover:bg-muted data-[state=active]:border-input data-[state=active]:bg-background! gap-1.5 [&_svg]:size-auto pl-2"
                  >
                    {fileIcon(file.name, "sm")}
                    <span className="truncate max-w-32 text-xs">{file.name}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); onClose(file.id); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onClose(file.id); } }}
                      className="opacity-0 group-hover:opacity-100 ml-0.5 rounded hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 ml-3 mt-[7px]" />
        <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7 ml-1 mt-[1px]">
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-4 py-1.5 border-b bg-card">
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <span className="text-muted-foreground">{vaultName}</span>
            </BreadcrumbItem>
            {segments.map((segment, i) => (
              <Fragment key={i}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {i === segments.length - 1 ? (
                    <BreadcrumbPage className="text-xs">{segment}</BreadcrumbPage>
                  ) : (
                    <span className="text-muted-foreground">{segment}</span>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}
