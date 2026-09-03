import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Tắt Image Optimization động để chạy tốt trên Cloudflare Pages (Edge runtime)
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'lodash'],
    // Không đưa source map server vào Pages Functions bundle production.
    // Điều này giúp giữ bundle dưới giới hạn 25 MiB của Cloudflare Pages.
    serverSourceMaps: false,
  },
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
  async redirects() {
    return [
      {
        source: '/author-dashboard',
        destination: '/admin',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
