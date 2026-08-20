import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Work-order photo/PDF uploads are sent to the extract server action as base64.
    serverActions: { bodySizeLimit: '12mb' },
  },
};

export default nextConfig;
