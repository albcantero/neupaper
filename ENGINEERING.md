Notas técnicas de arquitectura e implementación del proyecto Neupaper.

---

## Parser Markdown Isles

Pipeline de tres fases que transforma `.neu` en Markdown puro. El parser NO toca el Markdown — solo busca bloques `${ }`, resuelve lo que hay dentro, y devuelve texto plano que Remark renderiza.

```
source.neu → [Tokenize] → Token[] → [Build AST] → ASTNode[] → [Evaluate] → Markdown puro
```

### Tokenizer (`lib/parser/tokenizer.ts`)

Escanea el source buscando `${` y `}`. Produce una lista plana de `TextToken | IsleToken`. Regla clave: `$` no seguido de `{` se ignora (seguro con LaTeX: `$E=mc^2$`). Los `${` sin cerrar se emiten como texto (el linter avisa).

### AST Builder (`lib/parser/ast.ts`)

Frame stack para tracking de anidamiento: `root | for | if`. Maneja cierres de bloque (`${ end }`), condicionales inline (`${ if @x is val then "a" else "b" }`), y modo data (acumula texto raw hasta `${ end data }`).

**Tipos de nodo soportados:** `text`, `comment`, `pagebreak`, `config`, `load`, `data`, `variable`, `set`, `for`, `if`.

### Evaluator (`lib/parser/evaluator.ts`)

Recorre el AST con un contexto (datos) + locals (variables de bucle). Resolución de paths: `@cliente.nombre` → `ctx["cliente"]["nombre"]`. Arrays indexados desde 1 (`@lineas.1.nombre`). Variables se resuelven primero en locals, luego en context.

### Data Parser (`lib/parser/data-parser.ts`)

Parsea el formato `.data`:
```
key = value
parent.child = value
key props(p1, p2) = [
  val1, val2
  val3, val4
]
```
Produce `DataObject` (diccionario anidado con arrays indexados desde 1).

### Linter (`lib/parser/linter.ts`)

Dos pasadas: (1) token-level — `${` sin cerrar, `${ end }` sin match, `else` huérfano. (2) semántica — variables `@` no definidas, `[` sin cerrar en data. Devuelve `LintDiagnostic[]` con offsets `from/to` para CodeMirror.

### Tests

Vitest en `lib/parser/__tests__/`: tokenizer, ast, evaluator, linter. Ejecutar con `npm run test`.

---

## Editor (`components/editor.tsx`)

CodeMirror 6 con extensiones:

- **Markdown base** + extensión custom que previene tokenización de `[`, `@` dentro de `${ }` (`lib/editor/isle-markdown-ext.ts`)
- **Syntax highlighting para islas** (`lib/editor/isle-highlight.ts`) — ViewPlugin que escanea el viewport buscando `${ }`. Colores One Dark: delimitadores purple, keywords indigo, variables emerald, operadores slate italic, comentarios dark slate, data keys cyan, data values amber.
- **Theme oscuro** (`lib/editor/neu-theme.ts`) — base dark + overrides para colores Isles
- **Linter integrado** — `neuLint()` se ejecuta con 400ms de delay, alimenta el lintGutter de CM
- **Visual aids** — `showIndentSpaces()` (puntos `·` para leading spaces), `showLineBreaks()` (flechas entre líneas)

---

## Preview y Renderizado (`components/preview.tsx`)

### Pipeline de renderizado

