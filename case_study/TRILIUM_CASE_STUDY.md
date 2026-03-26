# TriliumNext Case Study

Estudio de TriliumNext desde https://github.com/TriliumNext (15 repos, 35K+ stars). Community fork de Trilium Notes. La app de notas self-hosted más potente — con scripting, SQL console, y note-as-code.

**Nota:** TriliumNext ES open source (AGPL-3.0). 100% free, sin tiers de pago. Donations only.

---

## Qué es TriliumNext

Knowledge base self-hosted con jerarquía de notas, scripting potente, múltiples tipos de notas (text, code, canvas, mind map, spreadsheet, mermaid...), sync bidireccional, y notas compartidas públicamente. Todo almacenado en un solo archivo SQLite.

Fork del original Trilium (zadam), ahora mantenido por Elian Doran y comunidad.

---

## Stack técnico

| Layer | Tecnología |
|-------|-----------|
| Backend | Express.js 5 + Node.js |
| Frontend | **jQuery 4 + Bootstrap** (legacy, NO React) |
| Rich text editor | **CKEditor 5** (heavily customized, 6+ plugins propios) |
| Code editor | **CodeMirror** (para code notes) |
| DB | **SQLite** (better-sqlite3, WAL mode, single file) |
| Desktop | Electron |
| Canvas | Excalidraw |
| Mind maps | Mind Elixir |
| Spreadsheets | Univerjs |
| Presentations | Reveal.js |
| Diagrams | jsPlumb (relation maps) + Mermaid |
| Maps | Leaflet (GPX/geo) |
| Tree view | FancyTree |
| Math | KaTeX (CKEditor plugin) |
| Build | Vite + esbuild + Nx + pnpm 10 |
| Auth | OpenID Connect + TOTP |
| i18n | i18next |

---

## Arquitectura: Three-Cache System

La decisión arquitectónica más interesante. Trilium mantiene TRES caches in-memory:

### 1. Becca (server-side)

Object graph completo en memoria. Singleton. Todos los notes, branches, attributes, options cargados como Maps.

```typescript
notes: Record<string, BNote>
branches: Record<string, BBranch>
attributes: Record<string, BAttribute>
attributeIndex: Record<string, BAttribute[]>
```

**Todo el árbol de notas en RAM al startup.** Content/blobs NO están en memoria — solo metadata, jerarquía, y atributos. Permite operaciones blazing-fast en 100K+ notas.

### 2. Froca (client-side)

Mirror de Becca en el browser. Fetch on demand.

### 3. Shaca

Cache optimizado para notas compartidas/públicas.

### Para Neupaper

No necesitamos esto — nuestro vault es mucho más pequeño (decenas de archivos, no 100K). Pero el concepto de "metadata in memory, content on demand" es válido si el vault crece.

---

## Note Hierarchy: Branch System (DAG)

NO es un filesystem tradicional. Es un **DAG** (directed acyclic graph):

- **BNote** = la nota (noteId, title, type, mime, content blob)
- **BBranch** = relación parent-child (branchId = `parentNoteId_noteId`)
- **Una nota puede tener MÚLTIPLES branches** → aparece en múltiples padres ("cloning")
- Branches tienen `notePosition` (ordering) y `prefix` (labels contextuales)
- "Weak" branches (bookmarks, shares) no previenen deletion
- Borrar un branch solo borra la nota si era el último branch "strong"

### Para Neupaper

Nuestro vault es un filesystem simple (paths). El DAG de Trilium es más potente pero innecesariamente complejo para documentos con layout A4.

---

## 13+ tipos de nota

| Tipo | Tecnología |
|------|-----------|
| Text | CKEditor 5 (WYSIWYG) |
| Code | CodeMirror |
| File | Binary attachments |
| Image | Display/management |
| Canvas | Excalidraw |
| Mermaid | Mermaid editor |
| Book | Collection de child notes |
| Render | Custom HTML |
| Relation Map | jsPlumb diagrams |
| Note Map | Graph visualization |
| Mind Map | Mind Elixir |
| Spreadsheet | Univerjs |
| Web View | Embedded web content |
| SQL Console | Direct SQL queries |
| Search | Saved search results |
| Launcher | Custom launcher buttons |

---

