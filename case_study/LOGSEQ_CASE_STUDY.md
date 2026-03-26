# Logseq Case Study

Estudio de la arquitectura de Logseq, extraído del análisis de https://github.com/logseq (33K+ stars, 63 repos). Plataforma de knowledge management open source basada en outliner.

**Nota:** Logseq ES open source (AGPL-3.0). Escrito en ClojureScript — stack muy diferente al nuestro.

---

## Qué es Logseq

PKM (Personal Knowledge Management) basado en el paradigma **outliner** — todo es un bloque en un árbol. Bidirectional linking, queries Datalog, journals, whiteboard. NO es un editor de documentos — es un sistema de conocimiento interconectado.

---

## Stack técnico

| Layer | Tecnología |
|-------|-----------|
| Lenguaje principal | ClojureScript (~71%) |
| UI framework | Rum (ClojureScript React wrapper, fork propio) |
| Build | shadow-cljs + Webpack + Gulp + PostCSS |
| CSS | Tailwind 3.3.5 + PostCSS |
| Desktop | Electron |
| Mobile | Capacitor (iOS Swift, Android Kotlin) |
| DB in-memory | DataScript (Datalog query engine) |
| DB persistent | SQLite (WASM + OPFS en browser) |
| Parser | mldoc (OCaml, Angstrom parser combinator, compiled a JS) |
| Editor | **textarea** plain (NO CodeMirror para edición principal) |
| Code blocks | CodeMirror 5 (solo para syntax highlighting) |
| Canvas | tldraw |
| PDF viewer | pdfjs-dist 4.2.67 |
| Git | isomorphic-git |
| Testing | Playwright |

---

## Arquitectura fundamental: Outliner vs Document

**Logseq (Outliner):**
- Unidad: bloque (bullet point) con UUID propio
- Cada bloque es independientemente addressable y linkable
- Bloques referenciables, embedables, queryables
- Editando un bloque a la vez (textarea individual)
- Ideal para: notas, tasks, journals, knowledge graphs

**Neupaper (Document):**
- Unidad: documento continuo Markdown
- Output fidelity importa — PDF debe coincidir con preview
- Editando documento completo en CM6
- Ideal para: propuestas, facturas, informes, documentos profesionales

Son productos **complementarios**, no competidores. Un usuario de Logseq que necesite un PDF pulido de sus notas se beneficiaría de algo como Neupaper.

---

## Editor

**Logseq NO usa CodeMirror ni ProseMirror para editar.** Usa **`<textarea>` elements** — uno por bloque. CM5 solo se usa para syntax highlighting dentro de code blocks.

### Flujo de edición

1. Usuario ve contenido renderizado (bloques colapsables)
2. Click en un bloque → aparece textarea con Markdown raw
3. Edita en textarea con event handling custom
4. Click fuera → bloque se renderiza de nuevo

### Vs Neupaper

Approach opuesto. Neupaper usa CM6 full-featured para el documento entero. Logseq prueba que textareas planos son suficientes para su caso (bullets cortos), pero para long-form documents CM6 es necesario.

---

## Parser: mldoc

- **OCaml** con Angstrom (parser combinator)
- Compilado a JS via js_of_ocaml
- Parsea Markdown Y Org-mode en AST unificado
- AST → DataScript entities (ClojureScript)
- npm: `mldoc@^1.5.9`

### Vs Neupaper

Similar two-phase approach: parser custom → rendering. Diferencia: Logseq construyó parser from scratch en OCaml. Neupaper construye pre-procesador sobre Remark — más pragmático.

---

## Database (dual-layer)

### Evolución: files → SQLite

**Original (file-based, "Logseq OG"):**
- Markdown/Org files en disco
- Al startup: mldoc parsea → DataScript entities
- Filesystem = source of truth, DataScript se reconstruye

**Nuevo (DB version, v0.11+, alpha):**
- SQLite reemplaza filesystem como source of truth
- DataScript sigue como query engine in-memory
- Beneficios: structured properties, better queries, no parsing overhead, better mobile

### DataScript (in-memory Datalog)

Todo se almacena como **datoms** (Entity, Attribute, Value, Transaction):

```
[:block/uuid "abc-123"]
[:block/content "Hello world"]
[:block/parent 42]       ;; reference to parent block entity
[:block/page 7]          ;; reference to page entity
[:block/refs [8 9 10]]   ;; references to other entities
```

Queries via **Datalog**:
```clojure
[:find (pull ?b [*])
 :where
 [?b :block/marker ?m]
 [(contains? #{"TODO" "DOING"} ?m)]]
```

### Web Worker isolation

