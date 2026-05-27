/** @type {import('next').NextConfig} */
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

