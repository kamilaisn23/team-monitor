import type { DashboardResponse, DashboardMember, DashboardIssue, DashboardIssueResponse } from "../types/dashboard";

// Deliberately fictional, browser-local data. No database or authenticated API access.
export const previewTeams = [
  { id: "demo-product", name: "Product Engineering", memberCount: 5 },
  { id: "demo-platform", name: "Platform & Infrastructure", memberCount: 6 },
  { id: "demo-quality", name: "Quality & Release", memberCount: 4 },
];
export const previewRepositories = [
  { id: "demo-web", name: "team/portal-web", platform: "github" },
  { id: "demo-api", name: "team/platform-api", platform: "gitlab" },
  { id: "demo-ui", name: "team/shared-ui", platform: "github" },
  { id: "demo-infra", name: "team/infrastructure", platform: "gitlab" },
];
const names = [
  "Aditya Pratama",
  "Nadia Putri",
  "Rizky Ramadhan",
  "Sarah Wijaya",
  "Fajar Nugroho",
  "Dinda Maharani",
  "Kevin Santoso",
  "Alya Safitri",
  "Bima Kurniawan",
  "Clara Anggraini",
  "Dimas Saputra",
  "Maya Lestari",
  "Rafi Hidayat",
  "Tania Kusuma",
];
const loads = [10, 8, 7, 6, 5, 4, 3, 3, 2, 2, 1, 0, 4, 1];
export const previewMembers: DashboardMember[] = names.map((name, index) => ({
  memberId: `demo-member-${index}`,
  name,
  avatarUrl: null,
  role: index === 2 || index === 9 ? "MANAGER" : "DEVELOPER",
  isActive: index < 12,
  teams: [
    previewTeams[index % 3]!,
    ...(index === 0 ? [previewTeams[1]!] : []),
  ].map(({ id, name }) => ({ id, name })),
  currentLoad: loads[index]!,
  workloadLevel:
    loads[index]! <= 3 ? "low" : loads[index]! <= 7 ? "medium" : "high",
}));
export const previewIssues = previewMembers.flatMap((member, index) =>
  Array.from({ length: member.currentLoad }, (_, issueIndex) => ({
    id: `${member.memberId}-issue-${issueIndex}`,
    title:
      [
        "Perbaiki validasi formulir",
        "Rapikan alur autentikasi",
        "Tingkatkan aksesibilitas halaman",
        "Optimalkan pemuatan data",
        "Lengkapi pengujian integrasi",
      ][issueIndex % 5]! + ` #${index + 1}.${issueIndex + 1}`,
    memberId: member.memberId,
    repository:
      previewRepositories[(index + issueIndex) % previewRepositories.length]!,
    ageDays: issueIndex === 0 ? 45 : 3 + issueIndex,
  })),
);

export type PreviewIssue = (typeof previewIssues)[number];
// Fictional completion history, scoped by the same members and repositories as open work.
const previewCompletions = previewMembers.flatMap((member, index) =>
  Array.from({ length: member.isActive ? 2 : 1 }, (_, n) => ({
    memberId: member.memberId,
    repository: previewRepositories[(index + n) % previewRepositories.length]!,
    closedDaysAgo: n === 0 ? (index % 6) + 1 : 9,
  })),
);

const previewReferenceTime = Date.now();
function previewDashboardIssue(issue: PreviewIssue): DashboardIssue {
  return {
    id: issue.id,
    title: issue.title,
    url: "",
    createdAt: new Date(previewReferenceTime - issue.ageDays * 86400000).toISOString(),
    ageDays: issue.ageDays,
    repository: issue.repository,
    assignees: [{ memberId: issue.memberId, name: previewMembers.find((member) => member.memberId === issue.memberId)!.name }],
  };
}

export function getPreviewDashboardIssues(params: URLSearchParams): DashboardIssueResponse {
  const issues = getPreviewIssues(params)
    .filter((issue) => params.get("issueView") !== "stale" || issue.ageDays > 30)
    .sort((a, b) => b.ageDays - a.ageDays || a.id.localeCompare(b.id));
  const rawPage = Number(params.get("issuePage"));
  const rawLimit = Number(params.get("issueLimit"));
  const page = Math.max(1, Number.isFinite(rawPage) ? Math.trunc(rawPage) || 1 : 1);
  const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) ? Math.trunc(rawLimit) || 20 : 20));
  return { data: issues.slice((page - 1) * limit, page * limit).map(previewDashboardIssue), total: issues.length, page, limit };
}
export function getPreviewIssues(params: URLSearchParams) {
  const members = previewMembers.filter(
    (m) =>
      (!params.get("teamId") ||
        m.teams.some((t) => t.id === params.get("teamId"))) &&
      (!params.get("name") ||
        m.name.toLowerCase().includes(params.get("name")!.toLowerCase())) &&
      (!params.has("active") ||
        m.isActive === (params.get("active") === "true")),
  );
  return previewIssues.filter(
    (issue) =>
      members.some((m) => m.memberId === issue.memberId) &&
      (!params.get("repositoryId") ||
        issue.repository.id === params.get("repositoryId")) &&
      (!params.get("platform") ||
        params.get("platform") === "all" ||
        issue.repository.platform === params.get("platform")),
  );
}

