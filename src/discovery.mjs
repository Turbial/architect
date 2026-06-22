/**
 * Repo discovery — GitHub API listing
 */

const GITHUB_API = 'https://api.github.com';

function authHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'architect-turbial',
  };
}

export async function discoverRepos(flags) {
  if (flags.repo) {
    const [owner, repo] = flags.repo.split('/');
    if (!owner || !repo) throw new Error('Invalid --repo format. Use owner/repo');
    const r = await fetchSingleRepo(owner, repo);
    return r ? [r] : [];
  }

  return await fetchOrgRepos(flags.org);
}

async function fetchSingleRepo(owner, repo) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    console.error(`  ✗ Failed to fetch ${owner}/${repo}: ${res.status}`);
    return null;
  }
  return res.json();
}

async function fetchOrgRepos(org) {
  const repos = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${GITHUB_API}/orgs/${org}/repos?per_page=100&page=${page}&sort=updated`;
    const res = await fetch(url, { headers: authHeaders() });

    if (!res.ok) {
      throw new Error(`Failed to fetch org repos: ${res.status} ${res.statusText}`);
    }

    const batch = await res.json();
    if (batch.length === 0) break;

    repos.push(...batch);
    page++;
    hasMore = batch.length === 100;
  }

  return repos;
}
