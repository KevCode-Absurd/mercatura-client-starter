import type { NextConfig } from "next";
const nextConfig: NextConfig = {
    devIndicators: false,
    distDir: process.env.NEXT_DIST_DIR || ".next",
    serverExternalPackages: ["better-sqlite3", "sharp", "@playwright/test", "playwright-core"],
};
export default nextConfig;
