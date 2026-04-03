import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/workout-app',
  env: {
    NEXT_PUBLIC_BASE_PATH: '/workout-app',
  },
};

export default nextConfig;
