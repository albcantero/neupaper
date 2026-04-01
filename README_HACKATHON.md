<br/><br/><br/><br/>
<h3 align="center">
	<img src="https://raw.githubusercontent.com/albcantero/neupaper/main/public/logo-app-name.svg " width="250" alt="Neupaper Logo"/><br/>
	<img src="https://img.shields.io/badge/New!-f14144" alt="New">
	NEUPAPER | A better way to build documents
</h3>
<br/><br/>

  > [!IMPORTANT] 
  > En dos frases: ¿qué es _Neupaper_?
  > 1. El _primer_ templating engine diseñado íntegramente para Markdown puro.[^1]
  > 2. El _primer_ editor Markdown con exportación PDF pixel-perfect sobre canvas editorial.[^2]

[^1]: Entre editores y motores de plantillas conocidos y de uso extendido. Editores Markdown contrastados: [Notion](https://notion.so), [Obsidian](https://obsidian.md), [Typora](https://typora.io), [iA Writer](https://ia.net/writer), [Inkdrop](https://inkdrop.app), [Mark Text](https://marktext.app), [StackEdit](https://stackedit.io), [HackMD](https://hackmd.io), [HedgeDoc](https://hedgedoc.org), [Dillinger](https://dillinger.io), [Joplin](https://joplinapp.org), [Logseq](https://logseq.com), [Anytype](https://anytype.io), [Standard Notes](https://standardnotes.com), [TriliumNext](https://github.com/TriliumNext/Notes), [Roam Research](https://roamresearch.com), [RemNote](https://remnote.com), [Jotty](https://github.com/nicolo-ribaudo/jotty), [GoodNotes](https://goodnotes.com). Motores de plantillas contrastados: [MDX](https://mdxjs.com), [Typst](https://typst.app), [Handlebars](https://handlebarsjs.com), [Liquid](https://shopify.github.io/liquid/), [Nunjucks](https://mozilla.github.io/nunjucks/), [Markdoc](https://markdoc.dev). Ninguno combina templating nativo dentro de Markdown puro con preview A4 y exportación PDF pixel-perfect.
[^2]: Misma comparativa de 19 editores. Editores con exportación PDF (Obsidian, Joplin, Inkdrop, Notion, Typora, iA Writer) usan `printToPDF` de Electron o `window.print()` del navegador: no tienen control sobre el resultado. Herramientas con preview A4 real (Typst, Overleaf) no son Markdown. Neupaper usa Puppeteer + ruta `/print` dedicada + canvas A4 con particionador DOM, garantizando que el PDF es idéntico al preview.

<details>
<summary><strong>Neupaper vs Notion</strong></summary>

<p align=center>
	<img src="https://raw.githubusercontent.com/albcantero/neupaper/main/public/github/screenshot%20(1).png" width="800" alt="PDF exports Notion vs Neupaper"/>
</p>

</details>

<br/>

---

### 📝 Descripción del proyecto

Este proyecto consiste en un editor web de Markdown con exportación PDF pixel-perfect con la posibilidad de aplicar varias plantillas profesionales. A diferencia de otros editores Markdown (como pueden ser _Notion_, _Obsidian_, _Inkdrop_ o _iA Writer_), Neupaper muestra una vista previa real en formato A4 sobre un canvas editorial. Su característica principal es **Markdown Isles**: islas de lógica ${ } dentro de Markdown que permiten crear bloques dinámicos con variables, bucles, condicionales y componentes. Una capa de lógica de programación en tiempo real, mucho más simple y accesible que MDX (Markdown con React) o Typst.
Dos puntos clave:
- El motor de Markdown Isles es un **parser desarrollado completamente desde cero**: tokenizer, AST builder, evaluator y linter propios, con más de 100 test unitarios. No es un wrapper sobre MDX, o sobre algún otro motor existente.
- El renderizado Markdown se apoya en `Remark` (con plugins GFM, math y raw HTML) y el editor usa `CodeMirror 6` con una extensión custom de syntax highlighting para la sintaxis de Markdown Isles. 

El editor incluye syntax highlighting custom para la sintaxis de Markdown Isles, linter en tiempo real, soporte nativo de fórmulas LaTeX (KaTeX) y diagramas Mermaid dinámicos, y un sistema de paginación (desarrollado desde cero) que parte el contenido en páginas A4 reales, incluyendo partición de párrafos a nivel de palabra con Range API.

---

### 🔗 URL de la demo (desplegada en CubePath)
[Ver el proyecto](https://neupaper.app/) alojado en CubePath.

### 📦 URL del repositorio (público)
[Ver la repo pública](https://github.com/albcantero/neupaper) en Github


### 📸 Capturas de pantalla o GIFs

<p align=center>
	<img src="https://raw.githubusercontent.com/albcantero/neupaper/main/public/github/screenshot%20(2).png" width="800" alt="Neupaper editor screenshot"/>
</p>

### ☁️ ¿Cómo has utilizado CubePath?

Neupaper está desplegado en un VPS de CubePath (`pg.micro`, Barcelona) con `Dokploy` como panel de gestión. El deploy es automático con `Nixpacks` en cada push a main. `Traefik` gestiona el SSL (`Let's Encrypt`) para el dominio. `Puppeteer` corre en el mismo servidor con _Chromium headless_ para la exportación PDF.

### 📧 Email de contacto (opcional)

alb.cantero@gmail.com

---

### ✅ Confirmación

- [x] Mi proyecto está desplegado en CubePath y funciona correctamente
- [x] El repositorio es público y contiene un README con la documentación
- [x] He leído y acepto las [reglas de la hackatón](https://github.com/midudev/hackaton-cubepath-2026#-reglas)