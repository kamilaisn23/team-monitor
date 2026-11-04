import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/session";
import { getSourceHealth } from "@/lib/sync-health";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ sources: await getSourceHealth() });
}
