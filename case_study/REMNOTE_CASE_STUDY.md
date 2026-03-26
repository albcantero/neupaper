# RemNote Case Study

Estudio de RemNote desde https://github.com/remnoteio (17 repos). App de knowledge management con spaced repetition/flashcards integrado.

**Nota:** RemNote es closed-source. Solo plugin SDK, templates de themes, y forks de utilidades son públicos.

---

## Qué es RemNote

Note-taking + spaced repetition en un solo producto. Todo es un "Rem" (su unidad atómica). Block editor con flashcards integradas. Web app + desktop + mobile (Capacitor). Freemium ($8/mo Pro, $395 lifetime).

---

## Stack técnico (inferido)

| Layer | Tecnología |
|-------|-----------|
| Frontend | React + TypeScript |
| Editor | **Custom block editor** (NO CodeMirror, NO ProseMirror) |
| Styling | Tailwind CSS |
| Desktop | Electron (probable) |
| Mobile | **Capacitor** (iOS/Android) con OTA updates |
| Storage local | **IndexedDB** |
| Sync | Servidores propios, offline-first |
| Auth | Passport.js, Apple Sign-In |
| Plugins | iframe sandbox + message passing |
| Plugin SDK | `@remnote/plugin-sdk` (React + Webpack + Tailwind) |
| Spaced repetition | **FSRS v6** (fork de ts-fsrs) |
| Support | Intercom |

---

## Data Model: todo es un "Rem"

El concepto core — similar a blocks de Notion pero más interconectado:

- Cada Rem tiene UUID único (usado en URL routing: `/document/REM_ID`)
- Jerarquía parent-child
- Referencias/links cross-knowledge base
- **Power-Up types:** Document, Header, File, Highlight, Todo, Aliases
- **Rich text como typed arrays** (`RichTextInterface`), NO Markdown strings
- Split-view: `/document/LEFT_ID/RIGHT_ID`
- Flashcard queue: `/queue/REM_ID`

### Vs Neupaper

RemNote almacena rich text estructurado internamente. Markdown es input convenience + export lossy. Neupaper almacena Markdown como source of truth — más simple y portable.

---

## Editor

**Custom block editor** — no usa ningún framework de editor:

- Block-based (cada línea es un Rem separado)
- React-first
- Rich text, no Markdown (shortcuts de Markdown convierten a structured data)
- Slash commands (`/`) para insertar bloques y componentes
- Outliner-style (nested, como Roam/Workflowy)
- LaTeX, tablas con properties (database-like)

### Vs Neupaper

Productos fundamentalmente diferentes. RemNote es outliner con flashcards. Neupaper es document authoring con PDF. Sin overlap real en el editor.

---

## Plugin System

Arquitectura iframe sandbox + message passing (como todos los demás):

### SDK (`@remnote/plugin-sdk`)

```typescript
// Rem API — query/create/modify/delete
const rem = await plugin.rem.findOne(remId);
await rem.setText(['Hello ', { bold: true, text: 'world' }]);

// Storage
await plugin.storage.setLocal('key', value);

// Commands
await plugin.app.registerCommand({
  id: 'my-command',
  name: 'My Command',
  action: async () => { ... }
});

// Widget system
plugin.app.registerWidget('my-widget', WidgetLocation.RightSidebar, {
  dimensions: { width: 300 }
});
```

### Plugins oficiales (16)

autocomplete, autofill-tables, dictionary, hide-in-queue, history, images, mermaid, new-tabs, puppy-reinforcement, smart-blocks, tabs, text-to-speech, universal-descriptors, wiki-popup, window-manager

### Templates

- Plugin template React: `remnote-plugin-template-react`
- CSS theme template: `remnote-theme-template`
- CSS snippet template: `remnote-snippet-template`

---

## PDF Annotation

Built-in PDF reader con:

- **Highlight text** → selecciones se convierten en Rem linkados a la página PDF
- **Freehand drawing** en desktop/tablet
- **Highlights tab** con lista de highlights + notas
- **AI features:** click en cualquier frase → flashcard, AI summaries, Q&A con citas inline
- **OCR** para PDFs escaneados (sin text layer)
- Soporta PDF, EPUB, web pages (via browser extension)

### Vs Neupaper

RemNote consume/anota PDFs existentes. Neupaper genera PDFs nuevos. Complementarios, no competidores.

---

## Spaced Repetition

Dos algoritmos:

### FSRS v6 (default actual)

- Free Spaced Repetition Scheduler por Jarrett Ye
- 20-30% menos reviews que SM-2 para misma retención
- Self-tuning — aprende del historial individual
- Fork TypeScript: `remnoteio/ts-fsrs`

