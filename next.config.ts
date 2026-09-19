import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Playwright suite sets NEXT_DIST_DIR so its dev server never shares `.next` with a build or `next dev` running elsewhere.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    domains: ["res.cloudinary.com"],
  },
};

export default nextConfig;
