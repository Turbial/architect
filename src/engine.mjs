/**
 * Architect Engine — orchestrates repo discovery, file scanning, and review
 */

import { discoverRepos } from './discovery.mjs';
import { checkRepo } from './checks.mjs';

export async function runReview(flags) {
  console.error(`  🔍 Discovering ${flags.repo ? 'repo' : 'org'}...`);
  const repos = await discoverRepos(flags);
  console.error(`  📦 Found ${repos.length} repos\n`);

  // Filter out archived by default unless flags say otherwise
  const active = flags.includeArchived ? repos : repos.filter(r => !r.archived);
  if (active.length < repos.length) {
    console.error(`  (skipping ${repos.length - active.length} archived repos)\n`);
  }

  const results = [];

  for (let i = 0; i < active.length; i++) {
    const repo = active[i];
    console.error(`  [${i + 1}/${active.length}] ${repo.full_name}...`);
    try {
      const checkResult = await checkRepo(repo, flags);
      results.push(checkResult);
      const issueCount = checkResult.errors?.length || 0;
      const warnCount = checkResult.findings?.filter(f => f.severity === 'warning').length || 0;
      console.error(`    → ${checkResult.checksPassed}/${checkResult.checksTotal} checks passed` +
        (issueCount ? `, ${issueCount} errors` : '') +
        (warnCount ? `, ${warnCount} warnings` : ''));
    } catch (err) {
      console.error(`    ✗ Error: ${err.message}`);
      results.push({
        full_name: repo.full_name,
        name: repo.name,
        owner: repo.owner,
        error: err.message,
        checksPassed: 0,
        checksTotal: 0,
        fileCount: 0,
        fileList: [],
        findings: [{ severity: 'error', check: 'fatal', message: err.message }],
        errors: [{ severity: 'error', check: 'fatal', message: err.message }],
      });
    }
  }

  // ── Aggregate ──
  const totalChecks = results.reduce((s, r) => s + (r.checksTotal || 0), 0);
  const passedChecks = results.reduce((s, r) => s + (r.checksPassed || 0), 0);
  const reposWithErrors = results.filter(r => r.errors?.length > 0);

  const report = {
    meta: {
      tool: 'architect',
      version: '0.1.0',
      org: flags.org,
      scannedAt: new Date().toISOString(),
      deep: flags.deep,
    },
    summary: {
      totalRepos: results.length,
      reposWithIssues: reposWithErrors.length,
      checksTotal: totalChecks,
      checksPassed: passedChecks,
      hasErrors: reposWithErrors.length > 0,
    },
    repos: results,
  };

  return report;
}

/**
 * Generate an agent-ready action prompt from the report
 * This is what an OpenClaw agent reads to know what to do next.
 */
export function generateAgentPrompt(report) {
  const lines = [];
  const repos = report.repos || [];

  lines.push('# Architect — Full Org Repo Scan Results\n');
  lines.push(`Scanned ${report.meta.scannedAt} | ${report.summary.totalRepos} repos | ${report.summary.checksPassed}/${report.summary.checksTotal} checks passed\n`);

  lines.push('## Repo Inventory\n');
  lines.push('| Repo | Language | Status | Files | Issues |');
  lines.push('|------|----------|--------|-------|--------|');
  for (const r of repos) {
    const status = r.archived ? '📦 archived' : r.errors?.length > 0 ? '⚠️ issues' : '✅ ok';
    lines.push(`| ${r.full_name} | ${r.language || 'N/A'} | ${status} | ${r.fileCount} | ${r.errors?.length || 0} |`);
  }

  lines.push('\n## Detailed Findings\n');
  for (const r of repos) {
    if (!r.findings || r.findings.length === 0) continue;
    const errorCount = r.errors?.length || 0;
    const warnCount = r.findings.filter(f => f.severity === 'warning').length;
    lines.push(`### ${r.full_name} (${errorCount} errors, ${warnCount} warnings)\n`);
    lines.push(`- URL: ${r.html_url}`);
    lines.push(`- Branch: ${r.default_branch}`);
    lines.push(`- Files: ${r.fileCount}`);
    lines.push(`- Last updated: ${r.updated_at}`);
    lines.push('');

    if (r.findings.some(f => f.severity === 'error')) {
      lines.push('**Errors:**');
      for (const f of r.findings.filter(f => f.severity === 'error')) {
        lines.push(`- 🔴 ${f.check}: ${f.message}`);
      }
      lines.push('');
    }

    const warnings = r.findings.filter(f => f.severity === 'warning');
    if (warnings.length > 0) {
      lines.push('**Warnings:**');
      for (const f of warnings) {
        lines.push(`- 🟡 ${f.check}: ${f.message}`);
      }
      lines.push('');
    }

    // Show file list (truncated if huge)
    if (r.fileList && r.fileList.length > 0) {
      const showFiles = r.fileList.length <= 100
        ? r.fileList
        : [...r.fileList.slice(0, 50), `... and ${r.fileList.length - 50} more files`];
      lines.push('**Files:**');
      for (const f of showFiles) {
        lines.push(`  - ${f}`);
      }
      lines.push('');
    }
  }

  // ── Action summary for agent ──
  lines.push('## Actions Needed\n');
  const reposNeedingAction = repos.filter(r => r.errors?.length > 0);
  if (reposNeedingAction.length === 0) {
    lines.push('No critical issues found. All repos pass basic checks.\n');
  } else {
    for (const r of reposNeedingAction) {
      lines.push(`**${r.full_name}:**`);
      for (const f of r.errors) {
        lines.push(`- Fix \`${f.check}\`: ${f.message}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
