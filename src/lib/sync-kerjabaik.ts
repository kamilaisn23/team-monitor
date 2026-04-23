import { prisma } from "@/lib/prisma"
import { listEmployees, listProjects } from "@/lib/kerjabaik"

export type KerjabaikSyncEvent =
    | { type: "kerjabaik_start" }
    | { type: "kerjabaik_done"; upserted: number; deactivated: number; teamsUpserted: number; teamsArchived: number; durationSeconds: string }
    | { type: "kerjabaik_error"; error: string }

export async function runKerjabaikSync(
    onProgress?: (event: KerjabaikSyncEvent) => void,
): Promise<void> {
    const startTime = Date.now()
    onProgress?.({ type: "kerjabaik_start" })
    console.log(`[sync-kerjabaik] Starting at ${new Date().toISOString()}`)

    let employees
    let projects
    try {
        ;[employees, projects] = await Promise.all([listEmployees(), listProjects()])
    } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err)
        console.error(`[sync-kerjabaik] Failed to fetch from kerjabaik: ${error}`)
        onProgress?.({ type: "kerjabaik_error", error })
        return
    }

    console.log(`[sync-kerjabaik] Fetched ${employees.length} employee(s) and ${projects.length} project(s)`)

    // ── Employee sync ──────────────────────────────────────────────────────────

    const activeEmployeeIds = new Set<string>()
    let upserted = 0

    for (const emp of employees) {
        if (!emp.employee_id) continue
        activeEmployeeIds.add(emp.employee_id)

        await prisma.teamMember.upsert({
            where: { kerjabaikEmployeeId: emp.employee_id },
            update: {
                name: emp.name,
                ...(emp.username_github !== undefined ? { usernameGithub: emp.username_github ?? null } : {}),
                ...(emp.username_gitlab !== undefined ? { usernameGitlab: emp.username_gitlab ?? null } : {}),
                isActive: emp.is_active,
            },
            create: {
                kerjabaikEmployeeId: emp.employee_id,
                name: emp.name,
                usernameGithub: emp.username_github ?? null,
                usernameGitlab: emp.username_gitlab ?? null,
                isActive: emp.is_active,
            },
        })
        upserted++
    }

    // Soft-offboard: mark members managed by kerjabaik but absent from response as inactive
    const { count: deactivated } = await prisma.teamMember.updateMany({
        where: {
            kerjabaikEmployeeId: { not: null, notIn: [...activeEmployeeIds] },
            isActive: true,
        },
        data: { isActive: false },
    })

    if (deactivated > 0) {
        console.log(`[sync-kerjabaik] Deactivated ${deactivated} member(s) not present in kerjabaik response`)
    }

    // ── Project → Team sync ────────────────────────────────────────────────────

    // Build a lookup: kerjabaikEmployeeId → TeamMember.id (only those already synced)
    const membersByKerjabaikId = new Map<string, string>()
    const allMembers = await prisma.teamMember.findMany({
        where: { kerjabaikEmployeeId: { not: null } },
        select: { id: true, kerjabaikEmployeeId: true },
    })
    for (const m of allMembers) {
        membersByKerjabaikId.set(m.kerjabaikEmployeeId!, m.id)
    }

    const activeProjectIds = new Set<string>()
    let teamsUpserted = 0

    for (const project of projects) {
        if (!project.is_active) continue
        activeProjectIds.add(project.project_id)

        const teamName = `${project.client_name} – ${project.project_name}`

        const team = await prisma.team.upsert({
            where: { kerjabaikProjectId: project.project_id },
            update: { name: teamName, isArchived: false },
            create: { name: teamName, kerjabaikProjectId: project.project_id, isArchived: false },
            select: { id: true },
        })
        teamsUpserted++

        // Replace memberships: delete existing, insert current assignments
        const memberIds = project.assignments
            .map((a) => membersByKerjabaikId.get(a.employee_id))
            .filter((id): id is string => id !== undefined)

        await prisma.$transaction([
            prisma.teamMembership.deleteMany({ where: { teamId: team.id } }),
            prisma.teamMembership.createMany({
                data: memberIds.map((teamMemberId) => ({ teamId: team.id, teamMemberId })),
                skipDuplicates: true,
            }),
        ])
    }

    // Archive teams managed by kerjabaik whose project is no longer active
    const { count: teamsArchived } = await prisma.team.updateMany({
        where: {
            kerjabaikProjectId: { not: null, notIn: [...activeProjectIds] },
            isArchived: false,
        },
        data: { isArchived: true },
    })

    if (teamsArchived > 0) {
        console.log(`[sync-kerjabaik] Archived ${teamsArchived} team(s) with inactive kerjabaik projects`)
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[sync-kerjabaik] Done — ${upserted} members upserted, ${deactivated} deactivated, ${teamsUpserted} teams upserted, ${teamsArchived} archived (${durationSeconds}s)`)
    onProgress?.({ type: "kerjabaik_done", upserted, deactivated, teamsUpserted, teamsArchived, durationSeconds })
}
