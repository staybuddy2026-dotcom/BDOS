import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.1.73',
    '192.168.1.12',
    'localhost:3000',
    '127.0.0.1:3000',
  ],
  // Retired pages: outreach sequences and won-deal handoffs now live on each deal in the CRM.
  async redirects() {
    return [
      { source: '/pipeline', destination: '/crm', permanent: false },
      { source: '/delivery', destination: '/crm', permanent: false },
    ];
  },
};

export default nextConfig;
