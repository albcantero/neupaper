# Jotty Case Study

Estudio de Jotty desde https://github.com/fccview/jotty (~1.7K stars). App self-hosted de checklists y notas con file-based storage.

**Nota:** Jotty ES open source (AGPL-3.0). Activamente mantenido (2-3 commits/week).

---

## Qué es Jotty

Self-hosted personal checklist y note-taking app. NO es un document authoring tool. Closer a un Notion/Google Keep self-hosted para organización personal. File-based storage (no database), encriptación PGP, 20+ themes.

---

## Stack técnico

| Layer | Tecnología |
|-------|-----------|
| Framework | **Next.js 16.1.6** + App Router |
| UI | **React 19.2.4** + TypeScript |
| CSS | **Tailwind 3.x** |
| Editor | **TipTap** (ProseMirror-based WYSIWYG) |
| Markdown rendering | react-markdown + remark-gfm + rehype-raw |
| State | **Zustand** (6 stores) + React Context (10 providers) |
| Diagrams | Mermaid 11.x + Excalidraw 0.18 + Draw.io |
| Code highlighting | PrismJS |
| Encryption | OpenPGP + libsodium (XChaCha) |
| Storage | **File-based** (Markdown + JSON en disco, NO database) |
| Real-time | WebSocket (ws) |
| Auth | JWT + OIDC + MFA (speakeasy + QR) |
| PWA | Serwist (Service Worker) |
| i18n | next-intl |
| Themes | next-themes + CSS variables |
| DnD | @dnd-kit |
| Charts | Recharts + @nivo/network |
| Export | archiver (ZIP) |
| HTML→MD | turndown + turndown-plugin-gfm |

---

## Lo más relevante para Neupaper

### 1. Mismo framework: Next.js 16 + React 19 + Tailwind

Jotty usa exactamente nuestro stack base. Confirma que Next.js App Router + React 19 es production-ready para apps complejas.

### 2. 20+ themes en un solo archivo CSS

`colors.css` con CSS custom properties (space-separated RGB). Themes incluyen: Default, Dark, Ocean, Forest, Nord, Dracula, Monokai, GitHub-Dark, Tokyo-Night, Catppuccin, Rose-Pine, Gruvbox, Solarized-Dark, Sakura-Blue/Red...

Switching via class en root element + `next-themes`. Simple y efectivo.

**Para Neupaper:** Si queremos múltiples editor themes (más allá de "Neupaper"), un solo `colors.css` con CSS variables per-theme es el approach más limpio. Class-based switching.

### 3. File-based storage (no database)

```
data/
  checklists/   → Markdown files
  notes/        → Markdown files
  users/        → users.json, sessions.json
  sharing/      → shared-items.json
  encryption/   → PGP key files
```

Docker volumes montan `./data`, `./config`, `./cache`. Hace self-hosting trivial.

**Para Neupaper:** Valida nuestro plan de File System Access API (Pro) — archivos `.neu` como archivos reales en disco. Jotty prueba que file-based storage funciona en producción.

### 4. Diagram trinity: Mermaid + Excalidraw + Draw.io

Tres herramientas de diagramas integradas en un editor. La mayoría de apps tienen una como máximo.

**Para Neupaper:** Ya tenemos Mermaid. Excalidraw podría ser un future add-on para diagramas freeform dentro de documentos.

### 5. PrintView con `window.printReady`

```javascript
// PrintView.tsx
window.printReady = true; // después de 500ms
```

Signal explícito para coordinar rendering async antes de captura. Más limpio que polling.

**Para Neupaper:** Podríamos usar un signal similar en `/print` para que Puppeteer sepa exactamente cuándo el contenido está ready, en vez de `waitForSelector`.

### 6. Auto-save con dirty tracking

`useNoteEditor` hook: track `contentIsDirty`, debounced auto-save configurable, skip encrypted content. Simple pero robusto.

### 7. Navigation guards

Modal de "unsaved changes" al navegar. Esencial para UX de editor.

