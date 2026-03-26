# Standard Notes Case Study

Estudio de la arquitectura de Standard Notes, extraído del análisis de https://github.com/standardnotes (93 repos). App de notas E2E encrypted, adquirida por Proton en 2024.

**Nota:** Standard Notes ES open source (AGPL-3.0). 300K+ usuarios. Adquirida por Proton (abril 2024).

---

## Qué es Standard Notes

App de notas cross-platform centrada en **privacidad y encriptación**. E2E encrypted by default. Sistema de editores modulares (plain text, Markdown, block editor, code, spreadsheets). Self-hostable. Modelo freemium agresivo (free = solo plain text).

---

## Stack técnico

| Layer | Tecnología |
|-------|-----------|
| Monorepo | Yarn workspaces + Lerna (21 packages) |
| Web | React 18 + Webpack + Tailwind + SCSS |
| Desktop | Electron |
| Mobile | React Native shell con **single WebView** |
| Editor flagship | **Lexical** (fork propio de Facebook's Lexical) |
| PDF | @react-pdf/renderer |
| Encryption | XChaCha20-Poly1305 + Argon2id |
| Server | TypeScript (4 containers Docker) |
| DB | MySQL 8 + Redis 7 |
| Workers | Comlink (Web Workers) |
| UI primitives | @ariakit/react |
| i18n | ttag |
| License | AGPL-3.0 |

---

## Monorepo (21 packages en `app`)

**Apps:** web, desktop (Electron), mobile (React Native WebView)

**Core:** snjs (business logic + encryption + sync), encryption, sncrypto-common, sncrypto-web, models, services, api, responses, features

**UI:** styles, icons, toast, ui-services, clipper

**Files:** files, filepicker

**Editors (en el monorepo):** markdown-basic, markdown-hybrid, markdown-math, markdown-minimal, markdown-visual, rich-text, simple-task-editor, spreadsheets, bold-editor, classic-code-editor

---

## Encryption — Standard Notes Protocol v004

Su differentiator principal. Protocolo meticulosamente especificado.

### Key derivation

- **Argon2id** — memory: 64MB, iterations: 5, parallelism: 1
- Salt: 128 bits (SHA256 de "identifier:seed")
- Output: 512 bits → split en dos:
  - 256 bits = **masterKey** (nunca sale del device)
  - 256 bits = **serverPassword** (solo para auth)

### Encryption

- **XChaCha20-Poly1305** — key 256 bits, nonce 192 bits (random per encryption)
- Formato: `004:nonce:ciphertext:authenticated_data`
- Authenticated data incluye: item UUID, version, keyParams

### Arquitectura de 3 capas de keys

1. **Root Key** — derivada del password, una por cuenta
2. **Items Keys** — encriptan items individuales; encriptadas con root key
3. **Root Key Wrapper** — capa opcional local (application passcode encripta root key)

### Per-item encryption flow

1. Generar random 256-bit `item_key`
2. Encriptar content con `item_key`
3. Encriptar `item_key` con el default `itemsKey`
4. Almacenar UUID del `itemsKey` como referencia

### Password changes

Solo re-encriptan los `itemsKeys`, NO todos los items. Minimiza re-encryption.

### Data integrity

Todo dato encriptado está firmado criptográficamente. Desencriptar valida la firma.

---

## Sistema de Editores

### Arquitectura dual

**Editores nativos** (renderizados en React directo):
- **Plain Text** — textarea simple, free
- **Super** — Lexical-based block editor, premium

**Editores iframe** (loaded via `<iframe>` + component-relay):
- Authenticator, Spreadsheets, y todos los editores deprecados
- Comunicación via `postMessage` con `@standardnotes/component-relay`
- CSS variables `--sn-stylekit-*` se inyectan en el iframe para theming automático

### Super Editor (Lexical) — Deep Dive

Built con **Lexical v0.38.1** (upstream, NO fork). 8 packages de `@lexical/*`. Ubicado en `packages/web/src/.../SuperEditor/`.

**Nodos registrados (20+ tipos):**
- Text: AutoLink, CodeHighlight, Code, Hashtag, Mark, Link, Overflow
- Structure: Heading, Quote, HorizontalRule, List, ListItem
- Tables: Table, TableCell, TableRow
- Media: Tweet, YouTube, RemoteImage
- Files: File (encrypted), InlineFile
- Custom: CollapsibleContainer/Content/Title, Bubble (@mentions)

**Storage:** Super notes se almacenan como **JSON** (Lexical native serialization), NO Markdown. Markdown es export target lossy.

**Slash commands (`/`):**
- Trigger inmediato al escribir `/` (`minLength: 0`)
- 14 tipos de bloque: Paragraph, H1-H3, Table, Divider, Collapsible, Bulleted/Numbered/Checklist, Remote Image, File, Code Block, Block Quote, DateTime, Password generator
- Cada opción es `BlockPickerOption` con title, icon, keywords, onSelect
- Regex filtering mientras el usuario escribe
- Popover anchored al cursor

**@mentions:**
- Trigger inmediato al escribir `@`
- Linkar otros notes, files, tags (con opción de crear tags nuevos)
- Inserción como `BubbleNode` (inline chip/pill)
- Custom hook `useTypeaheadAllowingSpacesAndPunctuation` para search flexible

**Embeds:** YouTube, Tweets, Remote Images, Encrypted Files, Collapsible/Toggle blocks

**Toolbar:**
- Fixed (desktop top), Floating (8px above selection), Mobile (conditional)
- Bold, Italic, Underline, Link, Code, Undo/Redo
- Dropdowns: formatting, block types, insert, alignment, TOC

**25+ plugins compuestos** en un solo `BlocksEditor` component. Cada plugin registra Lexical commands y maneja sus propios node types.

### Editores deprecados (todos iframe-based, todos paid)

- Markdown (5 variantes: basic, visual, math, hybrid, minimal)
- Rich Text, Alternative Rich Text
- Code (basado en **Monaco Editor**, 60+ languages, Prettier)
- Spreadsheets, Checklist

**Estrategia clara:** Super editor reemplaza todo. Conversión Super→Markdown es lossy.

### Para Neupaper

SN usa Lexical (block-based WYSIWYG, almacena JSON) — oculta el markup. Neupaper usa CM6 (source-level Markdown, almacena `.neu`) — abraza el markup. Filosofías opuestas.

**Lección clave:** SN deprecó 10+ editores en favor de uno solo. Mantener múltiples editors es costoso. Neupaper correctamente tiene UN editor (CM6).

Slash commands son simples: typeahead con regex, `BlockPickerOption` minimal. Si implementamos slash commands para `${ }` blocks, no necesitamos un registry complejo.

---

## Mobile: Single WebView

**Evolución:**
- 2016: Tres codebases (web, native Swift, native Kotlin)
- 2017: Dos (web + React Native)
- Actual: **Una** — React Native shell con un WebView que renderiza la web app completa

Comunicación nativa via `postMessage` bridge (keychain, biometrics, filesystem). Publicly stated "React Native is not the future" y movieron a WebView approach.

### Para Neupaper

Valida el approach web-first. Si Neupaper necesita mobile, un WebView wrapper (Capacitor o React Native shell) es el patrón probado. No native apps.

---

## Sync

- Server es un **"dumb data store"** — solo guarda y retorna blobs encriptados
- Sync item-based: cada nota/tag/preference es un item encriptado con UUID
- Conflict resolution via `updated_at` timestamps
- **Offline-first:** funciona sin conexión, sync cuando hay conectividad
- **Multi-client key recovery:** wizard para cuando clients tienen keys diferentes (password cambiado en otro device)

### Para Neupaper

El concepto de "dumb store" es relevante. Si Supabase solo almacena blobs encriptados del vault, la lógica de negocio vive 100% en el cliente. Simplifica el server enormemente.

---

## Self-Hosting

**Solo Docker** (4 containers):

| Container | Función |
|-----------|---------|
| API Gateway | Router/proxy |
| Syncing Server | Data y sync |
| Auth Service | Authentication |
| Background Worker | Async tasks (email backups, revision history) |

- MySQL 8 + Redis 7
- 65%+ reducción de memoria vs setup legacy
- Clientes configuran custom sync server URL en Advanced Settings

---

## PDF Export

- **Super notes pueden exportar a PDF** (anunciado enero 2024)
- Usa **@react-pdf/renderer** (client-side, no Puppeteer)
- También soporta OS-native "Print to PDF" como fallback
- **Direct printing NOT supported** — reconocen que es "non-trivial given the variety of editor formats"
- Bulk export solo como text files

### Vs Neupaper

PDF es un afterthought en SN. No hay preview A4, no hay paginación controlada, no hay Puppeteer pixel-perfect. **Neupaper's PDF pipeline es un diferenciador masivo.**

---

## Themes

- CSS files que sobreescriben CSS custom properties/variables
- Funcionan cross-platform automáticamente (mobile es WebView → mismos CSS)
- Instalados via JSON manifest (`ext.json`) con URL al CSS
- Built-in: autobiography, bold-editor, classic-code-editor, dynamic, focus, futura, midnight, solarized-dark, titanium
- Community themes via URL (hosted en GitHub)
- **Themes son paid-only**

---

## Listed — Publishing Platform

- Blogging gratuito en **listed.to**
- Two-click publishing desde Standard Notes
- Email newsletters automáticos a subscribers
- Markdown y WYSIWYG formatting
- Customizable con CSS

---

## Modelo de negocio

**Adquirida por Proton** (abril 2024). 300K+ usuarios.

| Plan | Precio | Features |
|------|--------|----------|
| Free | $0 | Solo plain text, unlimited notes/devices, tags, pin/archive |
| Productivity | ~$90/year | Todos los editores, themes, files, revision history, email backups, Listed |
| Professional | ~$120/year | Todo + 100GB storage, max history, family sharing, U2F keys |

**Free tier extremadamente limitado:** Solo plain text, sin formatting, sin themes, sin files. Contraste con Neupaper donde Markdown editing completo es free.

---

## Proton Acquisition

- Adquirida abril 2024
- Permanece independiente y open source
- Se integra en el ecosistema Proton (Mail, VPN, Drive, Calendar, Pass)
- Valida el mercado privacy-first para productivity tools

---

## Comparativa Standard Notes vs Neupaper

| Aspecto | Standard Notes | Neupaper |
|---------|---------------|----------|
| Focus | Privacy/encryption | Document authoring + PDF |
| Editor | Lexical (block WYSIWYG) | CodeMirror 6 (Markdown source) |
| Markdown | Oculta markup (WYSIWYG) | Abraza markup (source view) |
| Encryption | XChaCha20-Poly1305, E2E by default | No (aún) |
| PDF | @react-pdf/renderer (básico) | Puppeteer (pixel-perfect) |
| Templates | No | Markdown Isles (${ }) |
| Math | No built-in | KaTeX integrado |
| Diagrams | No built-in | Mermaid integrado |
| Free tier | Solo plain text | Markdown completo + preview + PDF con watermark |
| Self-hosting | Docker (4 containers) | Planned |
| Mobile | WebView en React Native shell | Web responsive |
| Open source | Sí (AGPL-3.0) | Sí |
| Pricing | $90-120/year | ~8-12€/mo (~96-144€/year) |
| Adquisición | Proton (2024) | Independiente |

---

## Patrones a adoptar

1. **"Dumb store" server pattern.** Server solo almacena/retorna blobs. Toda la lógica en el cliente. Simplifica server enormemente. Aplicable a nuestra Supabase integration.

2. **Protocol specification formal.** SN v004 está meticulosamente documentado. Si Neupaper añade encryption, tener un spec formal del protocolo es crucial.

3. **Editor isolation via iframe.** Cada editor en iframe con postMessage bridge. Validado por SN, Obsidian, Logseq, Anytype — es EL patrón para code isolation.

4. **Single WebView for mobile.** React Native shell con WebView de la web app completa. Eliminó dos codebases nativos. Pattern probado para web-first apps.

5. **Self-hosting con Docker minimal.** 4 containers es limpio. Si Neupaper ofrece self-hosting, mantenerlo a ≤4 containers.

6. **Listed (publishing platform).** Two-click publishing de notas a blog público con newsletters. Relevante si Neupaper quiere ofrecer document publishing (`/s/uuid`).

## Patrones a NO adoptar

1. **Free tier solo plain text.** Demasiado restrictivo. Neupaper's free con Markdown completo es más generoso y genera mejor conversion porque el usuario experimenta el producto real.

2. **Lexical como editor.** Block-based WYSIWYG oculta el markup. Para un producto Markdown-first, CM6 source editing es correcto.

3. **XChaCha20 encryption by default.** Complejidad enorme (key derivation, key rotation, multi-device recovery). No es core para un editor de documentos profesionales. Nice-to-have futuro, no priority.

4. **Multiple editor types per note.** SN permite cambiar de editor por nota (Markdown, WYSIWYG, Code, Spreadsheet). Añade complejidad de migración de datos. Neupaper tiene un editor (CM6) y es suficiente.

5. **Webpack.** Outdated. Next.js con Turbopack es más moderno.

---

## Fuentes

- https://github.com/standardnotes (93 repos)
- https://github.com/standardnotes/app
- https://github.com/standardnotes/server
- https://standardnotes.com/help/security/encryption
- https://standardnotes.com/plans
- https://standardnotes.com/help/self-hosting/docker
- https://standardnotes.com/blog/joining-forces-with-proton
- https://standardnotes.com/blog/react-native-is-not-the-future
- https://github.com/standardnotes/listed

---

*Estudio realizado el 2026-03-25 como referencia arquitectónica para Neupaper.*


Lo más relevante:
  - Adquirida por Proton — valida el mercado privacy-first para productivity tools
  - Protocol v004 meticulosamente especificado — referencia si añadimos E2E
  - "Dumb store" server pattern — Supabase como blob store, lógica en cliente
  - Free tier solo plain text — contraste con nuestro free tier generoso (mejor para conversion)
  - PDF es afterthought — Neupaper's Puppeteer pipeline es diferenciador masivo
  - Single WebView mobile — elimina necesidad de native apps
  - Listed (publishing) — relevante para nuestro /s/uuid document sharing

  Patrones que deberíamos adoptar:
  1. "Dumb store" server (Supabase como blob store)
  2. Protocol spec formal si añadimos encryption
  3. Single WebView for mobile (Capacitor o RN shell)
  4. Self-hosting Docker minimal (≤4 containers)
  5. Publishing platform pattern (Listed → nuestro /s/uuid)
