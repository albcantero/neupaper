"use client";

import { useState } from "react";
import {
  IconFolder,
  IconFolderOpen,
  IconChevronRight,
  IconBolt,
  IconSettings,
  IconMinus,
  IconPlus,
  IconPalette,
  IconFiles,
  IconDownload,
} from "@tabler/icons-react";
import { FileBox, FileCodeCorner, ChevronRight, PanelLeftIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import "@/app/vault/themes/neu-document.css";

// ─── Icons (same as vault FileIcon.tsx) ────────────────────────────

function FileMdIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={8.33} className={className} style={style}>
      <path d="M21.006,50l0,-33.333c0,-4.572 3.762,-8.333 8.333,-8.333l33.333,0c2.666,-0.007 5.227,1.053 7.108,2.942l14.95,14.95c1.888,1.882 2.948,4.442 2.942,7.108l0,50c0,4.572 -3.762,8.333 -8.333,8.333" />
      <path d="M62.672,8.333l0,20.833c0,2.286 1.881,4.167 4.167,4.167l20.833,0" />
      <path d="M52.801,61.25l0,25.755l7.359,0c7.064,0 12.878,-5.813 12.878,-12.878c0,-7.064 -5.813,-12.878 -12.878,-12.878l-7.359,0Z" />
      <path d="M38.083,87.005l0,-25.755l-12.878,18.397l-12.878,-18.397l0,25.755" />
    </svg>
  );
}

// ─── Types ──────────────────────────────────────────────────────────

type CodeLine = { segments: { text: string; cls?: string }[] };

interface FileEntry {
  id: string;
  name: string;
  type: "md" | "data" | "isle";
  folder?: string;
  code: CodeLine[];
}

interface TabData {
  name: string;
  value: string;
  description: string;
  mainFile: string; // id of the .md file
  files: FileEntry[];
  folders: { name: string; files: string[] }[]; // folder name -> file ids
  preview: string;
}

// ─── Syntax helper ──────────────────────────────────────────────────

function isle(text: string, cls?: string) {
  return { text, cls };
}

function line(...segments: { text: string; cls?: string }[]): CodeLine {
  return { segments };
}

function blank(): CodeLine {
  return { segments: [] };
}

// Colors matching isle-highlight.ts theme exactly
const delim = "isle-delim";   // ${ } — #a78bfa, bold
const kw = "isle-kw";         // keywords — #818cf8
const atVar = "isle-atvar";   // @variable — #34d399
const op = "isle-op-hl";      // is, in, then, get — #94a3b8 italic
const fg = "isle-fg";         // headings — foreground, bold
const fg7 = "isle-fg7";       // loop vars — foreground/70
const mt = "isle-mt";         // plain text — muted-foreground
const mt5 = "isle-mt5";       // separators — muted-foreground/50
const dKey = "isle-dkey";     // data keys — #7dd3fc
const dEq = "isle-deq";      // data = — #94a3b8
const dVal = "isle-dval";     // data values — #fbbf24
const dBrak = "isle-dbrak";   // data [ ] — #a78bfa, bold

// ─── Tab data ───────────────────────────────────────────────────────

