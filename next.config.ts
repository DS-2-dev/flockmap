import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Let phones on the local network load the dev server (e.g. http://192.168.1.12:3001).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  // Searches used to live at "/"; send old shared links to the map (query is kept).
  async redirects() {
    return ["from", "to"].map((key) => ({
      source: "/",
      has: [{ type: "query" as const, key }],
      destination: "/map",
      permanent: false,
    }));
  },
};

export default nextConfig;
