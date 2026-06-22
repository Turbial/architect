# Architect — Full Product Plan

## Vision

A single tool that any agent (Claude, Codex, OpenClaw, Cursor) can use to see, understand, and audit every repo in the Turbial org. Plus a cross-product registry that lets us share code, schemas, and services across products instead of rebuilding. Plus MightyMax integration.

Three layers, each independently useful:

| Layer | What | Who Uses It |
|-------|------|-------------|
| **L1 — MCP Server** | Any agent queries repos via MCP protocol | Claude Codex, Cursor, Copilot, OpenClaw |
| **L2 — Analyzer Engine** | Deep static analysis per repo | CLI, CI pipeline, developer |
| **L3 — Cross-Product Registry** | Shared dependency graph of all products | MightyMax, platform team, automation |

---

## L1 — MCP Server (Phase 1)

An MCP server that exposes every Turbial repo as a searchable/readable resource. Any MCP-compatible agent connects and gets instant access.

### Tools the MCP exposes

```
# Inventory
list_repos           -> [{name, language, size, updated, archived, ...}]

# Shallow info (no clone)
get_repo_info        -> {description, file tree, topics, license, CI configs}
search_files         -> "filename:Dockerfile" returns paths across all repos
find_secrets         -> scans all repos for .env files committed

# Deep info (clones on demand)
read_file            -> "Turbial/reach/src/index.v2.js" returns content
analyze_deps         -> {dependencies, outdated, vulns per repo}
find_shared_code     -> "auth" returns which repos have auth modules
```

### Protocol

Standard MCP JSON-RPC over stdio or HTTP. Any agent with MCP support connects in one config line:

```json
{
  "mcpServers": {
    "architect": {
      "command": "npx",
      "args": ["-y", "github:Turbial/architect", "mcp"]
    }
  }
}
```

### Files to build

```
src/mcp/server.mjs          # MCP transport (stdio + HTTP)
src/mcp/tools.mjs           # Tool definitions & handlers
src/mcp/resources.mjs       # Resource providers (repo://, file:// URIs)
```

### Status: 🔴 Not built

---

## L2 — Analyzer Engine (Phase 2)

Deep per-repo static analysis. The checks/ folder is stubbed — fill with real implementations.

### Checks to implement

| Check | What It Does | File |
|-------|-------------|------|
| **import-graph** | Parse require/import, build dependency tree, find orphan modules | `checks/import-graph.mjs` |
| **dependencies** | `npm audit` / `pip-audit` on cloned repos, report vulns | `checks/dependencies.mjs` |
| **outdated-deps** | `npm outdated` / `pip list --outdated` | `checks/dependencies.mjs` |
| **secrets-scan** | Regex patterns for API keys, tokens, passwords in committed code | `checks/secrets.mjs` |
| **dockerfile** | Validate Dockerfile best practices (no root, multi-stage, pinned versions) | `checks/config.mjs` |
| **ci-pipeline** | Check GitHub Actions / other CI for required jobs (test, lint, build) | `checks/config.mjs` |
| **dead-code** | Find exported but unimported modules (uses import graph) | `checks/import-graph.mjs` |
| **env-check** | Compare .env.example to actual usage in code | `checks/files.mjs` |

### Architecture

```
checks/import-graph.mjs   -- uses acorn to parse JS/TS, builds dependency tree
checks/dependencies.mjs   -- spawns npm audit / pip-audit, parses output
checks/secrets.mjs        -- regex scan + entropy detection for secrets
checks/config.mjs         -- Dockerfile parser + CI config parser
checks/files.mjs          -- Already partially built, extend
```

### Deep clone flow

```
architect --deep --org Turbial

1. GET /orgs/Turbial/repos  → 18 repos
2. git clone --depth 1 each  → /tmp/architect-workspace/
3. For each:
   a. Parse package.json / requirements.txt
   b. Run import-graph analysis
   c. Run npm audit / pip-audit
   d. Scan for secrets
   e. Check Dockerfiles
4. Aggregate into report
```

### Status: 🔴 Not built (stubs exist)

---

## L3 — Cross-Product Registry (Phase 3)

