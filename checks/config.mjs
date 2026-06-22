/**
 * Config checks — Dockerfiles, env templates, CI pipelines
 * Stub for now — expand when deep mode is implemented.
 */

export async function runConfigCheck(repoPath, flags) {
  const findings = [];
  let passed = 0;
  let total = 0;

  // TODO: deep mode — check for:
  // - Dockerfile exist / sensible
  // - .env.example or .env.template
  // - CI config (.github/workflows, Jenkinsfile)
  // - .gitignore

  return { findings, passed, total };
}
