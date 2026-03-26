# Typst Case Study

Estudio exhaustivo de la arquitectura de Typst, extraído del análisis completo de https://github.com/typst. Orientado a identificar patrones aplicables a Neupaper.

**Nota:** Typst SÍ es open source (Apache 2.0). Todo el código del compilador es público.

---

## Repositorios (13 públicos)

| Repo | Descripción | Stars |
|------|-------------|-------|
| typst/typst | Compilador principal | 52.2k |
| typst/packages | Paquetes community + oficiales | 924 |
| typst/pdf-writer | Serialización low-level de objetos PDF | 684 |
| typst/comemo | Computación incremental via memoización | 589 |
| typst/templates | Templates oficiales | 404 |
| typst/svg2pdf | Conversor SVG → PDF | 390 |
| typst/ecow | Clone-on-write vector/string compacto | 302 |
| typst/hypher | Separación silábica para hyphenation | 137 |
| typst/subsetter | Subsetting de fonts OpenType para PDF | 52 |
| typst/codex | Notación Unicode human-friendly | 38 |
| typst/package-check | Validación de paquetes | 26 |
| typst/webapp-issues | Issue tracker de typst.app | 24 |
| typst/typst-assets | Assets bundleados (fonts) | 13 |

**Decisión clave:** Typst construyó varias librerías fundacionales from scratch (pdf-writer, comemo, ecow, hypher, subsetter, svg2pdf) en vez de depender de crates existentes. Control total del pipeline PDF y fonts.

---

## Stack técnico

- **Lenguaje:** Rust
- **Plataformas:** CLI nativo + typst.app (web via WASM)
- **Editor propio:** No — se integra con VS Code via tinymist (LSP)
- **Font shaping:** rustybuzz (port de HarfBuzz)
- **Font subsetting:** subsetter (propio)
- **PDF:** pdf-writer (propio) + krilla (mid-level)
- **Rasterización:** tiny-skia
- **Computación incremental:** comemo (propio)
- **Hyphenation:** hypher (propio)

---

## Pipeline de compilación (4 fases)

```
Source (.typ)
     ↓
[1. PARSING] — typst-syntax
  Lexer tokeniza en 3 modos (Markup, Math, Code)
  Parser recursive descent → CST (preserva whitespace/comments para IDE)
  CST se reinterpreta como AST
     ↓
[2. EVALUATION] — typst-eval
  VM recorre AST → produce Module
  Module = valores exportados + Content tree
  Content = nodos de elementos tipados (HeadingElem, TextElem, etc.)
  Estilos via set rules (propiedades) y show rules (transformaciones)
  StyleChain = linked list non-allocating de estilos
     ↓
[2.5. REALIZATION] — typst-realize
  Aplica show rules recursivamente
  Agrupa elementos relacionados (párrafos, listas)
  Filtra elementos innecesarios
  Prepara introspección (locations, tags)
  Output: lista plana de elementos styled
     ↓
[3. LAYOUT] — typst-layout
  Convierte Content → PagedDocument (vector de frames)
  Layout iterativo: hasta 5 pasadas hasta que introspección converge
  (Números de página afectan layout que afecta números de página)
     ↓
[4. EXPORT] — typst-pdf / typst-html / typst-render / typst-svg
  Frames → formato target
  PDF via krilla (sucesor de pdf-writer directo)
  PNG/SVG via tiny-skia
  HTML experimental (solo semántico, sin CSS)
```

### Convergencia iterativa

`compile_impl` ejecuta layout hasta 5 veces hasta que las introspecciones converjan. Esto resuelve la dependencia circular: números de página → afectan layout → afectan números de página.

---

## Crates (17 en el workspace)

| Crate | Rol |
|-------|-----|
| typst-syntax | Lexer + parser → CST |
| typst-eval | VM que evalúa CST → Content |
| typst-library | Standard library: text, math, layout, model, visualize |
| typst-realize | Aplica show rules, agrupa elementos |
| typst-layout | Motor de layout: flow, inline, grid, math, paginación |
| typst-pdf | Export PDF via krilla |
| typst-html | Export HTML (experimental, NLnet-funded) |
| typst-render | Rasterización via tiny-skia |
| typst-svg | Export SVG |
| typst-ide | IDE support: autocomplete, hover, diagnostics |
| typst-cli | CLI |
| typst-kit | Toolkit para integradores: fonts, packages, file watching |
| typst-macros | Proc macros |
| typst-utils | Utilidades compartidas |
| typst-timing | Profiling |
| typst-bundle | Bundling de documentos |
| typst | Crate orquestador |

