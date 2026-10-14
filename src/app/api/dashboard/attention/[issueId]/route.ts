import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/session";
import { parseFollowUp, validFollowUpInput, type FollowUp } from "@/types/attention";
import { readJsonObject } from "@/lib/json-body";
import { onlyKeys } from "@/lib/input-validation";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ issueId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(session) && session.user.role !== "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = await readJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;
  if (!onlyKeys(body, ['status', 'note', 'ownerId', 'expectedRevision']) || !validFollowUpInput(body)) return NextResponse.json({ error: "Status, catatan (maksimal 2.000 karakter), atau penanggung jawab tidak valid." }, { status: 400 });
  const { issueId } = await params;
  const issue = await prisma.issue.findFirst({ where: { id: issueId, state: "OPEN", repository: { ignored: false } }, select: { id: true } });
  if (!issue) return NextResponse.json({ error: "Isu tidak tersedia atau sudah ditutup. Muat ulang pusat perhatian." }, { status: 404 });
  if (body.ownerId) {
    const owner = await prisma.teamMember.findFirst({ where: { id: body.ownerId, isActive: true, role: { not: "UNASSIGNED" } }, select: { id: true } });
    if (!owner) return NextResponse.json({ error: "Pilih penanggung jawab yang masih aktif." }, { status: 400 });
  }
  const key = `attention:issue:${issueId}`;
  const previous = await prisma.setting.findUnique({ where: { key } });
  const conflict = () => NextResponse.json({ error: "Tindak lanjut telah diubah pengguna lain. Muat ulang daftar sebelum menyimpan kembali." }, { status: 409 });
  if ((previous ? parseFollowUp(previous.value).revision : null) !== body.expectedRevision) return conflict();
  const followUp: FollowUp = {
    status: body.status, note: body.note.trim(), ownerId: body.ownerId,
    revision: randomUUID(), updatedAt: new Date().toISOString(), updatedBy: session.user.name || "Manager",
  };
  const value = JSON.stringify(followUp);
  if (previous) {
    const result = await prisma.setting.updateMany({ where: { key, value: previous.value }, data: { value } });
    if (!result.count) return conflict();
  } else {
    try { await prisma.setting.create({ data: { key, value } }); }
    catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") return conflict();
      throw error;
    }
  }
  return NextResponse.json(followUp);
}
