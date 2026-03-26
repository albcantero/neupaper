# Obsidian Case Study

Estudio exhaustivo de la arquitectura de Obsidian, extraído del análisis completo de https://github.com/obsidianmd. Orientado a identificar patrones aplicables a Neupaper.

**Nota:** Obsidian NO es open source. El código de la app es privado. Lo que es público: API types, plugin infrastructure, docs, y tooling.

---

## Repositorios (10 públicos)

| Repo | Descripción | Stars |
|------|-------------|-------|
| obsidian-releases | Registry de plugins/themes + releases | 15.7k |
| obsidian-sample-plugin | Template oficial para plugins | 4k |
| obsidian-clipper | Web Clipper (extensión de navegador) | 3.3k |
| obsidian-api | Type definitions del API | 2.1k |
| obsidian-help | Documentación de usuario | 1.6k |
| obsidian-importer | Importador de notas (Notion, Bear, Evernote...) | 1.3k |
| obsidian-translations | Traducciones i18n | 428 |
| obsidian-developer-docs | Docs para desarrolladores | 413 |
| obsidian-headless | CLI para Obsidian Sync | 88 |
| eslint-plugin | ESLint para plugins | 51 |

---

## Stack técnico

- **Desktop:** Electron (Chromium + Node.js)
- **Mobile:** Capacitor (Ionic) — mismo codebase en WebView nativo
- **Editor:** CodeMirror 6 + HyperMD (fork propio para WYSIWYG)
- **UI:** Vanilla JS/TS — NO usa React, Vue ni Angular
- **Parser Markdown:** Custom/propietario — NO usa remark, unified ni markdown-it
- **Syntax highlighting código:** PrismJS
- **Math:** MathJax (no KaTeX)
- **Diagramas:** Mermaid (carga lazy)
- **PDF export:** Electron `webContents.printToPDF()` (no Puppeteer)
- **Build plugins:** esbuild

---

## Editor (CodeMirror 6)

### Arquitectura

Obsidian usa CM6 como motor base y lo extiende con HyperMD para features WYSIWYG. El editor expone tres modos:

1. **Source Mode** — CM6 puro, muestra Markdown raw
2. **Live Preview** — CM6 + decorations que ocultan sintaxis y renderizan widgets inline
3. **Reading Mode** — HTML puro via MarkdownRenderer, sin CM6

### Live Preview (cómo funciona)

No es un renderer separado — es CM6 con decorations:
- **Replace decorations** ocultan `**` cuando el cursor no está en esa línea
- **Widget decorations** inyectan HTML renderizado inline (checkboxes, imágenes, embeds)
- `editorLivePreviewField` — StateField booleano que indica si Live Preview está activo
- `livePreviewState` — ViewPlugin que trackea mousedown

### Editor Abstraction Layer

Obsidian wrappea CM6 con una clase `Editor` abstracta (~50 métodos):

```typescript
abstract class Editor {
  getValue(): string;
  setValue(content: string): void;
  getLine(line: number): string;
  getSelection(): string;
  replaceSelection(replacement: string): void;
  getCursor(): EditorPosition;
  setCursor(pos: EditorPosition): void;
  transaction(tx: EditorTransaction): void;
  // ... ~40 métodos más
}
```

**Dos niveles de API:**
- Wrapper simple para el 80% de casos (get/set texto, cursor, selecciones)
- CM6 raw via `registerEditorExtension` para el 20% avanzado (decorations, state fields, keymaps)

### CM6 Packages compartidos

Obsidian bundlea internamente estos paquetes y los plugins los comparten (external):

```
@codemirror/autocomplete, /collab, /commands, /language, /lint, /search, /state, /text, /view
@lezer/common, /highlight, /lr
```

Los plugins NO bundlean CM6 — usan la instancia de Obsidian. Esto evita conflictos de versión (`instanceof` checks de CM6 fallan si hay copias duplicadas).

### Cuatro tipos de Decoration

1. **Mark** — estilo CSS en spans existentes (syntax highlighting)
2. **Widget** — insertar elementos DOM inline
3. **Replace** — ocultar o reemplazar rangos del documento (Live Preview)
4. **Line** — estilo en líneas enteras

### Implicación para Neupaper

Para el syntax highlighting de `${ }` en Fase 4:
- Usar `StateField` + `DecorationSet` (no ViewPlugin) porque el highlighting debe ser consistente independientemente del viewport
- Mark decorations para colorear `${ @variable }` inline
- Widget decorations si queremos mostrar valores resueltos inline
- `RangeSetBuilder` + iteración del syntax tree de Lezer es el approach estándar

