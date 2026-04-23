const PAGE_SIZE = 100

export interface KerjabaikEmployee {
    employee_id: string
    name: string
    username_github?: string | null
    username_gitlab?: string | null
    is_active: boolean
}

async function fetchPage(page: number): Promise<KerjabaikEmployee[]> {
    const baseUrl = process.env.KERJABAIK_BASE_URL
    const token = process.env.KERJABAIK_SERVICE_TOKEN

    if (!baseUrl) throw new Error("KERJABAIK_BASE_URL is not set")
    if (!token) throw new Error("KERJABAIK_SERVICE_TOKEN is not set")

    const url = `${baseUrl}/api/v1/employees/external-accounts?page=${page}&size=${PAGE_SIZE}`
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
        throw new Error(`kerjabaik API error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json() as KerjabaikEmployee[] | { data: KerjabaikEmployee[] }
    // Support both bare array and { data: [] } envelope shapes
    return Array.isArray(data) ? data : data.data
}

/** Fetch all employees from kerjabaik, paginating until an empty page. */
export async function listEmployees(): Promise<KerjabaikEmployee[]> {
    const results: KerjabaikEmployee[] = []
    let page = 1

    while (true) {
        const batch = await fetchPage(page)
        if (batch.length === 0) break
        results.push(...batch)
        if (batch.length < PAGE_SIZE) break
        page++
    }

    return results
}

export interface KerjabaikAssignment {
    employee_id: string
}

export interface KerjabaikProject {
    project_id: string
    client_name: string
    project_name: string
    is_active: boolean
    assignments: KerjabaikAssignment[]
}

function getEnv() {
    const baseUrl = process.env.KERJABAIK_BASE_URL
    const token = process.env.KERJABAIK_SERVICE_TOKEN
    if (!baseUrl) throw new Error("KERJABAIK_BASE_URL is not set")
    if (!token) throw new Error("KERJABAIK_SERVICE_TOKEN is not set")
    return { baseUrl, token }
}

/** Fetch all projects with active assignments from kerjabaik. */
export async function listProjects(): Promise<KerjabaikProject[]> {
    const { baseUrl, token } = getEnv()
    const res = await fetch(`${baseUrl}/api/v1/projects/external`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
        throw new Error(`kerjabaik API error: ${res.status} ${res.statusText}`)
    }
    const data = await res.json() as KerjabaikProject[] | { data: KerjabaikProject[] }
    return Array.isArray(data) ? data : data.data
}
