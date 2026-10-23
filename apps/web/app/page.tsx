import { Button } from '@repo/ui/components'

import { getCurrentUser, isAuthConfigured } from '@/auth'

import { signInAsDemo, signInWithGitHub, signOutAction } from './auth-actions'
import { ChatForm } from './chat/chatForm'
import styles from './page.module.css'
import { WakingAgent } from './waking-agent'
import { TechStack } from './teckStack'
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const user = isAuthConfigured ? await getCurrentUser() : null

  return (
    <>
      {user ? <UserBar login={user.login} userId={user.id} /> : null}

      <main className={styles.main}>
        <h1 className={styles.title}>Sprintwise</h1>
        <WakingAgent />
        <p className={styles.lead}>
          Kick off a product idea. The Analyst writes a discovery brief and a
          proposed v1 you can approve and take with you.
        </p>

        {user ? (
          <ChatForm />
        ) : (
          <>
            <SignedOut authConfigured={isAuthConfigured} error={error} />
            <h2 className={styles.stackHeading}>Built With</h2>
            <TechStack />
          </>
        )}
      </main>
    </>
  )
}

function UserBar({ login, userId }: { login: string; userId: string }) {
  return (
    <header className={styles.userBar}>
      <p>
        Signed in as <span className="font-medium">{login}</span>
      </p>
      <p className={styles.userId}>{userId}</p>
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </header>
  )
}

function SignedOut({
  authConfigured,
  error,
}: {
  authConfigured: boolean
  error?: string
}) {
  return (
    <div className={styles.signedOut}>
      <form action={signInAsDemo}>
        <Button type="submit" size="lg">
          Try the demo
        </Button>
      </form>
      {authConfigured ? (
        <form action={signInWithGitHub}>
          <Button type="submit" variant="outline" size="lg">
            Sign in with GitHub
          </Button>
        </form>
      ) : (
        <p className="text-muted-foreground">
          GitHub sign-in is not configured. Add AUTH_GITHUB_ID and
          AUTH_GITHUB_SECRET to the environment.
        </p>
      )}
      {error ? (
        <p className="text-destructive" role="alert">
          Sign-in failed before a user could be saved.
        </p>
      ) : null}
    </div>
  )
}