1. `parse(content)` — Parser Isles produce Markdown limpio
2. ReactMarkdown con plugins: remarkGfm, remarkBreaks, remarkMath, rehypeRaw, rehypeKatex
3. Handler custom para bloques ````mermaid` → componente `<MermaidBlock>`

### Mermaid

Carga async de `mermaid` + `@mermaid-js/mermaid-zenuml`. Renderizado off-screen para evitar flash. Auto-escala SVG con cálculo de viewBox. Workaround para bug de `JSON.stringify` con nodos DOM (monkey-patch temporal durante render).

### Zoom

7 niveles: 25%, 50%, 75%, 100%, 125%, 150%, 200%. Se aplica con `transform: scale()` sobre el A4. El wrapper exterior se dimensiona dinámicamente (`calc(210mm * scale + 96px)`) para que el scroll coincida con el tamaño visual.

### PDF export

1. Concatena todas las páginas con `<div class="neu-pagebreak">` entre ellas
2. POST a `/api/export-pdf` con el HTML
3. Puppeteer navega a `/print`, inyecta HTML vía `page.evaluate()`, genera PDF

---

## Almacenamiento (`lib/storage.ts`)

localStorage con clave `"neupaper:files"`. Interfaz `NeuFile`:

```typescript
{ id: string, name: string, path: string, content: string, createdAt: number, updatedAt: number }
```

- `path` distingue archivos raíz (`factura.neu`) de anidados (`components/ui/Table.isle`)
- `getFiles()` devuelve solo raíz (sin `/` en path), `getVaultFiles()` devuelve anidados
- `renameFolder()` cascadea el rename a todos los archivos hijos
- `initVault()` crea estructura por defecto: `components/built-in/` (14 componentes), `components/` (2 stubs), `data/` (2 stubs)

---

## Vault UI

### Sidebar (`components/sidebar.tsx`)

Árbol de archivos recursivo construido con `buildTree()`. Folders antes que archivos, ordenados alfabéticamente. Context menu (clic derecho) con: renombrar, duplicar, descargar, eliminar. Descarga de carpeta como ZIP con jszip. Icono de vault configurable con picker. Nombre de vault en localStorage (`"neupaper:vault-name"`).

### Tabs (`components/editor-tabs.tsx`)

Barra horizontal scrollable con indicadores de fade (gradientes left/right). Breadcrumb de navegación debajo. Click para cambiar archivo activo, X para cerrar pestaña.

### File Icons (`components/file-icon.tsx`)

Colores por extensión: `.neu` (purple), `.isle` (cyan), `.data` (amber). Iconos de Lucide.

---

## CSS y Estilos

### Theme global (`app/globals.css`)

Tailwind v4 con espacio de color OKLCH. Dark mode por defecto (clase `.dark`). Integración con tema Shadcn. Sidebar con colores propios.

### Estilos de documento (`app/neu-document.css`)

Escala tipográfica profesional: base 11pt, h1 24pt, h2 18pt, h3 14pt. Line heights y margins calibrados para A4. Estilos para tablas, listas, blockquotes, code blocks, checkboxes. `neu-pagebreak`: línea discontinua en preview + `break-before: page` en PDF. Estilos especiales para Mermaid Gantt (rotate x-axis labels -45°).

### Scrollbar pattern

Consistente en toda la app (tabs, editor, preview): 12px de hit area, 4px de thumb visible. Truco: `border: 4px solid transparent` + `background-clip: padding-box` para area de click grande con thumb fino.

---

## 2026-03-21 — Paginación y Page Breaks

### El problema

El preview A4 y el PDF generado por Puppeteer no coincidían en cómo partían las páginas. El render cortaba el contenido mecánicamente a exactamente N × 257mm de píxeles, lo que:

- Partía párrafos por la mitad
- No coincidía con los cortes naturales del PDF
- Daba sensación de que el preview "mentía"

### Intentos fallidos

**Intento 1 — `scrollTop` + `overflow-y: auto`** Usar `scrollTop = currentPage * clientHeight` para mostrar cada página. Bug crítico: el navegador clampea `scrollTop` a `max(0, scrollHeight - clientHeight)`. Si el contenido mide 1050px y la ventana 972px, la página 2 debería empezar en 972px pero el browser la fuerza a 78px → overlap masivo con la página 1.

**Intento 2 — `translateY` + `overflow: hidden`** Sustituir scroll por `transform: translateY(-N * windowHeight)`. Elimina el clamping. Problema que persiste: el corte sigue siendo mecánico. Puppeteer renderiza en PDF DPI con métricas de fuente ligeramente distintas a screen → los mismos párrafos pueden tener alturas diferentes → el corte cae en líneas distintas.

### Solución adoptada

**Preview = scroll continuo con guías CSS**

El documento fluye completo sin cortar nada, igual que lo renderizará Puppeteer. Las guías de página son líneas CSS cada 257mm:

```css
background-image: linear-gradient(to bottom,
  transparent calc(257mm - 1px),
  #e2e8f0 calc(257mm - 1px),
  #e2e8f0 257mm,
  transparent 257mm);
