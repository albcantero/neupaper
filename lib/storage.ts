export interface NeuFile {
  id: string;
  name: string;
  path: string; // "factura.md" for root, "components/ui/Table.isle" for nested
  content: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "neupaper:files";

function readAll(): NeuFile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const files: NeuFile[] = raw ? JSON.parse(raw) : [];
    // Migration: old files without path get path = name
    return files.map((f) => ({ ...f, path: f.path ?? f.name }));
  } catch {
    return [];
  }
}

function writeAll(files: NeuFile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

/** Root .md files (no subdirectory) */
export function getFiles(): NeuFile[] {
  return readAll().filter((f) => !f.path.includes("/"));
}

/** Files inside components/ and data/ */
export function getVaultFiles(): NeuFile[] {
  return readAll().filter((f) => f.path.includes("/"));
}

export function createFile(name: string): NeuFile {
  const fileName = name.endsWith(".md") ? name : `${name}.md`;
  const file: NeuFile = {
    id: crypto.randomUUID(),
    name: fileName,
    path: fileName,
    content: `\${ config theme="neu-document" page-numbers header="New document" }\n\n\${ data }\n  app = Neupaper\n\${ end data }\n\n# Title\nHey! I am using **\${ @app }**`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  writeAll([...readAll(), file]);
  return file;
}

export function createVaultFile(path: string, content = ""): NeuFile {
  const name = path.split("/").pop()!;
  const file: NeuFile = {
    id: crypto.randomUUID(),
    name,
    path,
    content,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  writeAll([...readAll(), file]);
  return file;
}

export function updateFile(
  id: string,
  updates: Partial<Pick<NeuFile, "name" | "content">>
): NeuFile | null {
  const all = readAll();
  const idx = all.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  if (updates.name !== undefined) {
    all[idx].name = updates.name;
    if (all[idx].path.includes("/")) {
      // Vault file: update last segment of path
      const dir = all[idx].path.split("/").slice(0, -1).join("/");
      all[idx].path = `${dir}/${updates.name}`;
    } else {
      // Root file: path = name
      all[idx].path = updates.name;
    }
  }
  if (updates.content !== undefined) all[idx].content = updates.content;
  all[idx].updatedAt = Date.now();
  writeAll(all);
  return all[idx];
}

export const DEFAULT_DOCUMENT_CONTENT = `\${ config theme="neu-document" page-numbers header="New document" }

\${ data }
  app = Neupaper
\${ end data }

# Title
Hey! I am using **\${ @app }**
`;

export const EXAMPLE_TERMS_ISLE = `\${ create <Terms> props() }
- Payment: 50% upfront, 50% on delivery
- Includes two rounds of revisions per phase
- Additional work billed at $120/hour
- Source code and documentation transferred on completion
- 90-day warranty covering defects in delivered work
\${ end <Terms> }
`;

export const EXAMPLE_PROJECT_PROPOSAL = `\${ config theme="modernist" page-numbers header="Project proposal" }

\${ data }
  project.name = Platform Migration
  project.client = Globex Inc
  project.date = April 2026
  project.budget = 24000

  phases props(name, start, duration) = [
    Discovery, 2026-04-07, 5d
    Design, 2026-04-14, 10d
    Development, 2026-04-28, 20d
    Testing, 2026-05-26, 5d
    Launch, 2026-06-02, 2d
  ]
\${ end data }

\${ import <Terms> }

# \${ @project.name }

**Client:** \${ @project.client }
**Date:** \${ @project.date }
**Budget:** $\${ @project.budget }

---

### Overview

This proposal outlines the migration of \${ @project.client }'s legacy monolith to a modern microservices architecture. The project is divided into five phases, spanning approximately two months from kickoff to launch.

The current system runs on a single Rails application deployed to a managed VM. Over the past three years, the codebase has grown to 180k lines with tightly coupled modules that make independent scaling impossible. Response times during peak hours regularly exceed 2 seconds, and deployments require a full 20-minute restart cycle.

Our approach replaces the monolith with a set of focused services behind an API gateway. Each service owns its data, communicates via async events, and deploys independently. This gives \${ @project.client } the ability to scale individual components, ship features faster, and reduce incident blast radius.

### Timeline

\`\`\`mermaid
gantt
  title \${ @project.name }
  dateFormat YYYY-MM-DD
  \${ for phase in @phases }
    \${ phase.name } : \${ phase.start }, \${ phase.duration }
  \${ end }
\`\`\`
### Phases

\${ for phase in @phases }
- **\${ phase.name }** — starts \${ phase.start }, duration \${ phase.duration }
\${ end }

\${ pagebreak }

### Discovery

During the first week we audit the existing codebase, map service boundaries, and identify shared state that needs careful extraction. We conduct interviews with the engineering team to understand pain points and undocumented dependencies. The output is a service dependency graph and a migration risk assessment.

### Design

The design phase produces API contracts, database schemas, and infrastructure diagrams for each service. We define the event bus topology, establish observability standards, and create a runbook template. All artifacts go through a review cycle with \${ @project.client }'s lead engineers before development begins.

### Development

Development follows a strangler-fig pattern: new services are built alongside the monolith, with traffic gradually shifted via feature flags. We prioritize the authentication and billing services first, as they have the cleanest boundaries. Each service includes unit tests, integration tests, and a CI/CD pipeline from day one.

### Testing & Launch

The final two phases cover end-to-end testing under production-like load, followed by a staged rollout. We run shadow traffic for 48 hours before cutting over. Rollback procedures are documented and rehearsed. Post-launch, we provide two weeks of on-call support at no additional cost.

---
---

### Terms

\${ <Terms> }
`;

export const EXAMPLE_ISSUE_REVIEW = `\${ config theme="neu-document" }

# Issue Review — Auth middleware timeout

**Status:** Open · **Priority:** High · **Assignee:** @daniela

---

## Description

Users are experiencing intermittent 504 errors when the auth middleware takes longer than 3s to validate session tokens. The issue started after deploying v2.4.1.

## Root cause

The token validation calls an external JWKS endpoint on every request instead of caching the public key:

\`\`\`tsx
async function validateToken(token: string) {
  const jwks = await fetch(process.env.JWKS_URL!);
  const key = await jwks.json();
  return jwt.verify(token, key.keys[0]);
}
\`\`\`

## Proposed fix

Cache the JWKS response with a 1-hour TTL. This reduces external calls from ~12k/min to ~1/hour.

## Next steps

- [ ] Implement JWKS cache with TTL
- [ ] Add circuit breaker for JWKS endpoint
- [ ] Monitor p99 latency after deploy
`;

export const EXAMPLE_CLIENT_REPORT = `\${ config theme="neu-document" page-numbers header="Client report" }

\${ load clients (example).data }

# Client Report — \${ @company.name }

**Prepared by:** \${ @company.name } · \${ @company.email }
**Date:** \${ @company.date }

---

## Report

| Client | Plan | Revenue |
|--------|------|---------|
\${ for client in @clients }
| \${ client.name } | \${ client.plan } | \${ if client.plan is pro then client.revenue else "nothing" } |
\${ end }

---

## Notes
\${ for client in @clients }
  \${ if client.plan is pro }
  - **\${ client.name }** — generating $\${ client.revenue } in monthly revenue.
  \${ else }
  - **\${ client.name }** — free tier, no revenue yet.
  \${ end }
\${ end }
`;

export const EXAMPLE_CLIENTS_DATA = `\${ data }
  company.name = Neupaper
  company.email = hello@neupaper.app
  company.date = March 31, 2026

  clients props(name, plan, revenue) = [
    Acme Corp, pro, 1200
    Globex Inc, free, 0
    Initech, pro, 800
    Umbrella Ltd, free, 0
    Stark Industries, pro, 3500
  ]
\${ end data }
`;

const DEFAULT_VAULT_STRUCTURE: { path: string; content: string }[] = [
  { path: "components/Terms.isle", content: EXAMPLE_TERMS_ISLE },
  { path: "data/clients (example).data", content: EXAMPLE_CLIENTS_DATA },
];

/** Seeds the vault with the default structure on first visit. Returns the default document id if created. */
export function initVault(): string | null {
  if (typeof window === "undefined") return null;
  const existing = readAll();
  const existingPaths = new Set(existing.map((f) => f.path));
  const toCreate = DEFAULT_VAULT_STRUCTURE.filter(
    (f) => !existingPaths.has(f.path)
  );

  // Create default example document on first visit (no root files yet)
  const rootFiles = existing.filter((f) => !f.path.includes("/"));
  let defaultDocId: string | null = null;
  if (rootFiles.length === 0) {
    const defaultDoc: NeuFile = {
      id: crypto.randomUUID(),
      name: "untitled.md",
      path: "untitled.md",
      content: DEFAULT_DOCUMENT_CONTENT,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const exampleDoc: NeuFile = {
      id: crypto.randomUUID(),
      name: "client-report (example).md",
      path: "client-report (example).md",
      content: EXAMPLE_CLIENT_REPORT,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const proposalDoc: NeuFile = {
      id: crypto.randomUUID(),
      name: "project-proposal (example).md",
      path: "project-proposal (example).md",
      content: EXAMPLE_PROJECT_PROPOSAL,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const issueDoc: NeuFile = {
      id: crypto.randomUUID(),
      name: "issue-review (example).md",
      path: "issue-review (example).md",
      content: EXAMPLE_ISSUE_REVIEW,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    defaultDocId = defaultDoc.id;
    writeAll([...existing, defaultDoc, exampleDoc, proposalDoc, issueDoc]);
  }

  if (toCreate.length === 0) return defaultDocId;
  const newFiles: NeuFile[] = toCreate.map((f) => ({
    id: crypto.randomUUID(),
    name: f.path.split("/").pop()!,
    path: f.path,
    content: f.content,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));
  writeAll([...readAll(), ...newFiles]);
  return defaultDocId;
}

export function renameFolder(oldPath: string, newName: string): void {
  const all = readAll();
  const parentPath = oldPath.includes("/") ? oldPath.split("/").slice(0, -1).join("/") : "";
  const newPath = parentPath ? `${parentPath}/${newName}` : newName;
  const updated = all.map((f) => {
    if (f.path.startsWith(`${oldPath}/`)) {
      const relative = f.path.slice(oldPath.length + 1);
      const updatedPath = `${newPath}/${relative}`;
      return { ...f, path: updatedPath, name: updatedPath.split("/").pop()! };
    }
    return f;
  });
  writeAll(updated);
}

export function deleteFile(id: string): boolean {
  const all = readAll();
  const filtered = all.filter((f) => f.id !== id);
  if (filtered.length === all.length) return false;
  writeAll(filtered);
  return true;
}
