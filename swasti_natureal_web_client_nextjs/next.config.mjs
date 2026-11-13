/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Development only: let other devices on the local network (e.g. http://192.168.0.111:3000)
  // load the dev server's scripts. Without this Next.js blocks them and the page stays white.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '127.0.0.1'],
  experimental: {
    // Product forms upload an image, a thumbnail and a gallery (up to 5 MB each) through the proxy.
    proxyClientMaxBodySize: '64mb',
  },
};

export default nextConfig;
