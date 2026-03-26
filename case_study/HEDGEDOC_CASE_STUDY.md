# HedgeDoc Case Study

Estudio de HedgeDoc desde https://github.com/hedgedoc (20 repos, 7K stars). Editor Markdown colaborativo web-first con split view. El producto arquitecturalmente más cercano a Neupaper.

**Nota:** HedgeDoc ES open source (AGPL-3.0). 100% community-driven, sin entidad comercial. v2 en alpha desde hace años.

---

## Qué es HedgeDoc

Editor Markdown colaborativo en tiempo real, web-first. Split view (editor + preview). Self-hostable. Originalmente CodiMD (fork de HackMD). v1 estable (maintenance-only), v2 rewrite completo en alpha.

**Por qué es relevante:** Es el producto más cercano a Neupaper arquitecturalmente — web-first, Markdown, split view, CM6.

---

## Stack técnico

### v1 (estable, maintenance-only)

| Layer | Tecnología |
|-------|-----------|
| Backend | Node.js + Express |
| Frontend | Vanilla JS |
| Editor | CodeMirror 5 |
| Rendering | markdown-it |
| Collaboration | OT via Socket.io |
| DB | SQLite / PostgreSQL |

### v2 (rewrite, alpha)

| Layer | Tecnología |
|-------|-----------|
| Backend | **NestJS** (Node.js) |
| Frontend | **Next.js + React + TypeScript** |
| Editor | **CodeMirror 6** (via @uiw/react-codemirror) |
| Rendering | **markdown-it** + html-to-react (custom) |
| State | **Redux** |
| Collaboration | **Yjs** (CRDT) via WebSocket |
| DB | PostgreSQL (TypeORM) |
| Styling | SCSS + Bootstrap |
| Build | **Turbo** monorepo + Yarn 4.12 |
| Linting | oxlint + oxfmt |

### Monorepo (8 packages)

backend, frontend, commons, database, dev-reverse-proxy, docs, html-to-react, markdown-it-plugins

---

## Rendering Pipeline

**NO usa Remark/unified.** Usa markdown-it + custom html-to-react:

```
Markdown source
    ↓
markdown-it + custom plugins
    ↓
HTML string
    ↓
@hedgedoc/html-to-react (replacer system)
    ↓
React components (sin dangerouslySetInnerHTML)
```

### Replacer system

html-to-react convierte HTML a React components safely. **Replacers** custom interceptan elementos HTML específicos y sustituyen con React components (KaTeX, Mermaid, embeds, etc.).

### Vs Neupaper

Neupaper usa remark → react-markdown (más directo, sin bridge HTML→React). HedgeDoc necesita el bridge porque markdown-it output es HTML string. Nuestro pipeline es más limpio.

---

## Split View

- **Left:** CM6 editor
- **Right:** Rendered Markdown preview (React components)
- **Scroll sync** via line mapping system (mapea editor lines a DOM positions)
- Toggle: editor-only, split view, preview-only

### Vs Neupaper

Similar pero nuestra preview es A4 paginada en canvas con dot pattern — más sofisticada que el scroll continuo de HedgeDoc. Nuestro approach es document-oriented, el suyo es note-oriented.

---

## Real-Time Collaboration

### v1 → v2 migration: OT → CRDT

**v1:** Operational Transformation via Socket.io (server es source of truth)

**v2:** **Yjs** CRDT:
- `YDoc` shared documents
- `RealtimeDoc` + `YDocSyncServerAdapter`
- `MessageTransporter` para WebSocket
- Integrado con CM6 via `y-codemirror` binding
- **Issue conocido:** crashes con ~10 concurrent editors (EventEmitter listener limits)

### Para Neupaper

No necesario ahora. Si collaboration futuro: Yjs + y-codemirror.next es el approach estándar para CM6. Alternativa más simple: immutable blocks (Roam pattern).

---

## CodeMirror 6

Packages:
- `@codemirror/lang-markdown` 6.0.5
- `@codemirror/language` 6.3.0
- `@codemirror/lint` 6.0.0
- `@codemirror/state` 6.1.3
- `@codemirror/theme-one-dark` 6.1.0
- `@codemirror/view` 6.4.2
- `@uiw/react-codemirror` 4.13.2 (React wrapper)

