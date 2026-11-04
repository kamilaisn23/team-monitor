import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readJsonObject } from "@/lib/json-body";
import { onlyKeys, validOneOnOneNoteBody } from "@/lib/input-validation";
import { canReadMember, canWriteNotes, canReadWorkspace } from "@/lib/read-access";

function serialize(note: {
  id: string;
  memberId: string;
  authorId: string | null;
  authorName: string;
  date: Date;
  focusArea: string;
  actionItems: string;
  sentiment: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: note.id,
    memberId: note.memberId,
    authorId: note.authorId,
    authorName: note.authorName,
    date: note.date.toISOString().slice(0, 10),
    focusArea: note.focusArea,
    actionItems: note.actionItems,
    sentiment: note.sentiment,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canReadWorkspace(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: memberId } = await params;
  // Developer can only read own notes; manager/admin can read any member's.
  if (!canReadMember(session, memberId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const notes = await prisma.oneOnOneNote.findMany({
    where: { memberId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(notes.map(serialize));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: memberId } = await params;
  if (!canWriteNotes(session, memberId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await readJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;
  if (!onlyKeys(body, ["date", "focusArea", "actionItems", "sentiment"]) || !validOneOnOneNoteBody(body)) {
    return NextResponse.json(
      { error: "Tanggal (YYYY-MM-DD), fokus (maks. 500), aksi (maks. 2.000), dan sentimen tidak valid." },
      { status: 400 },
    );
  }

  const member = await prisma.teamMember.findFirst({ where: { id: memberId }, select: { id: true } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const authorId = session.user.id ?? null;
  const authorName = session.user.name || session.user.githubLogin || "Manager";

  // Restrict to calendar-date range that kalender parser accepts (YYYY-MM-DD).
  const date = new Date(body.date + "T00:00:00Z");

  const note = await prisma.oneOnOneNote.create({
    data: {
      memberId,
      authorId,
      authorName,
      date,
      focusArea: body.focusArea.trim(),
      actionItems: body.actionItems.trim(),
      sentiment: body.sentiment,
    },
  });
  return NextResponse.json(serialize(note), { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: memberId } = await params;
  if (!canWriteNotes(session, memberId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = await readJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;
  if (!onlyKeys(body, ["id", "date", "focusArea", "actionItems", "sentiment"])) {
    return NextResponse.json({ error: "Invalid note fields" }, { status: 400 });
  }
  const noteId = body.id;
  if (!noteId || typeof noteId !== "string") return NextResponse.json({ error: "note id is required" }, { status: 400 });
  const fields = {
    date: body.date,
    focusArea: body.focusArea,
    actionItems: body.actionItems,
    sentiment: body.sentiment,
  };
  if (!validOneOnOneNoteBody(fields)) {
    return NextResponse.json({ error: "Invalid note fields" }, { status: 400 });
  }

  const existing = await prisma.oneOnOneNote.findFirst({ where: { id: noteId, memberId } });
  if (!existing) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  const updated = await prisma.oneOnOneNote.update({
    where: { id: noteId },
    data: {
      date: new Date(fields.date + "T00:00:00Z"),
      focusArea: fields.focusArea.trim(),
      actionItems: fields.actionItems.trim(),
      sentiment: fields.sentiment,
    },
  });
  return NextResponse.json(serialize(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: memberId } = await params;
  if (!canWriteNotes(session, memberId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(_req.url);
  const noteId = url.searchParams.get("noteId");
  if (!noteId) return NextResponse.json({ error: "noteId is required" }, { status: 400 });
  const existing = await prisma.oneOnOneNote.findFirst({ where: { id: noteId, memberId } });
  if (!existing) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  await prisma.oneOnOneNote.delete({ where: { id: noteId } });
  return new NextResponse(null, { status: 204 });
}
