import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      '**/__tests__/**/*.{test,spec}.{ts,tsx,js}',
      '**/*.{test,spec}.{ts,tsx,js}',
    ],
    exclude: [
      'node_modules',
      'e2e/**',
      '__tests__/statistics/r-spss-validation.test.ts',
      '__tests__/statistics/nist-validation.test.ts',
      '__tests__/statistics/python-direct-test.test.ts',
      'lib/statistics/__tests__/method-mapping.test.ts',
      '__tests__/statistics/statistical-validation.test.ts',
      // RAG 테스트 전체 제외 (ESM import 이슈로 인해)
      '__tests__/rag/**',
      'components/rag/__tests__/**',
      'lib/rag/__tests__/**',
      '__tests__/components/rag/**',
    ],
    testTimeout: 30000,
    pool: 'forks',
    maxForks: 2,
    coverage: {
      provider: 'v8',
      include: [
        'lib/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.d.ts',
        '**/node_modules/**',
        '**/test-data/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'absurd-sql': path.resolve(__dirname, './lib/rag/__mocks__/absurd-sql.ts'),
      'absurd-sql/dist/indexeddb-backend': path.resolve(__dirname, './lib/rag/__mocks__/absurd-sql-backend.ts'),
    },
  },
})
