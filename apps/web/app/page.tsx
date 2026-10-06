import { Button } from '@repo/ui/components/button';

import {
  auth,
  getCurrentUser,
  isAuthConfigured,
  signIn,
  signOut,
} from '@/auth';

async function signInWithGitHub() {
  'use server';
  await signIn('github');
}

async function signOutAction() {
  'use server';
  await signOut();
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = isAuthConfigured ? await auth() : null;
  const user = session?.user.githubId ? await getCurrentUser() : null;

  const signedIn = user ? (
    <div className="flex flex-col gap-4">
      <p>
        Signed in as <span className="font-medium">{user.login}</span>. Saved in
        the database as <span className="font-mono text-sm">{user.id}</span>.
      </p>
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="lg">
          Sign out
        </Button>
      </form>
    </div>
  ) : null;

  const signedOut = (
    <div className="flex flex-col gap-3">
      {isAuthConfigured ? (
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
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Sprintwise</h1>
      <p className="text-lg text-muted-foreground">
        Describe a product idea and watch an AI team turn it into user stories,
        a Kanban board and a plan you can approve.
      </p>

      {user ? signedIn : signedOut}
    </main>
  );
}
