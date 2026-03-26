# Joplin Case Study

Estudio de la arquitectura de Joplin, extraído del análisis de https://github.com/laurent22/joplin (54K+ stars). El proyecto open source de notas más grande en GitHub.

**Nota:** Joplin ES open source (AGPL-3.0). Todo el código es público, incluyendo el server.

---

## Qué es Joplin

App de notas y to-do open source, cross-platform. Electron (desktop) + React Native (mobile) + CLI + Web Clipper. Sync con múltiples backends. E2EE. 28 packages en monorepo.

---

## Stack técnico

| Layer | Tecnología |
|-------|-----------|
| Desktop | Electron |
| Mobile | React Native 0.81.6 |
| UI | React + Redux + styled-components |
| Editor principal | CodeMirror 6 |
| Editor WYSIWYG (legacy) | TinyMCE 6.8.5 |
| Editor WYSIWYG (nuevo) | ProseMirror |
| Markdown rendering | **markdown-it** v13.0.2 (NO remark) |
| Math | KaTeX v0.16.23 |
| Diagramas | Mermaid v11.10.1 |
| Code highlighting | highlight.js v11.11.1 |
| Storage local | SQLite (desktop + mobile + WASM) |
| Sync | Multi-backend (Dropbox, OneDrive, S3, WebDAV, Joplin Cloud) |
| Encriptación | AES-256 GCM E2E + RSA |
| Server | Koa + PostgreSQL/SQLite + Knex |
| Monorepo | Yarn 4.9.2 workspaces + Lerna |

---

## Monorepo (28 packages)

**Apps:** app-desktop (Electron), app-mobile (React Native), app-cli, app-clipper (browser ext)

**Core:** lib (sync, encryption, models), renderer (markdown-it pipeline), editor (CM6 + ProseMirror), utils, plugins

**Server:** server (Koa + PostgreSQL), pdf-viewer (PDF.js)

**Tooling:** turndown (HTML→MD), onenote-converter, transcribe, whisper-voice-typing, generator-joplin (Yeoman)

---

## Markdown Rendering (markdown-it)

### Pipeline

```
Markdown → markdown-it (tokenize) → custom rules → HTML + pluginAssets
```

1. `MdToHtml.render()` crea `PluginContext` para trackear CSS/assets
2. Configura markdown-it con highlight function para code blocks
3. Carga reglas built-in + plugins markdown-it estándar
4. `markdownIt.render(body, context)` transforma contenido
5. Filtra assets no usados (Mermaid, KaTeX, ABC)
6. Cache via MD5 hash del input

### Plugins markdown-it

anchor, mark, footnote, sub, sup, deflist, abbr, emoji, ins, multimd-table, toc-done-right, expand-tabs

### Custom rules (12+)

katex, mermaid, fence, checkbox, image, html_image, link_open/close, sanitize_html, highlight_keywords, code_inline, fountain, abc, frontmatter, source_map, tableHorizontallyScrollable, externalEmbed

### Vs Neupaper

Joplin usa markdown-it (token-level). Neupaper usa remark/rehype (AST-level, unified). markdown-it es más rápido para rendering simple. remark es más composable y mejor para transformaciones complejas como Markdown Isles.

---

## Editor (CodeMirror 6)

### Tres modos de edición

1. **CM6 Source** — editor principal con inline rendering (images, checkboxes como CM6 widgets)
2. **TinyMCE WYSIWYG** — legacy, bidirectional sync HTML↔Markdown con 1s debounce
3. **ProseMirror WYSIWYG** — nuevo, reemplazando TinyMCE

### CM6 Setup

Packages: autocomplete 6.20.0, commands 6.10.1, lang-markdown 6.5.0, language 6.10.4, search 6.5.8, state 6.5.4, view 6.35.0, @replit/codemirror-vim 6.2.1

Usa `Compartment` pattern para reconfiguración dinámica (history, settings, keymaps). `CodeMirrorControl` wrapper que extiende `CodeMirror5Emulation` para backward compat.

### Inline rendering en source view

Joplin renderiza elementos inline en el editor source (NO en un preview separado):

