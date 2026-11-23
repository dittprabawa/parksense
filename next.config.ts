import type { NextConfig } from "next";

const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (publishableKey && !publishableKey.startsWith("sb_publishable_")) {
  throw new Error("ParkSense requires a Supabase publishable key in its public configuration.");
}
const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (projectUrl) {
  let parsed: URL;
  try { parsed = new URL(projectUrl); }
  catch { throw new Error("Invalid Supabase project URL."); }
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if ((parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) ||
      parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Use the HTTPS project URL from Supabase Connect.");
  }
}

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
