#!/usr/bin/env node

/**
 * Architect — Turbial Org Code Review Tool
 *
 * Scans repos, runs structured checks, outputs reports.
 * Designed for both CLI use and agent consumption.
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
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--org':       flags.org = args[++i]; break;
      case '--repo':      flags.repo = args[++i]; break;
      case '--deep':      flags.deep = true; break;
      case '--agent':     flags.agent = true; break;
      case '--out':       flags.out = args[++i]; break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
      default:
        console.error(`Unknown flag: ${args[i]}`);
        process.exit(1);
    }
  }

  console.log(`\n  🏗️  Architect v${pkg.version}\n`);
  console.log(`  Scanning ${flags.repo ? `repo: ${flags.repo}` : `org: ${flags.org}`}${flags.deep ? ' (deep mode)' : ''}\n`);

  // ── Import and run the engine ──
  const { runReview } = await import('../src/engine.mjs');
  const report = await runReview(flags);

  // ── Output ──
  if (flags.out) {
    const { writeReport } = await import('../src/output.mjs');
    await writeReport(report, flags.out, flags.agent);
  } else if (flags.agent) {
    process.stdout.write(JSON.stringify(report, null, 2));
  } else {
    printSummary(report);
  }

  process.exit(report.summary?.hasErrors ? 1 : 0);
}

function showHelp() {
  console.log(`
  Architect v${pkg.version}

  Usage:
    architect --org Turbial          Scan all repos in org
    architect --repo Turbial/reach   Scan a single repo
    architect --deep                 Enable full clone + static analysis
    architect --agent                Output agent-ready JSON
    architect --out ./report         Write report files to directory

  Flags:
    --org <name>    GitHub org to scan (default: Turbial)
    --repo <slug>   Single repo (owner/repo)
    --deep          Full clone + static analysis (slower, more thorough)
    --agent         Output structured JSON for agent consumption
    --out <dir>     Write report files to directory
    --help, -h      Show help
  `);
}

function printSummary(report) {
  const repos = report.repos || [];
  console.log(`  ✅ Checked ${repos.length} repos\n`);
  for (const r of repos) {
    const icon = r.errors?.length ? '⚠️' : '✅';
    console.log(`  ${icon} ${r.full_name} (${r.checksPassed}/${r.checksTotal} checks passed)`);
  }
  console.log('');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
