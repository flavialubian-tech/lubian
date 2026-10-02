import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pacotes com binários/WASM ou leitura de arquivos que não devem ser empacotados.
  serverExternalPackages: ['@electric-sql/pglite', 'playwright-core', 'handlebars', 'postgres'],
  experimental: {
    // Poucos processos na montagem: cada um carrega o banco embutido (PGlite) e, com um por CPU,
    // a montagem na nuvem passou de 8 GB de memória.
    cpus: 2,
    serverActions: { bodySizeLimit: '15mb' }, // fotos da vistoria
  },
};

export default nextConfig;
