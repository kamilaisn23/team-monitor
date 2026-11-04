import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canReadWorkspace, issueReadScope } from "@/lib/read-access";

export async function GET() {
    const session = await auth();
    if (!session)
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });

    if (!canReadWorkspace(session)) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
    const result = await prisma.issue.aggregate({
        where: issueReadScope(session),
        _max: { syncedAt: true },
    });

    return new Response(
        JSON.stringify({
            lastSyncedAt: result._max.syncedAt?.toISOString() ?? null,
        }),
        { headers: { "Content-Type": "application/json" } },
    );
}
