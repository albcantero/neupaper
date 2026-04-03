# Neupaper

Reusable professional documents written in Markdown. From a developer, to developers.

Neupaper is a free, open-source document editor that lets you write once and reuse forever. It uses **Markdown Isles** — small islands of logic `${ }` inside standard Markdown — to create dynamic, data-driven documents like invoices, proposals, reports, and contracts.

**[neupaper.app](https://neupaper.app)**

## Features

- **Markdown Isles** — variables, loops, conditionals, components, and data blocks inside Markdown
- **Reusable templates** — write a document once, change the data, get a new document
- **Pixel-perfect PDF export** — what you see in the preview is what you get in the PDF
- **A4 page preview** — editorial canvas with dot pattern, zoom controls, and page-by-page navigation
- **Smart pagination** — DOM-based page partitioning with paragraph splitting at word boundaries
- **Reusable components** — `.isle` files with props, children, and full Isles evaluation inside
- **KaTeX formulas** — native LaTeX math support
- **Mermaid diagrams** — flowcharts, sequence diagrams, Gantt charts, ER diagrams
- **Syntax highlighting** — custom CodeMirror extension for Markdown Isles
- **Real-time linter** — catches unclosed blocks and undefined variables as you type
- **Document themes** — Neu Document, Modernist, and more

## Quick start

```bash
git clone https://github.com/albcantero/neupaper.git
cd neupaper
npm install
npm run dev
```

## Markdown Isles syntax

```
${ config theme="neu-document" page-numbers header="Invoice" }
${ load clients.data }

# Invoice ${ @invoice.number }

**Client:** ${ @client.name }
**Date:** ${ today }

| Service | Price |
|---------|-------|
${ for item in @lines }
| ${ item.name } | ${ item.price } € |
${ end }

${ set @total = sum @lines.price }
**Total: ${ @total } €**

${ if @client.type is vip }
Thank you for your continued trust.
${ end }
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
