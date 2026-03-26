# Roam Research Case Study

Estudio de Roam Research desde https://github.com/Roam-Research (16 repos). El pionero de "networked thought" y bidirectional linking. Caso de estudio histórico — Roam introdujo patrones que hoy son estándar en toda la industria.

**Nota:** Roam es closed-source. Solo extension registry, SDKs, y forks de dependencias son públicos.

---

## Qué es Roam Research

La app que popularizó bidirectional linking, block references, daily notes, y el paradigma outliner-as-database. ClojureScript + DataScript. $15/mo sin free tier. Peak viral en 2020, hoy estable con base dedicada pero más pequeña.

---

## Stack técnico (inferido)

| Layer | Tecnología |
|-------|-----------|
| Core | **ClojureScript** |
| DB in-browser | **DataScript** (fork propio — in-memory Datalog) |
| UI | Reagent (ClojureScript React wrapper) |
| Desktop | Electron |
| Mobile | **ClojureDart + Flutter** |
| Serialización | Transit (CLJ ↔ JSON/Dart) |
| Storage local | **IndexedDB** (via surreal — custom serializer) |
| API | Backend SDKs en Clojure, Dart, Java, Python, TypeScript |
| Extensions | roam-depot (registry GitHub-based) |
| AI integration | MCP server (roam-tools, marzo 2026) |

---

## Data Model: EAV Triple Store

Todo es un **datom**: `[entity-id, attribute, value, transaction-id]`

Atributos clave:
- `:block/uid` — identificador único
- `:block/string` — contenido texto
- `:block/page` — referencia a página padre
- `:block/parents` — padres
- `:block/children` — hijos ordenados
- `:block/refs` — páginas/bloques referenciados
- `:node/title` — título de página

### Queries con Datalog

```clojure
[:find ?title
 :where [?e :node/title ?title]
        [?e :block/children ?c]
        [?c :block/string ?s]
        [(clojure.string/includes? ?s "TODO")]]
```

El EAV triple store es lo que hace posible bidirectional linking, block references, y graph queries. Cada relación es un fact queryable de primera clase.

---

## Patrones que Roam pioneeró (hoy son estándar)

| # | Patrón | Quién lo adoptó |
|---|--------|-----------------|
| 1 | **Bidirectional linking** `[[Page]]` | Obsidian, Logseq, Notion, Craft, Reflect |
| 2 | **Block references** `((uid))` | Logseq, parcialmente Obsidian |
| 3 | **Block embeds/transclusion** | Logseq, Notion |
| 4 | **Daily Notes como entry point** | Obsidian (plugin→core), Logseq (default) |
| 5 | **Outliner-as-database** | Logseq (DataScript idéntico) |
| 6 | **In-app Datalog queries** | Logseq (misma sintaxis) |
| 7 | **Sidebar/right panel** | Obsidian, Logseq |
| 8 | **Graph visualization** | Obsidian (core), Logseq |
| 9 | **Slash commands** `/` | Notion, Obsidian, todos los editores modernos |
| 10 | **Custom render components** `roam/render` | Influyó plugins de Obsidian y Logseq |

---

## Extension System (roam-depot)

Registry GitHub-based, modelo dos-repos (como Homebrew cask):

**Estructura de extensión:**
- `extension.js` — exports `{ onload(), onunload() }`
- `extension.css` — styling opcional
- `README.md` — documentación

**Registry:** JSON metadata en `roam-depot`, código en repo del developer. Build via GitHub Actions. Soporte para extensiones de pago via Stripe.

### Para Neupaper

Similar conceptualmente a nuestro `/install` + `/restore`. JSON registry con código en repos separados. El modelo two-repo es limpio para un marketplace.

---

## surreal Library (performance)

Serialización ClojureScript ↔ JSON para IndexedDB sin JSON.stringify. README: "Surreal is solely about speed" — code readability sacrificado por performance.

Revela que Roam persiste DataScript a IndexedDB client-side con serialización custom.

### Para Neupaper

Si localStorage se vuelve bottleneck con vaults grandes, IndexedDB con serialización optimizada es el approach. O OPFS (como Logseq).

---

## API SDK

`@roam-research/roam-api-sdk` en npm:
- `initializeGraph` — conectar a graph
- `q` — ejecutar Datalog queries
- `pull` — pull entity details
- `createBlock`, `updateBlock`, `deleteBlock`, `moveBlock`
- `createPage`, `updatePage`, `deletePage`
- Auth via API tokens

### MCP Server (marzo 2026)

`roam-tools` — MCP server para AI assistants (Claude, Cursor). Full-text search, CRUD, backlinks, file upload/download con decryption, navegación.

---

## Collaboration: Immutable Blocks

Approach pragmático que evita CRDT/OT completamente:

- Users solo pueden editar **sus propios bloques**
- Otros pueden añadir child blocks debajo del tuyo
- Pero NO pueden modificar tu texto
- La DB (cada bloque tiene owner) lo hace natural
- Sin conflict resolution necesario

