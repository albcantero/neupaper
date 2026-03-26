# Anytype Case Study

Estudio de la arquitectura de Anytype (Any Association), extraído del análisis de https://github.com/anyproto (85 repos). La arquitectura más sofisticada de todos los productos estudiados.

**Nota:** Anytype ES open source (Any Source Available License). Organización: Any Association, non-profit suiza. Arquitectura completamente descentralizada y E2E encrypted.

---

## Qué es Anytype

Knowledge management local-first, E2E encrypted, con modelo de objetos+tipos+relaciones (similar a Notion pero privacy-first y descentralizado). Block editor custom. Sync P2P via protocolo propio (any-sync). Sin servidor central obligatorio — self-hostable.

---

## Stack técnico

| Layer | Tecnología |
|-------|-----------|
| Desktop | Electron 39.2.7 + React 18.3.1 |
| State management | MobX 6.15.0 |
| Styling | SCSS (no Tailwind, no CSS-in-JS) |
| Bundler | Rspack 1.1.0 (Rust-based, reemplaza Webpack) |
| Middleware (CORE) | **Go** (anytype-heart, 99.7% Go) |
| Comunicación | **gRPC + Protobuf** (200+ RPCs) |
| Storage local | BadgerDB (KV store) + SQLite |
| Full-text search | **Tantivy** (Rust, via FFI — like Lucene) |
| Sync protocol | any-sync (Go, CRDT + Merkle-DAG + E2E encryption) |
| iOS | Swift nativo (SwiftUI) |
| Android | Kotlin nativo (Jetpack Compose) |
| Editor | **Custom contentEditable** (NO CodeMirror, NO ProseMirror) |
| Code highlighting | PrismJS |
| Math | KaTeX |
| Markdown export | goldmark (Go) |

---

## Arquitectura: thick client / thin server

```
┌──────────────────────────────────────────────┐
│              CLIENT DEVICE                    │
│                                               │
│  ┌────────────┐  gRPC  ┌──────────────────┐  │
│  │ anytype-ts  │◄──────►│ anytype-heart    │  │
│  │ (Electron)  │        │ (Go middleware)  │  │
│  │ React+MobX  │        │ - Block store   │  │
│  └────────────┘         │ - CRDT engine   │  │
│                          │ - BadgerDB      │  │
│  ┌────────────┐         │ - Tantivy search│  │
│  │ swift/kotlin│◄────────│ - Encryption    │  │
│  │ (native)    │         │ - any-sync      │  │
│  └────────────┘         └──────────────────┘  │
└──────────────────────────┼────────────────────┘
                           │ encrypted DAGs
                           ▼
         ┌──────────────────────────────┐
         │     any-sync NETWORK         │
         │  Sync nodes + File nodes     │
         │  Consensus nodes + Coord     │
         │  (self-hostable via Docker)  │
         └──────────────────────────────┘
```

**Decisión clave:** Un middleware Go compartido por TODOS los clientes. Desktop (Electron), iOS (Swift), Android (Kotlin) — todos usan el mismo `anytype-heart` compilado para cada plataforma. La UI es thin client, toda la lógica está en Go.

---

## Editor: Custom contentEditable

**NO usa CodeMirror, ProseMirror, TipTap, Slate ni ningún framework.** Editor completamente custom:

- `<Editable>` React component wrapping native `contentEditable`
- Sistema de **marks** propio: `{ type, range: { from, to }, param }`, independiente de HTML tags
- `Mark.fromUnicode()`, `Mark.toHtml()`, `Mark.adjust()`, `Mark.toggle()`
- `text.tsx` maneja **40+ keyboard shortcuts** manualmente
- **Markdown auto-conversion on keyup**: `#` → Header1, `- ` → bullet, ``` → code block
- LaTeX via KaTeX (inline editing → blur renders)
- RTL detection, IME/composition para CJK, twin pair auto-wrapping

### Para Neupaper

CM6 es la elección correcta. Construir un editor custom desde contentEditable es enormemente costoso (Anytype tiene equipo grande). CM6 da syntax highlighting, extensiones, keymaps out-of-the-box.

---

## Block System

Modelo protobuf con **16+ tipos de contenido**:

- Text (Paragraph, Header1-4, Quote, Code, Checkbox, Bullet, Numbered, Toggle, Callout)
- File (Image, Video, Audio, PDF)
- Layout, Div, Bookmark, Icon, Link, Dataview, Relation, FeaturedRelations, Latex, TableOfContents, Table, Widget, Chat

### Block tree

```
Block (root, routes by type)
  → DropTarget (drag-drop wrapper)
    → Specific component (BlockText, BlockImage...)
  → ListChildren (recursive child rendering)