A machine-readable registry of shared assets across all products. This is what enables MightyMax to connect everything and what lets you develop faster by pulling existing pieces instead of rebuilding.

### Registry Schema (`registry.json`)

```json
{
  "version": 1,
  "generated": "2026-06-22T20:00:00Z",

  "databases": {
    "supabase-shared": {
      "ref": "afgmlkduuapquqkcqdsk",
      "location": "managed",
      "products": ["reach", "creditsmith", "maxhire", "connects", "filmturbo", "mightymaker"],
      "tables": ["contacts", "deals", "leads", "campaigns", "users", ...]
    }
  },

  "auth": {
    "modes": ["supabase", "nextauth", "telegram-bot"],
    "repos_with_auth": ["reach", "job", "result", "turbo-learning", "connect"]
  },

  "payments": {
    "stripe": {
      "account": "acct_1PoKB6EODNr305hM",
      "mode": "live",
      "products_using": ["maxhire", "filmturbo", "mightymaker"]
    }
  },

  "shared_components": {
    "auth-ui": {
      "found_in": ["Turbial/connect/frontend/src/components/"],
      "type": "react/tsx",
      "depended_by": []
    },
    "supabase-client": {
      "found_in": ["Turbial/turbo-learning/mobile/src/services/supabase.ts"],
      "type": "ts",
      "depended_by": []
    }
  },

  "shared_secrets": {
    "supabase_service_role": {
      "found_in_repos": ["Turbial/reach/ecosystem.config.js"],
      "severity": "critical",
      "needs_rotation": true
    }
  },

  "domains": {
    "filmturbo.app": { "provider": "cloudflare", "server": "openclaw-staging", "port": 3003 },
    "job.turbial.com": { "provider": "cloudflare", "server": "openclaw-staging", "port": 3010 },
    ...
  },

  "component_registry": {
    "url": "https://github.com/Turbial/web-components",
    "cli": "npx github:Turbial/web-components --source <url>"
  }
}
```

### How It's Generated

```
architect --registry
  → scans all repo file trees
  → detects package.json dependencies overlap (same libs across repos)
  → finds Stripe keys, Supabase refs, shared env vars
  → identifies identical component patterns across repos
  → outputs registry.json
```

### Status: 🔴 Not built

---

## Phase 4 — MightyMax Service

Architect becomes a **service** inside MightyMax. When someone messages:
- "audit everything" → triggers full scan, returns findings
- "find where we use Supabase" → queries registry
- "check if any repo has hardcoded secrets" → runs secret scan
- "what's the status of project X?" → returns last scan + issues

### Integration Points

```
MightyMax Message → Webhook → Architect Service → Response
                    POST /api/architect/scan
                    GET  /api/architect/registry
                    GET  /api/architect/repo/:name
```

### Status: 🔴 Not built (requires MightyMax messenger first)

---

## Implementation Roadmap

| Phase | What | Estimated Effort | Depends On |
|-------|------|-----------------|------------|
| **P1** | MCP Server — any agent can query repos | 2-3 days | Nothing |
| **P2a** | Import graph analyzer | 1-2 days | acorn parser |
| **P2b** | Dependency vuln scanner | 1 day | npm/pip CLI |
| **P2c** | Secret scanner | 1 day | Regex patterns |
| **P3** | Cross-product registry generator | 3-4 days | P2 for deep scan data |
| **P4** | MightyMax service integration | 2-3 days | P3, MightyMax API |

---

## How Agents Use This Today

Even before P1 MCP is built, any agent can already do this:

```bash
# Quick inventory (0 tokens for analysis)
npx github:Turbial/architect --list-repos

# Full scan as agent prompt
npx github:Turbial/architect --prompt

# Machine-readable for programmatic use
npx github:Turbial/architect --agent --out /tmp/report
```

The MCP server just makes it a *protocol* instead of a CLI command — every MCP-compatible tool can discover and use it natively.

---

## The Repo

**https://github.com/Turbial/architect**

The scaffold is there: CLI, checks, output, discovery. Everything in this plan maps to files that already exist or need to be created in that repo.

To start: pick a phase and PR into `main`.
