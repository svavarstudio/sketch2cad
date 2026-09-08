import type { NextConfig } from "next";

/**
 * Next.js 16.3 Instant Navigations (opt-in):
 * - cacheComponents: enable 'use cache' + instant validation
 * - partialPrefetching: reusable shell per route (SPA-like)
 * See: https://nextjs.org/blog/next-16-3-instant-navigations
 */
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactStrictMode: true,
};

export default nextConfig;
