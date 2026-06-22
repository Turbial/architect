# analyzer-test-repo

A tiny, self-contained fixture project for exercising the `github-repo-analyzer`
MCP server's tools end to end:

- `analyze_repo` — should detect Node.js/Express via `package.json`, and report
  a language breakdown across the `src/` tree.
- `deep_analyze_repo` — should build an import graph rooted at `src/index.js`,
  report per-file LOC/function counts, and flag `src/orphan.js` as dead code
  (it is exported but never imported by anything else in the project).

## Structure

- `src/index.js` — entry point, imports `math.js` and `greet.js`.
- `src/math.js` — small arithmetic helpers, imported by `index.js`.
- `src/greet.js` — greeting helper, imported by `index.js`.
- `src/orphan.js` — intentionally unimported module, to test the
  no-incoming-relative-import dead-code heuristic.
