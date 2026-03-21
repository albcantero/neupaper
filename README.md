# Neupaper

Dynamic documents that think. Small islands of logic in a sea of Markdown.

Neupaper is a web-based document editor with faithful PDF export, inspired by Typst and InDesign but with the simplicity of Markdown. It uses **Markdown Isles** — small islands of logic `${ }` inside standard Markdown — to create dynamic, data-driven documents.

## Features

- **Markdown Isles** — variables, loops, conditionals, and data blocks inside Markdown
- **Pixel-perfect PDF export** — what you see in the preview is what you get in the PDF
- **A4 page preview** — editorial canvas with dot pattern, zoom controls, and page-by-page navigation
- **Smart pagination** — DOM-based page partitioning with paragraph splitting at word boundaries
- **KaTeX formulas** — native LaTeX math support
- **Mermaid diagrams** — flowcharts, sequence diagrams, Gantt charts, ER diagrams
- **Syntax highlighting** — custom CodeMirror extension for `.neu` files
- **Real-time linter** — catches unclosed blocks and undefined variables as you type

## Quick start

```bash
git clone https://github.com/albcantero/neupaper.git
cd neupaper
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Markdown Isles syntax

```
${ data }
client.name = Anthropic
items props(name, price) = [
  Logo design, 500
  Website, 1200
]
${ end data }

# Invoice

Dear ${ @client.name },

${ for item in @items }
- ${ item.name }: ${ item.price } EUR
${ end }

${ if @client.type is vip }
Thank you for your continued trust.
${ end }

${ pagebreak }

## Terms and conditions
...
```

## Stack

- **Next.js** — framework
- **CodeMirror 6** — editor with custom syntax highlighting
- **Remark** — Markdown rendering (GFM, math, raw HTML)
- **Puppeteer** — PDF generation
- **Tailwind + Shadcn** — UI

## PDF export

PDF export requires Chrome/Chromium. In development, set the `CHROME_PATH` environment variable if Chrome is not in the default location:

```bash
export CHROME_PATH="/usr/bin/google-chrome"
```

## License

MIT
