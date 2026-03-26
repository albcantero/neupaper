# GoodNotes Case Study

Estudio de GoodNotes desde https://github.com/goodnotes (102 repos). App de notas con stylus, iPad App of the Year 2022. Caso de estudio por su approach a PDF y cross-platform via WASM.

**Nota:** GoodNotes es closed-source. Lo público son forks de dependencias, tools internos, y datasets de research. No hay API pública ni SDK.

---

## Qué es GoodNotes

App de handwriting/stylus para iPad/Apple. Core cerrado, 100K+ líneas de Swift. Cross-platform via SwiftWasm (Swift compilado a WebAssembly). Fundamentalmente diferente a Neupaper — no es Markdown, es dibujo vectorial sobre PDF.

---

## Stack técnico (inferido de repos)

| Layer | Tecnología |
|-------|-----------|
| Core | Swift (100K+ LOC) |
| Cross-platform | **SwiftWasm** (Swift → WebAssembly) |
| Web shell | TypeScript + React + Webpack (PWA) |
| Swift-JS interop | JavaScriptKit |
| Rendering | **CanvasKit (Skia WebGL)** + BezierKit |
| PDF rendering | **PDFium** (C++ → WASM) — más rápido que PDF.js |
| PDF nativo | Apple PDFKit (iOS/macOS) |
| Spatial indexing | KDTree (hit-testing strokes) |
| Storage local | RocksDB + SQLite |
| CRDT/sync | **Automerge** (financian el proyecto) |
| ML | ONNX Runtime, WhisperKit, sentence-transformers |
| RTF parsing | tree-sitter-rtf (custom grammar) |
| Cloud | OneDrive, Dropbox, Google APIs |
| Infra | AWS (Terraform), Datadog, Ory Kratos |

---

## Lo más relevante

### 1. PDFium > PDF.js

GoodNotes eligió PDFium (Google's C++ PDF engine) compilado a WASM sobre PDF.js (Mozilla's JS engine) por rendimiento. C++ compilado a WASM es "hundreds of times faster" que JS puro para rendering PDF.

**Para Neupaper:** Neupaper no renderiza PDFs existentes — los genera con Puppeteer. Diferente problema. Pero si algún día necesitamos un PDF viewer en el vault (para previews), PDFium WASM es el approach probado.

### 2. Automerge CRDT (financiado por GoodNotes)

- Fork de `automerge` (Rust + JS/WASM) y `automerge-swift`
- **Financian el desarrollo de Automerge** como sponsor
- Real-time collaboration con live cursors
- Local-first: offline funciona, conflict resolution automático
- Automerge 2.0: Rust core, hundreds of times faster

**Para Neupaper:** Si algún día añadimos real-time collaboration, Automerge es la librería que una empresa seria (GoodNotes) eligió y financia. Alternativa a Yjs.

### 3. Swift → WebAssembly como estrategia cross-platform

- 100K+ líneas de Swift reutilizadas en todas las plataformas
- `swift-icudata-slim` reduce ICU de 29.3MB a 1.5MB para WASM
- Chrome DevTools custom con DWARF debugging para Swift en WASM
- PWA para Android, Windows, ChromeOS

**Para Neupaper:** No aplica directamente (somos TypeScript/web-first). Pero prueba que WASM cross-platform funciona en producción. Si extractamos el parser como WASM module, tendría rendimiento near-native.

### 4. Canvas rendering (no DOM)

- CanvasKit (Skia + WebGL2) para strokes
- BezierKit para curvas vectoriales
- KDTree para spatial indexing
- Diferente paradigma: canvas para freeform drawing, DOM para structured documents

**Para Neupaper:** No aplica. Nuestro rendering es DOM-based con CSS para layout A4. Canvas es para dibujo vectorial libre.

### 5. tree-sitter para RTF parsing

`tree-sitter-rtf` — grammar custom para Rich Text Format con incremental parsing. Incluso una empresa grande construye parsers custom para formatos de documento.

**Para Neupaper:** Valida nuestro approach de parser custom para Markdown Isles. tree-sitter podría ser interesante a futuro si necesitamos incremental parsing en CM6 para syntax `.neu`.

### 6. Handwriting dataset (GNHK)

Dataset de investigación para handwriting recognition publicado en ICDAR 2021. GoodNotes invierte en ML/AI para reconocimiento de escritura.

**Para Neupaper:** No aplica directamente, pero muestra que las companies de documentos invierten en AI. OCR para PDFs importados podría ser un future feature.

---

## Comparativa GoodNotes vs Neupaper

| Aspecto | GoodNotes | Neupaper |
|---------|-----------|----------|
| Input | Stylus/handwriting | Keyboard/Markdown |
| Core language | Swift | TypeScript |
| Cross-platform | SwiftWasm | Next.js web |
| Rendering | Canvas (Skia WebGL) | DOM (CSS layout) |
| PDF | PDFium (render existing) | Puppeteer (generate new) |
| CRDT | Automerge | No (aún) |
| Storage | RocksDB + SQLite | localStorage / Supabase |
| Open source | No | Sí |
| Editor | Custom canvas | CodeMirror 6 |
| Target | Students, professionals (handwriting) | Developers (typed documents) |

---

## Patrones a adoptar

1. **Automerge como referencia CRDT.** Si real-time collab, Automerge es la opción respaldada por una empresa seria.

2. **PDFium WASM para PDF viewing.** Si necesitamos un viewer de PDF en el vault (no generación, sino visualización).

3. **tree-sitter para incremental parsing.** Si Markdown Isles necesita parsing incremental en documentos grandes, tree-sitter es el approach probado.

## Patrones a NO adoptar

1. **Swift/WASM cross-platform.** Somos TypeScript web-first. No necesitamos compilar a WASM.

2. **Canvas rendering.** DOM-based layout es correcto para documentos estructurados.

3. **Handwriting/stylus focus.** Completamente diferente target user.

4. **RocksDB.** Overkill para web app. localStorage/Supabase es suficiente.

---

## Fuentes

- https://github.com/goodnotes (102 repos)
- https://web.dev/case-studies/goodnotes
- https://www.goodnotes.com/blog/behind-the-scenes-cross-platform
- https://medium.com/engineering-at-goodnotes/
- https://automerge.org/

---

*Estudio realizado el 2026-03-25 como referencia arquitectónica para Neupaper.*


Lo más relevante:
  - PDFium (C++ WASM) > PDF.js para rendering PDF — referencia si necesitamos PDF viewer
  - Financian Automerge — validación de CRDT como approach serio para collaboration
  - Swift → WASM cross-platform funciona en producción (100K+ LOC)
  - tree-sitter para document format parsing — valida parsers custom
  - Fundamentalmente diferente a Neupaper (handwriting vs typed documents)

  Patrones que deberíamos adoptar:
  1. Automerge como referencia si real-time collaboration
  2. PDFium WASM si necesitamos PDF viewer
  3. tree-sitter si necesitamos incremental parsing
