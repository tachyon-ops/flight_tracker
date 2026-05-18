import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@prisma/ui",
    "@flightradar/db",
    "@flightradar/scrapers",
    "@flightradar/deal-engine",
  ],
};

export default nextConfig;
