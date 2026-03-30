const GITHUB_API = 'https://api.github.com'
const GITHUB_ORG_TOKEN = process.env.GITHUB_ORG_TOKEN!
const GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME!

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
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_ORG_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (res.status === 429 && attempt < 3) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '60') * 1000
    console.log(`[github] Rate limited — waiting ${retryAfter}ms`)
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
      console.error(`[github] Search failed: ${res.status} ${await res.text()}`)
      break
    }
    const data = await res.json() as { items: GitHubIssue[]; total_count: number }
    issues.push(...data.items)
    if (data.items.length < 100) break
    page++
  }
  return issues
}

export async function fetchGithubIssues(username: string): Promise<GitHubIssue[]> {
  const [assigned, authored] = await Promise.all([
    searchIssues(`org:${GITHUB_ORG_NAME} assignee:${username} is:issue`),
    searchIssues(`org:${GITHUB_ORG_NAME} author:${username} is:issue`),
  ])

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