```

- Parent-child via `childrenIds` list
- Layout blocks siempre aceptan children
- Columnas con redistribución de ancho + snap-to-grid
- State flows through MobX stores — Go middleware es source of truth

### Custom drag-and-drop

No usan @dnd-kit para bloques — custom DOM manipulation:
- Upper 30% = Top, Lower 30% = Bottom, Middle 40% = InnerFirst (nesting)
- `requestAnimationFrame` para feedback visual
- Alt+drop duplica en vez de mover
- Validación parent-child previene nesting circular

---

## Object Model: Types + Relations

### Todo es un Object

Pages, notes, tasks, bookmarks, files, types, relations — **todo es un object** en el mismo sistema.

### Types (26 layouts)

Define qué es un object: Page, Profile, Todo, Set, ObjectType, Relation, File, Dashboard, Image, Note, Space, Bookmark, Collection, Audio, Video, Date, Participant, PDF, Chat, Tag...

### Relations (properties tipadas)

Formatos: longtext, shorttext, number, status, tag, date, file, checkbox, url, email, phone, emoji, object. Con `dataSource`, `readOnly`, `multi`, `objectTypes` constraints.

### Graph

Types + Relations forman un **knowledge graph**:
- Objects = nodos
- Relations = edges
- Graph View visualiza conexiones
- Renderizado via D3.js + OffscreenCanvas + Web Workers

---

## Templates

- Ligados a **Types** (no standalone)
- Cada Type puede tener múltiples templates
- Presets de: cover, icon, block structure, relation values
- Creación: via Type Settings, "Use as Template" en object existente, o desde List view
- Default template per Type
- Auto-saved

### Vs Neupaper

Anytype templates son presets estructurales. Neupaper Markdown Isles templates con `${ for }`, `${ if }`, variables y componentes son fundamentalmente más potentes para document generation.

---

## Sets y Collections (database views)

### Sets = live queries

Filtros dinámicos sobre el graph. Objetos que matchean aparecen automáticamente. No "contienen" — son filtros.

### Collections = agrupación manual

Objetos añadidos explícitamente. Pueden mezclar Types.

### View types (7)

Grid (spreadsheet), Gallery (cards), Board (kanban), Calendar, List, Graph (network), Timeline.

---

## Sync: any-sync Protocol

### Merkle-CRDT

- Cada cambio crea un nodo en un **DAG encriptado**
- Nodos llevan: CRDT operation + referencia ACL head + hashes criptográficos de parents
- **Conflict resolution automático** — operaciones CRDT son commutativas e idempotentes
- Dos peers comparan DAG heads (root hashes). Si coinciden → synced. Si no → walk DAG para encontrar divergencia
- **Causal ordering** embebido en la estructura del DAG

### Change structure

```
PreviousIds  -- dependencias (múltiples para merge commits)
Next         -- forward pointers
OrderId      -- ordenamiento lexicográfico determinístico
Identity     -- firma criptográfica
Signature    -- verificación
Data         -- payload encriptado
Timestamp
```

### Merge strategy

- Changes solo se attachan cuando todos los predecessors existen
- Dependencias no resueltas → wait list
- Resolución cascadea
- `AddResult.Mode`: Append, Rebuild, Nothing

### Tree compaction

`reduceTree()` encuentra el latest common snapshot entre todos los heads, lo promueve a root, y poda todo lo anterior. Mantiene uso de memoria bounded.

### 4 tipos de nodo

| Nodo | Función |
|------|---------|
| sync-node | Almacena spaces y objects |
| filenode | Almacena archivos encriptados |
| consensusnode | Valida cambios ACL |
| coordinator | Configuración de red |

### Self-hosting

Docker Compose completo (`any-sync-dockercompose`). Corres tus propios 4 nodos. Zero cost, full privacy.

---

## Encryption

### E2E por defecto (no opcional)

- **ReadKey** (simétrico): Encripta todo el contenido del space
- **MetadataPrivKey/PubKey** (asimétrico): Encripta metadata de usuario
- **AccountKey** (privado): Desencripta read keys
- Key derivation: **BIP39 mnemonic + SLIP-0010 (Ed25519)** — estándares de crypto wallets

### Change signing

Cada cambio firmado con private key del autor. Verificación en recepción.

### Key rotation

Encadenada: cada nuevo read key encripta el anterior. Permite desencriptar historial hacia atrás.

### ACL

`AclState` trackea permisos per-user via map (public key → permissions + history). Validado por consensus nodes.

---

## State Management

### Immutable snapshots

```go
type State struct {
    blocks       map[string]Block
    rootId       string
    parent       *State  // referencia a snapshot anterior
    details      map[string]Value
    localDetails map[string]Value
}
```

Cada operación crea nuevo State con parent pointer. Enables:
- Change detection eficiente (diff parent vs child)
- Undo/redo (walk parent chain)
- Copy-on-write lazy

### Apply pipeline

Validation → Preparation → Execution → Persistence (push to CRDT) → Indexing (search) → Notification (events to sessions)

---

## Export

| Formato | Notas |
|---------|-------|
| Markdown | ZIP, include linked objects/files/archived |
| Protobuf | JSON o binary, full fidelity |
| PDF | **Electron printToPDF** (client-side, no server) |
| HTML | Experimental (behind feature flag) |
| DOT/SVG/Graph JSON | Graph export |

**No PDF server-side.** Neupaper's Puppeteer es más capaz para PDF fidelity.

---

## Mobile: Fully Native

- **iOS:** Swift nativo (SwiftUI), 97.2% Swift
- **Android:** Kotlin nativo (Jetpack Compose), 99.5% Kotlin, Clean Architecture
- **Ambos** usan `anytype-heart` (Go middleware) compilado como native library
- **No React Native, no Flutter** — fully native per platform

---

## Modelo de negocio

| Plan | Precio | Storage | Shared Spaces |
|------|--------|---------|---------------|
| Explorer (free) | $0 | 1 GB | 3 spaces, 3 editors |
| Builder | $99/year | 128 GB | 3 spaces, 10 editors |
| Co-Creator | $299/3 years | 256 GB | 3 spaces, 10 editors |

**Todas las features son gratis.** Pago solo por cloud infrastructure (storage, sync bandwidth) y collaboration scale. Self-hosting es gratuito.

---

## No web app

**No existe web app pública** (solo dev mode). Electron desktop + native mobile. Neupaper siendo web-first es diferenciador significativo.

---

## Comparativa Anytype vs Neupaper

| Aspecto | Anytype | Neupaper |
|---------|---------|----------|
| Paradigma | Objects + Types + Relations | Markdown documents |
| Lenguaje core | Go (middleware) + TS (UI) | TypeScript |
| Editor | Custom contentEditable | CodeMirror 6 |
| Rendering | Block tree + MobX + React | Remark pipeline |
| Storage | BadgerDB + SQLite | localStorage / Supabase |
| Sync | Merkle-CRDT + P2P + E2E | Supabase (planned) |
| Encryption | E2E by default (BIP39+SLIP-0010) | No (aún) |
| PDF | Electron printToPDF | Puppeteer (mejor control) |
| Templates | Structural presets per Type | Markdown Isles (${ }) con lógica |
| Plugin system | No (API en desarrollo) | Componentes .isle |
| Web app | No | Sí (core) |
| Open source | Sí (custom license) | Sí |
| Mobile | Native Swift + Kotlin | Web responsive |
| Pricing | Free all features, pay for cloud | Freemium + Pro |

---

## Patrones a adoptar

1. **Middleware compartido como core.** Anytype tiene UN Go binary que todas las plataformas consumen. Para Neupaper: extraer el parser como `@neupaper/parser` package npm consumible por web, CLI, y potencialmente mobile.

2. **Protobuf data contracts.** Definir schemas formales para `.neu`, `.isle`, `.data` en un package compartido. Portabilidad, tooling, validación tipada.

3. **Immutable state snapshots.** State con parent pointer para undo/redo eficiente y change detection. Aplicable al vault state management.

4. **Self-hosting como feature de confianza.** Docker Compose para el sync layer. Trust signal poderoso para developers.

5. **Tantivy para full-text search.** Si Neupaper necesita search across vault, Tantivy (Rust, WASM-compilable) es el engine probado. Alternativa: MiniSearch (JS puro, más simple).

6. **Gallery/marketplace pattern.** `anyproto/gallery` para templates pre-made. Mismo concepto que nuestro `/install` + `/restore`.

7. **MCP server para AI.** `anytype-mcp` (353 stars) — pattern forward-looking para integración con LLMs.

## Patrones a NO adoptar

1. **Editor custom desde contentEditable.** Enormemente costoso. CM6 es la elección correcta.

2. **Go middleware + gRPC.** Overkill para web-first. Next.js API routes es más simple y directo.

3. **Merkle-CRDT sync.** Sofisticado pero complejidad extrema. Supabase es la elección correcta para nuestro caso.

4. **BIP39/SLIP-0010 encryption.** Crypto-wallet-grade security. Overkill para un editor de documentos.

5. **Block tree model.** Neupaper es document-first (Markdown continuo), no block-first. El block model añade complejidad sin beneficio para nuestro caso.

6. **Native mobile per-platform.** Swift + Kotlin + Go middleware compartido es team-intensive. Web responsive o Capacitor es más viable para solo dev / small team.

7. **MobX.** Funciona pero React context + useState/useCallback es suficiente para nuestro scope.

---

## Lo más impresionante

La arquitectura de Anytype es la más sofisticada de todos los productos estudiados:

- **Merkle-CRDT** para sync descentralizado con E2E encryption
- **Go middleware** compartido por 3 plataformas nativas
- **200+ gRPC methods** como interfaz formal
- **Tantivy** (Rust) para full-text search via FFI
- **Self-hostable** con 4 tipos de nodos
- **Immutable state snapshots** con parent chain

Pero también la más compleja — requiere equipo grande y años de desarrollo. Neupaper debe tomar inspiración selectiva, no replicar la complejidad.

---

## Fuentes

- https://github.com/anyproto (85 repos)
- https://github.com/anyproto/anytype-heart
- https://github.com/anyproto/any-sync
- https://github.com/anyproto/anytype-ts
- https://github.com/anyproto/any-block
- https://github.com/anyproto/any-store
- https://tech.anytype.io/any-sync/overview
- https://doc.anytype.io/
- https://anytype.io/pricing/
- Merkle-CRDTs paper: https://research.protocol.ai/publications/merkle-crdts-merkle-dags-meet-crdts/

---

*Estudio realizado el 2026-03-25 como referencia arquitectónica para Neupaper.*


Lo más relevante:
  - Arquitectura más sofisticada de todos los estudiados — Merkle-CRDT + E2E + Go middleware + P2P
  - Go middleware compartido por 3 plataformas — pattern de "core library" que deberíamos aplicar al parser
  - Protobuf data contracts — formal schemas para portabilidad y tooling
  - No tienen web app — Neupaper web-first es diferenciador
  - Templates son structural presets, no lógicos — Markdown Isles es más potente para document generation
  - Self-hosting como trust signal — Docker Compose para sync layer
  - Editor custom desde contentEditable — confirma que CM6 es la elección correcta (evitar esa complejidad)

  Patrones que deberíamos adoptar:
  1. Parser como package npm standalone (@neupaper/parser)
  2. Formal data contracts para .neu/.isle/.data
  3. Immutable state snapshots para undo/redo
  4. Self-hosting como feature
  5. MCP server para AI integration