background-size: 100% 257mm;
background-position: 0 20mm;
background-repeat: repeat-y;
```

**`${ pagebreak }` — cortes explícitos**

El parser de Markdown Isles emite `<div class="neu-pagebreak"></div>`. En el preview muestra una línea discontinua visual. En el PDF aplica `break-before: page` (respetado por Puppeteer incluso con `emulateMediaType("screen")`).

### Paginación por particionado DOM

Approach final implementado — en vez de renderizar todo y cortar con `translateY`, particionamos el DOM en páginas independientes:

1. Contenido completo se renderiza en un contenedor oculto (`visibility: hidden`, `width: 170mm`)
2. `partitionPages()` recorre los hijos del article, midiendo alturas con `getComputedStyle` + `offsetHeight`
3. Si un `<p>` no cabe, se parte con **Range API** (binary search + snap a límite de palabra)
4. `${ pagebreak }` fuerza nueva página
5. Cada página se muestra con `dangerouslySetInnerHTML` — sin `translateY`, sin clipping
6. PDF export concatena todas las páginas con `<div class="neu-pagebreak">` entre ellas

**Archivos:**

- `lib/page-partitioner.ts` — algoritmo de particionado + `splitParagraph()`
- `components/preview.tsx` — contenedor oculto, render por página, Pagination de Shadcn

**Bug resuelto — border-box:** Tailwind usa `box-sizing: border-box`. El div interior tenía `height: 257mm` + `py-[20mm]`, lo que dejaba solo 217mm de contenido real. Fix: usar `h-full` para heredar 297mm del padre A4, dando 297-40=257mm de contenido.

**Limitaciones actuales:**

- Solo `<p>` se parte; el resto de elementos son indivisibles
- Margin collapsing entre siblings puede causar pequeñas imprecisiones (~1-2px)
- Screen DPI vs Puppeteer DPI sigue siendo una fuente potencial de divergencia

---

## 2026-03-21 — Arquitectura PDF (paridad pixel-perfect)

**Principio fundamental:** el PDF tiene que ser idéntico al preview A4.

**Cómo funciona:**

1. `/print` es una página Next.js real que carga todos los CSS
2. Puppeteer navega a `/print` → carga la página con los mismos estilos que el preview
3. `page.evaluate()` inyecta el HTML en el `<article>` vacío
4. `page.pdf()` genera el PDF con los estilos ya cargados

**Por qué navegar a `/print` y no `page.setContent()`:**

- `setContent()` requiere inlinear todos los CSS manualmente
- Navegando a `/print`, Puppeteer carga exactamente los mismos estilos que el preview
- Zero divergence by design

**Bug resuelto — HTTP 431:** Antes el HTML se pasaba como query param base64url (`/print?c=...`). Con documentos grandes, la URL superaba el límite de headers del servidor → HTTP 431. Solución: navegar a `/print` sin params y luego inyectar el HTML vía `page.evaluate()`. Sin store, sin UUID, sin intermediarios.

**Regla para futuras sesiones:** cualquier cambio en el CSS del preview debe reflejarse automáticamente en `/print`. No duplicar estilos — una sola fuente de verdad.

---

## 2026-03-21 — Sticky Headings

Inspirado en Typst: si un heading (`<h1>`–`<h6>`) cabe al final de una página pero el siguiente elemento no cabe después, el heading migra a la siguiente página. Evita headings huérfanos al final de página sin contenido debajo.

---

## 2026-03-21 — Análisis del layout engine de Typst

Estudiamos el código fuente de Typst (`crates/typst-layout/src/`) para extraer ideas aplicables.

### Arquitectura de Typst (3 fases)

**1. Collect** (`flow/collect.rs`) — Clasifica cada elemento como:

- `Single` — indivisible (imágenes, bloques con `fr` height)
- `Multi` — partible entre páginas (párrafos, bloques breakable)
- `Spacing` — con niveles de "debilidad" (0-5) para colapso
- Marca elementos como **sticky** (headings que no deben quedar huérfanos)

**2. Distribute** (`flow/distribute.rs`) — Procesa elementos secuencialmente:

- Intenta encajar cada uno en la "región" actual (página)
- Si no cabe un Multi, guarda el **spill** (sobrante) para la siguiente región
- Si no cabe un Single, migra entero a la siguiente región

**3. Compose** (`flow/compose.rs`) — Maneja floats, footnotes, re-layout:

- Usa **checkpoints** para hacer rollback
- Footnote invariant: una referencia y su nota deben estar en la misma página

### Ideas aplicadas a Neupaper

|Concepto Typst|Estado|
|---|---|
|Sticky headings|✅ Implementado|
|Single vs Multi (indivisible vs partible)|✅ `<p>` partible, resto indivisible|
|Spill pattern|✅ `splitParagraph()` devuelve segunda mitad|

### Ideas para implementar en el futuro

|Concepto|Descripción|Prioridad|
|---|---|---|
|Weak spacing collapse|Margins entre elementos: `max()` en vez de sumar|Media|
|`<ul>`/`<ol>` como Multi|Partir listas por `<li>` boundaries|Media|
|`<blockquote>` como Multi|Partir blockquotes por párrafos internos|Baja|
|Checkpoint/rollback|Guardar estado antes de inserciones complejas|Baja|

### Lo que NO es portable de Typst

- **Knuth-Plass line breaking** — Typst lo usa para texto justificado. Nosotros delegamos en el browser.
- **Glyph-level measurement** — Typst usa HarfBuzz. Nosotros medimos DOM renderizado.
- **El layout engine completo** — Typst calcula posiciones él mismo. Nosotros medimos después del hecho.

### Referencias Typst (open source)

- Repo principal: https://github.com/typst/typst
- `pdf-writer` — librería Rust para escribir PDFs: https://github.com/typst/pdf-writer
- `typst-render` — rasterización de páginas: https://crates.io/crates/typst-render

---

## Futuro — Opciones de paginación más precisa

**Opción A — DOM measurement mejorado:** Renderizar en `div` oculto con mismo ancho (170mm). Recorrer elementos bloque y obtener `offsetTop + offsetHeight`. Para cada límite de página, encontrar el último elemento que cabe completo. Limitación: screen DPI vs PDF DPI (~1-2px divergencia).

**Opción B — Iframe con `/print`:** Cargar contenido en `<iframe>` apuntando a `/print`. Consultar posiciones dentro del iframe. Garantía perfecta de coincidencia preview ↔ PDF porque ambos usan el mismo código de render. Complejidad: comunicación cross-frame.

**Opción C — Layout engine propio (largo plazo):** Calcular posición de cada elemento durante la fase de evaluación del parser, análogo a Typst. Factible cuando tengamos control total de los componentes `.isle`.