import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export 설정 (서버 불필요)
  output: 'export',

  // Trailing slash for static hosting compatibility
  trailingSlash: true,

  // Image optimization disabled for static export
  images: {
    unoptimized: true,
  },

  // 개발/테스트 페이지 빌드에서 제외 (LangGraph node:async_hooks 이슈)
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'].map(ext =>
    process.env.NODE_ENV === 'production' ? ext : ext
  ),

  // Note: redirects() is not compatible with output: 'export'
  // Redirects for moved pages are handled client-side in the pages themselves

  experimental: {
    optimizePackageImports: ['lucide-react', '@/components/ui']
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer, webpack }) => {
    // node:async_hooks Polyfill (클라이언트 빌드에서만 적용)
    // Static Export에서는 서버 코드가 없지만, 명시적으로 클라이언트만 적용
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:async_hooks$/,
          require.resolve('./lib/polyfills/async-hooks-polyfill.js')
        )
      )
    }

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
      // 'node:async_hooks'는 NormalModuleReplacementPlugin으로 처리 (위에서 polyfill 적용)
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
