import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "moodiness-skeletal-anchovy.ngrok-free.dev", "*.ngrok-free.dev"],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
