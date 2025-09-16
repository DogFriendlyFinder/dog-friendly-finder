import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    domains: ['koqqkpitepqwlfjymcje.supabase.co'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@tabler/icons-react'],
  },
};

export default nextConfig;
