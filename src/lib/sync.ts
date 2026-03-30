import { prisma } from "@/lib/prisma";
import { fetchGithubIssues, parseRepoFromGithubIssue } from "@/lib/github";
import {
    fetchGitlabIssues,
    getProjectUrl,
    parseRepoFromGitLabIssue,
} from "@/lib/gitlab";

async function upsertRepository(
    platform: "GITHUB" | "GITLAB",
    name: string,
    url: string,
) {
    return prisma.repository.upsert({
        where: { url },
        update: {},
        create: { platform, name, url, ignored: false },
    });
}

async function resolveUsernames() {
    const members = await prisma.teamMember.findMany({
        select: { id: true, usernameGithub: true, usernameGitlab: true },
    });
    const githubMap = new Map(
        members
            .filter((m) => m.usernameGithub)
            .map((m) => [m.usernameGithub!, m.id]),
    );
    const gitlabMap = new Map(
        members
            .filter((m) => m.usernameGitlab)
            .map((m) => [m.usernameGitlab!, m.id]),
    );

    // Resolve Issue creators
    const unresolvedIssues = await prisma.issue.findMany({
        where: { creatorTeamMemberId: null },
        include: { repository: { select: { platform: true } } },
    });
    for (const issue of unresolvedIssues) {
        const map =
            issue.repository.platform === "GITHUB" ? githubMap : gitlabMap;
        const memberId = map.get(issue.creatorUsername);
        if (memberId) {
            await prisma.issue.update({
                where: { id: issue.id },
                data: { creatorTeamMemberId: memberId },
            });
        }
    }

    // Resolve IssueAssignees
    const unresolvedAssignees = await prisma.issueAssignee.findMany({
        where: { teamMemberId: null },
        include: {
            issue: { include: { repository: { select: { platform: true } } } },
        },
    });
    for (const assignee of unresolvedAssignees) {
        const map =
            assignee.issue.repository.platform === "GITHUB"
                ? githubMap
                : gitlabMap;
        const memberId = map.get(assignee.platformUsername);
        if (memberId) {
            await prisma.issueAssignee.update({
                where: { id: assignee.id },
                data: { teamMemberId: memberId },
            });
        }
    }
}

export type SyncProgressEvent =
    | { type: "start"; total: number }
    | { type: "member_start"; name: string; index: number; total: number }
    | {
          type: "member_done";
          name: string;
          index: number;
          total: number;
          githubIssues: number;
          gitlabIssues: number;
      }
    | {
          type: "member_error";
          name: string;
          index: number;
          total: number;
          error: string;
      }
    | { type: "resolving" }
    | {
          type: "done";
          processed: number;
          githubIssues: number;
          gitlabIssues: number;
          errors: number;
          durationSeconds: string;
      };