---

## Layout Engine (lo más relevante para Neupaper)

### El concepto de Regions

La abstracción más importante:

```rust
pub struct Regions<'a> {
    pub size: Size,         // espacio restante en la PRIMERA región
    pub expand: Axes<bool>, // ¿expandir para llenar?
    pub full: Abs,          // altura completa (para sizing relativo)
    pub backlog: &'a [Abs], // alturas de regiones siguientes
    pub last: Option<Abs>,  // región final repetible (para páginas infinitas)
}
```

- Todas las regiones comparten el mismo ancho (simplificación deliberada)
- `last: Some(height)` crea secuencia infinita de regiones del mismo alto
- `may_progress()` previene loops infinitos con contenido más alto que una página

**Vs Neupaper:** Neupaper usa un solo número `remaining` que decrementa. Typst conoce TODAS las regiones futuras, habilitando look-ahead.

### Pipeline de flow en 3 fases

#### Fase 1: Collect (`collect.rs`)

Clasifica cada elemento:

```rust
enum Child {
    Line(LineChild),     // línea de párrafo (ya line-broken)
    Single(SingleChild), // bloque indivisible
    Multi(MultiChild),   // bloque partible entre páginas
    Placed(PlacedChild), // posicionado absolute/float
    Break(bool),         // salto explícito de columna/página
    Rel / Fr,            // spacing
}
```

**Insight crítico:** Los párrafos se rompen en líneas DURANTE la colección (Knuth-Plass), no durante la distribución. Cuando llega la distribución, cada línea tiene su altura conocida.

**Vs Neupaper:** Neupaper deja al browser hacer line breaking (CSS), luego mide el párrafo como un solo bloque.

#### Fase 2: Distribute (`distribute.rs`)

Encaja children en una sola región/columna:

**Sticky blocks (headings):**
- Toma **snapshot** del estado antes del heading
- Si la página termina en un heading (nada lo sigue), **restaura** snapshot → heading migra a la siguiente página
- Guard `stickable`: si el heading está al top de una página nueva, deshabilita stickiness para evitar loops infinitos

**Vs Neupaper:** Neupaper peek-ahead simple. Typst snapshot/restore más robusto con protección de loops.

**Widow/orphan prevention:**
- Cada `LineChild` tiene campo `need` que incluye no solo su altura sino la de líneas agrupadas
- Primera línea de párrafo: `need` = height de primeras 2 líneas + leading
- Últimas 2 líneas: `need` = height de últimas 2 líneas + leading
- El distributor no coloca una línea si su `need` no cabe

**Vs Neupaper:** Neupaper NO tiene prevención de widows/orphans. Solo parte `<p>` con binary search sin considerar mínimo de líneas.

**Breakable blocks (MultiChild):**
- Se layout en TODAS las regiones disponibles a la vez
- Devuelve primer frame + "spill" con lo que no cabe
- El spill se continúa en la siguiente página
- Así tablas, bloques, grids se parten entre páginas

**Vs Neupaper:** Neupaper trata todo excepto `<p>` como indivisible. Una tabla más alta que A4 se desborda.

#### Fase 3: Compose (`compose.rs`)

Maneja concerns a nivel de página: floats, footnotes, columnas, line numbers.

- Wrappea el distributor
- Puede **reiniciar layout** cuando se añade un float (reduce espacio disponible)
- `Insertions` trackea floats top/bottom y footnotes separadamente
- Footnotes deben aparecer en la misma página que sus markers
- Si un footnote no cabe, el marker migra a la siguiente página

**Vs Neupaper:** Neupaper no tiene floats ni footnotes. El composer layer no existe.

### Spacing y margin collapsing

Sistema basado en **weakness** (0-5), no CSS margin collapsing:

