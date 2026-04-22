import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Shape expected from GET /api/v1/employees/external-accounts
interface ExternalAccount {
    employee_id: string;
    username_github?: string | null;
    username_gitlab?: string | null;
}

async function fetchExternalAccounts(): Promise<ExternalAccount[]> {
    const baseUrl = process.env.KERJABAIK_BASE_URL;
    const token = process.env.KERJABAIK_SERVICE_TOKENS?.split(",")[0]?.trim();

    if (!baseUrl) throw new Error("KERJABAIK_BASE_URL is not set");
    if (!token) throw new Error("KERJABAIK_SERVICE_TOKENS is not set");

    const res = await fetch(`${baseUrl}/api/v1/employees/external-accounts`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        throw new Error(
            `Failed to fetch external accounts: ${res.status} ${res.statusText}`,
        );
    }

    return res.json() as Promise<ExternalAccount[]>;
}

async function main() {
    // Dynamic import so tsconfig-paths is registered first if needed
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    try {
        console.log("[backfill] Fetching external accounts from kerjabaik...");
        const accounts = await fetchExternalAccounts();
        console.log(`[backfill] Received ${accounts.length} account(s)`);

        const members = await prisma.teamMember.findMany({
            select: {
                id: true,
                name: true,
                usernameGithub: true,
                usernameGitlab: true,
                kerjabaikEmployeeId: true,
            },
        });

        // Build lookup maps from kerjabaik data
        const byGithub = new Map<string, string>();
        const byGitlab = new Map<string, string>();
        for (const acc of accounts) {
            if (acc.username_github) byGithub.set(acc.username_github.toLowerCase(), acc.employee_id);
            if (acc.username_gitlab) byGitlab.set(acc.username_gitlab.toLowerCase(), acc.employee_id);
        }

        let matched = 0;
        let skipped = 0;
        const unmatched: string[] = [];

        for (const member of members) {
            if (member.kerjabaikEmployeeId) {
                skipped++;
                continue;
            }

            const employeeId =
                (member.usernameGithub && byGithub.get(member.usernameGithub.toLowerCase())) ||
                (member.usernameGitlab && byGitlab.get(member.usernameGitlab.toLowerCase())) ||
                null;

            if (employeeId) {
                await prisma.teamMember.update({
                    where: { id: member.id },
                    data: { kerjabaikEmployeeId: employeeId },
                });
                console.log(
                    `[backfill] Matched: ${member.name} (${member.usernameGithub ?? member.usernameGitlab}) -> ${employeeId}`,
                );
                matched++;
            } else {
                unmatched.push(
                    `  - ${member.name} | github: ${member.usernameGithub ?? "—"} | gitlab: ${member.usernameGitlab ?? "—"}`,
                );
            }
        }

        console.log(`\n[backfill] Done — ${matched} matched, ${skipped} already set`);

        if (unmatched.length > 0) {
            console.warn(`\n[backfill] ${unmatched.length} unmatched team member(s) — manual reconciliation required:`);
            unmatched.forEach((line) => console.warn(line));
        } else {
            console.log("[backfill] All active team members matched successfully");
        }
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((err) => {
    console.error("[backfill] Fatal error:", err);
    process.exit(1);
});