---

## Pipeline de Markdown

### Obsidian (custom)

```
Source text
  → Custom parser (propietario, no public)
  → DOM nodes directos (no HTML string intermedio)
  → Post-processor chain (plugins modifican DOM)
  → Rendered output
```

- **NO expone el AST** — los plugins solo pueden hookearse en post-processing (después de HTML)
- **Secciones** — divide el contenido en secciones (`lineStart`, `lineEnd`) como unidad de re-render incremental
- **Post-processors** tienen `sortOrder` para controlar orden de ejecución

### Neupaper (remark)

```
Source .neu
  → Tokenizer (detecta ${ })
  → AST Builder (stack para anidamiento)
  → Evaluator (resuelve variables, bucles, condicionales)
  → Markdown limpio
  → Remark/Rehype
  → HTML
```

**Ventaja de Neupaper:** Pipeline más limpio y extensible. El parser custom de Obsidian es un competitive differentiator pero también una carga de mantenimiento. El approach de pre-procesador → remark es más mantenible.

### Hooks del pipeline

```typescript
// Post-processor — modifica HTML renderizado
registerMarkdownPostProcessor((el, ctx) => {
  // el = DOM element con Markdown renderizado
  // mutar in place
});

// Code block processor — renderiza lenguajes custom
registerMarkdownCodeBlockProcessor('mermaid', (source, el, ctx) => {
  // source = contenido raw del code block
  // renderizar en el
});
```

---

## Sistema de plugins

### Packaging (3 archivos)

| Archivo | Propósito |
|---------|-----------|
| `manifest.json` | Metadatos (id, name, version, minAppVersion) |
| `main.js` | Bundle completo (CommonJS, single file, esbuild) |
| `styles.css` | CSS opcional (se carga automáticamente) |

### Component Base Class (auto-cleanup)

La decisión arquitectónica más importante de Obsidian:

```typescript
class Component {
  onload(): void;     // setup
  onunload(): void;   // cleanup

  register(cb: () => any): void;           // cleanup callback
  registerEvent(eventRef: EventRef): void; // auto-cleanup event
  registerDomEvent(el, type, cb): void;    // auto-cleanup DOM listener
  registerInterval(id: number): number;    // auto-cleanup setInterval
  addChild(component: Component): void;    // child lifecycle
}
```

Cuando un plugin se deshabilita, TODOS los listeners, intervals, y children se limpian automáticamente. No memory leaks.

### Plugin Class

```typescript
abstract class Plugin extends Component {
  app: App;
  manifest: PluginManifest;

  // UI
  addRibbonIcon(icon, title, callback): HTMLElement;
  addStatusBarItem(): HTMLElement;
  addCommand(command: Command): Command;
  addSettingTab(tab: PluginSettingTab): void;

  // Markdown
  registerMarkdownPostProcessor(processor): void;
  registerMarkdownCodeBlockProcessor(language, handler): void;

  // Editor
  registerEditorExtension(extension: Extension): void;
  registerEditorSuggest(suggest: EditorSuggest): void;

  // Views
  registerView(type, viewCreator): void;
  registerExtensions(exts: string[], viewType: string): void;

  // Persistence
  loadData(): Promise<any>;      // lee data.json
  saveData(data: any): Promise<void>;  // escribe data.json
}
```

### Command System

```typescript
interface Command {
  id: string;
  name: string;
  icon?: string;
  hotkeys?: Hotkey[];

  // 4 tipos mutuamente exclusivos:
  callback?: () => any;                    // siempre disponible
  checkCallback?: (checking: boolean) => boolean | void;  // condicional
  editorCallback?: (editor, view) => any;  // requiere editor activo
  editorCheckCallback?: (checking, editor, view) => boolean | void;
}
```

El `checkCallback` es inteligente: Obsidian lo llama con `checking=true` para decidir si mostrar el comando en la paleta, y con `checking=false` cuando se selecciona.

### Settings UI (imperativo, sin framework)

```typescript
display(): void {
  const { containerEl } = this;
  containerEl.empty();

  new Setting(containerEl)
    .setName('My setting')
    .setDesc('Description')
    .addText(text => text
      .setValue(this.plugin.settings.value)
      .onChange(async (value) => {
        this.plugin.settings.value = value;
        await this.plugin.saveSettings();
      }));
}
```