- **replaceCheckboxes** — CM6 `WidgetType` → `<input type="checkbox">` interactivo
- **renderBlockImages** — CM6 `WidgetType` → preview de imágenes inline. `ImageHeightCache` (500 entries max) previene layout collapse durante carga
- **replaceBulletLists** — transforma markers de lista
- **replaceFormatCharacters** — oculta/estiliza `**`/`*` markers
- **replaceDividers** — horizontal rules
- **replaceInlineHtml** — elementos HTML inline
- **addFormattingClasses** — styling via CSS classes

### Vs Neupaper

Neupaper usa split-view (editor + preview separados). Joplin renderiza inline con CM6 widgets. Más complejo pero mejor UX. Es el approach de Live Preview que estudiamos en Obsidian.

---

## Math (KaTeX)

- KaTeX v0.16.23 via custom markdown-it plugin
- Inline: `$` delimiters (validación: sin whitespace, rejects `$$` vacío)
- Block: `$$` delimiters, multi-line
- **Caching:** MD5 de content + opciones serializadas. Nota en código: "katex macro structure is extremely verbose and slow to cache"
- Chemistry: `katex_mhchem.js` para fórmulas químicas
- Fonts: KaTeX WOFF2 declarados explícitamente para export HTML/PDF

### Vs Neupaper

Neupaper usa remark-math + rehype-katex. Mismo KaTeX pero via remark plugins. La estrategia de cache MD5 de Joplin es útil si performance se vuelve un issue.

---

## Mermaid

- Mermaid v11.10.1, client-side rendering
- Estructura HTML de 3 capas: source `<pre>` + botón SVG export + rendered `<pre class="mermaid">`
- Inicialización via polling (100ms), DOMContentLoaded, o custom event
- Dark mode via CSS class `.joplin--mermaid-use-dark-theme`
- Ancho inicial 640px → 100% post-render
- SVG export solo desktop (Darwin, Linux, FreeBSD, Windows)

---

## Sync (multi-backend)

### Arquitectura de 3 capas

**Layer 1: `BaseSyncTarget`** — cada backend extiende esta clase:
- Filesystem, OneDrive, Nextcloud, WebDAV, Dropbox, S3, Joplin Server, Joplin Cloud

**Layer 2: `FileApi`** — interfaz uniforme (~6 métodos):
```
list(path), stat(path), get(path), put(path, content), delete(path), delta(path)
+ acquireLock(), releaseLock(), mkdir()
```

Cada backend implementa un **driver** (FileApiDriverLocal, FileApiDriverWebDAV, etc.)

**Layer 3: `Synchronizer`** — UN solo algoritmo para TODOS los backends:
1. DELETE_REMOTE — items borrados localmente → borrar en remoto
2. UPLOAD — cambios locales → push a remoto (CreateRemote, UpdateRemote, o Conflict)
3. DELTA — fetch cambios remotos → CreateLocal, UpdateLocal, DeleteLocal

**Conflict resolution:** Compara `updated_time`. Conflictos crean copia del conflicto.

### Para Neupaper

El patrón FileApi + Synchronizer es exactamente lo que necesitamos:
```
VaultAdapter (interfaz ~6 métodos)
  → LocalStorageDriver
  → SupabaseDriver
  → GitHubDriver (File System Access API)
```
El filesystem sync target de Joplin son ~30 líneas. Toda la complejidad está en FileApi + Synchronizer.

---

## Encriptación (E2EE)

### 9 métodos de encriptación (evolución)

**Actuales:**
- KeyV1 — AES-256-GCM, PBKDF2 SHA-512, 220K iterations (master keys)
- FileV1 — mismo cipher, 3 iterations (contenido, tradeoff performance)
- StringV1 — mismo cipher, 3 iterations, UTF-16LE

### Arquitectura

- **Master Key system** — password → encripta master key → master key encripta data
- **Chunked encryption** — 64KB strings, 128KB files (memory en mobile)
- **Header:** `JED01` + metadata size + encryption method + master key ID
- **Sync integration:** `serializeForSync()` encripta contenido pero preserva foreign keys en plaintext (`id`, `parent_id`, `share_id`, `updated_time`)

---

## Plugin System

### Distribución

- `.jpl` files (tar archives con JS bundled + manifest.json)
- Registry centralizado en `github.com/joplin/plugins`
- `manifests.json` indexa todos los plugins
- Múltiples CDN mirrors (Staticaly, JSDelivr, FastGit, raw GitHub)
- Generator Yeoman para scaffolding