- Weakness 0 = spacing fuerte/absoluto (nunca colapsa)
- Weakness 1-5 = spacing débil que puede ser sobreescrito
- Cuando dos spacings débiles son adyacentes, gana el más fuerte (lower weakness)
- Iguales weakness → gana el mayor valor
- Paragraph spacing = weakness 4
- Leading entre líneas = weakness 5

**Vs Neupaper:** CSS margin collapsing del browser. Funciona para casos básicos.

### Line breaking: Knuth-Plass

Implementación two-pass optimizada:

**Pass 1 (Approximate):** Knuth-Plass con arrays cumulativos (barato) → upper cost bound
**Pass 2 (Exact + Bounded):** Knuth-Plass proper, poda search space con el bound del Pass 1

Cost function:
```
cost = (1 + badness + penalty)²
badness = 100 × |ratio|³
ratio = (available_width - line_width) / adjustability
```

Penalties: hyphenation (135 base), runts (100), dashes consecutivos.

También soporta modo greedy simple (`Linebreaks::Simple`).

**Vs Neupaper:** Browser usa greedy. No tiene Knuth-Plass. Importa para texto justificado, menos para left-aligned.

### Page breaks

**Explícitos:** Content se corta en "runs" en cada `PagebreakElem`. Cada run se layouta independientemente (y en paralelo via rayon).

- **Weak pagebreaks** solo disparan si hay contenido antes
- **Strong pagebreaks** siempre crean página nueva
- Soporte de paridad: `pagebreak(to: "odd")` inserta páginas en blanco si necesario

**Vs Neupaper:** `${ pagebreak }` via CSS class. Sin distinción weak/strong ni paridad.

---

## Sistema de fonts

Built on:
- **fontdb** — descubrimiento de fonts
- **rustybuzz** — shaping (port de HarfBuzz)
- **subsetter** — subsetting para PDF
- **hypher** — hyphenation

### Configuración en documentos

```typst
#set text(font: "Inter", size: 12pt, weight: "regular")
```

`TextElem` ofrece control granular:
- font, fallback, style, weight, stretch, size, fill, stroke
- **OpenType features:** kerning, ligatures (standard, discretionary, historical), stylistic alternates, stylistic sets (ss01-ss20), figure styles, slashed zeros, fractions
- Language/region (BCP 47 para script-aware shaping)
- Font coverage control (`covers` property para restringir Unicode ranges)
- Layout metrics configurables (ascender, cap-height, x-height, baseline, descender)

**Vs Neupaper:** Neupaper delega todo el font handling al browser y CSS. Vastamente más simple pero sin control programático de métricas.

---

## Scripting / Templating

Typst tiene un **lenguaje de programación completo** embebido via `#`:

```typst
#let data = json("data.json")
#for item in data.items [
  - *#item.name*: #item.price €
]
#if data.discount > 0 [
  Discount: #data.discount%
]
```

Features: variables, funciones, closures, control flow, pattern matching, type system, data loading (json/csv/yaml/toml), three modes (Markup/Code/Math).

**VM:** Stack-based scope management. `Eval` trait en nodos AST produce `Value` o `Content`. Module system con imports.

**Vs Neupaper:** Markdown Isles (`${ }`) es deliberadamente más simple — template substitution estilo Handlebars. Esto es un feature, no una limitación: Neupaper apunta a usuarios que quieren simplicidad de Markdown.

---

## Styling / Theming

### Two-rule system

**Set Rules** (propiedades):
```typst
#set text(font: "Inter", size: 11pt)
#set page(margin: 2cm)
```

**Show Rules** (transformaciones):
```typst
#show heading: it => [#it.body ---]
#show "TODO": text(red)[TODO]
```

**StyleChain:** Linked list non-allocating. Camina innermost → outermost para resolver propiedades. Style Folding: `set stroke: red` + `set stroke: 4pt` → `4pt + red`.

**Vs Neupaper:** `${ config @typeface:inter @theme:dark }` es key-value simple. CSS maneja theming. Apropiado para web.

---

## PDF Generation (3 capas)

### Layer 1: pdf-writer
- Serialización low-level de objetos PDF a byte buffer
- Builder pattern con typed writers
- Zero unsafe code

### Layer 2: krilla
- Mid-level: fills, strokes, gradients, glyphs, images
- Font subsetting (CFF y TTF)
- PDF standards: PDF 1.4-2.0, PDF/A-1 a A-4, PDF/UA-1
- Tagged PDF para accesibilidad
- Multithreading opcional via rayon
- 210+ visual regression tests

