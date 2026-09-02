import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  experimental: {
    // O wizard salva rascunhos com payloads grandes via server actions.
    serverActions: { bodySizeLimit: '4mb' },
  },
};

export default nextConfig;
