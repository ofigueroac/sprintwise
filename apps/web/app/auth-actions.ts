'use server'

import { signIn, signOut } from '@/auth'

export async function signInWithGitHub() {
  await signIn('github')
}

export async function signInAsDemo() {
  await signIn('credentials', { redirectTo: '/' })
}

export async function signOutAction() {
  await signOut()
}
