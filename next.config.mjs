// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['xlsx']
  },
  // Otimizações para build
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Configurações de webpack para bibliotecas externas
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Evitar bundling de dependências pesadas no servidor
      config.externals.push('xlsx')
    }
    return config
  },
  // Headers para CORS
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ]
  },
  // Configurações de imagens se necessário
  images: {
    domains: [],
    unoptimized: false,
  },
  // Configurações de output para static export se necessário
  // output: 'export',
  // trailingSlash: true,
}

export default nextConfig