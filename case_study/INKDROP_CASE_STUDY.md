# Inkdrop Case Study

Estudio de la arquitectura de Inkdrop, extraído del análisis de https://github.com/inkdropapp (111 repos). Orientado a identificar patrones aplicables a Neupaper.

**Nota:** Inkdrop NO es open source. Solo plugins, themes y tooling son públicos. App core es propietaria. Creado y mantenido en solitario por Takuya Matsuyama (craftzdog).

---

## Qué es Inkdrop

Editor Markdown de notas para developers. Cross-platform (macOS, Windows, Linux, Android, iOS). Subscription-only ($9.98/mo), sin free tier. +$10K MRR como solo developer.

---

## Stack técnico

| Layer | Tecnología |
|-------|-----------|
| Desktop | Electron |
| UI | React (compartido con mobile via React Native) |
| CSS/theming | Semantic UI + Less |
| Editor (v5) | CodeMirror 5 |
| Editor (v6, canary) | CodeMirror 6 |
| Markdown rendering | Remark (unified ecosystem) — unified@10, remark@14, remark-rehype@10 |
| Math | KaTeX (via plugin) |
| Diagramas | Mermaid.js (via plugin) |
| Storage local | PouchDB + SQLite (better-sqlite3) |
| Sync cloud | CouchDB (replicación nativa con PouchDB) |
| Encriptación | AES-256 GCM end-to-end |
| Mobile | React Native |
| Landing | GatsbyJS + Netlify |
| Docs | Next.js + Tailwind + FlexSearch |

---

## Rendering Pipeline

Idéntico al de Neupaper en concepto:

```
Markdown → Remark (MDAST) → remark-rehype → Rehype (HAST) → React components
```

Diferencia clave: Inkdrop renderiza Markdown directo con remark plugins. Neupaper añade un pre-procesador (Markdown Isles parser) antes de remark.

### Hooks del renderer

```javascript
const { markdownRenderer } = require('inkdrop')

// Añadir plugins remark/rehype
markdownRenderer.remarkPlugins.push(myRemarkPlugin)
markdownRenderer.rehypePlugins.push(myRehypePlugin)

// Override React components para elementos HTML
markdownRenderer.remarkReactComponents.a = CustomAnchor

// Custom code block renderers por lenguaje
markdownRenderer.remarkCodeComponents['mermaid'] = MermaidBlock
```

**Para Neupaper:** El patrón `remarkCodeComponents` (registrar React renderers por lenguaje de code block) es exactamente cómo funciona nuestro soporte de Mermaid.

---

## Sistema de plugins

### Distribución

Registry propio (no npm), modelado después de Atom's `apm`:
- **ipm** — Inkdrop Package Manager (lib + CLI)
- Packages publicados e instalados desde GitHub repos
- Registry en `https://api.inkdrop.app/packages`
- 100+ plugins en el ecosystem

