"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import { X, Settings, CircleCheck, CircleDashed, Ban } from "lucide-react";
import { fileIcon } from "@/components/vault/FileIcon";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { NeuFile } from "@/lib/storage";

export const EDITOR_THEMES = [
  { id: "dark", label: "Neupaper" },
] as const;

export const EDITOR_FONTS = [
  { id: "writer", label: "Writer", family: "Writer", hasLigatures: false, hasSS: true },
  { id: "azeret", label: "Azeret", family: "Azeret Mono", hasLigatures: true, hasSS: true },
  { id: "commit", label: "Commit", family: "Commit Mono", hasLigatures: true, hasSS: false },
  { id: "cousine", label: "Cousine", family: "Cousine", hasLigatures: false, hasSS: false },
  { id: "dm", label: "DM Mono", family: "DM Mono", hasLigatures: false, hasSS: true },
  { id: "drafting", label: "Drafting", family: "Drafting Mono", hasLigatures: false, hasSS: false },
  { id: "jetbrains", label: "JetBrains", family: "JetBrains Mono", hasLigatures: true, hasSS: true },
  { id: "meslo", label: "Meslo", family: "Meslo LGS", hasLigatures: false, hasSS: false },
  { id: "office-code", label: "Office", family: "Office Code Pro", hasLigatures: false, hasSS: false },
  { id: "victor", label: "Victor", family: "Victor Mono", hasLigatures: true, hasSS: true },
] as const;

export type EditorThemeId = (typeof EDITOR_THEMES)[number]["id"];
export type EditorFontId = (typeof EDITOR_FONTS)[number]["id"];

interface EditorTabsProps {
  openFiles: NeuFile[];
  activeId: string | null;
  activeFile: NeuFile;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  editorTheme: EditorThemeId;
  editorFont: EditorFontId;
  editorFontSize: number;
  editorLigatures: boolean;
  editorAltChars: boolean;
  onEditorThemeChange: (theme: EditorThemeId) => void;
  onEditorFontChange: (font: EditorFontId) => void;
  onEditorFontSizeChange: (size: number) => void;
  onEditorLigaturesChange: (enabled: boolean) => void;
  onEditorAltCharsChange: (enabled: boolean) => void;
}

