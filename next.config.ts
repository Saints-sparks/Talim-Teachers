import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["res.cloudinary.com"],
  },
  eslint: {
    // The new rules (`no-explicit-any`, `no-console`, JSDoc on services) flag
    // ~640 pre-existing violations that the Track 3 page pass clears page by
    // page. Blocking the build on them would block every deploy in the
    // meantime, so lint is enforced through `npm run lint` and in review.
    // REMOVE this once `npm run lint` is clean.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
