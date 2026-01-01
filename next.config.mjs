/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable source maps in production to reduce build complexity
  productionBrowserSourceMaps: false,
  // Optimize for package distribution
  output: 'standalone',
};

export default nextConfig;