Custom linting sobre `@codemirror/lint` para warnings y auto-fixes de Markdown issues.

### Vs Neupaper

Mismo editor. Nosotros integramos CM6 directamente (sin wrapper), ellos usan @uiw/react-codemirror. Nuestra integración directa con Compartments es más flexible.

---

## Math, Mermaid, Diagrams

| Feature | v1 | v2 |
|---------|----|----|
| Math | MathJax 2 | **KaTeX** |
| Diagrams | js-sequence-diagrams, flowchart.js, GraphViz | **Mermaid** |
| Music | ABC notation | — |
| Charts | Vega-Lite | — |

### Vs Neupaper

Idéntico a nosotros (KaTeX + Mermaid). La diferencia: nuestro Markdown Isles puede generar diagramas dinámicos desde datos — HedgeDoc no.

---

## HedgeDoc Flavored Markdown (HFM)

Extensiones beyond CommonMark:
- KaTeX math (inline/block)
- Mermaid diagrams
- Syntax-highlighted code blocks
- Task lists (checkboxes)
- Table of contents (auto-generated)
- Front matter (YAML)
- Emoji support
- Image size specification (custom syntax)
- Embeds (YouTube, Vimeo — v1: `{%youtube %}`, v2: plain URLs auto-embed)
- **Slide mode** con `---` separators (Reveal.js)
- Spoiler/collapse blocks
- Footnotes, abbreviations

### Vs Neupaper

HFM son extensiones de rendering. Markdown Isles son extensiones de lógica (variables, loops, conditionals). Fundamentalmente diferentes.

---

## Slide Mode (Reveal.js)

- Set document type a `slide`
- `---` separa slides horizontalmente
- `----` separa slides verticalmente
- Options via YAML front matter (theme, transition, speed)
- Speaker notes
- PDF via browser print

### Para Neupaper

No en roadmap. Si algún día queremos presentaciones desde `.neu`, Reveal.js es el approach probado.

---

## Permission/Sharing

Multi-level permission system:

| Level | Quién edita | Quién lee |
|-------|-------------|-----------|
| Freely | Cualquiera | Cualquiera |
| Editable | Logged-in | Cualquiera |
| Limited | Logged-in | Cualquiera |
| Locked | Solo owner | Cualquiera |
| Protected | Solo owner | Logged-in |
| Private | Solo owner | Solo owner |

Guest access configurable a nivel de instancia. Groups support.

### Vs Neupaper

Mucho más complejo de lo que necesitamos. Nuestro modelo: no-login (localStorage) vs logged-in (Supabase) + public sharing (`/s/uuid`). Suficiente.

---

## PDF/Export

**No tiene PDF export real.**

- v2 eliminó/depriorizó PDF
- v1 tenía browser print (Ctrl+P) limitado
- Slide mode PDF via Reveal.js print stylesheet
- No Puppeteer, no headless Chrome, no server-side PDF
- No paginación, no A4, no print-specific layout

### Vs Neupaper

**Nuestra mayor ventaja sobre HedgeDoc.** Su preview es infinite-scroll web page. Nuestra preview es A4 paginada con Puppeteer PDF. Productos fundamentalmente diferentes en output quality.

---

## Self-Hosting

- Docker images oficiales (`hedgedoc/container`)
- Kubernetes via community Helm charts con autoscaling
- PostgreSQL (producción) o SQLite (small)
- Redis para session management (scaled)
- S3-compatible storage para media (o local filesystem, Imgur)

---

## Modelo de negocio

**Ninguno.** 100% open source, community-driven, volunteer.

- Sin paid tiers, sin SaaS
- Sin entidad comercial
- Third-party managed hosting (Elestio, OctaByte)
- No official hosted instance (solo demo)

### Para Neupaper

**Advertencia:** Sin funding, v2 lleva años en alpha. Confirma que open source sin modelo de negocio = desarrollo lento. Nuestro freemium + Pro es el path correcto para sostenibilidad.

---

## v1 → v2 Changes

