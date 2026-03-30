import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/types";

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    providers: [GitHub],
    callbacks: {
        async signIn({ profile }) {
            const login = profile?.login as string | undefined;
            if (!login) return false;

            // Superadmin check — no DB write
            if (login === process.env.SUPERADMIN_GITHUB_USERNAME) return true;

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
            if (token.memberId) session.user.id = token.memberId as string;
            return session;
        },
        async jwt({ token, profile, trigger }) {
            // Populate on first sign-in (profile present) or on session refresh
            const login = (profile?.login ?? token.login) as string | undefined;
            if (!login) return token;

            token.login = login;

            // Always re-read from DB so role changes are picked up on next sign-in
            // or explicit session refresh (trigger === 'update')
            if (profile || trigger === "update" || !token.role) {
                if (login === process.env.SUPERADMIN_GITHUB_USERNAME) {
                    token.role = "SUPERADMIN";
                    token.isSuperadmin = true;
                    token.memberId = undefined;
                } else {
                    const member = await prisma.teamMember.findUnique({
                        where: { usernameGithub: login },
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