export function getPreviewDashboard(
  params: URLSearchParams,
): DashboardResponse {
  const teamId = params.get("teamId");
  const repoId = params.get("repositoryId");
  const platform = params.get("platform");
  const name = (params.get("name") ?? "").toLowerCase();
  const active = params.get("active");
  const scope = previewMembers.filter(
    (m) =>
      (!teamId || m.teams.some((t) => t.id === teamId)) &&
      (!name || m.name.toLowerCase().includes(name)) &&
      (active === null || m.isActive === (active === "true")),
  );
  const scopedIssues = previewIssues.filter(
    (i) =>
      scope.some((m) => m.memberId === i.memberId) &&
      (!repoId || i.repository.id === repoId) &&
      (!platform || platform === "all" || i.repository.platform === platform),
  );
  const members = scope.map((m) => {
    const currentLoad = scopedIssues.filter(
      (i) => i.memberId === m.memberId,
    ).length;
    return {
      ...m,
      currentLoad,
      workloadLevel: (currentLoad <= 3
        ? "low"
        : currentLoad <= 7
          ? "medium"
          : "high") as DashboardMember["workloadLevel"],
    };
  });
  const distribution = { low: 0, medium: 0, high: 0 };
  members.forEach((m) => distribution[m.workloadLevel]++);
  const summary = {
    memberCount: members.length,
    activeMembers: members.filter((m) => m.isActive).length,
    totalOpenIssues: scopedIssues.length,
    highWorkload: distribution.high,
    staleIssues: scopedIssues.filter((i) => i.ageDays > 30).length,
    resolvedLast7Days: previewCompletions.filter((issue) =>
      issue.closedDaysAgo <= 7 &&
      scope.some((member) => member.memberId === issue.memberId) &&
      (!repoId || issue.repository.id === repoId) &&
      (!platform || platform === "all" || issue.repository.platform === platform),
    ).length,
    distribution,
  };
  const teamOverview = previewTeams
    .map((team) => {
      const teamMembers = members.filter((m) =>
        m.teams.some((t) => t.id === team.id),
      );
      return {
        id: team.id,
        name: team.name,
        memberCount: teamMembers.length,
        assignments: teamMembers.reduce((n, m) => n + m.currentLoad, 0),
        highWorkload: teamMembers.filter((m) => m.workloadLevel === "high")
          .length,
      };
    })
    .filter((team) => team.memberCount > 0);
  const tiers = { low: 0, medium: 1, high: 2 };
  const sortCol = params.get("sortCol") ?? "currentLoad";
  const sortDir = params.get("sortDir") === "asc" ? 1 : -1;
  const workload = params.get("workload");
  const data = members.filter(
    (m) =>
      !["low", "medium", "high"].includes(workload ?? "") ||
      m.workloadLevel === workload,
  );
  data.sort(
    (a, b) =>
      sortDir *
      (sortCol === "currentLoad"
        ? a.currentLoad - b.currentLoad
        : sortCol === "workloadLevel"
          ? tiers[a.workloadLevel] - tiers[b.workloadLevel]
          : sortCol === "role"
            ? a.role.localeCompare(b.role)
            : a.name.localeCompare(b.name)),
  );
  const page = Math.max(1, Number(params.get("page")) || 1);
  const limit = Math.max(1, Number(params.get("limit")) || 10);
  return {
    total: data.length,
    data: data.slice((page - 1) * limit, page * limit),
    summary,
    thresholds: { lowMax: 3, mediumMax: 7, staleDays: 30 },
    teamOverview,
    attentionIssues: scopedIssues.filter((issue) => issue.ageDays > 30)
      .sort((a, b) => b.ageDays - a.ageDays || a.id.localeCompare(b.id))
      .slice(0, 3).map(previewDashboardIssue),
  };
}
