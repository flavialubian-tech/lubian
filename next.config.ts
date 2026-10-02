import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pacotes com binários/WASM ou leitura de arquivos que não devem ser empacotados.
  serverExternalPackages: ['@electric-sql/pglite', 'playwright-core', 'handlebars', 'postgres'],
  experimental: {
    serverActions: { bodySizeLimit: '15mb' }, // fotos da vistoria
  },
};

export default nextConfig;