| Aspecto | v1 | v2 |
|---------|----|----|
| Architecture | Monolithic Node.js | Monorepo: NestJS + Next.js |
| Language | JavaScript | TypeScript |
| Editor | CM5 | **CM6** |
| Collab | OT (Socket.io) | **Yjs CRDT** (WebSocket) |
| Math | MathJax 2 | **KaTeX** |
| Diagrams | flowchart.js, sequence | **Mermaid** |
| Embeds | `{%youtube %}` | Plain URLs auto-embed |
| State | Server-side | **Redux** |
| Build | npm scripts | **Turbo + Yarn** |
| Status | Stable, maintenance | **Alpha** (años en desarrollo) |
| Migration | — | **No hay migration path** v1→v2 |

---

## Comparativa HedgeDoc vs Neupaper

| Aspecto | HedgeDoc | Neupaper |
|---------|----------|----------|
| Propósito | Collaborative notes | Professional documents |
| Framework | Next.js + NestJS | Next.js (mismo frontend!) |
| Editor | CM6 (same!) | CM6 (same!) |
| Rendering | markdown-it + html-to-react | **remark** + react-markdown |
| Preview | Infinite scroll (note) | **A4 paginada** (document) |
| PDF | No real (browser print) | **Puppeteer** (pixel-perfect) |
| Collaboration | Yjs CRDT (real-time) | Not yet |
| Templates | No | **Markdown Isles** (${ }) |
| Slides | Reveal.js | No |
| Business model | None (volunteer) | **Freemium + Pro** |
| Open source | Sí (AGPL-3.0) | Sí |
| Self-hosting | Docker + PostgreSQL | Planned |
| v2 status | **Alpha (years)** | **Functional MVP** |

---

## Patrones a adoptar

1. **html-to-react replacer pattern.** Interceptar HTML nodes y sustituir con React components. Nuestro remark ya soporta esto via `components` prop en react-markdown, pero el concepto de replacers es extensible.

2. **Line mapping para scroll sync.** Editor lines → DOM positions para scroll sincronizado entre editor y preview. Podríamos implementar click-in-preview → scroll-to-source.

3. **Yjs como referencia CRDT.** Si collaboration futura, Yjs + y-codemirror.next es el approach para CM6. GoodNotes usa Automerge, HedgeDoc usa Yjs — ambos son viables.

4. **Monorepo con Turbo.** HedgeDoc v2 usa Turbo + Yarn workspaces — exactamente lo que planeamos.

5. **Auto-embed from plain URLs.** v2 detecta YouTube/Vimeo URLs y auto-embed. Pattern limpio para Neupaper si queremos soportar embeds en documentos.

## Patrones a NO adoptar

1. **markdown-it.** Ya usamos remark, que es más composable y tiene pipeline directo a React.

2. **html-to-react bridge.** Innecesario con remark — react-markdown ya output React components directamente.

3. **Bootstrap + SCSS.** Tailwind + Shadcn es más moderno.

4. **Redux.** Overkill para nuestro scope. React context + useState es suficiente.

5. **Complex permission groups.** No necesitamos 6 niveles de permisos.

6. **No business model.** v2 alpha después de años confirma que volunteer-only no es sostenible.

---

## Fuentes

- https://github.com/hedgedoc/hedgedoc (7K stars)
- https://github.com/hedgedoc (20 repos)
- https://docs.hedgedoc.dev/
- https://docs.hedgedoc.org/
- https://hedgedoc.org/history/
- https://deepwiki.com/hedgedoc/hedgedoc

---

*Estudio realizado el 2026-03-25 como referencia arquitectónica para Neupaper.*


Lo más relevante:
  - Arquitecturalmente el más cercano a Neupaper: web-first, Next.js, CM6, Markdown, split view
  - PERO sin PDF real, sin paginación, sin A4 — confirma nuestro diferenciador
  - markdown-it + html-to-react vs nuestro remark + react-markdown — nuestro pipeline es más directo
  - Yjs CRDT para collaboration es el approach para CM6 (si futuro)
  - v2 alpha después de años SIN funding — confirma que business model es esencial
  - Line mapping para scroll sync — implementable para source↔preview sync
  - Auto-embed from plain URLs — pattern limpio

  Patrones que deberíamos adoptar:
  1. Line mapping para scroll sync (editor↔preview)
  2. Yjs como referencia CRDT si collaboration
  3. Auto-embed from URLs (YouTube, Vimeo)
  4. Monorepo Turbo (ya planeado)
