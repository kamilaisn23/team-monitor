import type { DashboardIssue } from "./dashboard";

export const followUpStatuses = ["unreviewed", "following_up", "reviewed"] as const;
export type FollowUpStatus = (typeof followUpStatuses)[number];
export const followUpLabels: Record<FollowUpStatus, string> = {
  unreviewed: "Belum ditinjau", following_up: "Ditindaklanjuti", reviewed: "Sudah ditinjau",
};
export interface FollowUp {
  status: FollowUpStatus;
  note: string;
  ownerId: string | null;
  ownerName?: string | null;
  revision: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}
export interface AttentionIssue extends DashboardIssue {
  reasons: ("stale" | "unassigned")[];
  followUp: FollowUp;
}
export interface AttentionResponse {
  data: AttentionIssue[];
  total: number;
  page: number;
  limit: number;
  counts: Record<FollowUpStatus, number>;
  owners: { id: string; name: string }[];
  staleDays: number;
}
export function emptyFollowUp(): FollowUp {
  return { status: "unreviewed", note: "", ownerId: null, revision: null, updatedAt: null, updatedBy: null };
}
export function parseFollowUp(value: string): FollowUp {
  try {
    const data = JSON.parse(value);
    if (!data || !followUpStatuses.includes(data.status) || typeof data.note !== "string" ||
      !(data.ownerId === null || typeof data.ownerId === "string") ||
      typeof data.revision !== "string" || typeof data.updatedAt !== "string" || typeof data.updatedBy !== "string" ||
      data.note.length > 2000 || !Number.isFinite(Date.parse(data.updatedAt))) return emptyFollowUp();
    return { status: data.status, note: data.note, ownerId: data.ownerId, ownerName: typeof data.ownerName === 'string' ? data.ownerName : null, revision: data.revision, updatedAt: data.updatedAt, updatedBy: data.updatedBy };
  } catch { return emptyFollowUp(); }
}
export function validFollowUpInput(data: unknown): data is Pick<FollowUp, "status" | "note" | "ownerId"> & { expectedRevision: string | null } {
  if (!data || typeof data !== "object") return false;
  const input = data as Record<string, unknown>;
  return followUpStatuses.includes(input.status as FollowUpStatus) &&
    typeof input.note === "string" && input.note.length <= 2000 &&
    (input.ownerId === null || typeof input.ownerId === "string" && input.ownerId.length > 0 && input.ownerId.length <= 128) &&
    (input.expectedRevision === null || typeof input.expectedRevision === "string" && input.expectedRevision.length <= 64);
}