## Scripting System

La feature más potente de Trilium. Scripts son **notas** (code-type con JS backend/frontend mime).

### Execution model

- Scripts wrapeados en IIFEs con context inyectado
- Backend: ejecución síncrona (por SQLite transactions)
- Frontend: ejecución asíncrona
- Scripts pueden `require()` otras note-scripts como modules
- Child notes se inyectan como function parameters

### BackendScriptApi (superficie enorme)

- Full CRUD en notes, branches, attributes, attachments, revisions
- Search con query syntax completo
- Calendar/date note management
- `runOnFrontend()` — ejecutar código en todos los clients via WebSocket
- **Direct SQL access** via `api.sql`
- Bundled: axios, dayjs, xml2js, cheerio
- Transaction management, backup triggers
- Export to ZIP (markdown/HTML)
- `api.__private.becca` — acceso directo al object graph in-memory

### Events system

Scripts hook a system events (note creation, modification) via attributes.

### Custom HTTP endpoints

Scripts registran HTTP handlers → Trilium como mini application server.

### Para Neupaper

Conceptualmente similar a `${ script }` pero más potente — Trilium scripts manipulan la app entera. Neupaper `${ script }` genera contenido dentro del documento. Diferentes scopes: Trilium = app scripting, Neupaper = template scripting.

---

## CKEditor 5

Heavily customized con 6+ plugins propios:

| Plugin | Función |
|--------|---------|
| ckeditor5-footnotes | Footnotes |
| ckeditor5-math | KaTeX math |
| ckeditor5-mermaid | Mermaid diagrams |
| ckeditor5-admonition | Callout/info boxes |
| ckeditor5-keyboard-marker | Keyboard shortcuts display |

CKEditor para text notes, CodeMirror para code notes. Dos editores separados por tipo.

### Vs Neupaper

Trilium eligió WYSIWYG (CKEditor). Neupaper eligió source-editing (CM6). Trilium oculta markup; Neupaper lo abraza. Filosofías opuestas para productos diferentes.

---

## Relation/Attribute System

Una de las features más distintivas:

- **Labels** = key-value metadata en notas (como tags con valores)
- **Relations** = typed links entre notas (mini-graph database)
- Attributes pueden ser **inheritable** (hijos heredan atributos de padres)
- **Promoted attributes** — aparecen prominentemente en la UI
- Search potente: `#label=value`, `~relation.title=X`
- Templates usan atributos para definir estructura default

---

## Sync

Protocolo **bidirectional pull-push-verify**:

1. **Login** — HMAC auth con `documentSecret` compartido
2. **Push** — Enviar `entity_changes` locales al server (batched, max 1000/request)
3. **Pull** — Fetch server changes desde `lastSyncedPull`
4. **Push again** — Enviar cambios creados durante pull
5. **Verify** — Comparar content hashes por sector; re-queue mismatches

- Changes trackeados en tabla `entity_changes` con `isSynced` flag e `instanceId`
- Network errors trigger proxy toggle logic

---

## Self-Hosting (killer feature)

- **Docker** (docker-compose + rootless variant)
- **Kubernetes** (Helm charts oficiales)
- **NixOS** (flake.nix)
- **Manual** (server binary)
- **Desktop** (Electron, no server needed)
- Data = single SQLite file

---

## Features únicas

- **Note hoisting** — focus en subtree, esconde todo lo demás
- **Protected notes** — encryption per-note con session-based key management
- **Shared notes** — publicar notas via `/s/uuid` URLs (con Shaca cache)
- **Day notes** — journal con jerarquía automática year/month/week/day
- **Cloning** — misma nota en múltiples locations (DAG)
- **SQL Console** — queries SQL directos contra SQLite desde la UI
- **Custom request handlers** — notas como HTTP endpoints
- **Web Clipper** — browser extension

---

## Export

| Formato | Notas |
|---------|-------|
| Markdown | Via turndown-plugin-gfm (HTML→MD) |
| HTML | Single-note con base64 inlined attachments |
| OPML | Outline format |
| ZIP | Subtree en markdown o HTML |
| PDF | **NO server-side.** Returns 400. Client-side via Electron printToPDF |

### Para Neupaper

