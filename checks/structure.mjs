/**
 * Structure check — README, license, CI config, etc.
 */

export function runStructureCheck(repo) {
  const findings = [];
  let passed = 0;
  let total = 0;

  // Has description? (from GH API)
  if (repo.description) {
    passed++;
  } else {
    findings.push({ severity: 'warning', check: 'description', message: 'No repo description' });
  }
  total++;

  // Has topics?
  if (repo.topics?.length > 0) {
    passed++;
  } else {
    findings.push({ severity: 'info', check: 'topics', message: 'No topics defined' });
  }
  total++;

  // Has license?
  if (repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION') {
    passed++;
  } else {
    findings.push({ severity: 'warning', check: 'license', message: 'No license detected' });
  }
  total++;

  // Has homepage?
  if (repo.homepage) {
    passed++;
  } else {
    findings.push({ severity: 'info', check: 'homepage', message: 'No homepage URL set' });
  }
  total++;

  return { findings, passed, total };
}
