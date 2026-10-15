import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import '@repo/ui/globals.css';

import styles from './layout.module.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Sprintwise',
  description:
    'Describe a product idea and watch an AI team turn it into a project plan.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={styles.body}>{children}</body>
    </html>
  );
}
