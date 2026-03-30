import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { prisma } from '@/lib/prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GitHub],
  callbacks: {
    async signIn({ profile }) {
      const login = profile?.login as string | undefined
      if (!login) return false

      // Superadmin check — no DB write
      if (login === process.env.SUPERADMIN_GITHUB_USERNAME) return true

      const avatarUrl = typeof profile?.avatar_url === 'string' ? profile.avatar_url : null
      const displayName = (typeof profile?.name === 'string' ? profile.name : null) ?? login
      const oauthId = String(profile?.id ?? '')

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
          role: 'UNASSIGNED',
          lastLoginAt: new Date(),
        },
      })
      return true
    },
    async session({ session, token }) {
      const login = token.login as string | undefined
      if (login === process.env.SUPERADMIN_GITHUB_USERNAME) {
        session.user.role = 'SUPERADMIN'
        session.user.isSuperadmin = true
      } else if (login) {
        const member = await prisma.teamMember.findUnique({
          where: { usernameGithub: login },
          select: { id: true, role: true },
        })
        if (member?.id) session.user.id = member.id
        session.user.role = (member?.role as 'MANAGER' | 'DEVELOPER' | 'UNASSIGNED') ?? 'UNASSIGNED'
        session.user.isSuperadmin = false
      }
      return session
    },
    async jwt({ token, profile }) {
      if (profile?.login) token.login = profile.login
      return token
    },
  },
})
