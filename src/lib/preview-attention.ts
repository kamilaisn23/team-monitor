import { getPreviewDashboardIssues, previewMembers, previewRepositories, previewTeams } from "./preview-data";
import { emptyFollowUp, followUpStatuses, type AttentionIssue, type AttentionResponse, type FollowUp, type FollowUpStatus } from "../types/attention";

export function getPreviewAttention(params: URLSearchParams, records: Record<string, FollowUp> = {}): AttentionResponse {
  const staleParams = new URLSearchParams(params);
  staleParams.set("issueView", "stale"); staleParams.set("issuePage", "1"); staleParams.set("issueLimit", "100");
  const stale: AttentionIssue[] = getPreviewDashboardIssues(staleParams).data.map((issue) => ({ ...issue, reasons: ["stale"], followUp: records[issue.id] ?? emptyFollowUp() }));
  const unassigned: AttentionIssue[] = previewRepositories.map<AttentionIssue>((repository, index) => ({
    id: `demo-unassigned-${index}`,
    title: ["Tentukan pemilik audit akses", "Tinjau strategi cache API", "Lengkapi panduan komponen", "Periksa konfigurasi deployment"][index]!,
    url: "", createdAt: new Date(Date.now() - (index === 0 ? 41 : 5) * 86400000).toISOString(),
    ageDays: index === 0 ? 41 : 5, repository, assignees: [],
    reasons: index === 0 ? ["stale", "unassigned"] : ["unassigned"],
    followUp: records[`demo-unassigned-${index}`] ?? emptyFollowUp(),
  })).filter((issue, index) =>
    (!params.get("teamId") || previewTeams[index % 3]!.id === params.get("teamId")) &&
    (!params.get("repositoryId") || issue.repository.id === params.get("repositoryId")) &&
    (!params.get("platform") || params.get("platform") === "all" || issue.repository.platform === params.get("platform")) &&
    (!params.get("name") || previewMembers[index]!.name.toLowerCase().includes(params.get("name")!.toLowerCase())) &&
    params.get("active") !== "false",
  );
  const reason = params.get("reason");
  const issues = [...stale, ...unassigned].filter((issue) => reason !== "stale" && reason !== "unassigned" || issue.reasons.includes(reason)).sort((a, b) => b.ageDays - a.ageDays || a.id.localeCompare(b.id));
  const counts = { unreviewed: 0, following_up: 0, reviewed: 0 };
  issues.forEach((issue) => counts[issue.followUp.status]++);
  const status = params.get("status") as FollowUpStatus;
  const filtered = issues.filter((issue) =>
    !followUpStatuses.includes(status) || issue.followUp.status === status,
  );
  const rawPage = Number(params.get("attentionPage"));
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage) || 1) : 1;
  return {
    data: filtered.slice((page - 1) * 10, page * 10), total: filtered.length, page, limit: 10, counts, staleDays: 30,
    owners: previewMembers.filter((member) => member.isActive && (!params.get("teamId") || member.teams.some((team) => team.id === params.get("teamId")))).map((member) => ({ id: member.memberId, name: member.name })),
  };
}