Otro producto sin PDF server-side. Neupaper's Puppeteer pipeline es diferenciador en TODOS los case studies.

---

## Modelo de negocio

**100% free, AGPL-3.0. Sin tiers de pago.**

- GitHub Sponsors: 38 activos ($1/$5/$10/mo)
- PayPal donations
- Buy Me a Coffee
- No SaaS, no hosted version

### Advertencia para Neupaper

38 sponsors a $1-10/month no es sostenible como ingreso principal. Neupaper's freemium ($0 free + $8-12/mo Pro) es un path mucho más fuerte.

---

## Comparativa TriliumNext vs Neupaper

| Aspecto | TriliumNext | Neupaper |
|---------|-------------|----------|
| Paradigma | Knowledge base + scripting | Document authoring + PDF |
| Editor text | CKEditor 5 (WYSIWYG) | CodeMirror 6 (Markdown source) |
| Editor code | CodeMirror | N/A (same editor) |
| Frontend | jQuery + Bootstrap (legacy) | React + Tailwind + Shadcn |
| Backend | Express.js + SQLite | Next.js + localStorage/Supabase |
| Scripting | Full app scripting (notes = code) | Template scripting (${ }) |
| PDF | No (Electron printToPDF) | Puppeteer (pixel-perfect) |
| Self-hosting | Core feature | Planned (Pro) |
| Note types | 13+ | 3 (.neu, .isle, .data) |
| Hierarchy | DAG (cloning) | Filesystem simple |
| Open source | Sí (AGPL-3.0) | Sí |
| Pricing | Free (donations) | Freemium + Pro |

---

## Patrones a adoptar

1. **Shared notes via `/s/uuid`.** Trilium publica notas en URLs públicas con cache dedicado (Shaca). Exactamente lo que planeamos para document sharing en Fase 5.

2. **Day notes / journal system.** Jerarquía automática year/month/week/day. Si Neupaper añade journal/changelog, este es el patrón.

3. **Attribute inheritance.** Atributos de padre heredados por hijos. Podría aplicarse a themes de documento: un folder con `@theme:dark` aplica a todos los `.neu` dentro.

4. **Pull-push-verify sync.** Si necesitamos sync propio (beyond Supabase), el protocolo de Trilium con entity changes + sector hash verification es probado en producción.

5. **Protected notes con session keys.** Per-note encryption con timeout. Si añadimos encryption selectiva (solo algunos documentos), este pattern es limpio.

## Patrones a NO adoptar

1. **jQuery + Bootstrap.** Legacy stack. React + Tailwind es correcto.

2. **CKEditor 5.** WYSIWYG no es nuestro paradigma. CM6 source editing es correcto.

3. **Three-cache system.** Overkill para un vault de documentos. Solo para 100K+ entities.

4. **DAG hierarchy.** Un documento apareciendo en múltiples folders añade complejidad sin beneficio para document authoring.

5. **Scripting como notes.** Potente pero peligroso (SQL directo, app manipulation). Nuestro `${ script }` sandboxed es más seguro.

6. **Donations-only model.** 38 sponsors no es sostenible. Freemium es mejor.

---

## Fuentes

- https://github.com/TriliumNext (15 repos)
- https://github.com/TriliumNext/Trilium
- https://docs.triliumnotes.org/

---

*Estudio realizado el 2026-03-25 como referencia arquitectónica para Neupaper.*


Lo más relevante:
  - 35K stars como app self-hosted — valida demanda de self-hosting para developers
  - Scripting system es el más potente de todos los case studies (notes = code, SQL directo, HTTP endpoints)
  - Three-cache system (Becca/Froca/Shaca) — bold pero solo necesario para 100K+ entities
  - Branch system (DAG) permite cloning — una nota en múltiples locations
  - Shared notes via /s/uuid — exactamente nuestro plan para Fase 5
  - OTRO producto sin PDF server-side — confirma nuestro moat
  - Donations-only model (38 sponsors) no es sostenible — valida nuestro freemium

  Patrones que deberíamos adoptar:
  1. Shared notes via /s/uuid con cache dedicado
  2. Attribute inheritance (theme/config de folder a children)
  3. Pull-push-verify sync protocol si sync propio
  4. Protected notes con session-based keys si encryption selectiva
