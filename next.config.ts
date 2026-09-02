import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // O empacotamento Windows roda o servidor standalone dentro do Electron.
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  experimental: {
    // O wizard salva rascunhos com payloads grandes via server actions.
    serverActions: { bodySizeLimit: '4mb' },
  },
};

export default nextConfig;
