import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production build mode (no static export)
  env: {
    NEXT_PUBLIC_API_URL: "https://6966e8dbd2ff5b.lhr.life",
  },
};

export default nextConfig;
