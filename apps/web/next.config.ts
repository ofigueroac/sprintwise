import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  transpilePackages: ['@repo/ui'],
  serverExternalPackages: ['drizzle-orm', 'postgres'],
  images: {
    remotePatterns: [
      'docs.langchain.com',
      'hono.dev',
      'neon.com',
      'orm.drizzle.team',
      'playwright.dev',
      'pnpm.io',
      'turbo.build',
      'ui.shadcn.com',
      'www.gstatic.com',
      'www.postgresql.org',
      'www.typescriptlang.org',
      'zod.dev',
    ].map((hostname) => ({
      protocol: 'https' as const,
      hostname,
      pathname: '/**',
    })),
  },
}

export default nextConfig
