import type { NextConfig } from 'next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

const here = path.dirname(fileURLToPath(import.meta.url))

const config: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: here,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
    ],
  },
}

export default config

// Exposes wrangler.jsonc bindings (local D1 `DB`) to `next dev`.
initOpenNextCloudflareForDev()