const tabsData: TabData[] = [
  {
    name: "Project Proposal",
    value: "proposal",
    description:
      "Write your proposal once with variables and components. Change the client data, get a new proposal instantly.",
    mainFile: "proposal-md",
    folders: [
      { name: "data", files: ["clients-data"] },
    ],
    files: [
      {
        id: "proposal-md",
        name: "proposal.md",
        type: "md",
        code: [
          line(isle("${", delim), isle(' config theme="neu-document" page-numbers header="Project Proposal" ', kw), isle("}", delim)),
          line(isle("${", delim), isle(" load clients.data ", kw), isle("}", delim)),
          blank(),
          line(isle("# Proposal for ", fg), isle("${", delim), isle(" @client.name ", atVar), isle("}", delim)),
          blank(),
          line(isle("Dear ", mt), isle("${", delim), isle(" @client.name ", atVar), isle("}", delim), isle(",", mt)),
          line(isle("Thank you for considering our services.", mt)),
          blank(),
          line(isle("## Scope", fg)),
          blank(),
          line(isle("| Service | Price |", mt)),
          line(isle("|---------|-------|", mt5)),
          line(isle("${", delim), isle(" for ", kw), isle("item ", fg7), isle("in ", op), isle("@scope", atVar), isle(" }", delim)),
          line(isle("| ", mt), isle("${", delim), isle(" item.name ", fg7), isle("}", delim), isle(" | ", mt), isle("${", delim), isle(" item.price ", fg7), isle("}", delim), isle(" \u20AC |", mt)),
          line(isle("${", delim), isle(" end ", kw), isle("}", delim)),
        ],
      },
      {
        id: "clients-data",
        name: "clients.data",
        type: "data",
        folder: "data",
        code: [
          line(isle("${", delim), isle(" data ", kw), isle("}", delim)),
          line(isle("  company.name", dKey), isle(" = ", dEq), isle("Neupaper Inc.", dVal)),
          line(isle("  client.name", dKey), isle(" = ", dEq), isle("John Smith", dVal)),
          blank(),
          line(isle("  scope", dKey), isle(" props(name, price)", dEq), isle(" = [", dBrak)),
          line(isle("    Web redesign, 4800", dVal)),
          line(isle("    SEO audit, 1200", dVal)),
          line(isle("    Analytics setup, 800", dVal)),
          line(isle("  ]", dBrak)),
          line(isle("${", delim), isle(" end data ", kw), isle("}", delim)),
        ],
      },
    ],
    preview: `
      <div class="neu-header">Project Proposal</div>
      <div class="neu-page-number">01</div>
      <h1>Proposal for John Smith</h1>
      <p>Dear John Smith,<br/>Thank you for considering our services.</p>
      <h2>Scope</h2>
      <table>
        <thead><tr><th>Service</th><th>Price</th></tr></thead>
        <tbody>
          <tr><td>Web redesign</td><td>4,800 \u20AC</td></tr>
          <tr><td>SEO audit</td><td>1,200 \u20AC</td></tr>
          <tr><td>Analytics setup</td><td>800 \u20AC</td></tr>
        </tbody>
        <tfoot><tr><td><strong>Total</strong></td><td><strong>6,800 \u20AC</strong></td></tr></tfoot>
      </table>
    `,
  },
  {
    name: "Annual Report",
    value: "report",
    description:
      "Generate reports from your data files. Update the numbers, the document rebuilds itself.",
    mainFile: "report-md",
    folders: [
      { name: "components", files: [] },
      { name: "data", files: ["report-data"] },
    ],
    files: [
      {
        id: "report-md",
        name: "report.md",
        type: "md",
        code: [
          line(isle("${", delim), isle(' config theme="neu-document" page-numbers header="Annual Report" ', kw), isle("}", delim)),
          line(isle("${", delim), isle(" load report.data ", kw), isle("}", delim)),
          blank(),
          line(isle("# ", fg), isle("${", delim), isle(" @report.year ", atVar), isle("}", delim), isle(" Annual Report", fg)),
          blank(),
          line(isle("**Company:** ", mt), isle("${", delim), isle(" @company.name ", atVar), isle("}", delim)),
          line(isle("**Revenue:** $", mt), isle("${", delim), isle(" @report.revenue ", atVar), isle("}", delim)),
          blank(),
          line(isle("## Quarterly Breakdown", fg)),
          blank(),
          line(isle("${", delim), isle(" for ", kw), isle("q ", fg7), isle("in ", op), isle("@quarters", atVar), isle(" }", delim)),
          line(isle("### ", fg), isle("${", delim), isle(" q.name ", fg7), isle("}", delim)),
          line(isle("- Revenue: $", mt), isle("${", delim), isle(" q.revenue ", fg7), isle("}", delim)),
          line(isle("- Growth: ", mt), isle("${", delim), isle(" q.growth ", fg7), isle("}", delim), isle("%", mt)),
          line(isle("${", delim), isle(" end ", kw), isle("}", delim)),
        ],
      },
      {
        id: "report-data",
        name: "report.data",
        type: "data",
        folder: "data",
        code: [
          line(isle("${", delim), isle(" data ", kw), isle("}", delim)),
          line(isle("  report.year", dKey), isle(" = ", dEq), isle("2025", dVal)),
          line(isle("  company.name", dKey), isle(" = ", dEq), isle("Neupaper Inc.", dVal)),
          line(isle("  report.revenue", dKey), isle(" = ", dEq), isle("284,000", dVal)),
          blank(),
          line(isle("  quarters", dKey), isle(" props(name, revenue, growth)", dEq), isle(" = [", dBrak)),
          line(isle("    Q1, 58000, 12", dVal)),
          line(isle("    Q2, 67000, 15", dVal)),
          line(isle("    Q3, 74000, 10", dVal)),
          line(isle("    Q4, 85000, 18", dVal)),
          line(isle("  ]", dBrak)),
          line(isle("${", delim), isle(" end data ", kw), isle("}", delim)),
        ],
      },
    ],
    preview: `
      <div class="neu-header">Annual Report</div>
      <div class="neu-page-number">01</div>
      <h1>2025 Annual Report</h1>
      <p><strong>Company:</strong> Neupaper Inc.</p>
      <p><strong>Revenue:</strong> $284,000</p>
      <h2>Quarterly Breakdown</h2>
      <h3>Q1</h3>
      <ul>
        <li>Revenue: $58,000</li>
        <li>Growth: 12%</li>
      </ul>
      <h3>Q2</h3>
      <ul>
        <li>Revenue: $67,000</li>
        <li>Growth: 15%</li>
      </ul>
      <h3>Q3</h3>
      <ul>
        <li>Revenue: $74,000</li>
        <li>Growth: 10%</li>
      </ul>
      <h3>Q4</h3>
      <ul>
        <li>Revenue: $85,000</li>
        <li>Growth: 18%</li>
      </ul>
    `,
  },
  {
    name: "Invoice",
    value: "invoice",
    description:
      "Create your invoice template once. Change the client and line items, export a new PDF every month.",
    mainFile: "invoice-md",
    folders: [
      { name: "data", files: ["clients-invoice-data"] },
    ],
    files: [
      {
        id: "invoice-md",
        name: "invoice.md",
        type: "md",
        code: [
          line(isle("${", delim), isle(' config theme="neu-document" page-numbers header="Invoice" ', kw), isle("}", delim)),
          line(isle("${", delim), isle(" load clients.data ", kw), isle("}", delim)),
          blank(),
          line(isle("# Invoice ", fg), isle("${", delim), isle(" @invoice.number ", atVar), isle("}", delim)),
          blank(),
          line(isle("**Client:** ", mt), isle("${", delim), isle(" @client.name ", atVar), isle("}", delim)),
          line(isle("**Date:** ", mt), isle("${", delim), isle(" @invoice.date ", atVar), isle("}", delim)),
          blank(),
          line(isle("| Description | Hours | Rate | Amount |", mt)),
          line(isle("|-------------|-------|------|--------|", mt5)),
          line(isle("${", delim), isle(" for ", kw), isle("line ", fg7), isle("in ", op), isle("@lines", atVar), isle(" }", delim)),
          line(isle("| ", mt), isle("${", delim), isle(" line.desc ", fg7), isle("}", delim), isle(" | ", mt), isle("${", delim), isle(" line.hours ", fg7), isle("}", delim), isle(" | ", mt), isle("${", delim), isle(" line.rate ", fg7), isle("}", delim), isle(" | ", mt), isle("${", delim), isle(" line.amount ", fg7), isle("}", delim), isle(" |", mt)),
          line(isle("${", delim), isle(" end ", kw), isle("}", delim)),
          blank(),
          line(isle("${", delim), isle(" set ", kw), isle("@total", atVar), isle(" = ", op), isle("sum ", kw), isle("@lines.amount", atVar), isle(" }", delim)),
          line(isle("**Total: $", mt), isle("${", delim), isle(" @total ", atVar), isle("}", delim), isle("**", mt)),
        ],
      },
      {
        id: "clients-invoice-data",
        name: "clients.data",
        type: "data",
        folder: "data",
        code: [
          line(isle("${", delim), isle(" data ", kw), isle("}", delim)),
          line(isle("  invoice.number", dKey), isle(" = ", dEq), isle("2026-004", dVal)),
          line(isle("  invoice.date", dKey), isle(" = ", dEq), isle("April 2, 2026", dVal)),
          line(isle("  client.name", dKey), isle(" = ", dEq), isle("Acme Corp.", dVal)),
          blank(),
          line(isle("  lines", dKey), isle(" props(desc, hours, rate, amount)", dEq), isle(" = [", dBrak)),
          line(isle("    Frontend development, 32, $120, $3840", dVal)),
          line(isle("    API integration, 18, $120, $2160", dVal)),
          line(isle("    Testing & QA, 8, $100, $800", dVal)),
          line(isle("  ]", dBrak)),
          line(isle("${", delim), isle(" end data ", kw), isle("}", delim)),
        ],
      },
    ],
    preview: `
      <div class="neu-header">Invoice</div>
      <div class="neu-page-number">01</div>
      <h1>Invoice #2026-004</h1>
      <p><strong>Client:</strong> Acme Corp.</p>
      <p><strong>Date:</strong> April 2, 2026</p>
      <table>
        <thead><tr><th>Description</th><th>Hours</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>
          <tr><td>Frontend development</td><td>32</td><td>$120</td><td>$3,840</td></tr>
          <tr><td>API integration</td><td>18</td><td>$120</td><td>$2,160</td></tr>
          <tr><td>Testing &amp; QA</td><td>8</td><td>$100</td><td>$800</td></tr>
        </tbody>
        <tfoot><tr><td colspan="3"><strong>Total</strong></td><td><strong>$6,800</strong></td></tr></tfoot>
      </table>
    `,
  },
  {
    name: "NDA",
    value: "nda",
    description:
      "Mutual or one-way — the template adapts with conditionals. Change one field, get a different agreement.",
    mainFile: "nda-md",
    folders: [
      { name: "data", files: ["nda-data"] },
    ],
    files: [
      {
        id: "nda-md",
        name: "nda.md",
        type: "md",
        code: [
          line(isle("${", delim), isle(' config theme="neu-document" header="NDA" ', kw), isle("}", delim)),
          line(isle("${", delim), isle(" load nda.data ", kw), isle("}", delim)),
          blank(),
          line(isle("# Non-Disclosure Agreement", fg)),
          blank(),
          line(isle("This agreement is entered between ", mt), isle("${", delim), isle(" @party_a.name ", atVar), isle("}", delim)),
          line(isle("and ", mt), isle("${", delim), isle(" @party_b.name ", atVar), isle("}", delim), isle(".", mt)),
          blank(),
          line(isle("${", delim), isle(" if ", kw), isle("@type ", atVar), isle("is ", op), isle("mutual ", kw), isle("}", delim)),
          line(isle("Both parties agree not to disclose confidential", mt)),
          line(isle("information received from the other party.", mt)),
          line(isle("${", delim), isle(" else ", kw), isle("}", delim)),
          line(isle("${", delim), isle(" @party_b.name ", atVar), isle("}", delim), isle(" agrees not to disclose", mt)),
          line(isle("confidential information received from ", mt), isle("${", delim), isle(" @party_a.name ", atVar), isle("}", delim), isle(".", mt)),
          line(isle("${", delim), isle(" end ", kw), isle("}", delim)),
          blank(),
          line(isle("**Effective date:** ", mt), isle("${", delim), isle(" @effective_date ", atVar), isle("}", delim)),
          line(isle("**Duration:** ", mt), isle("${", delim), isle(" @duration ", atVar), isle("}", delim)),
        ],
      },
      {
        id: "nda-data",
        name: "nda.data",
        type: "data",
        folder: "data",
        code: [
          line(isle("${", delim), isle(" data ", kw), isle("}", delim)),
          line(isle("  type", dKey), isle(" = ", dEq), isle("mutual", dVal)),
          line(isle("  party_a.name", dKey), isle(" = ", dEq), isle("Neupaper Inc.", dVal)),
          line(isle("  party_b.name", dKey), isle(" = ", dEq), isle("Acme Corp.", dVal)),
          line(isle("  effective_date", dKey), isle(" = ", dEq), isle("April 3, 2026", dVal)),
          line(isle("  duration", dKey), isle(" = ", dEq), isle("2 years", dVal)),
          line(isle("${", delim), isle(" end data ", kw), isle("}", delim)),
        ],
      },
    ],
    preview: `
      <div class="neu-header">NDA</div>
      <div class="neu-page-number">01</div>
      <h1>Non-Disclosure Agreement</h1>
      <p>This agreement is entered between <strong>Neupaper Inc.</strong> and <strong>Acme Corp.</strong></p>
      <p>Both parties agree not to disclose confidential information received from the other party.</p>
      <p><strong>Effective date:</strong> April 3, 2026</p>
      <p><strong>Duration:</strong> 2 years</p>
    `,
  },
  {
    name: "CV",
    value: "cv",
    description:
      "Keep your resume as data. Update your experience, skills, and projects — the CV rebuilds itself.",
    mainFile: "cv-md",
    folders: [
      { name: "components", files: ["experience-isle"] },
      { name: "data", files: ["cv-data"] },
    ],
    files: [
      {
        id: "cv-md",
        name: "cv.md",
        type: "md",
        code: [
          line(isle("${", delim), isle(' config theme="neu-document" header="Curriculum Vitae" ', kw), isle("}", delim)),
          line(isle("${", delim), isle(" load cv.data ", kw), isle("}", delim)),
          line(isle("${", delim), isle(" import <Experience> ", kw), isle("}", delim)),
          blank(),
          line(isle("# ", fg), isle("${", delim), isle(" @name ", atVar), isle("}", delim)),
          blank(),
          line(isle("${", delim), isle(" @title ", atVar), isle("}", delim), isle(" \u00B7 ", mt), isle("${", delim), isle(" @email ", atVar), isle("}", delim), isle(" \u00B7 ", mt), isle("${", delim), isle(" @location ", atVar), isle("}", delim)),
          blank(),
          line(isle("## Experience", fg)),
          blank(),
          line(isle("${", delim), isle(" for ", kw), isle("job ", fg7), isle("in ", op), isle("@experience", atVar), isle(" }", delim)),
          line(isle("${", delim), isle(" <Experience ", kw), isle("role=", op), isle("job.role", fg7), isle(" company=", op), isle("job.company", fg7), isle(" period=", op), isle("job.period", fg7), isle(" desc=", op), isle("job.description", fg7), isle("> ", kw), isle("}", delim)),
          line(isle("${", delim), isle(" end ", kw), isle("}", delim)),
          blank(),
          line(isle("## Skills", fg)),
          blank(),
          line(isle("${", delim), isle(" for ", kw), isle("skill ", fg7), isle("in ", op), isle("@skills", atVar), isle(" then ", op), isle("skill ", fg7), isle('separator=", " ', op), isle("}", delim)),
        ],
      },
      {
        id: "experience-isle",
        name: "Experience.isle",
        type: "isle",
        folder: "components",
        code: [
          line(isle("${", delim), isle(" create <Experience> props(role, company, period, desc) ", kw), isle("}", delim)),
          blank(),
          line(isle("### ", fg), isle("${", delim), isle(" get ", op), isle("role ", kw), isle("}", delim), isle(" \u2014 ", mt), isle("${", delim), isle(" get ", op), isle("company ", kw), isle("}", delim)),
          blank(),
          line(isle("*", mt), isle("${", delim), isle(" get ", op), isle("period ", kw), isle("}", delim), isle("*", mt)),
          blank(),
          line(isle("${", delim), isle(" get ", op), isle("desc ", kw), isle("}", delim)),
          blank(),
          line(isle("${", delim), isle(" end <Experience> ", kw), isle("}", delim)),
        ],
      },
      {
        id: "cv-data",
        name: "cv.data",
        type: "data",
        folder: "data",
        code: [
          line(isle("${", delim), isle(" data ", kw), isle("}", delim)),
          line(isle("  name", dKey), isle(" = ", dEq), isle("Alberto Cantero", dVal)),
          line(isle("  title", dKey), isle(" = ", dEq), isle("Full-Stack Developer", dVal)),
          line(isle("  email", dKey), isle(" = ", dEq), isle("hello@alberto.dev", dVal)),
          line(isle("  location", dKey), isle(" = ", dEq), isle("Barcelona, Spain", dVal)),
          blank(),
          line(isle("  experience", dKey), isle(" props(role, company, period, description)", dEq), isle(" = [", dBrak)),
          line(isle("    Senior Developer, Neupaper, 2024\u2013present, Building a Markdown editor with PDF export", dVal)),
          line(isle("    Frontend Engineer, Acme Corp, 2021\u20132024, Led the design system team", dVal)),
          line(isle("  ]", dBrak)),
          blank(),
          line(isle("  skills", dKey), isle(" = [", dBrak)),
          line(isle("    TypeScript", dVal)),
          line(isle("    React", dVal)),
          line(isle("    Next.js", dVal)),
          line(isle("    Node.js", dVal)),
          line(isle("    Tailwind", dVal)),
          line(isle("  ]", dBrak)),
          line(isle("${", delim), isle(" end data ", kw), isle("}", delim)),
        ],
      },
    ],
    preview: `
      <div class="neu-header">Curriculum Vitae</div>
      <div class="neu-page-number">01</div>
      <h1>Alberto Cantero</h1>
      <p>Full-Stack Developer · hello@alberto.dev · Barcelona, Spain</p>
      <h2>Experience</h2>
      <h3>Senior Developer — Neupaper</h3>
      <p><em>2024–present</em></p>
      <p>Building a Markdown editor with PDF export</p>
      <h3>Frontend Engineer — Acme Corp</h3>
      <p><em>2021–2024</em></p>
      <p>Led the design system team</p>
      <h2>Skills</h2>
      <p>TypeScript, React, Next.js, Node.js, Tailwind</p>
    `,
  },
  {
    name: "Timesheet",
    value: "timesheet",
    description:
      "Log your hours in a data file. The timesheet calculates totals and averages automatically.",
    mainFile: "timesheet-md",
    folders: [
      { name: "data", files: ["timesheet-data"] },
    ],
    files: [
      {
        id: "timesheet-md",
        name: "timesheet.md",
        type: "md",
        code: [
          line(isle("${", delim), isle(' config theme="neu-document" page-numbers header="Timesheet" ', kw), isle("}", delim)),
          line(isle("${", delim), isle(" load timesheet.data ", kw), isle("}", delim)),
          blank(),
          line(isle("# Timesheet — ", fg), isle("${", delim), isle(" @project.name ", atVar), isle("}", delim)),
          blank(),
          line(isle("**Client:** ", mt), isle("${", delim), isle(" @client.name ", atVar), isle("}", delim)),
          line(isle("**Week:** ", mt), isle("${", delim), isle(" @week ", atVar), isle("}", delim)),
          blank(),
          line(isle("| Day | Task | Hours |", mt)),
          line(isle("|-----|------|-------|", mt5)),
          line(isle("${", delim), isle(" for ", kw), isle("entry ", fg7), isle("in ", op), isle("@entries", atVar), isle(" }", delim)),
          line(isle("| ", mt), isle("${", delim), isle(" entry.day ", fg7), isle("}", delim), isle(" | ", mt), isle("${", delim), isle(" entry.task ", fg7), isle("}", delim), isle(" | ", mt), isle("${", delim), isle(" entry.hours ", fg7), isle("}", delim), isle(" |", mt)),
          line(isle("${", delim), isle(" end ", kw), isle("}", delim)),
          blank(),
          line(isle("${", delim), isle(" set ", kw), isle("@total", atVar), isle(" = ", op), isle("sum ", kw), isle("@entries.hours", atVar), isle(" }", delim)),
          line(isle("${", delim), isle(" set ", kw), isle("@daily_avg", atVar), isle(" = ", op), isle("avg ", kw), isle("@entries.hours", atVar), isle(" }", delim)),
          blank(),
          line(isle("**Total hours:** ", mt), isle("${", delim), isle(" @total ", atVar), isle("}", delim)),
          line(isle("**Daily average:** ", mt), isle("${", delim), isle(" @daily_avg ", atVar), isle("}", delim)),
        ],
      },
      {
        id: "timesheet-data",
        name: "timesheet.data",
        type: "data",
        folder: "data",
        code: [
          line(isle("${", delim), isle(" data ", kw), isle("}", delim)),
          line(isle("  project.name", dKey), isle(" = ", dEq), isle("Website Redesign", dVal)),
          line(isle("  client.name", dKey), isle(" = ", dEq), isle("Acme Corp.", dVal)),
          line(isle("  week", dKey), isle(" = ", dEq), isle("March 24\u201328, 2026", dVal)),
          blank(),
          line(isle("  entries", dKey), isle(" props(day, task, hours)", dEq), isle(" = [", dBrak)),
          line(isle("    Monday, Frontend components, 7", dVal)),
          line(isle("    Tuesday, API integration, 8", dVal)),
          line(isle("    Wednesday, Testing, 6", dVal)),
          line(isle("    Thursday, Bug fixes, 7.5", dVal)),
          line(isle("    Friday, Code review, 5", dVal)),
          line(isle("  ]", dBrak)),
          line(isle("${", delim), isle(" end data ", kw), isle("}", delim)),
        ],
      },
    ],
    preview: `
      <div class="neu-header">Timesheet</div>
      <div class="neu-page-number">01</div>
      <h1>Timesheet — Website Redesign</h1>
      <p><strong>Client:</strong> Acme Corp.</p>
      <p><strong>Week:</strong> March 24–28, 2026</p>
      <table>
        <thead><tr><th>Day</th><th>Task</th><th>Hours</th></tr></thead>
        <tbody>
          <tr><td>Monday</td><td>Frontend components</td><td>7</td></tr>
          <tr><td>Tuesday</td><td>API integration</td><td>8</td></tr>
          <tr><td>Wednesday</td><td>Testing</td><td>6</td></tr>
          <tr><td>Thursday</td><td>Bug fixes</td><td>7.5</td></tr>
          <tr><td>Friday</td><td>Code review</td><td>5</td></tr>
        </tbody>
      </table>
      <p><strong>Total hours:</strong> 33.5</p>
      <p><strong>Daily average:</strong> 6.7</p>
    `,
  },
];

