/**
 * Architect Engine — orchestrates repo discovery, checkout, and review
 */

import { discoverRepos } from './discovery.mjs';
import { checkRepo } from './checks.mjs';

export async function runReview(flags) {
  const repos = await discoverRepos(flags);
  const results = [];

  for (const repo of repos) {
    try {
      const checkResult = await checkRepo(repo, flags);
      results.push(checkResult);
    } catch (err) {
      results.push({
        full_name: repo.full_name,
        error: err.message,
        checksPassed: 0,
        checksTotal: 0,
        findings: [],
      });
    }
  }

  const totalChecks = results.reduce((s, r) => s + (r.checksTotal || 0), 0);
  const passedChecks = results.reduce((s, r) => s + (r.checksPassed || 0), 0);
  const failedRepos = results.filter(r => r.error || r.findings?.length > 0);

  return {
    meta: {
      tool: 'architect',
      version: '0.1.0',
      org: flags.org,
      scannedAt: new Date().toISOString(),
      deep: flags.deep,
    },
    summary: {
      totalRepos: repos.length,
      reposWithIssues: failedRepos.length,
      checksTotal: totalChecks,
      checksPassed: passedChecks,
      hasErrors: failedRepos.length > 0,
    },
    repos: results,
  };
}
