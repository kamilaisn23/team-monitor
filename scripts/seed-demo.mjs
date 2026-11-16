import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

async function main() {
  console.log("[seed-demo] Seeding demo data...");

  for (const [key, value] of [
    ["workload_low_max", "3"],
    ["workload_medium_max", "7"],
    ["issue_stale_days", "14"],
  ]) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  const teams = await Promise.all([
    prisma.team.upsert({ where: { name: "Product" }, update: { isArchived: false }, create: { name: "Product" } }),
    prisma.team.upsert({ where: { name: "Platform" }, update: { isArchived: false }, create: { name: "Platform" } }),
    prisma.team.upsert({ where: { name: "Quality" }, update: { isArchived: false }, create: { name: "Quality" } }),
  ]);
  const [product, platform, quality] = teams;

  const memberDefs = [
    { id: "demo-admin", name: "Nadia Putri", usernameGithub: "nadiaputri", role: "ADMIN", team: product },
    { id: "demo-manager", name: "Rizky Ramadhan", usernameGithub: "rizkyramadhan", role: "MANAGER", team: product },
    { id: "demo-dev-1", name: "Aditya Pratama", usernameGithub: "adityapratama", role: "DEVELOPER", team: product },
    { id: "demo-dev-2", name: "Sarah Wijaya", usernameGithub: "sarahwijaya", role: "DEVELOPER", team: product },
    { id: "demo-dev-3", name: "Fajar Nugroho", usernameGithub: "fajarnugroho", role: "DEVELOPER", team: platform },
    { id: "demo-dev-4", name: "Dinda Maharani", usernameGithub: "dindamaharani", role: "DEVELOPER", team: platform },
    { id: "demo-dev-5", name: "Kevin Santoso", usernameGithub: "kevinsantoso", role: "DEVELOPER", team: quality },
    { id: "demo-dev-6", name: "Alya Safitri", usernameGithub: "alyasafitri", role: "DEVELOPER", team: quality },
  ];

  const members = [];
  for (const m of memberDefs) {
    const member = await prisma.teamMember.upsert({
      where: { id: m.id },
      update: { name: m.name, usernameGithub: m.usernameGithub, role: m.role, isActive: true },
      create: { id: m.id, name: m.name, usernameGithub: m.usernameGithub, role: m.role, isActive: true },
    });
    members.push(member);
    await prisma.teamMembership.upsert({
      where: { teamId_teamMemberId: { teamId: m.team.id, teamMemberId: member.id } },
      update: {},
      create: { teamId: m.team.id, teamMemberId: member.id },
    });
  }

  const repos = await Promise.all([
    prisma.repository.upsert({ where: { url: "https://github.com/demo/team-portal-web" }, update: { name: "demo/team-portal-web", platform: "GITHUB", ignored: false }, create: { name: "demo/team-portal-web", platform: "GITHUB", url: "https://github.com/demo/team-portal-web", ignored: false } }),
    prisma.repository.upsert({ where: { url: "https://github.com/demo/team-platform-api" }, update: { name: "demo/team-platform-api", platform: "GITHUB", ignored: false }, create: { name: "demo/team-platform-api", platform: "GITHUB", url: "https://github.com/demo/team-platform-api", ignored: false } }),
    prisma.repository.upsert({ where: { url: "https://gitlab.com/demo/team-quality-suite" }, update: { name: "demo/team-quality-suite", platform: "GITLAB", ignored: false }, create: { name: "demo/team-quality-suite", platform: "GITLAB", url: "https://gitlab.com/demo/team-quality-suite", ignored: false } }),
  ]);
  const [webRepo, apiRepo, qaRepo] = repos;

  for (const [repo, team] of [[webRepo, product], [apiRepo, platform], [qaRepo, quality]]) {
    await prisma.repositoryTeam.upsert({
      where: { repositoryId_teamId: { repositoryId: repo.id, teamId: team.id } },
      update: {},
      create: { repositoryId: repo.id, teamId: team.id },
    });
  }

  const issueDefs = [
    { id: "demo-issue-1", platformId: "gh-101", repo: webRepo, title: "Perbaiki validasi form login", state: "OPEN", creator: members[0], assignees: [members[2]], createdAt: daysAgo(21), closedAt: null },
    { id: "demo-issue-2", platformId: "gh-102", repo: webRepo, title: "Tingkatkan aksesibilitas dashboard", state: "OPEN", creator: members[1], assignees: [members[2], members[3]], createdAt: daysAgo(16), closedAt: null },
    { id: "demo-issue-3", platformId: "gh-103", repo: webRepo, title: "Optimalkan pemuatan data anggota", state: "OPEN", creator: members[1], assignees: [members[3]], createdAt: daysAgo(5), closedAt: null },
    { id: "demo-issue-4", platformId: "gh-201", repo: apiRepo, title: "Stabilkan endpoint sinkronisasi", state: "OPEN", creator: members[4], assignees: [members[4]], createdAt: daysAgo(18), closedAt: null },
    { id: "demo-issue-5", platformId: "gh-202", repo: apiRepo, title: "Tambah retry pada worker", state: "OPEN", creator: members[5], assignees: [members[5]], createdAt: daysAgo(3), closedAt: null },
    { id: "demo-issue-6", platformId: "gl-301", repo: qaRepo, title: "Lengkapi skenario uji regresi", state: "OPEN", creator: members[6], assignees: [members[6], members[7]], createdAt: daysAgo(9), closedAt: null },
    { id: "demo-issue-7", platformId: "gh-104", repo: webRepo, title: "Rapikan navigasi mobile", state: "CLOSED", creator: members[0], assignees: [members[2]], createdAt: daysAgo(30), closedAt: daysAgo(2) },
    { id: "demo-issue-8", platformId: "gh-203", repo: apiRepo, title: "Perbaiki penanganan timeout", state: "CLOSED", creator: members[4], assignees: [members[4]], createdAt: daysAgo(25), closedAt: daysAgo(6) },
    { id: "demo-issue-9", platformId: "gl-302", repo: qaRepo, title: "Perbarui laporan cakupan uji", state: "CLOSED", creator: members[7], assignees: [members[7]], createdAt: daysAgo(20), closedAt: daysAgo(10) },
    { id: "demo-issue-10", platformId: "gh-105", repo: webRepo, title: "Investigasi error tanpa assignee", state: "OPEN", creator: members[1], assignees: [], createdAt: daysAgo(12), closedAt: null },
  ];

  for (const issue of issueDefs) {
    const url = `${issue.repo.url}/issues/${issue.platformId.replace(/\D/g, "") || issue.platformId}`;
    await prisma.issue.upsert({
      where: { platformId_repositoryId: { platformId: issue.platformId, repositoryId: issue.repo.id } },
      update: {
        title: issue.title, url, state: issue.state,
        creatorUsername: issue.creator.usernameGithub || issue.creator.name,
        creatorTeamMemberId: issue.creator.id,
        createdAt: issue.createdAt, closedAt: issue.closedAt,
      },
      create: {
        id: issue.id, platformId: issue.platformId, repositoryId: issue.repo.id,
        title: issue.title, url, state: issue.state,
        creatorUsername: issue.creator.usernameGithub || issue.creator.name,
        creatorTeamMemberId: issue.creator.id,
        createdAt: issue.createdAt, closedAt: issue.closedAt,
      },
    });
    await prisma.issueAssignee.deleteMany({ where: { issueId: issue.id } });
    for (const assignee of issue.assignees) {
      await prisma.issueAssignee.create({
        data: { issueId: issue.id, platformUsername: assignee.usernameGithub || assignee.name, teamMemberId: assignee.id },
      });
    }
  }

  await prisma.syncJob.upsert({
    where: { id: "demo-seed" },
    update: { status: "success", finishedAt: new Date(), summary: { seeded: true } },
    create: { id: "demo-seed", status: "success", finishedAt: new Date(), summary: { seeded: true } },
  });

  console.log(`[seed-demo] Demo data ready (${members.length} members, ${repos.length} repos, ${issueDefs.length} issues).`);
}

main()
  .catch((error) => {
    console.error("[seed-demo] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
