import type { NextConfig } from "next";
import path from "path"; // 👈 import path module

const nextConfig: NextConfig = {
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname), // 👈 define the @ alias
    };
    return config;
  },
};

export default nextConfig;