### Anki SM-2 (legacy)

- SuperMemo's algorithm, highly customizable
- Requiere tuning manual de parámetros

---

## Export

| Formato | Notas |
|---------|-------|
| Plain Text | ✅ |
| Markdown | Quirky — todo como nested lists (no standard Markdown) |
| HTML | ✅ |
| OPML | Para outliner compatibility |
| JSON | Full Raw Backup, puede restaurar todo |
| Anki | Para migrar flashcards |

**Markdown export es débil** precisamente porque no usan Markdown como formato core. Ventaja competitiva de Neupaper — documentos son Markdown desde el inicio.

---

## Modelo de negocio

| Plan | Precio | PDF | Tables | Files | Collab |
|------|--------|-----|--------|-------|--------|
| Free | $0 | 3 PDFs | Limited | Limited | No |
| Pro | $8/mo ($6 students) | Unlimited | Unlimited | Unlimited | Yes |
| Life-Long Learner | **$395 one-time** | Most Pro | Most Pro | Most Pro | Varies |

**$395 lifetime plan** — inusual pero compelling para academic users. Worth considering para Neupaper como opción.

---

## Mobile

- **Capacitor** wrapping web app
- **OTA updates** via Capacitor Updater (bypasses app store review)
- Native plugins para features específicas (screenshots, Intercom)
- Algo de Swift nativo (logging)

---

## Comparativa RemNote vs Neupaper

| Aspecto | RemNote | Neupaper |
|---------|---------|----------|
| Focus | Knowledge + flashcards | Document authoring + PDF |
| Editor | Custom block (outliner) | CodeMirror 6 (Markdown) |
| Data format | Rich text arrays (internal) | Markdown (.neu) |
| PDF | Consume/anota existentes | Genera nuevos (Puppeteer) |
| Flashcards | Core feature (FSRS) | No |
| Templates | Power-Up Rems (structural) | Markdown Isles (${ }) con lógica |
| Export Markdown | Lossy (nested lists) | Nativo (es el formato) |
| Plugins | iframe + SDK | Componentes .isle |
| Pricing | $8/mo Pro, $395 lifetime | ~8-12€/mo Pro |
| Open source | No | Sí |
| Mobile | Capacitor | Web responsive |

---

## Patrones a adoptar

1. **Lifetime pricing option.** $395 one-time es compelling para ciertos users. Si Neupaper tiene users que prefieren pagar una vez, un plan lifetime de ~150-200€ podría funcionar.

2. **Capacitor + OTA updates.** RemNote usa Capacitor Updater para enviar updates web sin pasar por app store review. Si mobile, este es el patrón.

3. **Slash commands con plugin integration.** `/mermaid` dispara un plugin oficial que renderiza el diagrama. Pattern para `/pagebreak`, `/for`, `/if` en Neupaper.

4. **Widget system por locations.** Plugins registran widgets en locations específicas (RightSidebar, etc.). Si abrimos plugins, definir locations claras: sidebar, toolbar, preview, etc.

## Patrones a NO adoptar

1. **Rich text arrays como storage.** Markdown como source of truth es más simple y portable. Export de RemNote a Markdown es lossy — confirma que Markdown-first es mejor.

2. **Outliner paradigm.** No aplica a document authoring.

3. **Spaced repetition.** No es relevante para documentos profesionales.

4. **Custom block editor.** CM6 es la elección correcta.

5. **PDF annotation.** Neupaper genera PDFs, no los anota.

---

## Fuentes

- https://github.com/remnoteio (17 repos)
- https://plugins.remnote.com/
- https://www.remnote.com/pricing
- https://help.remnote.com/
- https://www.remnote.com/feature/annotate-pdf

---

*Estudio realizado el 2026-03-25 como referencia arquitectónica para Neupaper.*


Lo más relevante:
  - Rich text arrays interno → Markdown export lossy — confirma que Markdown-first es la decisión correcta
  - $395 lifetime plan — modelo de pricing interesante para considerar
  - Capacitor + OTA updates para mobile sin app store review
  - PDF annotation es su fuerte, PDF generation es nuestro fuerte — complementarios
  - Plugin SDK con widget locations definidas — pattern limpio si abrimos extensibilidad
  - FSRS spaced repetition algorithm — no relevante pero fork TypeScript disponible si algún día se necesita

  Patrones que deberíamos adoptar:
  1. Lifetime pricing option (~150-200€)
  2. Capacitor + OTA updates si mobile
  3. Widget locations definidas para extensibilidad futura
