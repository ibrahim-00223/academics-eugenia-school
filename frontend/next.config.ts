import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Forward env vars to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',
  },
}

export default nextConfig
