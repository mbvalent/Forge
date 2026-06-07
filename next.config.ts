import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    // Prevent Turbopack from picking up ~/package-lock.json as the workspace root
    root: process.cwd(),
  },
}

export default nextConfig