### Estructura de un plugin

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "main": "./lib/main.js",
  "engines": { "inkdrop": "^6.x" },
  "styleSheets": ["styles/main.css"]
}
```

### Lifecycle

```javascript
module.exports = {
  activate() {
    inkdrop.components.registerClass(MyComponent)
    inkdrop.layouts.addComponentToLayout('modals', 'MyComponent')
  },
  deactivate() {
    inkdrop.layouts.removeComponentFromLayout('modals', 'MyComponent')
    inkdrop.components.deleteClass(MyComponent)
  }
}
```

### CodeMirror hooks

```javascript
global.inkdrop.onEditorLoad((editor) => {
  // editor.cm da la instancia de CodeMirror
})
global.inkdrop.onEditorUnload(() => {
  // Cleanup
})
```

---

## Sistema de themes (3 capas)

Separación limpia en tres tipos:

1. **UI Themes** — sidebar, note list, toolbars, dropdowns
2. **Syntax Themes** — editor CodeMirror (gutter, tokens, cursor)
3. **Preview Themes** — preview pane (headers, code blocks, text)

### Arquitectura CSS

- Built on Semantic UI + Less
- Variables semánticas: `--note-list-bar-background`, `--color-*`, `--hsl-*`
- `palette.json` con colores en JSON (para previews y mobile)
- **CSS Cascade Layers**: `@layer reset, base, tokens, theme, theme.ui, theme.preview, theme.syntax`
- Tool `@inkdropapp/theme-dev-helpers` para hot-reload durante desarrollo

### Para Neupaper

La separación UI / syntax / preview mapea bien a nuestras necesidades:
- **UI** → Shadcn + Tailwind (sidebar, tabs, popover)
- **Syntax** → CodeMirror theme (isle-highlight, neu-theme)
- **Preview** → neu-document.css (estilos del documento A4)

---

## Sync/Storage

La decisión arquitectónica más elegante de Inkdrop:

- **Local:** PouchDB (JS implementation de CouchDB) → SQLite via custom adapter
- **Cloud:** CouchDB server
- **Sync:** Protocolo de replicación CouchDB built-in en PouchDB — offline-first, conflict resolution automático, resume tras desconexión
- **Self-hosting:** Usuarios pueden apuntar a su propio CouchDB
- **Encriptación:** AES-256 GCM E2E. Key derivada del password via PBKDF2, nunca almacenada sin encriptar

### Data model

4 entidades core definidas como JSON Schemas en `inkdrop-model`:
- **Note** — la nota
- **Book** — notebook/carpeta
- **Tag** — etiqueta
- **File** — attachment (imagen)

### Para Neupaper

PouchDB/CouchDB es elegante pero complejo. Para Neupaper web-first, Supabase es más simple. El concepto de data model como package publicado (`inkdrop-model`) sí es interesante — Neupaper podría extraer el parser como package npm standalone.

---

## Plugins destacados

### inkdrop-mermaid
- TypeScript, built con tsup
- Mermaid.js v11.4.1
- Registra handler para code blocks `mermaid`
- **Lazy loading** — solo carga mermaid.js cuando una nota lo usa
- Theming custom via preferences

### inkdrop-math
- KaTeX v0.16.38 via react-katex
- Block math (`$$`), inline math (`$`), equation numbering
- Parser bundled integrado con remark/rehype

### inkdrop-export-print (PDF)
- Plugin bundled (viene con Inkdrop)
- Usa **Electron print API** (no Puppeteer)
- Limitaciones similares a Obsidian: sin bookmarks, sin page numbers custom

### inkdrop-export-utils
- `renderHTML(markdown)`, `createHTML(note)`, `getStylesheets()`
- Convierte imágenes a base64 data URIs para HTML standalone

---

## Modelo de negocio

- **Precio:** $9.98/mo o $99.80/año (17% descuento anual)
- **Sin free tier:** Solo 14 días de trial
- **Razonamiento:** Free users "tienden a ser ruidosos y consumir recursos del servidor" — no viable para solo developer
- **Revenue:** +$10K MRR, lifetime revenue +$300K
- **Precio duplicado:** De $4.90 a $9.98/mo. Solo 20% churn; nuevos signups estables
- **Growth channel:** YouTube (devaslife, 201K+ subs, 70-80% de nuevos usuarios)
- **Equipo:** 1 persona

### Para Neupaper

- Neupaper's freemium es viable porque localStorage no tiene coste de servidor
- El razonamiento de "no free tier" aplica menos a web apps sin backend obligatorio
- YouTube como canal de growth es probado para dev tools

---

## Inkdrop v6 (CM6 upgrade, canary)

- CodeMirror 6 reemplazando CM5
- Floating toolbar (reemplaza toolbar fija)
- Command palette (press `/` en línea vacía)
- GitHub Alerts syntax con autocompletion
- Copy button en code blocks
- Compatibilidad con Grammarly (gracias a contentEditable)

---

## Comparativa Inkdrop vs Neupaper

| Aspecto | Inkdrop | Neupaper |
|---------|---------|----------|
| Plataforma | Electron + React Native | Next.js web |
| Editor | CM5 (→ CM6 canary) | CM6 |
| Markdown | Remark (unified) | Remark (unified) — mismo |
| Math | KaTeX (plugin) | KaTeX (remark-math + rehype-katex) |
| Diagramas | Mermaid (plugin) | Mermaid (remark-mermaid) |
| PDF | Electron print API | Puppeteer (más control) |
| Storage | PouchDB + SQLite + CouchDB | localStorage / Supabase |
| Templating | Ninguno — Markdown puro | Markdown Isles (${ }) |
| Plugins | Registry + ipm, 100+ plugins | Componentes .isle |
| Modelo | $9.98/mo, sin free tier | Freemium + Pro (~8-12€/mo) |
| Open source | No (plugins only) | Sí |
| Target | Developer tomando notas | Developer creando documentos profesionales |

---

## Patrones a adoptar

1. **Three-layer theme system.** UI / syntax / preview como capas separadas. Limpio y escalable si abrimos theming a usuarios.

2. **remarkCodeComponents pattern.** Registrar React renderers custom por lenguaje de code block. Ya lo hacemos con Mermaid — formalizar el patrón.

3. **Lazy loading de dependencias pesadas.** Mermaid solo se carga cuando se usa. Ya lo hacemos con `import("mermaid")` dinámico — confirma que es el approach correcto.

4. **Data model como package.** Extraer el parser de Markdown Isles como package npm standalone (`@neupaper/parser`). Útil para tooling externo, testing, y portabilidad.

5. **MCP server para AI.** `inkdrop/mcp-server` (52 stars, su repo más starred reciente) expone datos a AI assistants. Forward-looking pattern para integración con LLMs.

6. **CSS Cascade Layers.** `@layer reset, base, tokens, theme` para orden de precedencia claro en theming.

## Patrones a NO adoptar

1. **Custom package registry.** ipm es complejo de mantener. Nuestro `/install` + `/restore` (estilo Shadcn) es más simple.

2. **PouchDB/CouchDB sync.** Elegante pero overkill para web-first. Supabase es más directo.

3. **Semantic UI + Less.** Outdated stack. Tailwind + Shadcn es mejor para nuestro caso.

4. **Sin free tier.** Funciona para Inkdrop (desktop app con server costs) pero no para Neupaper (localStorage = zero cost).

5. **Electron.** No somos desktop-first.

---

## Fuentes

- https://github.com/inkdropapp (111 repos)
- https://developers.inkdrop.app/
- https://docs.inkdrop.app/
- https://dev.to/craftzdog/how-i-built-a-markdown-editor-earning-1300-mo-profit-inkdrop-4l6f
- https://www.devas.life/why-inkdrop-is-a-subscription-app/
- https://www.devas.life/the-roadmap-of-inkdrop-vol-6/
- https://www.foundershut.com/explore/inkdrop-saas-10000-mrr-growth
- https://www.inkdrop.app/pricing/

---

*Estudio realizado el 2026-03-25 como referencia arquitectónica para Neupaper.*


Lo más interesante:
  - Usa exactamente el mismo stack de rendering que Neupaper (remark/rehype/unified)
  - $10K MRR como solo developer — valida el modelo de editor Markdown de pago
  - Three-layer theme system (UI/syntax/preview) es muy limpio
  - remarkCodeComponents pattern para custom renderers por lenguaje
  - MCP server para AI integration es forward-looking
  - Lazy loading de Mermaid confirma nuestro approach

  Patrones que deberíamos adoptar:
  1. Three-layer theme system (UI / syntax / preview)
  2. Data model / parser como package npm standalone
  3. CSS Cascade Layers para orden de precedencia en theming
  4. MCP server para integración con AI/LLMs

---

  Lo más relevante:
  - Usa exactamente remark/rehype/unified como nosotros — valida nuestra   
  elección
  - $10K MRR como solo developer — prueba que el modelo de editor Markdown 
  de pago funciona
  - Three-layer theme system (UI / syntax / preview) — la separación más   
  limpia que hemos visto
  - Su remarkCodeComponents pattern es exactamente lo que ya hacemos con   
  Mermaid
  - MCP server para AI — su repo más starred reciente, pattern
  forward-looking

  Diferencia fundamental con Neupaper: Inkdrop es puro notas sin
  templating. Neupaper tiene Markdown Isles. Eso nos diferencia
  completamente en el mercado.
