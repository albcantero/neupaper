"use client";

import { useState, useCallback } from "react";
import { EDITOR_THEMES, EDITOR_FONTS, type EditorThemeId, type EditorFontId } from "@/components/vault/EditorTabs";

export interface EditorSettings {
  theme: EditorThemeId;
  font: EditorFontId;
  fontSize: number;
  ligatures: boolean;
  altChars: boolean;
  invisibles: boolean;
  powerful: boolean;
  advices: boolean;
}

/** Maps setting keys to localStorage keys (preserves existing keys) */
const STORAGE_KEYS: Record<keyof EditorSettings, string> = {
  theme: "neupaper:editor-theme",
  font: "neupaper:editor-font",
  fontSize: "neupaper:editor-font-size",
  ligatures: "neupaper:editor-ligatures",
  altChars: "neupaper:editor-alt-chars",
  invisibles: "neupaper:editor-invisibles",
  powerful: "neupaper:editor-powerful",
  advices: "neupaper:editor-advices",
};

const DEFAULTS: EditorSettings = {
  theme: EDITOR_THEMES[0].id,
  font: EDITOR_FONTS[0].id,
  fontSize: 14,
  ligatures: true,
  altChars: true,
  invisibles: true,
  powerful: false,
  advices: true,
};

function readSetting<K extends keyof EditorSettings>(key: K): EditorSettings[K] {
  if (typeof window === "undefined") return DEFAULTS[key];
  const raw = localStorage.getItem(STORAGE_KEYS[key]);
  if (raw === null) return DEFAULTS[key];

  const def = DEFAULTS[key];
  if (typeof def === "boolean") {
    return (def ? raw !== "false" : raw === "true") as EditorSettings[K];
  }
  if (typeof def === "number") {
    const n = parseInt(raw, 10);
    return (isNaN(n) ? def : n) as EditorSettings[K];
  }
  return (raw || def) as EditorSettings[K];
}

function init(): EditorSettings {
  return {
    theme: readSetting("theme"),
    font: readSetting("font"),
    fontSize: readSetting("fontSize"),
    ligatures: readSetting("ligatures"),
    altChars: readSetting("altChars"),
    invisibles: readSetting("invisibles"),
    powerful: readSetting("powerful"),
    advices: readSetting("advices"),
  };
}

export function useEditorSettings() {
  const [settings, setSettings] = useState<EditorSettings>(init);

  const update = useCallback(<K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    localStorage.setItem(STORAGE_KEYS[key], String(value));
  }, []);

  const reset = useCallback(() => {
    setSettings({ ...DEFAULTS });
    for (const key of Object.keys(DEFAULTS) as (keyof EditorSettings)[]) {
      localStorage.removeItem(STORAGE_KEYS[key]);
    }
  }, []);

  return { settings, update, reset } as const;
}
