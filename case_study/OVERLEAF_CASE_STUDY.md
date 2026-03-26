# Overleaf Case Study

Estudio de Overleaf desde https://github.com/overleaf (93 repos, 17.5K stars). El gold standard mundial de source editing → PDF. El case study más relevante para Neupaper.

**Nota:** Overleaf ES open source (AGPL-3.0). Community Edition gratuita, Server Pro de pago. Adquirida por Digital Science.

---

## Qué es Overleaf

El editor LaTeX online más popular del mundo. Source editing en CodeMirror 6, compilación LaTeX server-side, preview PDF en tiempo real, colaboración en tiempo real con OT. Split view editor/PDF. Self-hostable.

**Por qué es el case study más importante:** Overleaf resuelve exactamente el mismo problema que Neupaper (source editing → PDF fiel) pero con LaTeX en vez de Markdown.

---

## Stack técnico

| Layer | Tecnología |
|-------|-----------|
| Backend | Node.js + Express.js (13+ microservices) |
| Frontend | React (migrado de Angular) |
| Editor | **CodeMirror 6** (migrado de Ace) |
| PDF viewer | **PDF.js** |
| Compilation | **TeX Live** en Docker containers |
| Real-time | **ShareJS / OT** via Socket.io + Redis |
| Database | MongoDB |
| Cache | Redis (pub/sub + document cache) |
| Git bridge | Java |
| Build | Webpack + pnpm + Nx |
| Desktop | N/A (web-only) |

---

## Arquitectura: 13+ Microservices

```
Browser (CM6) ──WebSocket──→ [real-time] ──HTTP──→ [document-updater] ←→ Redis
                                                          ↓
                                                    [docstore] → MongoDB
                                                    [filestore] → S3

User clicks "Recompile":
[web] ──HTTP──→ [CLSI] ──Docker socket──→ [TeX Live container]
                                               ↓
                                          PDF output
                                               ↓
                                     [PDF.js in browser]
```

### Services

| Service | Función |
|---------|---------|
| web | Express app principal, UI, auth, project management |
| clsi | LaTeX compilation API (Common LaTeX Service Interface) |
| real-time | Socket.io WebSocket layer, presencia, cursores |
| document-updater | Core OT — transforma operaciones, persiste a Redis/MongoDB |
| docstore | CRUD de text documents en MongoDB |
| filestore | CRUD de binary files en S3/local FS |
| project-history | Comprime/almacena history, renders diffs |
| chat | Chat de proyecto |
| spelling | Spellcheck server-side (Hunspell) |
| notifications | Notificaciones |
| contacts | Tracking de contactos para sugerencias |
| tags | Tags/folders de proyectos |

---

## CodeMirror 6 — La integración más sofisticada

### Migration timeline

- ShareLaTeX era: **Ace editor**
- Overleaf v2: Ace source + CM5 rich text
- Diciembre 2022: **CM6** para source mode
- Actual: **CM6 para TODO** (source + rich text)

### Por qué CM6 sobre Ace

- Maneja source code Y rich text en un solo framework
- Mejor mobile/tablet
- Mejor i18n (RTL, CJK)
- Mejor accessibility
- Compatibilidad Grammarly
- Arquitectura moderna extensible

### Integración React-CM6

```typescript
// View creado UNA VEZ en ref, no en cada render
const view = new EditorView({
  state,
  dispatchTransactions: trs => {
    view.update(trs)
    if (isMounted.current) setState(view.state)
  },
})
viewRef.current = view
```

- View expuesto via `CodeMirrorStateContext` y `CodeMirrorViewContext`
- **56 extension files** + 4 subdirectories
- Lezer grammars custom para LaTeX y BibTeX
- Lazy loaded como separate webpack chunk (`React.lazy()` + `Suspense`)
- Compartments para configuración dinámica (linting, theming, settings)

### Para Neupaper

Mismo editor (CM6), mismos patterns. Su integración es la referencia definitiva:
1. View en ref, no en state
2. Contexts para exponer view a children
3. Compartments para reconfiguración dinámica (ya lo hacemos con fonts)
4. Lazy loading del editor
5. Lezer grammar custom → futuro para `.neu` syntax

---

## Visual Editor (Rich Text Mode) — EL PATTERN MÁS RELEVANTE

