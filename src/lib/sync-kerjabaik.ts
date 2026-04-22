import { prisma } from "@/lib/prisma"
import { listEmployees } from "@/lib/kerjabaik"

export type KerjabaikSyncEvent =
    | { type: "kerjabaik_start" }
    | { type: "kerjabaik_done"; upserted: number; deactivated: number; durationSeconds: string }
    | { type: "kerjabaik_error"; error: string }

export async function runKerjabaikSync(
    onProgress?: (event: KerjabaikSyncEvent) => void,
): Promise<void> {
    const startTime = Date.now()
    onProgress?.({ type: "kerjabaik_start" })
    console.log(`[sync-kerjabaik] Starting at ${new Date().toISOString()}`)

    let employees
    try {
        employees = await listEmployees()
    } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err)
        console.error(`[sync-kerjabaik] Failed to fetch employees: ${error}`)
        onProgress?.({ type: "kerjabaik_error", error })
        return
    }

    console.log(`[sync-kerjabaik] Fetched ${employees.length} employee(s) from kerjabaik`)

    const activeIds = new Set<string>()
    let upserted = 0

    for (const emp of employees) {
        if (!emp.employee_id) continue
        activeIds.add(emp.employee_id)

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
            kerjabaikEmployeeId: { not: null, notIn: [...activeIds] },
            isActive: true,
        },
        data: { isActive: false },
    })

    if (deactivated > 0) {
        console.log(`[sync-kerjabaik] Deactivated ${deactivated} member(s) not present in kerjabaik response`)
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[sync-kerjabaik] Done — ${upserted} upserted, ${deactivated} deactivated (${durationSeconds}s)`)
    onProgress?.({ type: "kerjabaik_done", upserted, deactivated, durationSeconds })
}
