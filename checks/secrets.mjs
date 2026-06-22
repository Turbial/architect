/**
 * Secrets check — hardcoded API keys, tokens, passwords
 * Uses regex scanning on cloned repo contents.
 * Stub for now — expand when deep mode is implemented.
 */

export async function runSecretCheck(repoPath, flags) {
  const findings = [];
  let passed = 0;
  let total = 0;

  // TODO: deep mode — scan for patterns like:
  // - GITHUB_TOKEN, GH_TOKEN, API_KEY, SECRET, PASSWORD
  // - Base64-encoded credentials
  // - .env files committed

  return { findings, passed, total };
}
