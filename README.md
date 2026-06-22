# Architect — Turbial Org Code Review Tool

Scans all repos under the Turbial GitHub org, runs structured reviews, and produces unified reports.

## Usage

```bash
npx github:Turbial/architect --org Turbial
npx github:Turbial/architect --org Turbial --deep   # clone + full static analysis
npx github:Turbial/architect --repo Turbial/reach    # single repo
npx github:Turbial/architect --agent                 # output as agent-ready JSON
```

## Review Checks

- **Structure** — README, license, CI config, package.json/pyproject.toml
- **Dependencies** — outdated, deprecated, known vulns
- **Secrets** — hardcoded API keys, tokens, passwords
- **Code quality** — lint errors, dead code, missing error handling
- **Configs** — Dockerfiles, env templates, CI pipelines
- **Coverage** — test files, test commands, documentation

## Output

- `report.json` — unified machine-readable report
- `report.md` — human-readable summary
- `report/` — per-repo detailed breakdowns

## Agent Mode

```bash
# Produces structured JSON an OpenClaw agent can consume directly
npx github:Turbial/architect --agent --out /tmp/architect-report
```

Then any agent can pick up the report and take action (fix issues, open PRs, file issues).
