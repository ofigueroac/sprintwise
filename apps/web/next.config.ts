import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  transpilePackages: ['@repo/ui'],
  serverExternalPackages: ['postgres'],
}

export default nextConfig
