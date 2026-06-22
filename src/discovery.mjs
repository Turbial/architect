/**
 * Repo discovery — GitHub API listing with full metadata
 */

const GITHUB_API = 'https://api.github.com';

function authHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN or GH_TOKEN required');
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

  // Try org first, fall back to user account
  try {
    return await fetchOrgRepos(flags.org);
  } catch (err) {
    if (err.message.includes('404') || err.message.includes('Not Found')) {
      console.error(`  ℹ️  ${flags.org} is not an org, trying as user account...`);
      return await fetchUserRepos(flags.org);
    }
    throw err;
  }
}

async function fetchUserRepos(username) {
  const repos = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${GITHUB_API}/users/${username}/repos?per_page=100&page=${page}&sort=updated&type=owner`;
    const res = await fetch(url, { headers: authHeaders() });

    if (!res.ok) {
      throw new Error(`Failed to fetch user repos: ${res.status} ${res.statusText}`);
    }

    const batch = await res.json();
    if (batch.length === 0) break;

    repos.push(...batch.map(enrichRepo));
    page++;
    hasMore = batch.length === 100;
  }

  return repos;
}

async function fetchSingleRepo(owner, repo) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    console.error(`  ✗ Failed to fetch ${owner}/${repo}: ${res.status}`);
    return null;
  }
  return enrichRepo(await res.json());
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

    repos.push(...batch.map(enrichRepo));
    page++;
    hasMore = batch.length === 100;
  }

  return repos;
}

function enrichRepo(repo) {
  return {
    full_name: repo.full_name,
    name: repo.name,
    owner: repo.owner?.login,
    description: repo.description,
    language: repo.language,
    private: repo.private,
    archived: repo.archived,
    disabled: repo.disabled,
    fork: repo.fork,
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    pushed_at: repo.pushed_at,
    default_branch: repo.default_branch,
    topics: repo.topics || [],
    license: repo.license?.spdx_id || null,
    size: repo.size,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    open_issues: repo.open_issues_count,
    has_issues: repo.has_issues,
    has_wiki: repo.has_wiki,
    has_pages: repo.has_pages,
    clone_url: repo.clone_url,
    ssh_url: repo.ssh_url,
    homepage: repo.homepage,
    html_url: repo.html_url,
  };
}

/**
 * Fetch repo contents tree via GitHub Contents API (no clone needed for shallow)
 */
export async function fetchRepoFileList(owner, repo, branch = 'main') {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const res = await fetch(url, { headers: authHeaders() });

  if (res.status === 409) {
    // Empty repo
    return [];
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch tree for ${owner}/${repo}: ${res.status}`);
  }

  const data = await res.json();
  return (data.tree || []).filter(item => item.type === 'blob').map(item => ({
    path: item.path,
    size: item.size,
    mode: item.mode,
  }));
}

/**
 * Fetch a single file content from GitHub
 */
export async function fetchRepoFile(owner, repo, path, branch = 'main') {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const res = await fetch(url, { headers: authHeaders() });

  if (!res.ok) return null;

  const data = await res.json();
  if (data.encoding === 'base64' && data.content) {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }
  return null;
}
