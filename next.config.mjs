/** @type {import('next').NextConfig} */
const nextConfig = {
  // 纯静态站点：构建产物输出到 out/，可部署到 Vercel / Netlify / GitHub Pages / 任意 CDN
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizePackageImports: [],
  },
};

export default nextConfig;
