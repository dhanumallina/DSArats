import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @dsarats/shared ships TypeScript source; transpile it for the browser/server.
  transpilePackages: ["@dsarats/shared"],
};

export default nextConfig;