### API (24 módulos via `joplin.*`)

| API | Capability |
|-----|-----------|
| joplin.data | CRUD notes, folders, tags, resources |
| joplin.commands | Register/execute commands |
| joplin.views | Panels, dialogs, menus, toolbar, editor extensions |
| joplin.settings | Custom settings |
| joplin.workspace | Workspace state, events |
| joplin.contentScripts | Inject en renderer o editor |
| joplin.clipboard | Clipboard ops |
| joplin.imaging | Image processing |
| joplin.fs | File system |
| joplin.interop | Import/export hooks |

### Sandbox

- `sandboxProxy.js` — Proxy que intercepta property access y construye namespace path
- Todas las llamadas pasan por un gateway centralizado
- Safe Mode: `isSafeMode_` flag previene toda ejecución de plugins
- Performance monitoring: `recordCallStat()` trackea frecuencia de calls

### Content Script Types

1. **MarkdownItPlugin** — extiende renderer con reglas custom, CSS/JS assets
2. **CodeMirrorPlugin** — extiende editor con commands, modes, keymaps, CM6 extensions

---

## Data Model

### Entidades

- **Note** — id, title, body, parent_id, timestamps, is_todo, geolocation, markup_language, encryption, sharing, deleted_time
- **Folder** — notebooks jerárquicos via parent_id
- **Tag** — labels via junction table NoteTag
- **Resource** — attachments en filesystem, dual encryption (metadata + blob), OCR fields
- **MasterKey** — encryption keys
- **Revision** — version history
- **ItemChange** — change tracking para sync

### Storage

- SQLite everywhere: desktop (`sqlite3`), mobile (`react-native-sqlite-storage`), web (`@sqlite.org/sqlite-wasm`)
- Server: PostgreSQL o SQLite via Knex ORM

---

## PDF Export

**Electron `webContents.printToPDF()`** — NO Puppeteer:

1. Exporta nota a HTML temporal
2. Carga en Electron `BrowserWindow`
3. `win.webContents.printToPDF()` con `preferCSSPageSize: true`, `generateTaggedPDF: true`
4. Retorna buffer PDF
5. Auto-abre `<details>` tags antes de generar

### Vs Neupaper

Joplin solo puede hacer esto porque es Electron. Neupaper web-first necesita Puppeteer. Nuestro approach con `/print` route + `page.evaluate()` + `page.pdf()` es más controlable y produce mejores resultados.

---

## Theming

### Dos sistemas separados

**Preview (rendered notes):**
- CSS generado dinámicamente desde theme object en runtime
- Template literals con colores, tipografía, spacing
- ForkAwesome SVGs como base64 data URIs
- `@media print` rules
- Font size 15px, line-height 1.6em, dark text #222

**Editor (CodeMirror):**
- `createTheme()` genera CM6 `Extension` arrays desde `EditorTheme` object
- `EditorView.theme()` para UI elements
- `HighlightStyle.define()` con Lezer parser tags → visual properties
- 4.5:1 contrast ratios
- Dark mode: white caret, darker selections

---

## Modelo de negocio

**Open source (AGPL-3.0) + Joplin Cloud:**

| Tier | Precio | Storage | Note Size |
|------|--------|---------|-----------|
| Basic | $3/mo ($30/yr) | 1 GB | 10 MB |
| Pro | $6/mo ($60/yr) | 10 GB | 200 MB |
| Teams | $8.50/mo ($85/yr) | 10 GB + collab | 200 MB |

- 50% descuento educación
- Self-hosted server option
- Donaciones (PayPal, GitHub Sponsors, Patreon)
- Data en Francia, GDPR compliant

---

## Comparativa Joplin vs Neupaper

