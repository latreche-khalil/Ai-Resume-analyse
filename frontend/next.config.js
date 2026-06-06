/** @type {import('next').NextConfig} */

// Security headers applied to every response
const securityHeaders = [
  // Prevent clickjacking — only allow framing from same origin
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Stop browsers from MIME-sniffing the content type
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Block XSS reflected attacks in older browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Strict referrer — don't leak full URL to third parties
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Limit browser feature APIs
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // HSTS — force HTTPS for 1 year (enable only in production with HTTPS)
  // Uncomment when deploying with TLS:
  // { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },

  // Content Security Policy
  // - default-src 'self': only load resources from same origin
  // - script-src 'self' 'unsafe-eval' 'unsafe-inline': Next.js requires unsafe-eval in dev
  //   In production you can remove unsafe-eval if not using eval()
  // - style-src 'self' 'unsafe-inline': Tailwind inlines styles
  // - img-src 'self' data: blob: : allow base64 images and blob URLs
  // - font-src 'self': only local fonts
  // - connect-src 'self': API calls only to same origin (proxied via Next.js rewrites)
  // - media-src 'self': video/audio from same origin only
  // - object-src 'none': block Flash, Java plugins entirely
  // - frame-ancestors 'self': no external framing (complements X-Frame-Options)
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' http://localhost:8000 ws://localhost:*",
      "media-src 'self' blob:",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  },
  // Proxy all /api/v1/* requests to backend — eliminates CORS entirely
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8000/api/v1/:path*',
      },
    ]
  },
  // Apply security headers to all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  // Performance optimizations
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  transpilePackages: ['lucide-react'],
  productionBrowserSourceMaps: false,
  webpack: (config, { dev, isServer }) => {
    config.resolve.extensionAlias = {
      '.js': ['.js', '.mjs', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.mjsx'],
    }
    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
