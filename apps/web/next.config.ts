import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  transpilePackages: ['@repo/ui'],
  serverExternalPackages: ['drizzle-orm', 'postgres'],
}

export default nextConfig
