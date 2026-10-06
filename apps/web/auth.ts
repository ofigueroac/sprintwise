import { eq } from 'drizzle-orm';
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

import { users } from '@repo/db/schema';

import { getDb } from './lib/db';
import { upsertGithubUser } from './lib/users';

export const isAuthConfigured = Boolean(
  process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: { params: { scope: 'read:user user:email' } },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ profile }) {
      const githubProfile = readGithubProfile(profile);

      if (!githubProfile) {
        return false;
      }

      await upsertGithubUser(githubProfile);

      return true;
    },
    async jwt({ token, profile }) {
      const githubProfile = readGithubProfile(profile);

      if (githubProfile) {
        token.githubId = githubProfile.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (typeof token.githubId === 'string') {
        session.user.githubId = token.githubId;
      }

      return session;
    },
  },
});

export async function getCurrentUser() {
  const session = await auth();
  const githubId = session?.user.githubId;

  if (!githubId) {
    return null;
  }

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.githubId, githubId))
    .limit(1);

  return user ?? null;
}

type GithubAuthProfile = {
  id?: string | number | null;
  login?: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

function readGithubProfile(profile: GithubAuthProfile | undefined) {
  if (profile?.id == null || profile.id === '' || !profile.login) {
    return null;
  }

  return {
    id: String(profile.id),
    login: profile.login,
    name: profile.name ?? null,
    email: profile.email ?? null,
    avatarUrl: profile.avatar_url ?? null,
  };
}
