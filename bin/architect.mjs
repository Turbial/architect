#!/usr/bin/env node

/**
 * Architect — Turbial Org Code Review Tool
 *
 * Designed for both CLI use and OpenClaw agent consumption.
 * Can list repos, scan files, clone deep, and output agent-ready prompts.
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'));

async function main() {
  const args = process.argv.slice(2);
  const flags = {
    org: 'Turbial',
    repo: null,
    deep: false,
    agent: false,
    out: null,
    includeArchived: false,
    prompt: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--org':           flags.org = args[++i]; break;
      case '--repo':          flags.repo = args[++i]; break;
      case '--deep':          flags.deep = true; break;
      case '--agent':         flags.agent = true; break;
      case '--out':           flags.out = args[++i]; break;
      case '--prompt':        flags.prompt = true; break;
      case '--include-archived': flags.includeArchived = true; break;
      case '--list-repos':
        return await listReposOnly(flags);
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
      default:
        console.error(`Unknown flag: ${args[i]}`);
        process.exit(1);
    }
  }

  console.error(`\n  🏗️  Architect v${pkg.version}\n`);

  // ── Run the engine ──
  const { runReview, generateAgentPrompt } = await import('../src/engine.mjs');
  const report = await runReview(flags);

  // ── Output modes ──
  if (flags.prompt) {
    // Output a markdown prompt that an agent can be fed directly
    console.log(generateAgentPrompt(report));
  } else if (flags.out) {
    const { writeReport } = await import('../src/output.mjs');
    await writeReport(report, flags.out, flags.agent);
  } else if (flags.agent) {
    // JSON stdout for programmatic consumption
    process.stdout.write(JSON.stringify(report, null, 2));
  } else {
    printSummary(report);
  }

  process.exit(report.summary?.hasErrors ? 1 : 0);
}

async function listReposOnly(flags) {
  const { discoverRepos } = await import('../src/discovery.mjs');
  const repos = await discoverRepos(flags);

  console.log(`\n  Repos in ${flags.org} org:\n`);
  for (const r of repos) {
    const icon = r.archived ? '📦' : r.private ? '🔒' : '🌐';
    console.log(`  ${icon} ${r.full_name}${r.archived ? ' (archived)' : ''}`);
    if (r.description) console.log(`       ${r.description}`);
    console.log(`       ${r.language || 'N/A'} • ${r.size}KB • ${r.default_branch}`);
    console.log('');
  }
  console.log(`  Total: ${repos.length} repos\n`);
}

function showHelp() {
  console.log(`
  Architect v${pkg.version}

  Usage:
    architect --org Turbial            Scan all repos in org
    architect --repo Turbial/reach     Scan a single repo
    architect --deep                   Enable full clone + static analysis
    architect --agent                  Output agent-ready JSON
    architect --prompt                 Output markdown agent prompt
    architect --out ./report           Write report files
    architect --list-repos             Just list repos (quick inventory)
    architect --include-archived       Include archived repos in scan

  Example:
    architect --org Turbial --prompt               # Full report as agent prompt
    architect --org Turbial --deep --out ./audit    # Deep scan, write files
    architect --org Turbial --list-repos            # Quick inventory
  `);
}

function printSummary(report) {
  const repos = report.repos || [];
  const withIssues = repos.filter(r => r.errors?.length > 0);
  console.error(`  ✅ Checked ${repos.length} repos`);
  console.error(`  ⚠️  ${withIssues.length} repos have issues\n`);

  for (const r of repos) {
    const icon = r.errors?.length ? '⚠️' : r.findings?.length ? '📋' : '✅';
    const issueStr = r.errors?.length
      ? `(${r.errors.length} errors, ${r.findings.filter(f => f.severity === 'warning').length} warnings)`
      : r.findings?.length
        ? `(${r.findings.filter(f => f.severity === 'warning').length} warnings)`
        : '(all clear)';
    console.error(`  ${icon} ${r.full_name} — ${r.checksPassed}/${r.checksTotal} ${issueStr}`);
  }
  console.error('');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
