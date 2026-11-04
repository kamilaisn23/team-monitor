import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readJsonObject } from "@/lib/json-body";
import { onlyKeys, validRebalanceBody } from "@/lib/input-validation";
import { canRebalance } from "@/lib/read-access";
import { executeRebalance } from "@/lib/rebalance";

/**
 * POST /api/issues/rebalance
 * Body: { fromMemberId: string, toMemberId: string, issueIds: string[] }
 *
 * INTERNAL ONLY — reassigns issues in the internal DB and records an
 * audit trail in FollowUpHistory (origin="rebalance"). This endpoint does
 * NOT call the GitHub/GitLab APIs and does NOT modify assignees on GitHub/GitLab.
 * The source-side assignee row is removed; the destination row is stored
 * internally. The next DB sync from GitHub/GitLab may reconcile platform
 * assignees again — this is documented in docs/PROTOTYPE_MERGE.md.
 *
 * Permission: MANAGER + ADMIN (+ superadmin). Developer: 403.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canRebalance(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await readJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;
  if (!onlyKeys(body, ["fromMemberId", "toMemberId", "issueIds"]) || !validRebalanceBody(body)) {
    return NextResponse.json({ error: "fromMemberId, toMemberId, dan issueIds tidak valid." }, { status: 400 });
  }

  try {
    const result = await executeRebalance({
      fromMemberId: body.fromMemberId,
      toMemberId: body.toMemberId,
      issueIds: body.issueIds,
      actorId: session.user.id ?? null,
      actorName: session.user.name || session.user.githubLogin || "Manager",
    });
    return NextResponse.json({ ...result, internalOnly: true });
  } catch (error) {
    const failure = error as { status?: number };
    const status = failure.status ?? 500;
    const messages: Record<number, string> = {
      400: "Anggota tujuan tidak tersedia (nonaktif / belum ditentukan).",
      409: "Sebagian isu tidak tersedia (sudah ditutup / bukan milik sumber). Muat ulang sebelum mencoba lagi.",
    };
    return NextResponse.json({ error: messages[status] || "Redistribusi gagal." }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