export function EditorTabs({ openFiles, activeId, activeFile, onSelect, onClose, editorTheme, editorFont, editorFontSize, editorLigatures, editorAltChars, onEditorThemeChange, onEditorFontChange, onEditorFontSizeChange, onEditorLigaturesChange, onEditorAltCharsChange }: EditorTabsProps) {
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

  const themeLabels = EDITOR_THEMES.map((t) => t.label);
  const fontLabels = EDITOR_FONTS.map((f) => f.label);

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
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7 ml-1 mt-[1px]">
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 font-[family-name:var(--font-vault)]">
            <div className="grid gap-4">
              <div className="space-y-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="leading-none font-medium">Editor settings</h4>
                  <Button
                    variant="secondary"
                    className="h-7 rounded-full px-2 py-1 text-xs"
                    onClick={() => {
                      onEditorThemeChange(EDITOR_THEMES[0].id);
                      onEditorFontChange(EDITOR_FONTS[0].id);
                      onEditorFontSizeChange(14);
                      onEditorLigaturesChange(true);
                      onEditorAltCharsChange(false);
                    }}
                  >
                  Reset all
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">Customize the editor appearance.</p>
              </div>
              <div className="grid gap-2">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label>Theme</Label>
                  <div className="col-span-2">
                    <Combobox
                      items={themeLabels}
                      value={EDITOR_THEMES.find((t) => t.id === editorTheme)?.label ?? null}
                      onValueChange={(val) => {
                        const theme = EDITOR_THEMES.find((t) => t.label === val);
                        if (theme) onEditorThemeChange(theme.id);
                      }}
                    >
                      <ComboboxInput placeholder="Select theme" showClear />
                      <ComboboxContent>
                        <ComboboxEmpty>No themes found.</ComboboxEmpty>
                        <ComboboxList>
                          {(item) => {
                            const theme = EDITOR_THEMES.find((t) => t.label === item);
                            return (
                              <ComboboxItem key={item} value={item}>
                                <span className="flex-1">{item}</span>
                                {theme?.id === "dark" && <span className="ml-auto text-muted-foreground font-sans text-[10px] italic">(default)</span>}
                              </ComboboxItem>
                            );
                          }}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label>Font</Label>
                  <div className="col-span-2 flex items-center gap-2">
                    <div
                      className="flex-1 min-w-0 [&_input]:text-[11px] [&_input]:leading-none [&_input]:truncate"
                      style={{ fontFamily: EDITOR_FONTS.find((f) => f.id === editorFont)?.family }}
                    >
                      <Combobox
                        items={fontLabels}
                        value={EDITOR_FONTS.find((f) => f.id === editorFont)?.label ?? null}
                        onValueChange={(val) => {
                          const font = EDITOR_FONTS.find((f) => f.label === val);
                          if (font) onEditorFontChange(font.id);
                        }}
                      >
                        <ComboboxInput placeholder="Select font" showClear />
                        <ComboboxContent>
                          <ComboboxEmpty>No fonts found.</ComboboxEmpty>
                          <ComboboxList>
                            {(item) => {
                              const font = EDITOR_FONTS.find((f) => f.label === item);
                              return (
                                <ComboboxItem key={item} value={item} className="truncate" style={{ fontFamily: font?.family, fontSize: "11px" }}>
                                  <span className="flex-1">{item}</span>
                                  {font?.id === "writer" && <span className="ml-auto text-muted-foreground font-sans text-[10px] italic">(default)</span>}
                                </ComboboxItem>
                              );
                            }}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </div>
                    <Input
                      key={editorFontSize}
                      type="text"
                      inputMode="numeric"
                      defaultValue={editorFontSize}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value, 10);
                        const clamped = isNaN(v) ? 14 : Math.max(8, Math.min(32, v));
                        e.target.value = String(clamped);
                        onEditorFontSizeChange(clamped);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      className="w-12 h-8 text-center tabular-nums caret-foreground"
                    />
                  </div>
                </div>
                {(() => {
                  const currentFont = EDITOR_FONTS.find((f) => f.id === editorFont);
                  return (
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label>&nbsp;</Label>
                      <div className="col-span-2 flex items-center gap-2">
                        <Toggle
                          aria-label="Toggle ligatures"
                          variant="outline"
                          size="sm"
                          className="font-normal text-xs transition-transform duration-150 active:scale-95"
                          pressed={editorLigatures}
                          onPressedChange={onEditorLigaturesChange}
                          disabled={!currentFont?.hasLigatures}
                        >
                          <span className="relative size-4 shrink-0">
                            {!currentFont?.hasLigatures ? <Ban className="absolute inset-0" /> : (
                              <>
                                <CircleDashed className={`absolute inset-0 transition-opacity duration-200 ${editorLigatures ? "opacity-0" : "opacity-100"}`} />
                                <CircleCheck className={`absolute inset-0 transition-opacity duration-200 ${editorLigatures ? "opacity-100" : "opacity-0"}`} />
                              </>
                            )}
                          </span>
                          Ligatures
                        </Toggle>
                        <Toggle
                          aria-label="Toggle stylistic set"
                          variant="outline"
                          size="sm"
                          className="font-normal text-xs transition-transform duration-150 active:scale-95"
                          pressed={editorAltChars}
                          onPressedChange={onEditorAltCharsChange}
                          disabled={!currentFont?.hasSS}
                        >
                          <span className="relative size-4 shrink-0">
                            {!currentFont?.hasSS ? <Ban className="absolute inset-0" /> : (
                              <>
                                <CircleDashed className={`absolute inset-0 transition-opacity duration-200 ${editorAltChars ? "opacity-0" : "opacity-100"}`} />
                                <CircleCheck className={`absolute inset-0 transition-opacity duration-200 ${editorAltChars ? "opacity-100" : "opacity-0"}`} />
                              </>
                            )}
                          </span>
                          Stylistic set
                        </Toggle>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </PopoverContent>
        </Popover>
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