Overleaf construyó un **WYSIWYG completo sobre CM6** usando decorations. NO es un editor separado — es CM6 con decorations que renderizan LaTeX visualmente.

### Arquitectura

- `visualState` StateField trackea si visual mode está on
- `visualConf` Compartment maneja extensions condicionales
- `setVisual()` toggle via transaction

### 27 widgets visuales

| Widget | Qué hace |
|--------|----------|
| math.ts | Renderiza LaTeX math via **MathJax** a SVG (inline y display) |
| tabular.tsx | Renderiza tablas LaTeX como React components interactivos |
| graphics.ts | Renderiza `\includegraphics` como imágenes reales (PDF.js para PDFs, blob URLs para SVGs) |
| begin.ts / end.ts | Colapsa `\begin{}`/`\end{}` markers |
| footnote.ts | Renderiza footnotes inline |
| preamble.ts | Oculta document preamble |

### Pattern clave: "decorations disappear on click"

```typescript
// atomic-decorations.ts
shouldDecorate() // checks if cursor is inside the range
// Si cursor está dentro → muestra raw LaTeX
// Si cursor está fuera → muestra rendered visual
```

### Para Neupaper

**Este es EL pattern para Markdown Isles en el editor:**
- `${ @cliente.nombre }` se muestra como "Alberto" cuando el cursor no está
- Click → revela `${ @cliente.nombre }` raw
- `${ for item in @lista }...{ end }` se muestra como preview del loop renderizado
- Click → revela la syntax

Exactamente el comportamiento de Obsidian Live Preview pero implementado con CM6 decorations, no custom.

---

## PDF Preview y SyncTeX

### PDF.js

- Mozilla's PDF.js renderiza el PDF compilado
- Carga en chunks de 64KB (progressive rendering)
- Persiste scroll position entre recompilaciones
- Dark mode, mouse wheel zoom, presentation mode
- **Detached mode** — PDF en ventana separada, sincronizado via `useDetachState`

### SyncTeX (bidirectional source↔PDF)

**Forward sync (code → PDF):**
1. Cursor position (file, line, col) desde CM6
2. POST a `/project/:id/sync/code`
3. Server ejecuta `synctex view` contra `.synctex.gz`
4. Retorna PDF highlights (page, h, v, width, height)
5. Client scrollea PDF a la posición

**Reverse sync (PDF → code):**
1. Double-click en PDF
2. Coordenadas (page, h, v) — v invertido (PDF mide desde abajo)
3. POST a `/project/:id/sync/pdf`
4. Server ejecuta `synctex edit` → retorna `{file, line, column}`
5. Client abre file y salta a la línea

### Para Neupaper

No necesitamos SyncTeX (nuestro preview es HTML, no PDF compilado). Pero el concepto de **click en preview → scroll a source** es implementable:
- Data attributes en HTML renderizado mapeando a source line numbers
- Click en preview paragraph → CM6 scrollea al Markdown correspondiente
- Click en CM6 → preview scrollea al HTML renderizado

---

## Compilación LaTeX (CLSI)

### Pipeline

1. User clicks "Recompile"
2. Web service envía project files al CLSI via HTTP
3. CLSI escribe files a disco
4. CLSI crea **Docker sibling container** con TeX Live
5. `latexmk` ejecuta compilación (pdflatex/xelatex/lualatex)
6. Timeout: 20s free, 4min Pro
7. Retorna PDF + SyncTeX + logs
8. latex-log-parser extrae errors/warnings/info
9. PDF.js renderiza en browser

### Sandboxed compiles (Server Pro)

Cada compilación en Docker container aislado. Sin red, sin shared state. Container destruido después.

### Vs Neupaper

Overleaf: server-side TeX Live (~4GB) → PDF con tipografía perfecta pero compile delay (segundos a minutos).
Neupaper: client-side parser → Remark → HTML → Puppeteer PDF. Mucho más ligero, preview instant.

---

## Real-Time Collaboration (OT)

**Operational Transformation**, no CRDT. Built on ShareJS.

### Flujo

1. User escribe en CM6
2. Diff-Match-Patch calcula diff
3. Diff → ShareJS operations (insert/delete at position)
4. Socket.io → real-time service
5. real-time → document-updater
6. document-updater **transforma** operación vs concurrentes (OT algorithm)
7. Aplica a server-side document state
8. Broadcast a todos los clients
9. Cada client aplica operación transformada a su CM6

