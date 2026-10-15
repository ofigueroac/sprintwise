import Link from 'next/link';

import { buttonVariants } from '@repo/ui/components';

import { ChatForm } from './chatForm';
import styles from './page.module.css';

export default function ChatPage() {
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
  );
}