Todas las operaciones de DB corren en un **Web Worker dedicado**:
- SQLite persistence via WASM
- Search indexing
- Validation
- RTC sync loop
- Comunicación con UI thread via **Comlink RPC**

### Multi-tab coordination

- Master/slave election via Web Locks API
- Solo un tab accede directamente a la DB
- Slaves proxy operaciones a través del master
- Re-election automática cuando master tab se cierra

### Para Neupaper

- **Web Worker para parser:** Si el parser de Markdown Isles se vuelve lento en documentos grandes, moverlo a un Worker es el patrón probado
- **Multi-tab:** Si necesitamos multi-tab, Web Locks API es el approach
- **No over-engineer storage:** La transición file→DB de Logseq lleva años y aún no está completa. Empezar simple con localStorage, migrar a Supabase después

---

## Plugin System

### Sandboxing via iframe

- Plugins corren en **iframes sandboxed** o shadow DOM
- Comunicación via **message-passing** (postMessage bridge)
- `LSPlugin.caller.ts` implementa el protocolo
- Plugins NO pueden acceder estado interno ni DOM de Logseq

### SDK: @logseq/libs

TypeScript types para el API:

```typescript
logseq.App      // app-level: registerCommand, getInfo
logseq.Editor   // blocks/pages: insertBlock, createPage, registerSlashCommand
logseq.DB       // queries: datascriptQuery, onChanged
logseq.UI       // notifications, panels
```

### Marketplace

- Repo `logseq/marketplace` en GitHub
- Submission via PR: directorio en `./packages/` con `manifest.json`
- Registry como JSON: `plugins.json`, `stats.json`, `popular.json`
- GitHub Action `publish.yml` genera zip artifact en release

### Para Neupaper

**iframe sandboxing validado a escala.** Exactamente el approach que planeamos para `${ script }`:
```html
<iframe sandbox="allow-scripts" src="/preview" />
```
Logseq prueba que funciona en producción. El marketplace model (JSON registry + GitHub releases) es referencia si abrimos un marketplace de `.isle` components.

---

## Sync

- **Logseq Sync:** 5 EUR/month, E2E encrypted via **age** (encryption moderna)
- **File-based sync:** Syncing Markdown/Org files (Syncthing, iCloud, Git)
- **DB version RTC (Real-Time Collaboration):** Syncs DataScript transactions (datom-level), no files. Corre en el mismo Web Worker que SQLite. En testing.

---

## PDF

**Logseq NO tiene PDF export built-in.** Gap significativo:
- PDF **viewing y annotation** sí (PDF.js) — highlights stored como bloques
- PDF **export** es plugin de comunidad (`logseq-pdf-export`) con resultados mediocres
- Highlights solo visibles en Logseq, no en PDF readers externos

### Para Neupaper

**PDF es nuestro moat.** Logseq's weak PDF story confirma que el document output es un gap real en el mercado PKM. Neupaper's Puppeteer approach llena ese gap.

---

## Whiteboard

- Built on **tldraw** (open-source canvas library)
- Bloques del outliner se pueden colocar en el canvas
- Conectores, shapes, frames, freehand drawing
- Bloques en canvas mantienen conexiones al knowledge graph
- Stored como EDN files

---

## Templates y Queries

### Templates

- Bloques marcados con property `template::`
- Insertados via `/template` slash command
- Variables dinámicas: `<% today %>`, `<% current page %>`
- NO es un template language — es reutilización de bloques

### Queries (dos niveles)

**Simple:** `{{query [[tag]]}}` — filtrado básico

**Advanced:** Datalog completo contra DataScript:
```clojure
#+BEGIN_QUERY
{:title "My Tasks"
 :query [:find (pull ?b [*])
         :where
         [?b :block/marker ?m]
         [(contains? #{"TODO" "DOING"} ?m)]]}
#+END_QUERY
```

### Vs Neupaper

Logseq queries son para knowledge retrieval (buscar en el grafo). Neupaper Markdown Isles son para document generation (loops, conditionals, data binding). Propósitos completamente diferentes.

---

## Modelo de negocio

- **Core app:** Free y open source (AGPL-3.0)
- **Logseq Sync:** 5 EUR/month — E2E encrypted cloud sync
- **Sponsor tier:** 15 EUR/month — early access experimental features
- **Open Collective** para donaciones community

---

## Comparativa Logseq vs Neupaper

