import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // TMDB already serves pre-sized images from its CDN, so a custom loader
    // maps the requested width to the nearest TMDB size instead of paying for
    // a second round of optimization.
    loader: "custom",
    loaderFile: "./lib/tmdb/image-loader.ts",
  },
};

export default nextConfig;
