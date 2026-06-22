/**
 * Per-repo checks — runs structured review on a single repo
 */

import { runStructureCheck } from '../checks/structure.mjs';
import { runDependencyCheck } from '../checks/dependencies.mjs';
import { runSecretCheck } from '../checks/secrets.mjs';
import { runConfigCheck } from '../checks/config.mjs';

export async function checkRepo(repo, flags) {
  const findings = [];
  let checksPassed = 0;
  let checksTotal = 0;

  // ── Metadata checks (API-only, no clone needed) ──
  const { findings: structFindings, passed: structPassed, total: structTotal } =
    runStructureCheck(repo);
  findings.push(...structFindings);
  checksPassed += structPassed;
  checksTotal += structTotal;

  // ── Deep checks (require clone) ──
  if (flags.deep) {
    // Deep checks will run on cloned repo
    // For now, stub them
  }

  // ── Light dependency check (from API data) ──
  if (repo.language) {
    findings.push({
      severity: 'info',
      check: 'language',
      message: `Repo language: ${repo.language}`,
      detail: repo.topics?.length ? `Topics: ${repo.topics.join(', ')}` : null,
    });
    checksPassed++;
    checksTotal++;
  }

  if (repo.archived) {
    findings.push({
      severity: 'warning',
      check: 'archived',
      message: 'Repo is archived — no active development',
    });
  }

  return {
    full_name: repo.full_name,
    description: repo.description,
    language: repo.language,
    private: repo.private,
    archived: repo.archived,
    updated_at: repo.updated_at,
    default_branch: repo.default_branch,
    topics: repo.topics || [],
    checksPassed,
    checksTotal,
    findings,
    errors: findings.filter(f => f.severity === 'error'),
  };
}