### Para Neupaper

Si collaboration futura, el modelo "immutable blocks" es la simplificación más elegante. Evita toda la complejidad de CRDT. Un usuario edita su documento, otros pueden comentar/anotar pero no modificar.

---

## JSON Export Format

```json
{
  "title": "Page Name",
  "children": [
    {
      "string": "Block text with [[links]] and ((block-refs))",
      "uid": "abc123",
      "children": [...],
      "create-time": 1587844367467,
      "edit-time": 1587844367467
    }
  ]
}
```

Jerárquico via `children`, UIDs para block references, `[[Page]]` para links inline.

---

## Modelo de negocio

| Plan | Precio |
|------|--------|
| Pro | $15/month o $180/year |
| Believer | **$500 por 5 años** ($8.33/mo) — early access, priority support |

- **Sin free tier** (a diferencia de Obsidian, Logseq)
- ~1M monthly active visitors en 2026
- Base core de Believers con graphs multi-año demasiado complejos para migrar

---

## Mobile

- **ClojureDart + Flutter** — uno de los mayores users reales de ClojureDart
- Transit serialization para interop CLJ ↔ Dart
- roamOS: integración nativa iOS/macOS (Spotlight, Shortcuts) para Believers

---

## Contexto histórico

- Fundado por Conor White-Sullivan
- Influencias: Vannevar Bush (Memex), Ted Nelson (hypertext), Luhmann (Zettelkasten)
- Viral en 2020, "#roamcult"
- **Decline:** Pese a pionear la categoría, Obsidian (free, plugins) y Logseq (open source, mismo Datalog) capturaron el mercado haciendo las innovaciones de Roam accesibles a menor coste

### Lección para Neupaper

**Pionear patrones no garantiza dominio del mercado.** Obsidian y Logseq ganaron con: gratis, open source, extensible. Neupaper debe ser open source + freemium generoso + extensible para evitar que un competidor clone Markdown Isles con mejor distribución.

---

## Comparativa Roam vs Neupaper

| Aspecto | Roam Research | Neupaper |
|---------|---------------|----------|
| Paradigma | Networked thought / outliner | Document authoring |
| Core | ClojureScript + DataScript | TypeScript + Remark |
| Editor | Custom outliner | CodeMirror 6 |
| Data model | EAV triple store (Datalog) | Markdown files |
| Bidirectional links | Core feature `[[]]` | No (documentos independientes) |
| PDF | No | Core feature (Puppeteer) |
| Templates | No (structural) | Markdown Isles (${ }) con lógica |
| Free tier | No | Sí (generous) |
| Open source | No | Sí |
| Pricing | $15/mo | ~8-12€/mo |
| Mobile | ClojureDart + Flutter | Web responsive |

---

## Patrones a adoptar

1. **Registry two-repo model.** Metadata en repo central, código en repo del developer. Pattern limpio para marketplace de `.isle` components.

2. **Immutable collaboration.** Si añadimos collab, el modelo "solo editas lo tuyo, otros comentan" evita CRDT completamente.

3. **MCP server para AI.** Tercera app que lo implementa (Inkdrop, Anytype, Roam). El patrón es claro — necesitamos MCP server.

4. **Believer pricing.** $500/5 años lock-in de power users. Para Neupaper: plan lifetime o multi-year con descuento agresivo.

## Patrones a NO adoptar

1. **Sin free tier.** Roam perdió mercado ante Obsidian (free) y Logseq (open source). Free tier generoso es esencial.

2. **ClojureScript.** Barrera de contribución altísima. TypeScript es correcto.

3. **DataScript/Datalog.** Overkill para documentos. No necesitamos triple store.

4. **Outliner paradigm.** No aplica a documents con layout A4.

5. **$15/mo pricing.** Demasiado alto para el mercado actual donde Obsidian es free.

---

## Fuentes

- https://github.com/Roam-Research (16 repos)
- https://github.com/Roam-Research/roam-depot
- https://github.com/Roam-Research/roam-tools
- https://github.com/Roam-Research/backend-sdks
- https://roamresearch.com/

---

*Estudio realizado el 2026-03-25 como referencia arquitectónica para Neupaper.*


Lo más relevante:
  - Roam pioneeró 10 patrones que hoy son estándar (bidirectional links, slash commands, daily notes, graph view...)
  - Pese a pionear la categoría, perdió mercado ante Obsidian (free) y Logseq (open source)
  - Lección: open source + free tier generoso es esencial para defensibilidad
  - Immutable blocks collaboration evita CRDT completamente — simplificación elegante
  - MCP server (marzo 2026) — tercera app que lo implementa, pattern claro
  - Registry two-repo model para marketplace — limpio y escalable
  - $500/5yr Believer plan — lock-in de power users

  Patrones que deberíamos adoptar:
  1. Registry two-repo model para .isle marketplace
  2. Immutable collaboration (si collab)
  3. MCP server para AI
  4. Multi-year/lifetime pricing option