### CM6 integration

```typescript
// extensions/realtime.ts
class EditorFacade {
  // Local edits: CM6 transactions → OT insert/delete
  handleUpdateFromCM(update)
  // Remote edits: ShareJS events → CM6 cmInsert()/cmDelete()
  // Transaction.remote annotation distingue local vs remote
}
```

### Para Neupaper

No para Fase 3. Cuando añadamos collaboration, el `EditorFacade` adapter pattern (bridging CM6 con OT) es el approach probado. La alternativa de Roam (immutable blocks) es más simple.

---

## Error Handling

### Backend

latex-log-parser parsea TeX logs → structured errors/warnings/info con file + line number.

### Frontend

- Tabbed interface: "All Logs", "Errors", "Warnings", "Info"
- Error counts capped a "99+"
- Cada error linkea a source location
- Raw log en "All Logs" tab

### In-editor linting

CM6 `linter()` en Compartment para toggle dinámico. Linting contra Lezer parse tree, no compilation output.

### Para Neupaper

Ya tenemos linting real-time en el editor. **Ventaja sobre Overleaf:** podemos lint en tiempo real porque Markdown Isles es simple. LaTeX es Turing-complete — solo puede mostrar errores tras compilar.

---

## Self-Hosting

### Community Edition (free, AGPL-3.0)

- Single Docker container (todos los services via runit)
- MongoDB + Redis como companion containers
- 3 containers via Docker Compose
- Managed por Overleaf Toolkit (shell scripts)

### Server Pro (paid, enterprise)

- Sandboxed compiles (Docker-in-Docker)
- LDAP/SAML auth
- Git bridge
- Template system institucional
- Horizontal scaling

---

## Templates

- Gallery pública: `overleaf.com/gallery` con miles de templates
- Templates = proyectos Overleaf completos que se clonan
- Categorías: journals, CVs, presentations, reports, theses
- Publisher templates oficiales (Elsevier, IEEE, ACM)
- Server Pro: galleries privadas institucionales

### Vs Neupaper

Overleaf templates son proyectos opacos que clonas. Neupaper templates son files que posees y modificas (Shadcn-style). Mejor para developers.

---

## Modelo de negocio

| Plan | Precio | Collaborators | Compile Timeout |
|------|--------|---------------|-----------------|
| Free | $0 | 1/project | 20 seconds |
| Standard | ~$19/mo | 10/project | 1 minute |
| Professional | ~$39/mo | Unlimited | 4 minutes |
| Group Standard | ~$125/user/year | 10/project | — |
| Group Professional | ~$199-399/user/year | Unlimited | — |

- 7-day trial en paid plans
- 40% descuento educación
- AI Assist como add-on separado
- Licencias institucionales/universitarias

---

## Comparativa Overleaf vs Neupaper

| Aspecto | Overleaf | Neupaper |
|---------|----------|----------|
| Source language | LaTeX | Markdown + Isles |
| Editor | CM6 (same!) | CM6 (same!) |
| Preview | PDF.js (compiled PDF) | Live HTML A4 canvas |
| Compilation | Server-side TeX Live (4GB) | Client-side Remark (instant) |
| PDF generation | LaTeX compiler | Puppeteer |
| Source-PDF sync | SyncTeX | Possible via data attributes |
| Collaboration | OT (ShareJS) battle-tested | Not yet (Phase 5) |
| Visual editor | CM6 decorations (27 widgets) | Planned (Live Preview) |
| Spellcheck | Hunspell in Web Worker | Not yet |
| Templates | Server-side gallery (clone) | Local files, Shadcn install |
| Architecture | 13+ microservices | Monolith Next.js |
| Frontend | React + CSS classes | React + Tailwind + Shadcn |
| Self-hosting | Docker (3-4 containers) | Planned |
| Pricing | $0-39/mo | ~8-12€/mo |
| Open source | Sí (AGPL-3.0) | Sí |

---

## Patrones a adoptar

1. **CM6 Visual Editor via decorations.** El pattern más importante: "decorations que desaparecen cuando el cursor entra en el range". Perfecto para Markdown Isles — `${ @variable }` muestra valor resuelto, click revela syntax. 27 widgets como referencia.

