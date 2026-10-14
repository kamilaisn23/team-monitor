import type { Prisma } from "@prisma/client";
import type { AppRole } from "@/types";
import { isAdminRole } from "./session";

type ReadSession = { user: { role: AppRole; isSuperadmin: boolean; id?: string } };

export function isSelfScoped(session: ReadSession): boolean {
  return !isAdminRole(session) && session.user.role === "DEVELOPER";
}

export function canReadWorkspace(session: ReadSession): boolean {
  return isAdminRole(session) || session.user.role === "MANAGER" ||
    (session.user.role === "DEVELOPER" && !!session.user.id);
}

export function memberReadScope(session: ReadSession): Prisma.TeamMemberWhereInput {
  return isSelfScoped(session) ? { id: session.user.id ?? "__missing_session_member__" } : {};
}

export function issueReadScope(session: ReadSession): Prisma.IssueWhereInput {
  if (!isSelfScoped(session)) return {};
  const id = session.user.id ?? "__missing_session_member__";
  return { OR: [{ creatorTeamMemberId: id }, { assignees: { some: { teamMemberId: id } } }] };
}

export function canReadMember(session: ReadSession, memberId: string): boolean {
  return canReadWorkspace(session) && (!isSelfScoped(session) || session.user.id === memberId);
}

export function teamReadScope(session: ReadSession): Prisma.TeamWhereInput {
  return isSelfScoped(session) ? { members: { some: { teamMemberId: session.user.id ?? "__missing_session_member__" } } } : {};
}
