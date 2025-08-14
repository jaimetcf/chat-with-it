/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  transpilePackages: ['undici', '@firebase/auth'],
}

module.exports = nextConfig
