import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production build mode (no static export)
  env: {
    NEXT_PUBLIC_API_URL: "https://altcoin-fantasy.onrender.com",
  },
};

export default nextConfig;
