/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  // Performance optimizations
  experimental: {
    // Reduce memory usage
    workerThreads: false,
    cpus: 1,
  },
  // Disable source maps in development to save memory
  productionBrowserSourceMaps: false,
  webpack: (config, { dev, isServer }) => {
    // Reduce memory usage in development
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