| Aspecto | Logseq | Neupaper |
|---------|--------|----------|
| Paradigma | Outliner/PKM | Document authoring |
| Lenguaje | ClojureScript | TypeScript |
| Editor | textarea plain + CM5 (code blocks) | CodeMirror 6 |
| Parser | mldoc (OCaml) | Custom tokenizer + remark |
| DB | DataScript + SQLite | localStorage / Supabase |
| Plugin sandbox | iframe + postMessage | iframe sandbox (planned) |
| PDF export | No (community plugin) | Puppeteer (core feature) |
| Templates | Block reuse + Datalog queries | Markdown Isles (${ }) |
| Canvas | tldraw whiteboard | Dot-pattern A4 preview |
| Sync | E2E encrypted, 5 EUR/mo | Supabase (planned) |
| Open source | Sí (AGPL-3.0) | Sí |

---

## Patrones a adoptar

1. **Web Worker para computación pesada.** Parser, DB ops, search indexing — todo en worker thread. UI thread libre. Aplicar si nuestro parser se vuelve lento en documentos grandes.

2. **iframe sandboxing para user code.** Logseq valida a escala el approach de sandbox="allow-scripts" que planeamos para `${ script }`.

3. **Multi-tab coordination via Web Locks API.** Si necesitamos soporte multi-tab, este es el patrón probado.

4. **Marketplace como JSON registry.** `plugins.json` + GitHub releases + `manifest.json` como submission via PR. Referencia para un futuro marketplace de `.isle` components.

5. **OPFS para storage en browser.** Origin Private File System es el approach moderno para storage persistente en web. Alternativa a localStorage para datos grandes.

## Patrones a NO adoptar

1. **ClojureScript.** Stack exótico, barrera de contribución alta. TypeScript es la elección correcta.

2. **Outliner paradigm.** Bloques individuales no son apropiados para documentos continuos con layout A4.

3. **DataScript/Datalog.** Overkill para documentos. Neupaper no necesita un graph database.

4. **textarea plain como editor.** Funciona para bullets cortos pero no para long-form documents. CM6 es necesario.

5. **mldoc (OCaml parser).** Construir un parser en otro lenguaje añade complejidad de build. Nuestro parser TypeScript es correcto.

6. **File-to-DB migration.** Logseq lleva años en esa transición. Empezar con storage abstraction limpia desde el principio.

---

## Fuentes

- https://github.com/logseq/logseq
- https://github.com/logseq/marketplace
- https://github.com/logseq/mldoc
- https://plugins-doc.logseq.com/
- https://discuss.logseq.com/t/why-the-database-version-and-how-its-going/26744
- https://blog.logseq.com/

---

*Estudio realizado el 2026-03-25 como referencia arquitectónica para Neupaper.*


Lo más interesante:
  - Paradigma outliner es fundamentalmente diferente a document authoring — son complementarios, no competidores
  - NO usa CodeMirror para editar — textareas plain. Prueba que el editor no define el producto
  - iframe sandboxing para plugins validado a escala — confirma nuestro plan para ${ script }
  - Web Workers para DB ops y computación pesada — patrón a seguir si parser se vuelve lento
  - PDF export es su gap más grande — confirma que es nuestro moat
  - Transición file→DB lleva años — no over-engineer storage early

  Patrones que deberíamos adoptar:
  1. Web Worker para parser si documentos grandes
  2. iframe sandboxing para ${ script } (validado por Logseq)
  3. Web Locks API para multi-tab
  4. OPFS como alternativa a localStorage para datos grandes
 
Comentario: "1. Web Workers para parser — Logseq mueve TODA la computación pesada (DB,
   parsing, search) a un Worker dedicado. Si nuestros documentos .neu      
  crecen (10+ páginas con muchos ${ for } y ${ data }), el parser podría   
  bloquear el UI thread. Mover parse() a un Worker con postMessage es      
  trivial y el impacto en UX es enorme.
  2. OPFS (Origin Private File System) — Alternativa moderna a
  localStorage. localStorage tiene límite de ~5-10MB. OPFS no tiene ese    
  límite y es más rápido para datos grandes (imágenes, PDFs generados,     
  vaults grandes). Relevante para cuando un usuario tenga 50+ archivos .neu
   con datos.
  3. Multi-tab via Web Locks API — Ahora mismo si abres Neupaper en dos    
  tabs, ambos escriben localStorage a la vez → conflictos. El master/slave 
  election de Logseq es elegante: un tab es master (escribe), los demás son
   slaves (leen). Implementable en ~50 líneas.
  4. Slash commands — Logseq popularizó el / en línea vacía para insertar  
  cosas. Para Neupaper sería natural: /pagebreak, /for, /if, /import,      
  /data. AutoComplete de CM6 ya soporta esto.
  5. tldraw como canvas — Si algún día Neupaper quisiera un modo visual    
  para diseñar layouts de documentos (arrastrar secciones, reordenar       
  visualmente), tldraw es la librería probada."