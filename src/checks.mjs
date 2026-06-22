/**
 * Per-repo checks — runs structured review on a single repo
 * Supports both shallow (API) and deep (clone) modes.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runStructureCheck } from '../checks/structure.mjs';
import { runFileScan } from '../checks/files.mjs';
import { runDependencyCheck } from '../checks/dependencies.mjs';
import { runSecretCheck } from '../checks/secrets.mjs';
import { runConfigCheck } from '../checks/config.mjs';

const WORKSPACE = '/tmp/architect-workspace';

export async function checkRepo(repo, flags) {
  const findings = [];
  let checksPassed = 0;
  let checksTotal = 0;

  // ── Structure checks (API-only) ──
  const { findings: structFindings, passed: structPassed, total: structTotal } =
    runStructureCheck(repo);
  findings.push(...structFindings);
  checksPassed += structPassed;
  checksTotal += structTotal;

  // ── File tree (API, no clone) ──
  let fileList = [];
  try {
    const { fetchRepoFileList, fetchRepoFile } = await import('./discovery.mjs');
    fileList = await fetchRepoFileList(repo.owner, repo.name, repo.default_branch);

    const { findings: fileFindings, passed: filePassed, total: fileTotal } =
      runFileScan(repo, fileList, { fetchRepoFile, owner: repo.owner, name: repo.name, branch: repo.default_branch });
    findings.push(...fileFindings);
    checksPassed += filePassed;
    checksTotal += fileTotal;
  } catch (err) {
    findings.push({ severity: 'warning', check: 'file-tree', message: `Could not fetch file tree: ${err.message}` });
  }

  repo._fileList = fileList;

  // ── Archived repos get a flag ──
  if (repo.archived) {
    findings.push({ severity: 'warning', check: 'archived', message: 'Repo is archived — no active development' });
  }

  // ── Deep checks (clone + static analysis) ──
  if (flags.deep) {
    const repoDir = await cloneRepo(repo);
    if (repoDir) {
      const depResults = await runDependencyCheck(repoDir, flags);
      findings.push(...depResults.findings);
      checksPassed += depResults.passed;
      checksTotal += depResults.total;

      const secretResults = await runSecretCheck(repoDir, flags);
      findings.push(...secretResults.findings);
      checksPassed += secretResults.passed;
      checksTotal += secretResults.total;

      const configResults = await runConfigCheck(repoDir, flags);
      findings.push(...configResults.findings);
      checksPassed += configResults.passed;
      checksTotal += configResults.total;
    }
  }

  return {
    full_name: repo.full_name,
    name: repo.name,
    owner: repo.owner,
    description: repo.description,
    language: repo.language,
    private: repo.private,
    archived: repo.archived,
    updated_at: repo.updated_at,
    default_branch: repo.default_branch,
    topics: repo.topics,
    size: repo.size,
    stars: repo.stars,
    html_url: repo.html_url,
    fileCount: fileList.length,
    fileList: fileList.map(f => f.path),
    checksPassed,
    checksTotal,
    findings,
    errors: findings.filter(f => f.severity === 'error'),
  };
}

async function cloneRepo(repo) {
  const dir = resolve(WORKSPACE, repo.owner, repo.name);
  if (existsSync(dir)) return dir;

  await mkdir(resolve(WORKSPACE, repo.owner), { recursive: true });

  try {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const authUrl = repo.clone_url.replace('https://', `https://${token}@`);
    execSync(`git clone --depth 1 ${authUrl} "${dir}"`, {
      stdio: 'pipe',
      timeout: 120000,
    });
    return dir;
  } catch (err) {
    console.error(`  ✗ Failed to clone ${repo.full_name}: ${err.message}`);
    return null;
  }
}