export async function runSync(onProgress?: (event: SyncProgressEvent) => void) {
    const startTime = Date.now();
    console.log(`[sync] Starting sync at ${new Date().toISOString()}`);

    const members = await prisma.teamMember.findMany({
        where: {
            OR: [
                { usernameGithub: { not: null } },
                { usernameGitlab: { not: null } },
            ],
        },
    });

    let processed = 0;
    let githubIssuesUpserted = 0;
    let gitlabIssuesUpserted = 0;
    const errors: string[] = [];

    onProgress?.({ type: "start", total: members.length });

    for (const member of members) {
        const index = processed;
        onProgress?.({
            type: "member_start",
            name: member.name,
            index,
            total: members.length,
        });
        let memberGithub = 0;
        let memberGitlab = 0;
        try {
            // Sync GitHub issues
            if (member.usernameGithub) {
                const issues = await fetchGithubIssues(member.usernameGithub);
                for (const ghIssue of issues) {
                    const { name: repoName, url: repoUrl } =
                        parseRepoFromGithubIssue(ghIssue);
                    const repo = await upsertRepository(
                        "GITHUB",
                        repoName,
                        repoUrl,
                    );
                    const platformId = String(ghIssue.number);

                    const issue = await prisma.issue.upsert({
                        where: {
                            platformId_repositoryId: {
                                platformId,
                                repositoryId: repo.id,
                            },
                        },
                        update: {
                            state: ghIssue.state === "open" ? "OPEN" : "CLOSED",
                            closedAt: ghIssue.closed_at
                                ? new Date(ghIssue.closed_at)
                                : null,
                        },
                        create: {
                            platformId,
                            repositoryId: repo.id,
                            title: ghIssue.title,
                            url: ghIssue.html_url,
                            state: ghIssue.state === "open" ? "OPEN" : "CLOSED",
                            creatorUsername: ghIssue.user.login,
                            createdAt: new Date(ghIssue.created_at),
                            closedAt: ghIssue.closed_at
                                ? new Date(ghIssue.closed_at)
                                : null,
                        },
                    });

                    for (const assignee of ghIssue.assignees) {
                        await prisma.issueAssignee.upsert({
                            where: {
                                issueId_platformUsername: {
                                    issueId: issue.id,
                                    platformUsername: assignee.login,
                                },
                            },
                            update: {},
                            create: {
                                issueId: issue.id,
                                platformUsername: assignee.login,
                            },
                        });
                    }
                    githubIssuesUpserted++;
                    memberGithub++;
                }
            }

            // Sync GitLab issues
            if (member.usernameGitlab) {
                const issues = await fetchGitlabIssues(member.usernameGitlab);
                for (const glIssue of issues) {
                    const projectUrl = await getProjectUrl(glIssue.project_id);
                    const { name: repoName, url: repoUrl } =
                        parseRepoFromGitLabIssue(glIssue, projectUrl);
                    const repo = await upsertRepository(
                        "GITLAB",
                        repoName,
                        repoUrl,
                    );
                    const platformId = String(glIssue.iid);

                    const issue = await prisma.issue.upsert({
                        where: {
                            platformId_repositoryId: {
                                platformId,
                                repositoryId: repo.id,
                            },
                        },
                        update: {
                            state:
                                glIssue.state === "opened" ? "OPEN" : "CLOSED",
                            closedAt: glIssue.closed_at
                                ? new Date(glIssue.closed_at)
                                : null,
                        },
                        create: {
                            platformId,
                            repositoryId: repo.id,
                            title: glIssue.title,
                            url: glIssue.web_url,
                            state:
                                glIssue.state === "opened" ? "OPEN" : "CLOSED",
                            creatorUsername: glIssue.author.username,
                            createdAt: new Date(glIssue.created_at),
                            closedAt: glIssue.closed_at
                                ? new Date(glIssue.closed_at)
                                : null,
                        },
                    });

                    for (const assignee of glIssue.assignees) {
                        await prisma.issueAssignee.upsert({
                            where: {
                                issueId_platformUsername: {
                                    issueId: issue.id,
                                    platformUsername: assignee.username,
                                },
                            },
                            update: {},
                            create: {
                                issueId: issue.id,
                                platformUsername: assignee.username,
                            },
                        });
                    }
                    gitlabIssuesUpserted++;
                    memberGitlab++;
                }
            }

            processed++;
            onProgress?.({
                type: "member_done",
                name: member.name,
                index,
                total: members.length,
                githubIssues: memberGithub,
                gitlabIssues: memberGitlab,
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[sync] Error for member ${member.name}: ${msg}`);
            errors.push(`${member.name}: ${msg}`);
            onProgress?.({
                type: "member_error",
                name: member.name,
                index,
                total: members.length,
                error: msg,
            });
            processed++;
        }
    }

    // Resolve username mappings
    onProgress?.({ type: "resolving" });
    await resolveUsernames();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
        `[sync] Completed at ${new Date().toISOString()} (${duration}s)`,
    );
    console.log(`[sync] Members processed: ${processed}`);
    console.log(
        `[sync] Issues upserted: ${githubIssuesUpserted + gitlabIssuesUpserted} (GitHub: ${githubIssuesUpserted}, GitLab: ${gitlabIssuesUpserted})`,
    );
    if (errors.length > 0) {
        console.log(`[sync] Errors: ${errors.length} (${errors.join("; ")})`);
    }
    onProgress?.({
        type: "done",
        processed,
        githubIssues: githubIssuesUpserted,
        gitlabIssues: gitlabIssuesUpserted,
        errors: errors.length,
        durationSeconds: duration,
    });
}