| Aspecto | Joplin | Neupaper |
|---------|--------|----------|
| Markdown parser | markdown-it (tokens) | remark/rehype (AST, unified) |
| Editor | CM6 + ProseMirror (WYSIWYG) | CM6 (source + preview) |
| Editor rendering | Inline widgets (images, checkboxes) | Split-view separado |
| Math | KaTeX custom markdown-it plugin | KaTeX via remark-math |
| PDF | Electron printToPDF (desktop only) | Puppeteer API route (web) |
| Storage | SQLite everywhere | localStorage / Supabase |
| Sync | Multi-backend (8 targets) | localStorage → Supabase → GitHub |
| Encryption | AES-256 E2E full | No (aún) |
| Plugins | Full API, 24 modules, sandbox | Componentes .isle |
| Templating | Ninguno | Markdown Isles (${ }) |
| Open source | Sí (AGPL-3.0) | Sí |
| Plataforma | Electron + React Native | Next.js web |
| Precio | $3-8.50/mo | ~8-12€/mo |

---

## Patrones a adoptar

1. **FileApi pattern para sync.** Interfaz uniforme (~6 métodos) + drivers por backend + un solo Synchronizer. Joplin's filesystem target son ~30 líneas — prueba de que es simple.

2. **KaTeX cache con MD5.** Hash de content + opciones para evitar re-render. Útil si math rendering se vuelve bottleneck.

3. **Mermaid client-side con polling.** Inicialización robusta: polling 100ms + DOMContentLoaded + custom event. Cubre todos los timing edge cases.

4. **Inline rendering selectivo en editor.** Checkboxes e imágenes como CM6 widgets en el source editor. No es WYSIWYG completo pero mejora la UX significativamente.

5. **ImageHeightCache.** Cache de alturas de imágenes (500 entries max) previene layout collapse durante carga. Útil para nuestro preview.

6. **Content Script types.** Separar extensiones de renderer (markdown plugins) de extensiones de editor (CM6 plugins). Dos hooks diferentes para dos concerns diferentes.

## Patrones a NO adoptar

1. **markdown-it.** Ya usamos remark y es mejor para Markdown Isles (AST manipulation vs token manipulation).

2. **WYSIWYG dual-editor (TinyMCE/ProseMirror).** Complejidad enorme de bidirectional sync HTML↔Markdown. Fuente de bugs. Split-view es más simple y confiable.

3. **SQLite everywhere.** Overkill para web-first. localStorage + Supabase es correcto.

4. **Multi-backend sync completo.** 8 targets con conflict resolution y locking es years of work. Empezar con localStorage → Supabase, añadir GitHub Sync después.

5. **Plugin sandbox con Proxy.** Demasiado complejo para .isle components que son template code, no application extensions.

---

## Fuentes

- https://github.com/laurent22/joplin
- https://joplinapp.org/plans/
- https://discourse.joplinapp.org/

---

*Estudio realizado el 2026-03-25 como referencia arquitectónica para Neupaper.*


Lo más interesante:
  - 54K stars, el open source de notas más grande
  - Usa markdown-it (no remark) — valida que hay dos approaches viables
  - Su FileApi pattern para multi-backend sync es el patrón a seguir para nuestro VaultAdapter
  - Inline rendering de images/checkboxes en CM6 source editor — UX win sin WYSIWYG completo
  - PDF via Electron printToPDF — confirma que Puppeteer es la elección correcta para web
  - E2EE con 9 métodos evolutivos — referencia si algún día añadimos encriptación

  Patrones que deberíamos adoptar:
  1. FileApi pattern para sync (interfaz ~6 métodos + drivers)
  2. KaTeX cache con MD5
  3. Inline rendering selectivo en editor (images, checkboxes como CM6 widgets)
  4. ImageHeightCache para preview

---

Lo más valioso para Neupaper:

  - FileApi pattern — la joya de la corona. Interfaz uniforme de ~6 métodos
   + drivers por backend + UN solo Synchronizer. El filesystem target son  
  ~30 líneas. Exactamente lo que necesitamos para VaultAdapter
  (localStorage → Supabase → GitHub).
  - Inline rendering selectivo — no WYSIWYG completo, sino checkboxes e    
  imágenes como CM6 widgets en el source editor. Mejora UX sin la
  complejidad de TinyMCE/ProseMirror bidirectional sync.
  - markdown-it vs remark — Joplin valida que ambos approaches funcionan en
   producción. Nuestra elección de remark es correcta para Markdown Isles  
  (AST manipulation > token manipulation).
  - Puppeteer es correcto — Joplin usa Electron printToPDF porque es       
  desktop. Para web, Puppeteer es la elección estándar.