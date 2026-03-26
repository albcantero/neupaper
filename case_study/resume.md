14 case studies completados. Resumen final de todos:

  ┌─────┬─────────────┬───────┬────────────┬────────────────────┐   
  │  #  │  Proyecto   │ Stars │ Relevancia │   Lo único que     │   
  │     │             │       │            │       aporta       │   
  ├─────┼─────────────┼───────┼────────────┼────────────────────┤   
  │     │             │       │            │ CM6 Visual Editor  │   
  │ 1   │ Overleaf    │ 17.5K │ Máxima     │ via decorations,   │   
  │     │             │       │            │ gold standard      │   
  │     │             │       │            │ source→PDF         │   
  ├─────┼─────────────┼───────┼────────────┼────────────────────┤   
  │     │             │       │            │ Layout engine,     │   
  │ 2   │ Typst       │ 52K   │ Alta       │ widow/orphan, need │   
  │     │             │       │            │  concept           │   
  ├─────┼─────────────┼───────┼────────────┼────────────────────┤   
  │     │             │       │            │ Mismo stack        │   
  │ 3   │ Inkdrop     │ —     │ Alta       │ (remark), $10K MRR │   
  │     │             │       │            │  solo dev          │   
  ├─────┼─────────────┼───────┼────────────┼────────────────────┤   
  │     │             │       │            │ FileApi sync       │   
  │ 4   │ Joplin      │ 54K   │ Alta       │ pattern, inline    │   
  │     │             │       │            │ CM6 widgets        │   
  ├─────┼─────────────┼───────┼────────────┼────────────────────┤   
  │     │             │       │            │ Closest            │   
  │ 5   │ HedgeDoc    │ 7K    │ Alta       │ architecture, line │   
  │     │             │       │            │  mapping scroll    │   
  │     │             │       │            │ sync               │   
  ├─────┼─────────────┼───────┼────────────┼────────────────────┤   
  │     │             │       │            │ Live Preview,      │   
  │ 6   │ Obsidian    │ —     │ Alta       │ auto-cleanup       │   
  │     │             │       │            │ lifecycle          │   
  ├─────┼─────────────┼───────┼────────────┼────────────────────┤   
  │     │             │       │            │ Go middleware      │   
  │ 7   │ Anytype     │ 7.3K  │ Media      │ shared, protobuf   │   
  │     │             │       │            │ contracts, CRDT    │   
  ├─────┼─────────────┼───────┼────────────┼────────────────────┤   
  │ 8   │ Logseq      │ 33K   │ Media      │ iframe sandbox,    │   
  │     │             │       │            │ Web Workers, OPFS  │   
  ├─────┼─────────────┼───────┼────────────┼────────────────────┤   
  │     │ Standard    │       │            │ Encryption         │   
  │ 9   │ Notes       │ 6.4K  │ Media      │ protocol, "dumb    │   
  │     │             │       │            │ store"             │   
  ├─────┼─────────────┼───────┼────────────┼────────────────────┤   
  │     │             │       │            │ Scripting, /s/uuid │   
  │ 10  │ TriliumNext │ 35K   │ Media      │  sharing,          │   
  │     │             │       │            │ self-hosting       │   
  ├─────┼─────────────┼───────┼────────────┼────────────────────┤   
  │ 11  │ Roam        │ —     │ Histórica  │ Pioneer patterns,  │   
  │     │             │       │            │ market lesson      │   
  ├─────┼─────────────┼───────┼────────────┼────────────────────┤   
  │     │             │       │            │ Same Next.js 16,   │   
  │ 12  │ Jotty       │ 1.7K  │ Stack      │ 20+ themes CSS,    │   
  │     │             │       │            │ window.printReady  │   
  ├─────┼─────────────┼───────┼────────────┼────────────────────┤   
  │ 13  │ RemNote     │ —     │ Baja       │ Lifetime pricing,  │   
  │     │             │       │            │ Capacitor OTA      │   
  ├─────┼─────────────┼───────┼────────────┼────────────────────┤   
  │ 14  │ GoodNotes   │ —     │ Baja       │ Automerge CRDT,    │   
  │     │             │       │            │ PDFium WASM        │   
  └─────┴─────────────┴───────┴────────────┴────────────────────┘   

  El mega-hallazgo transversal: De 14 productos, NINGUNO tiene PDF generation comparable a Neupaper. Todos usan Electron printToPDF (limitado), browser print, o no lo tienen. Puppeteer + /print route + A4 canvas preview Qes un diferenciador universal.