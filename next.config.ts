import type { NextConfig } from "next";

// Without these, accounts silently vanish from a deploy. Only enforced for real
// production deploys so a fresh clone (or CI) still builds as a guest-only app.
if (
  process.env.VERCEL_ENV === "production" &&
  !(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
) {
  throw new Error("Production build needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
}

const nextConfig: NextConfig = {
  images: {
    // TMDB already serves pre-sized images from its CDN, so a custom loader
    // maps the requested width to the nearest TMDB size instead of paying for
    // a second round of optimization.
    loader: "custom",
    loaderFile: "./lib/tmdb/image-loader.ts",
    // Match the widths TMDB actually serves (see image-loader.ts) so srcset
    // candidates map 1:1 onto CDN sizes instead of overshooting to the next one.
    deviceSizes: [640, 780, 1280, 1920],
    imageSizes: [92, 154, 185, 342, 500],
  },
};

export default nextConfig;