### Layer 3: typst-pdf
Pipeline en `convert.rs`:
1. Recibe `PagedDocument` + `PdfOptions`
2. Crea `Document` krilla
3. Itera páginas, procesa frames recursivamente
4. Handlers especializados: text, shape, image, link
5. Finaliza con outlines, metadata, tagged PDF tree
6. Retorna `Vec<u8>` (PDF bytes)

**Font embedding:**
- `handle_text()` recibe `TextItem` con font, size, glyph data
- Cache bidireccional de fonts (typst ↔ krilla)
- Subsetting: solo embebe glyps usados en el documento
- Performance: evita `Em::at` por finiteness check costoso

**Vs Neupaper:** Puppeteer es más simple (Chrome genera PDF) pero menos controlable. Typst produce PDFs más pequeños y predecibles. Para Neupaper web-first, Puppeteer es la elección pragmática.

---

## Web / WASM

### typst.ts (community)
- Compila el compilador Typst a WASM para browser/Node.js
- Implementa `World` trait en JavaScript (virtual filesystem, font loading, package resolution)
- Tres modos de rendering: SVG server-side, Vector IR, Canvas client-side
- Integrations: React, Angular, Vue3

### typst.app
- Web app oficial (comercial)
- Corre compilador via WASM con UI, autocomplete, live preview

### WASM plugins (desde v0.8.0)
- Typst soporta plugins WASM nativos dentro de documentos
- Performance mejorado en v0.13.0

### El World Trait
Abstracción para el entorno de compilación:
- Files: resolución y lectura
- Fonts: descubrimiento, carga, provisión
- Packages: descarga y cache
- Implementaciones: CLI (SystemWorld), IDE (tinymist), browser (typst.ts), testing

---

## Sistema de packages

```typst
#import "@preview/tablex:0.0.8": *
```

- Packages en `packages/preview/{name}/{version}` del repo typst/packages
- Version completa obligatoria (no hay "latest")
- `typst.toml` como manifest
- Local packages: `@local/mypkg:1.0.0`
- Templates: scaffolding via `typst init`
- Auto-download + cache offline
- **Typst Universe** (typst.app/universe): registry community

**Vs Neupaper:** Typst es registry-based, versionado, inmutable. Neupaper es shadcn-inspired (copy-paste local, editable, `/install` + `/restore`). Mejor para nuestro user profile.

---

## HTML Export (experimental)

- Desde Typst 0.13 (Feb 2025), NLnet-funded
- `--format html --features html`
- **Solo semántico** — NO genera CSS, usuarios escriben sus propios estilos
- `typst watch` con HTML output levanta HTTP server con live-reload
- Muy incompleto, solo para experimentación

**Vs Neupaper:** Neupaper ya parte de HTML (Markdown → remark → HTML). No aplica.

---

## Computación incremental (comemo)

- Naive memoización de `eval(world)` invalida con CUALQUIER cambio
- comemo trackea qué datos específicos accedió cada función memoizada
- `#[track]` en trait impls logea method calls
- `#[memoize]` en funciones verifica si dependencias tracked cambiaron
- Resultado: editar un archivo solo re-evalúa funciones que dependían de ese archivo

**Relevancia para Neupaper:** Si los documentos crecen, memoizar evaluación de bloques `${ }` individuales (keyed en source + data dependencies) evitaría re-evaluar el documento entero en cada keystroke.

---

## Comparativa Typst vs Neupaper

| Aspecto | Typst | Neupaper |
|---------|-------|----------|
| Lenguaje | Rust | TypeScript |
| Plataforma | CLI + WASM web app | Next.js web app |
| Parser | Custom Rust (CST + AST) | Custom TS (tokenizer + AST) + remark |
| Rendering | Propio (frames → PDF/SVG/PNG) | Browser (DOM → Puppeteer PDF) |
| Layout | Motor propio con Knuth-Plass | Browser CSS + DOM measurement |
| Paginación | Regions + collect/distribute/compose | DOM partitioner + binary search |
| Fonts | rustybuzz + subsetter (control total) | CSS @font-face (browser controla) |
| Scripting | Lenguaje completo con VM | Template substitution (${ }) |
| Theming | Set/show rules con StyleChain | CSS variables + @theme config |
| Incremental | comemo (memoización con tracking) | Re-parse completo por keystroke |
| Open source | Sí (Apache 2.0) | Sí |

