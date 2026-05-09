/** @type {import('next').NextConfig} */
const nextConfig = {
  // Não expor source maps em produção
  productionBrowserSourceMaps: false,

  // Limite de body para Server Actions (1 MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
}

export default nextConfig