Soporta: `.addText()`, `.addToggle()`, `.addDropdown()`, `.addColorPicker()`, `.addSlider()`, `.addButton()`, `.addSearch()`

### Persistencia

JSON file en disco. No database, no API:
```typescript
async loadSettings() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}
async saveSettings() {
  await this.saveData(this.settings);
}
```

### Implicación para Neupaper

El patrón `register*` con auto-cleanup es excelente para el sistema de componentes `.isle` en Fase 4. Cuando un usuario registra extensiones custom, el lifecycle management previene resource leaks.

---

## Vault / File System

### Vault Class

```typescript
class Vault {
  // Lookup
  getAbstractFileByPath(path: string): TAbstractFile | null;
  getFileByPath(path: string): TFile | null;
  exists(path: string): Promise<boolean>;

  // CRUD
  create(path, data): Promise<TFile>;
  read(file): Promise<string>;
  cachedRead(file): Promise<string>;  // versión cached
  modify(file, data): Promise<void>;
  process(file, fn): Promise<string>; // atomic read-modify-write
  delete(file): Promise<void>;
  rename(file, newPath): Promise<void>;

  // Events
  on('create', cb): EventRef;
  on('modify', cb): EventRef;
  on('delete', cb): EventRef;
  on('rename', cb): EventRef;
}
```

### Adapter Pattern

```
Vault (abstracción)
  → FileSystemAdapter (desktop, Node.js fs)
  → CapacitorAdapter (mobile, native bridge)
```

El mismo vault API funciona idénticamente en desktop y mobile.

### MetadataCache

Index en memoria de todo el vault:
- Headings, links, embeds, tags, secciones, listas
- Frontmatter (YAML)
- Actualización incremental cuando cambian archivos

### Implicación para Neupaper

Para Fase 5 (Supabase), adoptar un adapter pattern similar:
```
VaultAdapter (interfaz)
  → LocalStorageAdapter (actual)
  → SupabaseAdapter (futuro)
  → FileSystemAccessAdapter (Pro, File System Access API)
```

El concepto de MetadataCache podría ser útil para cachear `.data` parseados y referencias a componentes, evitando re-parse en cada keystroke.

---

## Sistema de themes

### Arquitectura CSS Variables (400+ variables)

Obsidian usa un sistema jerárquico de tres capas:

**1. Foundation** — tokens de diseño raw:
```css
--color-base-00 through --color-base-100  /* neutral palette */
--accent-h: 254; --accent-s: 80%; --accent-l: 68%;  /* HSL accent */
--font-text-size: 16px;
--line-height-normal: 1.5;
```

**2. Semantic** — tokens con propósito:
```css
--text-normal, --text-muted, --text-faint, --text-accent
--background-primary, --background-secondary
--interactive-normal, --interactive-hover, --interactive-accent
```

**3. Component** — tokens específicos de UI:
```css
--nav-item-color, --tab-text-color, --modal-background
--code-background, --heading-color, --tag-color
```

### Dark/Light Mode

```css
.theme-dark {
  --background-primary: #1e1e1e;
  --text-normal: #dcddde;
}
.theme-light {
  --background-primary: #ffffff;
  --text-normal: #2e3338;
}
```

### Theme packaging

Un theme es solo:
- `manifest.json` — metadatos
- `theme.css` — un solo archivo CSS que sobreescribe variables

### Cascade de estilos

```
Obsidian defaults (base)
  → Theme CSS (sobreescribe defaults)
  → CSS snippets del usuario (sobreescribe theme)
  → Plugin styles (mayor especificidad)
```

### Restricción importante

Los themes DEBEN embeber fonts como base64 data URLs — no se permite carga externa de fonts (privacidad/offline).

### Implicación para Neupaper

El sistema foundation → semantic → component es probado a escala. Adoptarlo para los themes de documento (`@theme:light`, `@theme:dark`). Las CSS variables funcionan en print stylesheets, así que Puppeteer las respetaría automáticamente. Naming convention: `--[category]-[variant]-[state]`.

---

## PDF Export

### Obsidian

Usa `Electron webContents.printToPDF()` — Chromium nativo, no Puppeteer.

Pipeline:
1. Renderiza nota en Reading Mode (MarkdownRenderer → HTML + CSS)
2. Pasa HTML a `webContents.printToPDF(options)`
3. Chromium genera PDF con print styles

**Limitaciones** (por eso existen plugins como Better Export PDF):
- Sin bookmarks/outline
- Sin números de página
- Sin headers/footers custom
- Sin multi-file export
- Control limitado de márgenes

