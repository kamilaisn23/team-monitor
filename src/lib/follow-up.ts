import type { FollowUp as FollowUpRow } from "@prisma/client";
import type { FollowUp, FollowUpStatus } from "../types/attention";
export function serializeFollowUp(row: FollowUpRow): FollowUp {
  return { status: row.status as FollowUpStatus, note: row.note, ownerId: row.ownerId,
    ownerName: row.ownerName, revision: row.revision, updatedAt: row.updatedAt.toISOString(), updatedBy: row.actorName };
}
export function followUpStatusWhere(status: FollowUpStatus) {
  return status === "unreviewed" ? { OR: [{ followUp: null }, { followUp: { is: { status } } }] }
    : { followUp: { is: { status } } };
}