2. **CM6 integration pattern.** View en ref (no state), Contexts para exposición, Compartments para reconfiguración, lazy loading como chunk separado. Battle-tested a escala masiva.

3. **Source↔Preview sync via data attributes.** Click en preview → scroll a source. Click en source → scroll a preview. Implementable con line number mapping.

4. **Detached preview window.** PDF/preview en ventana separada para segundo monitor. Cross-window sync via `useDetachState`.

5. **Tabbed error/warning panel.** "All Logs", "Errors", "Warnings" con counts y links a source location.

6. **Progressive PDF loading (64KB chunks).** Si mostramos PDF real (además del HTML preview), PDF.js con chunks es la UX correcta.

7. **Compilation caching.** Cache de outputs compilados, invalidar on change. Útil si PDF generation via Puppeteer se vuelve bottleneck.

## Patrones a NO adoptar

1. **Microservices.** 13+ services es overkill para Neupaper. Monolith Next.js es correcto.

2. **TeX Live server-side.** 4GB installation, compile delay. Nuestro approach client-side es más ligero e instant.

3. **MongoDB + Redis.** Overkill. localStorage/Supabase es suficiente.

4. **OT collaboration (ahora).** Complejidad enorme. Para cuando collaboration sea priority, evaluar OT vs CRDT vs immutable blocks.

5. **SyncTeX.** Protocolo binario para LaTeX↔PDF. No necesario con HTML preview.

---

## Ventajas estructurales de Neupaper sobre Overleaf

1. **Preview instant** — Overleaf tiene compile delay (20s-4min). Neupaper renderiza en milliseconds.
2. **Linting real-time** — Overleaf solo muestra errores post-compilación. Neupaper lintea mientras escribes.
3. **No server compilation** — Overleaf necesita TeX Live (~4GB) en un server. Neupaper no necesita nada server-side para preview.
4. **Self-hosting trivial** — Overleaf necesita MongoDB + Redis + Docker-in-Docker. Neupaper solo necesita un server Next.js.
5. **Templates como files** — Overleaf clona proyectos opacos. Neupaper instala files que posees.
6. **Markdown > LaTeX para nuestro user** — Developers ya saben Markdown. LaTeX tiene curva de aprendizaje pronunciada.

## Ventajas estructurales de Overleaf sobre Neupaper

1. **Tipographic quality** — TeX produce la mejor tipografía existente. Puppeteer rendering HTML/CSS nunca igualará Knuth-Plass, micro-typography, etc.
2. **Collaboration battle-tested** — OT a escala masiva (millones de usuarios).
3. **Ecosystem** — 4000+ LaTeX packages, décadas de templates académicos.
4. **PDF fidelity guarantee** — Muestran el PDF real compilado. Nosotros mostramos HTML que debe coincidir con Puppeteer output.

---

## Fuentes

- https://github.com/overleaf/overleaf (17.5K stars)
- https://github.com/overleaf (93 repos)
- https://www.overleaf.com/blog/towards-the-future-a-new-source-editor
- https://www.overleaf.com/blog/the-updated-rich-text-editor-simplifies-team-collaboration
- https://docs.overleaf.com/
- https://deepwiki.com/overleaf/overleaf

---

*Estudio realizado el 2026-03-25 como referencia arquitectónica para Neupaper.*


Lo más relevante:
  - Gold standard de source editing → PDF. Mismo editor (CM6), mismo problema, diferente approach
  - Visual Editor via CM6 decorations es EL pattern para Markdown Isles Live Preview
  - "Decorations disappear on click" — perfecto para ${ @variable } → muestra valor, click revela syntax
  - CM6 integration pattern definitivo: ref-based view, Contexts, Compartments, lazy loading
  - Preview instant es nuestra ventaja #1 sobre Overleaf (ellos tienen compile delay 20s-4min)
  - Linting real-time es nuestra ventaja #2 (ellos solo post-compilación)
  - Source↔Preview sync posible via data attributes (no necesitamos SyncTeX)

  Patrones que deberíamos adoptar:
  1. CM6 Visual Editor via decorations (el más importante de TODOS los case studies)
  2. CM6 ref-based integration pattern
  3. Source↔Preview bidirectional sync
  4. Detached preview window
  5. Tabbed error panel
  6. Compilation caching
