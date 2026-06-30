import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Tắt Image Optimization động để chạy tốt trên Cloudflare Pages (Edge runtime)
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
