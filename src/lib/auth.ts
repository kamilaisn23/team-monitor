import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { isDevLoginEnabled } from "@/lib/dev-login";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/types";

if (process.env.AUTH_SECRET === "generate-a-random-secret-here") {
    throw new Error(
        "AUTH_SECRET is still set to the placeholder value. " +
        "Generate a real secret with: openssl rand -base64 32",
    );
}

function isSuperadminLogin(login: string | undefined) {
    if (!login) return false;
    return (process.env.SUPERADMIN_GITHUB_USERNAME ?? "")
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
        .includes(login.toLowerCase());
}

const devLoginEnabled = isDevLoginEnabled();

async function authorizeDevLogin(credentials: Partial<Record<string, unknown>>) {
    const login = String(credentials?.login ?? "").trim();
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(login)) return null;

    if (isSuperadminLogin(login)) {
        return {
            id: `superadmin:${login.toLowerCase()}`,
            name: login,
            login,
            role: "SUPERADMIN" as AppRole,
            isSuperadmin: true,
        };
    }

    const existing = await prisma.teamMember.findFirst({
        where: { usernameGithub: { equals: login, mode: "insensitive" } },
        select: { id: true, name: true, role: true },
    });

    const member = existing
        ? await prisma.teamMember.update({
              where: { id: existing.id },
              data: { lastLoginAt: new Date() },
              select: { id: true, name: true, role: true },
          })
        : await prisma.teamMember.create({
              data: {
                  name: login,
                  usernameGithub: login,
                  role: "UNASSIGNED",
                  lastLoginAt: new Date(),
              },
              select: { id: true, name: true, role: true },
          });

    return {
        id: member.id,
        name: member.name,
        login,
        role: member.role as AppRole,
        isSuperadmin: false,
    };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    providers: [
        GitHub({
            issuer: "https://github.com/login/oauth",
        }),
        ...(devLoginEnabled
            ? [
                  Credentials({
                      id: "dev-github",
                      name: "GitHub username (local development)",
                      credentials: {
                          login: {
                              label: "GitHub username",
                              type: "text",
                          },
                      },
                      authorize: (credentials) =>
                          authorizeDevLogin(credentials),
                  }),
              ]
            : []),
    ],
    callbacks: {
        async signIn({ profile, account }) {
            if (account?.provider === "dev-github") return true;

            const login = profile?.login as string | undefined;
            if (!login) return false;

            // Superadmin check — no DB write
            if (isSuperadminLogin(login)) return true;

            const avatarUrl =
                typeof profile?.avatar_url === "string"
                    ? profile.avatar_url
                    : null;
            const displayName =
                (typeof profile?.name === "string" ? profile.name : null) ??
                login;
            const oauthId = String(profile?.id ?? "");

            // Upsert TeamMember by username_github
            await prisma.teamMember.upsert({
                where: { usernameGithub: login },
                update: {
                    githubOauthId: oauthId,
                    ...(avatarUrl ? { avatarUrl } : {}),
                    lastLoginAt: new Date(),
                },
                create: {
                    name: displayName,
                    usernameGithub: login,
                    githubOauthId: oauthId,
                    ...(avatarUrl ? { avatarUrl } : {}),
                    role: "UNASSIGNED",
                    lastLoginAt: new Date(),
                },
            });
            return true;
        },
        async session({ session, token }) {
            session.user.role = token.role as AppRole;
            session.user.isSuperadmin = token.isSuperadmin as boolean;
            session.user.githubLogin = token.login as string | undefined;
            if (token.memberId) session.user.id = token.memberId as string;
            return session;
        },
        async jwt({ token, user, profile, trigger }) {
            const devUser = user as
                | {
                      id?: string;
                      login?: string;
                      role?: AppRole;
                      isSuperadmin?: boolean;
                  }
                | undefined;

            // Local development login already resolved the member and role
            // in the Credentials authorize() callback.
            if (devUser?.login && !profile) {
                token.login = devUser.login;
                token.role = devUser.role ?? "UNASSIGNED";
                token.isSuperadmin = devUser.isSuperadmin ?? false;
                token.memberId = devUser.isSuperadmin
                    ? undefined
                    : (devUser.id as string | undefined);
                return token;
            }

            // Populate on first sign-in (profile present) or on session refresh
            const login = (profile?.login ?? token.login) as string | undefined;
            if (!login) return token;

            token.login = login;

            // Always re-read from DB so role changes are picked up on next sign-in
            // or explicit session refresh (trigger === 'update')
            if (profile || trigger === "update" || !token.role) {
                if (isSuperadminLogin(login)) {
                    token.role = "SUPERADMIN";
                    token.isSuperadmin = true;
                    token.memberId = undefined;
                } else {
                    const member = await prisma.teamMember.findFirst({
                        where: {
                            usernameGithub: {
                                equals: login,
                                mode: "insensitive",
                            },
                        },
                        select: { id: true, role: true },
                    });
                    token.role = member?.role ?? "UNASSIGNED";
                    token.isSuperadmin = false;
                    token.memberId = member?.id ?? undefined;
                }
            }

            return token;
        },
    },
});
