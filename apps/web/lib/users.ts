import { users } from '@repo/db/schema'

import { getDb } from './db'

export type GithubProfile = {
  id: string
  login: string
  name: string | null
  email: string | null
  avatarUrl: string | null
}

export const DEMO_GITHUB_ID = 'demo'

export async function ensureDemoUser() {
  return upsertGithubUser({
    id: DEMO_GITHUB_ID,
    login: 'demo',
    name: 'Demo',
    email: null,
    avatarUrl: null,
  })
}

export async function upsertGithubUser(profile: GithubProfile) {
  const [user] = await getDb()
    .insert(users)
    .values({
      githubId: profile.id,
      login: profile.login,
      name: profile.name,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
    })
    .onConflictDoUpdate({
      target: users.githubId,
      set: {
        login: profile.login,
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
      },
    })
    .returning()

  if (!user) {
    throw new Error('Failed to save the GitHub user')
  }

  return user
}
