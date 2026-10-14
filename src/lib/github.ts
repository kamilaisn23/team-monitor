const GITHUB_API = 'https://api.github.com'

export function githubIssueQueries(username: string): string[] {
  const personalOwner = process.env.GITHUB_USER_NAME?.trim();
  const organization = process.env.GITHUB_ORG_NAME?.trim();
  const owner = personalOwner || organization || username;
  for (const login of [owner, username]) {
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(login)) {
      throw new Error('Invalid GitHub username or repository owner configuration.');
    }
  }
  const scope = personalOwner || !organization ? `user:${owner}` : `org:${owner}`;
  return [`${scope} assignee:${username} is:issue`, `${scope} author:${username} is:issue`];
}

export interface GitHubIssue {
  number: number
  title: string
  html_url: string
  state: 'open' | 'closed'
  user: { login: string }
  assignees: { login: string }[]
  repository_url: string
  created_at: string
  closed_at: string | null
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchPage(url: string, attempt = 0): Promise<Response> {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_ORG_TOKEN;
  const res = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(30_000),
  })
  // GitHub secondary rate limit returns 403 (not 429) with a specific message.
  // Treat both the same: back off and retry up to 3 times.
  const rateLimited = res.status === 429 || (res.status === 403 &&
    (res.headers.has('Retry-After') || res.headers.get('X-RateLimit-Remaining') === '0'));
  if (rateLimited && attempt < 3) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '0') * 1000 || 60_000
    console.warn(`[github] Rate limited (${res.status}) — waiting ${retryAfter / 1000}s before retry ${attempt + 1}/3`)
    await sleep(retryAfter)
    return fetchPage(url, attempt + 1)
  }
  return res
}

async function searchIssues(query: string): Promise<GitHubIssue[]> {
  const issues: GitHubIssue[] = []
  let page = 1

  while (true) {
    const url = `${GITHUB_API}/search/issues?q=${encodeURIComponent(query)}&per_page=100&page=${page}`
    const res = await fetchPage(url)
    if (!res.ok) {
      throw new Error(`GitHub issue search failed (HTTP ${res.status}). Check repository access, token and account scope.`)
    }
    const data = await res.json() as { items: GitHubIssue[]; total_count: number }
    issues.push(...data.items)
    if (data.items.length < 100) break
    page++
  }
  return issues
}

export async function fetchGithubIssues(username: string): Promise<GitHubIssue[]> {
  // Run sequentially to avoid hitting GitHub's secondary rate limit (burst of concurrent search requests).
  const [assignedQuery, authoredQuery] = githubIssueQueries(username)
  const assigned = await searchIssues(assignedQuery!)
  const authored = await searchIssues(authoredQuery!)

  // Deduplicate by html_url
  const seen = new Set<string>()
  const all: GitHubIssue[] = []
  for (const issue of [...assigned, ...authored]) {
    if (!seen.has(issue.html_url)) {
      seen.add(issue.html_url)
      all.push(issue)
    }
  }
  return all
}

export function parseRepoFromGithubIssue(issue: GitHubIssue): { name: string; url: string } {
  // repository_url: https://api.github.com/repos/org/repo-name
  const parts = issue.repository_url.split('/')
  const name = parts[parts.length - 1] ?? 'unknown'
  // html_url: https://github.com/org/repo-name/issues/123
  const urlParts = issue.html_url.split('/')
  const url = urlParts.slice(0, 5).join('/') // https://github.com/org/repo-name
  return { name, url }
}
