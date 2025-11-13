import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Static HTML export 설정 (서버 불필요)
  output: 'export',

  // Trailing slash for static hosting compatibility
  trailingSlash: true,

  // Image optimization disabled for static export
  images: {
    unoptimized: true,
  },

  // Redirects for moved pages (frequency-table, cross-tabulation)
  async redirects() {
    return [
      {
        source: '/statistics/frequency-table',
        destination: '/data-tools/frequency-table',
        permanent: true,
      },
      {
        source: '/statistics/cross-tabulation',
        destination: '/data-tools/cross-tabulation',
        permanent: true,
      },
    ]
  },

  experimental: {
    optimizePackageImports: ['lucide-react', '@/components/ui']
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // 서버 사이드에서 Pyodide 완전히 배제
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push('pyodide')
    } else {
      // 클라이언트 사이드 설정
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: require.resolve('buffer'),
      };
    }
    
    // Node.js 모듈 완전 차단
    config.resolve.alias = {
      ...config.resolve.alias,
      'node:child_process': false,
      'node:fs': false,
      'node:path': false,
      'node:crypto': false,
      'node:stream': false,
      'node:util': false,
    };
    
    // Pyodide 관련 모듈들을 external로 처리
    config.externals = config.externals || []
    if (isServer) {
      config.externals.push({
        'pyodide': 'commonjs pyodide',
        'pyodide/package.json': 'commonjs pyodide/package.json',
      })
    }
    
    return config;
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