// ─── Code renderer ──────────────────────────────────────────────────

function CodeBlock({ lines }: { lines: CodeLine[] }) {
  return (
    <pre className="font-[family-name:var(--font-mono)] text-[11px] leading-[1.7] whitespace-pre-wrap">
      <code>
        {lines.map((l, i) => (
          <div key={i} className="flex min-h-[1.7em]">
            <span className="select-none text-right pr-4 w-8 shrink-0" style={{ color: "#404040" }}>
              {i + 1}
            </span>
            <span className="flex-1">
              {l.segments.length === 0 ? (
                "\u200B"
              ) : (
                l.segments.map((seg, j) => (
                  <span key={j} className={seg.cls || "text-muted-foreground"}>
                    {seg.text}
                  </span>
                ))
              )}
            </span>
          </div>
        ))}
      </code>
    </pre>
  );
}

// ─── File icon resolver ─────────────────────────────────────────────

function getFileIcon(type: FileEntry["type"], className: string) {
  switch (type) {
    case "md":
      return <FileMdIcon className={className} style={{ width: "14px", height: "14px" }} />;
    case "data":
      return <FileCodeCorner className={className} style={{ width: "14px", height: "14px" }} strokeWidth={1.75} />;
    case "isle":
      return <FileBox className={className} style={{ width: "14px", height: "14px" }} strokeWidth={1.75} />;
  }
}

