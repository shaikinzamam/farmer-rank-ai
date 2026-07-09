/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.resolve.alias["@"] = require("path").resolve(__dirname, "src");
    return config;
  },
  async rewrites() {
    return [
      { source: "/api/backend/:path*", destination: `${process.env.BACKEND_URL || "http://localhost:4000"}/:path*` },
    ];
  },
};
module.exports = nextConfig;
