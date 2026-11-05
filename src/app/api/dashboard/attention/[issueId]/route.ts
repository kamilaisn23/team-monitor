import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/session";
import { validFollowUpInput } from "@/types/attention";
import { serializeFollowUp } from "@/lib/follow-up";
import { readJsonObject } from "@/lib/json-body";
import { onlyKeys, identifier } from "@/lib/input-validation";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ issueId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(session) && session.user.role !== "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = await readJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;
  if (!onlyKeys(body, ['status', 'note', 'ownerId', 'expectedRevision']) || !validFollowUpInput(body)) return NextResponse.json({ error: "Status, catatan (maksimal 2.000 karakter), atau penanggung jawab tidak valid." }, { status: 400 });
  const { issueId } = await params;
  if (!identifier(issueId)) return NextResponse.json({ error: "Invalid issue ID" }, { status: 400 });
  try {
    const row = await prisma.$transaction(async tx => {
      const issue = await tx.issue.findFirst({ where: { id: issueId, state: "OPEN", repository: { ignored: false } }, select: { id: true } });
      if (!issue) throw Object.assign(new Error(), { status: 404 });
      const previous = await tx.followUp.findUnique({ where: { issueId } });
      if ((previous?.revision ?? null) !== body.expectedRevision) throw Object.assign(new Error(), { status: 409 });
      let ownerName = previous?.ownerName ?? null;
      if (body.ownerId) {
        const owner = await tx.teamMember.findFirst({ where: { id: body.ownerId }, select: { id: true, name: true, isActive: true, role: true } });
        if (!owner || (!owner.isActive || owner.role === "UNASSIGNED") && previous?.ownerId !== body.ownerId) throw Object.assign(new Error(), { status: 400 });
        // Preserve historic name for an unchanged unavailable owner.
        ownerName = owner.isActive ? owner.name : ownerName || owner.name;
      } else ownerName = null;
      const actor = session.user.id ? await tx.teamMember.findFirst({ where: { id: session.user.id }, select: { id: true } }) : null;
      const data = { status: body.status, note: body.note.trim(), ownerId: body.ownerId, ownerName,
        actorId: actor?.id ?? null, actorName: session.user.name || session.user.githubLogin || "Manager",
        revision: randomUUID(), updatedAt: new Date() };
      if (previous) {
        const result = await tx.followUp.updateMany({ where: { issueId, revision: body.expectedRevision! }, data });
        if (!result.count) throw Object.assign(new Error(), { status: 409 });
      } else await tx.followUp.create({ data: { issueId, ...data } });
      // Atomic with current version: no audit entry for rejected/stale writes.
      await tx.followUpHistory.create({ data: { issueId, revision: data.revision, status: data.status, note: data.note,
        ownerId: data.ownerId, ownerName: data.ownerName, actorId: data.actorId, actorName: data.actorName, changedAt: data.updatedAt } });
      return { issueId, ...data };
    });
    return NextResponse.json(serializeFollowUp(row));
  } catch (error) {
    const failure = error as { status?: number; code?: string };
    const status = failure.code === "P2002" ? 409 : failure.status;
    const messages: Record<number, string> = { 400: "Pilih penanggung jawab yang masih aktif.", 404: "Isu tidak tersedia atau sudah ditutup. Muat ulang pusat perhatian.", 409: "Tindak lanjut telah diubah pengguna lain. Muat ulang daftar sebelum menyimpan kembali." };
    return NextResponse.json({ error: messages[status || 500] || "Tindak lanjut gagal disimpan." }, { status: status || 500 });
  }
}