### Better Export PDF (plugin popular)

1. `MarkdownRenderer` parsea Markdown
2. HTML se mejora con block IDs
3. CSS snippets se combinan con HTML
4. Contenido se inyecta en `WebviewTag` aislado
5. `webview.printToPDF()` genera PDF inicial
6. `pdf-lib` post-procesa: bookmarks, outlines, page numbers, metadata

### Ventaja de Neupaper

Puppeteer es más potente que `printToPDF` de Electron:
- Control total del contexto de rendering
- Headers/footers custom via page templates
- Funciona en cualquier entorno (no solo Electron)
- Obsidian está limitado por ser desktop app — no puede usar Puppeteer porque no tiene server

---

## Comparativa Obsidian vs Neupaper

| Aspecto | Obsidian | Neupaper |
|---------|----------|----------|
| Parser Markdown | Custom/propietario | remark (open, extensible) |
| Pipeline | Parser → HTML DOM → post-processors | Isles parser → Markdown limpio → remark → HTML |
| Editor | CM6 con Live Preview decorations | CM6 con split view |
| PDF export | Electron printToPDF | Puppeteer (más flexible) |
| Plataforma | Electron + Capacitor | Next.js web app |
| Theming | 400+ CSS variables | @theme config + CSS variables |
| Formato archivo | .md con YAML frontmatter | .neu con ${ config } |
| Plugins | Runtime JS con API completo | Template components (.isle) |
| Datos | Archivos locales + Sync opcional | localStorage + Supabase opcional |
| UI framework | Vanilla JS/TS | Next.js + React + Shadcn |
| Open source | No (solo API/docs) | Sí |

---

## Patrones a adoptar

1. **Auto-cleanup lifecycle** — `register*` pattern del Component class. Aplicar a `.isle` components.
2. **CSS variables jerárquicas** — foundation → semantic → component para theming de documentos.
3. **Adapter pattern para storage** — `VaultAdapter` interface con implementaciones por backend.
4. **Two-tier editor API** — wrapper simple + CM6 raw. Ya lo tenemos parcialmente.
5. **MetadataCache** — cachear `.data` parseados y referencias a componentes.
6. **Post-processor sort order** — si añadimos pipeline extensible, usar sortOrder explícito.

## Patrones a NO adoptar

1. **Custom Markdown parser** — remark es mejor para nuestro caso. Obsidian lo necesita por Live Preview WYSIWYG.
2. **Electron/desktop-first** — somos web-first, diferentes constraints.
3. **Plugin ecosystem complexity** — manifest.json + GitHub Releases es overkill para `.isle`. Nuestro `/install` + `/restore` (estilo Shadcn) es más limpio.
4. **Vanilla JS UI** — React + Shadcn es más productivo para nuestro caso.
5. **Embeber fonts en base64** — nosotros servimos fonts desde `/fonts/`, más eficiente en web.

---

## Fuentes

- https://github.com/obsidianmd/obsidian-api
- https://github.com/obsidianmd/obsidian-releases
- https://github.com/obsidianmd/obsidian-sample-plugin
- https://github.com/obsidianmd/obsidian-developer-docs
- https://github.com/obsidianmd/obsidian-clipper
- https://github.com/obsidianmd/obsidian-importer
- https://docs.obsidian.md/Reference/CSS+variables/CSS+variables
- https://docs.obsidian.md/Plugins/Editor/Editor+extensions
- Forum threads sobre parser, Live Preview, y mobile architecture

---

*Estudio realizado el 2026-03-25 como referencia arquitectónica para Neupaper.*


Lo más interesante:
  - Obsidian NO es open source — solo el API y tooling
  - NO usan remark/unified — parser custom propietario (nuestro approach   
  con remark es más mantenible)
  - Live Preview es CM6 con replace/widget decorations, no un renderer     
  separado
  - Su PDF export (Electron printToPDF) es más limitado que nuestro        
  Puppeteer
  - El Component class con auto-cleanup es su decisión arquitectónica más  
  elegante
  - 400+ CSS variables organizadas en 3 capas para theming
  - Settings UI es puramente imperativo (no React)

  Patrones que deberíamos adoptar:
  1. Auto-cleanup lifecycle para .isle components
  2. CSS variables jerárquicas (foundation → semantic → component) para    
  themes
  3. Adapter pattern para storage (localStorage → Supabase → File System   
  Access)
  4. MetadataCache para cachear .data parseados