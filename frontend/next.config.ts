import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production build mode (no static export)
  env: {
    NEXT_PUBLIC_API_URL: "https://e8ee5cf38181bf.lhr.life",
  },
};

export default nextConfig;
