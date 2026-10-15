import Link from 'next/link'
import { redirect } from 'next/navigation'

import { buttonVariants } from '@repo/ui/components'

import { getCurrentUser } from '@/auth'

import { ChatForm } from './chatForm'
import styles from './page.module.css'

export default async function ChatPage() {
  const user = await getCurrentUser()

  // Same gate as the home form so a direct /chat URL cannot skip GitHub login
  if (!user) {
    redirect('/')
  }

  return (
    <main className={styles.page}>
      <Link
        href="/"
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Go back
      </Link>
      <h1 className={styles.title}>Chat</h1>
      <p className={styles.lead}>
        Describe a product idea and the Analyst will stream a reply here.
      </p>
      <ChatForm />
    </main>
  )
}
