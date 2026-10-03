import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
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
