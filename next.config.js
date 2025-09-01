/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for Mini Apps
  experimental: {
    serverComponentsExternalPackages: ['ws']
  },
  
  // Configure for Mini App deployment
  assetPrefix: process.env.NODE_ENV === 'production' ? '/' : '',
  
  // Optimize for mobile and Mini App contexts
  compress: true,
  
  // Configure headers for Frame integration
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL'
          }
        ]
      }
    ]
  },

  // Webpack configuration for Web3 libraries
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },

  // Environment variables for client-side
  env: {
    CUSTOM_KEY: 'my-value',
  }
};

module.exports = nextConfig;