---

## Editor: TipTap (no CodeMirror)

WYSIWYG basado en ProseMirror con 14 extensiones custom:

- Slash commands, @mentions, internal links
- Callouts, collapsible details
- Mermaid, Excalidraw, Draw.io
- Keyboard shortcuts, overlays, tag links

**Dual mode:** Visual (WYSIWYG) + Markdown mode con conversión bidireccional (turndown para HTML→MD).

### Vs Neupaper

TipTap = WYSIWYG para non-technical users. CM6 = source-editing para developers. Diferentes audiences.

---

## PDF/Export

**No Puppeteer. No PDF server-side.**

- PrintView con browser print dialog (Ctrl+P)
- ZIP export via archiver (JSON por usuario/categoría)
- No hay pdfkit, jsPDF, html2pdf, Puppeteer ni Playwright

### Para Neupaper

Otro más sin PDF real. Neupaper's Puppeteer pipeline sigue siendo diferenciador universal.

---

## Encryption

- **OpenPGP** para PGP encryption de notas
- **libsodium** (XChaCha) para encryption simétrica
- Server-side encryption con signing
- Per-note encryption

---

## Comparativa Jotty vs Neupaper

| Aspecto | Jotty | Neupaper |
|---------|-------|----------|
| Propósito | Personal notes/checklists | Professional documents |
| Framework | Next.js 16 + React 19 | Next.js 16 + React 19 (mismo) |
| Editor | TipTap (WYSIWYG) | CodeMirror 6 (Markdown source) |
| Storage | File-based (no DB) | localStorage / Supabase |
| PDF | Browser print (no server) | Puppeteer (pixel-perfect) |
| Templates | No | Markdown Isles (${ }) |
| Themes | 20+ en CSS variables | 1 (expandible) |
| Encryption | PGP + XChaCha | No (aún) |
| Self-hosting | Core feature (Docker) | Planned (Pro) |
| Diagrams | Mermaid + Excalidraw + Draw.io | Mermaid |
| Open source | Sí (AGPL-3.0) | Sí |

---

## Patrones a adoptar

1. **Themes en un solo CSS file.** 20+ themes definidos con CSS variables, switching con classes. Pattern más limpio para expandir nuestros editor themes.

2. **`window.printReady` signal.** En vez de `waitForSelector` en Puppeteer, un flag explícito cuando el render está completo.

3. **Navigation guards.** Modal de unsaved changes al navegar fuera del editor.

4. **Auto-save debounced con dirty tracking.** Hook dedicado con `contentIsDirty`, interval configurable.

5. **File-based storage para File System Access API.** Valida que archivos en disco funcionan en producción.

## Patrones a NO adoptar

1. **TipTap/WYSIWYG.** CM6 source editing es correcto para nuestro audience.

2. **No database.** File-based funciona para self-hosted pero localStorage/Supabase es mejor para web-first.

3. **Zustand.** React context + useState es suficiente para nuestro scope actual.

4. **jQuery patterns.** Jotty no usa jQuery pero algunos patterns de su codebase son legacy.

---

## Fuentes

- https://github.com/fccview/jotty
- https://jotty.page

---

*Estudio realizado el 2026-03-25 como referencia arquitectónica para Neupaper.*


Lo más relevante:
  - Mismo stack exacto (Next.js 16 + React 19 + Tailwind) — confirma production-ready
  - 20+ themes en un solo CSS file — pattern más limpio para expandir themes
  - File-based storage funciona en producción — valida File System Access API
  - window.printReady signal — más limpio que waitForSelector para Puppeteer
  - Diagram trinity (Mermaid + Excalidraw + Draw.io) — Excalidraw como future add-on
  - NO es competidor — personal notes vs professional documents

  Patrones que deberíamos adoptar:
  1. Themes en CSS file único con variables
  2. window.printReady signal para Puppeteer
  3. Navigation guards (unsaved changes)
  4. Auto-save debounced con dirty tracking
