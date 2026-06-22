/**
 * File scan checks — examines key files across the repo
 * without requiring a clone (uses GitHub Contents API).
 */

export function runFileScan(repo, fileList, { fetchRepoFile, owner, name, branch }) {
  const findings = [];
  let passed = 0;
  let total = 0;

  const fileMap = new Map(fileList.map(f => [f.path, f]));
  const filenames = [...fileMap.keys()];

  // ── README check ──
  const hasReadme = filenames.some(f => /^README/i.test(f));
  if (hasReadme) {
    passed++;
  } else {
    findings.push({ severity: 'error', check: 'readme', message: 'No README file found' });
  }
  total++;

  // ── License file ──
  const hasLicense = filenames.some(f => /^LICENSE/i.test(f));
  if (hasLicense) {
    passed++;
  } else {
    findings.push({ severity: 'warning', check: 'license-file', message: 'No LICENSE file in root' });
  }
  total++;

  // ── .gitignore ──
  if (filenames.includes('.gitignore')) {
    passed++;
  } else {
    findings.push({ severity: 'info', check: 'gitignore', message: 'No .gitignore file' });
  }
  total++;

  // ── .env.example or .env.template ──
  const hasEnvExample = filenames.some(f => f === '.env.example' || f === '.env.template' || f === '.env.sample');
  if (hasEnvExample) {
    passed++;
  } else {
    findings.push({ severity: 'info', check: 'env-template', message: 'No .env.example / .env.template file' });
  }
  total++;

  // ── CI/CD config ──
  const hasCI = filenames.some(f =>
    f.startsWith('.github/workflows/') ||
    f === 'Jenkinsfile' ||
    f.startsWith('.gitlab-ci') ||
    f === 'Dockerfile' ||
    filenames.some(ff => /docker-compose/.test(ff))
  );
  if (hasCI) {
    passed++;
  } else {
    findings.push({ severity: 'info', check: 'ci-config', message: 'No CI/CD config detected' });
  }
  total++;

  // ── Check for committed .env ──
  if (filenames.includes('.env')) {
    findings.push({ severity: 'error', check: 'secrets', message: '.env file committed to repo — contains secrets!' });
  }
  // Also catch .env in subdirectories
  const envFiles = filenames.filter(f => /\.env$/.test(f) && f !== '.env.example' && !f.includes('.env.template') && !f.includes('.env.sample'));
  if (envFiles.length > 0) {
    findings.push({ severity: 'error', check: 'secrets', message: `.env files committed: ${envFiles.join(', ')}` });
  }

  // ── Language-specific files ──
  if (repo.language === 'JavaScript' || repo.language === 'TypeScript') {
    const hasPackageJson = filenames.includes('package.json');
    if (hasPackageJson) {
      passed++;
    } else {
      findings.push({ severity: 'warning', check: 'package-json', message: 'JavaScript/TypeScript repo without package.json' });
    }
    total++;

    const hasLockfile = filenames.some(f => f === 'package-lock.json' || f === 'yarn.lock' || f === 'pnpm-lock.yaml');
    if (!hasLockfile) {
      findings.push({ severity: 'info', check: 'lockfile', message: 'No lockfile (package-lock.json/yarn.lock/pnpm-lock.yaml)' });
    }
  }

  if (repo.language === 'Python') {
    const hasRequirements = filenames.some(f => /requirements.*\.txt/.test(f) || f === 'Pipfile' || f === 'pyproject.toml' || f === 'poetry.lock');
    if (hasRequirements) {
      passed++;
    } else {
      findings.push({ severity: 'warning', check: 'requirements', message: 'Python repo without requirements.txt/Pipfile/pyproject.toml' });
    }
    total++;
  }

  return { findings, passed, total };
}
