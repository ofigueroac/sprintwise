import { eq } from 'drizzle-orm'
import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'

import { users } from '@repo/db/schema'

import { getDb } from './lib/db'
import { upsertGithubUser } from './lib/users'

// True only when the GitHub app id and secret are both set
export const isAuthConfigured = Boolean(
  process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
)

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust whatever host is serving this app in each environment
  trustHost: true,
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      // Ask GitHub for the public profile and the email
      authorization: { params: { scope: 'read:user user:email' } },
    }),
  ],
  // Keep the session in a signed cookie instead of a database row
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ profile }) {
      const githubProfile = readGithubProfile(profile)

      // Block login if GitHub did not send an id and a username
      if (!githubProfile) {
        return false
      }

      // Create or update the matching row in our users table
      await upsertGithubUser(githubProfile)

      return true
    },
    async jwt({ token, profile }) {
      const githubProfile = readGithubProfile(profile)

      // On the first login stash the GitHub id inside the cookie
      if (githubProfile) {
        token.githubId = githubProfile.id
      }

      return token
    },
    async session({ session, token }) {
      // Copy that GitHub id onto session.user so pages can read it
      if (typeof token.githubId === 'string') {
        session.user.githubId = token.githubId
      }

      return session
    },
  },
})

// The signed-in person from Neon, or null if they are logged out
export async function getCurrentUser() {
  const session = await auth()
  const githubId = session?.user.githubId

  if (!githubId) {
    return null
  }

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.githubId, githubId))
    .limit(1)

  return user ?? null
}

type GithubAuthProfile = {
  id?: string | number | null
  login?: string
  name?: string | null
  email?: string | null
  avatar_url?: string | null
}

// Turn the raw GitHub payload into a small object we can save
function readGithubProfile(profile: GithubAuthProfile | undefined) {
  if (profile?.id == null || profile.id === '' || !profile.login) {
    return null
  }

  return {
    id: String(profile.id),
    login: profile.login,
    name: profile.name ?? null,
    email: profile.email ?? null,
    avatarUrl: profile.avatar_url ?? null,
  }
}
