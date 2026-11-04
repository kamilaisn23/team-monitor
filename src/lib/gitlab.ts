const GITLAB_BASE_URL = process.env.GITLAB_BASE_URL!
const GITLAB_GROUP_TOKEN = process.env.GITLAB_GROUP_TOKEN!
const GITLAB_GROUP_ID = process.env.GITLAB_GROUP_ID!

export interface GitLabIssue {
  iid: number
  title: string
  web_url: string
  state: 'opened' | 'closed'
  author: { username: string }
  assignees: { username: string }[]
  project_id: number
  created_at: string
  closed_at: string | null
  references: { full: string }
}

async function fetchGitLabPage(url: string): Promise<{ items: GitLabIssue[]; nextPage: string | null }> {
  const res = await fetch(url, {
    headers: { 'PRIVATE-TOKEN': GITLAB_GROUP_TOKEN },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    throw new Error(`GitLab issue request failed (HTTP ${res.status})`)
  }
  const items = await res.json() as GitLabIssue[]
  const nextPage = res.headers.get('X-Next-Page')
  return { items, nextPage: nextPage || null }
}

async function fetchGroupIssues(params: Record<string, string>): Promise<GitLabIssue[]> {
  const issues: GitLabIssue[] = []
  const query = new URLSearchParams({ ...params, per_page: '100', page: '1', with_labels_details: 'false' })
  let url: string | null = `${GITLAB_BASE_URL}/api/v4/groups/${GITLAB_GROUP_ID}/issues?${query.toString()}`

  while (url) {
    const { items, nextPage } = await fetchGitLabPage(url)
    issues.push(...items)
    if (nextPage) {
      const baseUrl: string = url.split('?')[0]!
      const currentParams: URLSearchParams = new URLSearchParams(url.split('?')[1] ?? '')
      currentParams.set('page', nextPage)
      url = `${baseUrl}?${currentParams.toString()}`
    } else {
      url = null
    }
  }
  return issues
}

export async function fetchGitlabIssues(username: string): Promise<GitLabIssue[]> {
  const [assigned, authored] = await Promise.all([
    fetchGroupIssues({ assignee_username: username }),
    fetchGroupIssues({ author_username: username }),
  ])

  // Deduplicate by web_url
  const seen = new Set<string>()
  const all: GitLabIssue[] = []
  for (const issue of [...assigned, ...authored]) {
    if (!seen.has(issue.web_url)) {
      seen.add(issue.web_url)
      all.push(issue)
    }
  }
  return all
}

// Cache for project URL lookups (projectId → web_url)
const projectUrlCache = new Map<number, string>()

export function prewarmProjectUrlCache(repos: { platformId: string; url: string }[]) {
    for (const { platformId, url } of repos) {
        const id = parseInt(platformId, 10)
        if (!isNaN(id) && !projectUrlCache.has(id)) {
            projectUrlCache.set(id, url)
        }
    }
}

export async function getProjectUrl(projectId: number): Promise<string> {
  if (projectUrlCache.has(projectId)) return projectUrlCache.get(projectId)!
  const res = await fetch(`${GITLAB_BASE_URL}/api/v4/projects/${projectId}`, {
    headers: { 'PRIVATE-TOKEN': GITLAB_GROUP_TOKEN },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) return `${GITLAB_BASE_URL}/projects/${projectId}`
  const data = await res.json() as { web_url: string }
  projectUrlCache.set(projectId, data.web_url)
  return data.web_url
}

export function parseRepoFromGitLabIssue(issue: GitLabIssue, projectUrl: string): { name: string; url: string } {
  const parts = projectUrl.split('/')
  const name = parts[parts.length - 1] ?? String(issue.project_id)
  return { name, url: projectUrl }
}
