/**
 * Report output — JSON, markdown, agent format
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function writeReport(report, outDir, agentMode) {
  await mkdir(outDir, { recursive: true });

  // Full JSON
  const jsonPath = resolve(outDir, 'report.json');
  await writeFile(jsonPath, JSON.stringify(report, null, 2));
  console.log(`  📄 Report: ${jsonPath}`);

  // Agent JSON (flattened, findings-focused)
  if (agentMode) {
    const agentPath = resolve(outDir, 'report.agent.json');
    const agentReport = {
      scanned_at: report.meta.scannedAt,
      summary: report.summary,
      issues: report.repos.flatMap(r =>
        r.findings.map(f => ({
          repo: r.full_name,
          severity: f.severity,
          check: f.check,
          message: f.message,
        }))
      ),
      repos_needing_attention: report.repos
        .filter(r => r.findings?.length > 0)
        .map(r => r.full_name),
    };
    await writeFile(agentPath, JSON.stringify(agentReport, null, 2));
    console.log(`  🤖 Agent report: ${agentPath}`);
  }

  // Markdown summary
  const mdPath = resolve(outDir, 'report.md');
  const md = generateMarkdown(report);
  await writeFile(mdPath, md);
  console.log(`  📝 Markdown: ${mdPath}`);
}

function generateMarkdown(report) {
  const lines = [];
  lines.push(`# Architect Report — ${report.meta.org}`);
  lines.push(`\nScanned: ${report.meta.scannedAt} | Deep: ${report.meta.deep}\n`);
  lines.push(`## Summary\n`);
  lines.push(`- Total repos: ${report.summary.totalRepos}`);
  lines.push(`- Repos with issues: ${report.summary.reposWithIssues}`);
  lines.push(`- Checks: ${report.summary.checksPassed}/${report.summary.checksTotal} passed\n`);

  for (const repo of report.repos) {
    const icon = repo.error ? '🔴' : repo.findings?.length ? '🟡' : '🟢';
    lines.push(`### ${icon} ${repo.full_name}`);
    if (repo.error) {
      lines.push(`\n  Error: ${repo.error}\n`);
      continue;
    }
    lines.push(`\n- Language: ${repo.language || 'N/A'}`);
    lines.push(`- Private: ${repo.private}`);
    lines.push(`- Updated: ${repo.updated_at}`);
    lines.push(`- Checks: ${repo.checksPassed}/${repo.checksTotal}\n`);

    for (const f of repo.findings || []) {
      const sev = f.severity === 'error' ? '🔴' : f.severity === 'warning' ? '🟡' : '🔵';
      lines.push(`  ${sev} **${f.check}**: ${f.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