// ─── Sidebar ────────────────────────────────────────────────────────

function VaultSidebar({
  tab,
  selectedFile,
  onSelect,
  openFiles,
}: {
  tab: TabData;
  selectedFile: string;
  onSelect: (id: string) => void;
  openFiles: FileEntry[];
}) {
  const rootFiles = tab.files.filter((f) => !f.folder);

  return (
    <div className="w-[180px] shrink-0 bg-[var(--background)] flex flex-col [&_svg.tabler-icon]:stroke-[1.75]">
      {/* Open Files section */}
      <div className="px-3 pt-3 pb-1">
        <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/40">
          Open Files
        </span>
        <div className="flex flex-col gap-0.5 mt-1.5">
          {openFiles.map((file) => (
            <button
              key={file.id}
              onClick={() => onSelect(file.id)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] w-full text-left transition-colors ${
                selectedFile === file.id
                  ? "bg-input/30 text-foreground border border-input"
                  : "text-muted-foreground hover:text-foreground hover:bg-input/20 border border-transparent"
              }`}
            >
              {getFileIcon(file.type, "size-3.5 shrink-0")}
              <span className="truncate">{file.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Vault section */}
      <div className="px-3 pt-3 pb-1 flex-1 overflow-y-auto">
        <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/40">
          Vault
        </span>
        <Collapsible defaultOpen className="group/collapsible mt-1.5">
          <CollapsibleTrigger className="flex items-center gap-1.5 py-0.5 rounded-md text-[11px] text-foreground hover:bg-input/20 w-full transition-colors">
            <span className="size-5 shrink-0 inline-flex items-center justify-center rounded border border-input bg-background text-muted-foreground">
              <IconBolt className="size-3" strokeWidth={1.75} />
            </span>
            <span className="flex-1 text-left">My Vault</span>
            <IconPlus className="size-3 text-muted-foreground/60 group-data-[state=open]/collapsible:hidden" strokeWidth={1.75} />
            <IconMinus className="size-3 text-muted-foreground/60 group-data-[state=closed]/collapsible:hidden" strokeWidth={1.75} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-3 pl-2 border-l border-border/40 flex flex-col gap-0.5 mt-0.5">
              {/* Folders */}
              {tab.folders.map((folder) => (
                <FolderItem
                  key={folder.name}
                  name={folder.name}
                  files={tab.files.filter((f) => folder.files.includes(f.id))}
                  selectedFile={selectedFile}
                  onSelect={onSelect}
                />
              ))}

              {/* Root files */}
              {rootFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => onSelect(file.id)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] w-full text-left transition-colors ${
                    selectedFile === file.id
                      ? "bg-input/30 text-foreground border border-input"
                      : "text-muted-foreground hover:text-foreground hover:bg-input/20 border border-transparent"
                  }`}
                >
                  {getFileIcon(file.type, "size-3.5 shrink-0")}
                  <span className="truncate">{file.name}</span>
                </button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

function FolderItem({
  name,
  files,
  selectedFile,
  onSelect,
}: {
  name: string;
  files: FileEntry[];
  selectedFile: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(files.length > 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-input/20 w-full transition-colors">
        <IconChevronRight
          className={`size-3 shrink-0 text-muted-foreground/60 transition-transform duration-150 ${
            open ? "rotate-90" : ""
          }`}
          strokeWidth={1.75}
        />
        {open ? (
          <IconFolderOpen className="size-3.5 shrink-0" strokeWidth={1.75} />
        ) : (
          <IconFolder className="size-3.5 shrink-0" strokeWidth={1.75} />
        )}
        <span className="truncate">{name}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-3 pl-2 border-l border-border/40 flex flex-col gap-0.5 mt-0.5">
          {files.length === 0 ? (
            <span className="text-[10px] text-muted-foreground/40 px-2 py-0.5 italic">
              empty
            </span>
          ) : (
            files.map((file) => (
              <button
                key={file.id}
                onClick={() => onSelect(file.id)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] w-full text-left transition-colors ${
                  selectedFile === file.id
                    ? "bg-input/30 text-foreground border border-input"
                    : "text-muted-foreground hover:text-foreground hover:bg-input/20 border border-transparent"
                }`}
              >
                {getFileIcon(file.type, "size-3.5 shrink-0")}
                <span className="truncate">{file.name}</span>
              </button>
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Editor panel ───────────────────────────────────────────────────

function EditorPanel({ file, openFiles, onSelect }: { file: FileEntry; openFiles: FileEntry[]; onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0">
      {/* Tab bar */}
      <div className="h-9 border-b border-border/50 flex items-center px-2 bg-card [&_svg.tabler-icon]:stroke-[1.75]">
        <button className="size-7 shrink-0 mr-1 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <PanelLeftIcon className="size-4" />
        </button>
        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 mr-3" />
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {openFiles.map((f) => (
            <button
              key={f.id}
              onClick={() => onSelect(f.id)}
              className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md h-7 transition-colors ${
                f.id === file.id
                  ? "text-foreground border border-input bg-input/30"
                  : "text-muted-foreground border border-transparent hover:bg-input/20"
              }`}
            >
              {getFileIcon(f.type, "shrink-0")}
              <span className="truncate max-w-32">{f.name}</span>
            </button>
          ))}
        </div>
        <button className="size-7 shrink-0 ml-1 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <IconSettings className="size-4" />
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="px-4 py-1.5 border-b border-border/50 bg-card text-[11px] text-muted-foreground flex items-center gap-1">
        <span>My Vault</span>
        {file.folder && (
          <>
            <ChevronRight className="size-3 text-muted-foreground/40" />
            <span>{file.folder}</span>
          </>
        )}
        <ChevronRight className="size-3 text-muted-foreground/40" />
        <span className="text-foreground">{file.name}</span>
      </div>

      {/* Code area */}
      <div
        className="flex-1 overflow-hidden p-4"
        style={{ backgroundColor: "#111111" }}
      >
        <CodeBlock lines={file.code} />
      </div>
    </div>
  );
}

// ─── Preview panel ──────────────────────────────────────────────────

function PreviewPanel({ preview }: { preview: string }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 to 1
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setOffset({ x: x * 80, y: y * 60 });
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div
      className="group/preview flex flex-1 items-start justify-start overflow-hidden min-w-0 min-h-0 pt-10 pl-6 relative"
      style={{
        backgroundColor: "var(--card)",
        backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Floating toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-3 py-1.5 bg-card border border-border rounded-lg shadow-lg opacity-0 group-hover/preview:opacity-100 transition-opacity duration-200 [&_svg.tabler-icon]:stroke-[1.75]">
        <button className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <IconMinus className="size-4" />
        </button>
        <div className="flex items-center justify-center w-12">
          <span className="text-xs text-muted-foreground tabular-nums">100</span>
          <span className="text-xs text-muted-foreground">%</span>
        </div>
        <button className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <IconPlus className="size-4" />
        </button>

        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 mx-1" />

        <IconPalette className="size-4 text-muted-foreground" />
        <div className="h-7 text-xs text-muted-foreground flex items-center px-2 border border-input rounded-md bg-transparent w-36">
          Neu Document
        </div>

        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 mx-1" />

        <button className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <IconFiles className="size-4" />
        </button>
        <button className="h-7 px-2 text-xs gap-1.5 flex items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <IconDownload className="size-4" />
          Download
        </button>
      </div>
      {/* A4 page */}
      <div
        className="shrink-0 relative overflow-hidden transition-transform duration-300 ease-out"
        style={{
          width: "210mm",
          minHeight: "297mm",
          transformOrigin: "top left",
          transform: `scale(0.75) translate(${offset.x}px, ${offset.y}px)`,
        }}
      >
        <div
          className="neu-document border border-white/[0.08]"
          style={{
            boxShadow:
              "inset 0 0 1px 1.5px hsla(0,0%,100%,0.15), 0 8px 40px rgba(0,0,0,0.4)",
          }}
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      </div>
    </div>
  );
}

// ─── Resize handle ──────────────────────────────────────────────────

function ResizeHandle() {
  return (
    <div className="w-px bg-border relative flex items-center justify-center">
      <div
        className="w-1 h-6 rounded-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, var(--muted-foreground) 0px, var(--muted-foreground) 6px, transparent 6px, transparent 11px)",
          opacity: 0.3,
        }}
      />
    </div>
  );
}

// ─── Tab content ────────────────────────────────────────────────────

function VaultUI({ tab }: { tab: TabData }) {
  const [selectedFile, setSelectedFile] = useState(tab.mainFile);

  const activeFile =
    tab.files.find((f) => f.id === selectedFile) || tab.files[0];

  return (
    <>
      <div
        className="rounded-xl border border-border overflow-hidden bg-background"
        style={{ height: "500px" }}
      >
        <div className="flex h-full">
          <VaultSidebar
            tab={tab}
            selectedFile={selectedFile}
            onSelect={setSelectedFile}
            openFiles={tab.files}
          />
          {/* Editor card */}
          <div className="flex-1 min-w-0 pt-2 pb-2 pl-2 pr-1">
            <div className="flex flex-col h-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <EditorPanel file={activeFile} openFiles={tab.files} onSelect={setSelectedFile} />
            </div>
          </div>
          {/* Preview card */}
          <div className="flex-1 min-w-0 pt-2 pb-2 pr-2 pl-1">
            <div className="flex flex-col h-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <PreviewPanel preview={tab.preview} />
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mt-4">
        <p className="text-sm font-semibold">{tab.name}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {tab.description}
        </p>
      </div>
    </>
  );
}

// ─── Main component ─────────────────────────────────────────────────

export function TabPreview() {
  return (
    <>
    <style>{`
  .isle-delim { color: #a78bfa; font-weight: 600; }
  .isle-kw { color: #818cf8; font-weight: 500; }
  .isle-atvar { color: #34d399; }
  .isle-op-hl { color: #94a3b8; font-style: italic; }
  .isle-fg { color: oklch(0.985 0 0); font-weight: 600; }
  .isle-fg7 { color: oklch(0.985 0 0 / 70%); }
  .isle-mt { color: #e2e2e2; }
  .isle-mt5 { color: #555; }
  .isle-dkey { color: #7dd3fc; }
  .isle-deq { color: #94a3b8; }
  .isle-dval { color: #fbbf24; }
  .isle-dbrak { color: #a78bfa; font-weight: 600; }
  .isle-isle-bg { background-color: rgba(139, 92, 246, 0.12); border-radius: 3px; }
    `}</style>
    <section className="max-w-[1250px] mx-auto px-8 py-16">
      <Tabs defaultValue="proposal" className="gap-4">
        <TabsList className="bg-background gap-1 border p-1">
          {tabsData.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent"
            >
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabsData.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <VaultUI tab={tab} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
    </>
  );
}