---

## Patrones a adoptar

1. **Tablas y listas partibles.** Recorrer `<tr>` o `<li>` como Typst recorre `MultiChild`. Cuando no cabe, partir en boundary de fila/item y continuar en siguiente página.

2. **Prevención de widows/orphans.** Concepto de `need`: primera línea de párrafo → need = 2 líneas + leading. No colocar si need no cabe. Mínimo 2 líneas en cada lado del split.

3. **Mejora de sticky headings.** Checkpoint/restore en vez de peek-ahead. Guard `stickable` para evitar loops infinitos (deshabilitar stickiness si heading ya está al top de página nueva).

4. **Concepto de `need`.** Para cada elemento, computar no solo su altura sino la mínima necesaria para evitar orphans. Heading → need = heading height + 2 primeras líneas del párrafo siguiente.

5. **Realization como fase separada.** Cuando añadamos `.isle` components, separar "resolver componentes" (realize) de "calcular posiciones" (layout). Mirrors la separación limpia de Typst.

6. **Computación incremental.** Si documentos crecen, memoizar evaluación de bloques `${ }` individuales keyed en source + data dependencies.

## Patrones a NO adoptar

1. **Motor de layout propio.** Typst calcula posiciones él mismo. Nosotros medimos DOM. Cambiar sería reescribir todo. Browser layout es "good enough" para nuestro caso.

2. **Knuth-Plass line breaking.** Solo importa para texto justificado. Neupaper usa left-aligned por defecto. El browser maneja line breaking.

3. **Font pipeline nativo.** Subsetting, shaping, metrics propias. Puppeteer/Chrome lo hace por nosotros.

4. **Lenguaje de scripting completo.** Markdown Isles es deliberadamente simple. La complejidad de un VM + type system no aporta al user profile de Neupaper.

5. **Convergencia iterativa de layout.** Typst necesita múltiples pasadas porque page numbers afectan layout. Neupaper no tiene ese problema — no genera page numbers dinámicos en el layout.

---

## Mejoras prioritarias para el partitioner de Neupaper

| Mejora | Impacto | Esfuerzo |
|--------|---------|----------|
| Tablas/listas partibles | Alto | Medio |
| Widow/orphan prevention | Alto | Bajo |
| Concepto de `need` | Alto | Bajo |
| Sticky headings mejorado (checkpoint/restore) | Medio | Bajo |
| Breakable blockquotes | Bajo | Bajo |
| Regions con look-ahead | Medio | Medio |
| Floats/footnotes | Bajo (MVP) | Alto |

---

## Fuentes

- https://github.com/typst/typst
- https://github.com/typst/pdf-writer
- https://github.com/typst/subsetter
- https://github.com/typst/comemo
- https://github.com/typst/packages
- https://github.com/LaurenzV/krilla
- https://github.com/Myriad-Dreamin/typst.ts
- https://typst.app/universe/
- https://typst.app/blog/2025/typst-0.13/
- https://nlnet.nl/project/Typst-HTML/

---

*Estudio realizado el 2026-03-25 como referencia arquitectónica para Neupaper.*


Lo más relevante:
  - Typst ES open source (a diferencia de Obsidian) — todo el layout engine
   es estudiable
  - Su sistema de Regions + collect/distribute/compose es exactamente lo   
  que nuestro partitioner necesita mejorar
  - El concepto de need (altura mínima para evitar orphans) es simple de   
  implementar y de alto impacto
  - Tablas partibles (MultiChild con spill) — nuestro mayor gap actual     
  - Checkpoint/restore para sticky headings es más robusto que nuestro     
  peek-ahead

  Mejoras más impactantes para Neupaper (por esfuerzo/impacto):
  1. Widow/orphan prevention (alto impacto, bajo esfuerzo)
  2. Concepto de need (alto impacto, bajo esfuerzo)
  3. Tablas/listas partibles (alto impacto, medio esfuerzo)
  4. Sticky headings con checkpoint/restore (medio impacto, bajo esfuerzo) 