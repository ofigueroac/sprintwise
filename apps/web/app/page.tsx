import { Button } from '@repo/ui/components'

import { getCurrentUser, isAuthConfigured } from '@/auth'

import { signInWithGitHub, signOutAction } from './auth-actions'
import { ChatForm } from './chat/chatForm'
import styles from './page.module.css'

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
        <p className={styles.lead}>
          Describe a product idea and watch an AI team turn it into user
          stories, a Kanban board and a plan you can approve.
        </p>

        {user ? (
          <ChatForm />
        ) : (
          <SignedOut authConfigured={isAuthConfigured} error={error} />
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
      {authConfigured ? (
        <form action={signInWithGitHub}>
          <Button type="submit" size="lg">
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
