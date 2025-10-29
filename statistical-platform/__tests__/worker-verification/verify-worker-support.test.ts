/**
 * Web Worker 환경 검증 스크립트 테스트
 *
 * Purpose: Option 4 검증 - verify-worker-support.ts의 정확성 확인
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

describe('Worker Environment Verification', () => {
  describe('Option 1: Syntax Error Fixes', () => {
    it('should have correct useStatisticsPage hook syntax in chi-square-goodness', () => {
      const filePath = 'app/(dashboard)/statistics/chi-square-goodness/page.tsx'
      const fs = require('fs')
      const path = require('path')
      const fullPath = path.join(__dirname, '../../', filePath)

      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${fullPath}`)
      }

      const content = fs.readFileSync(fullPath, 'utf-8')

      // ✅ Check: Opening parenthesis after generic parameters
      expect(content).toMatch(/useStatisticsPage<.*>\(\{/)

      // ❌ Should NOT have: Missing parenthesis (syntax error)
      expect(content).not.toMatch(/useStatisticsPage<.*>\{/)
    })

    it('should have correct useStatisticsPage hook syntax in chi-square-independence', () => {
      const filePath = 'app/(dashboard)/statistics/chi-square-independence/page.tsx'
      const fs = require('fs')
      const path = require('path')
      const fullPath = path.join(__dirname, '../../', filePath)

      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${fullPath}`)
      }

      const content = fs.readFileSync(fullPath, 'utf-8')

      // ✅ Check: Opening parenthesis after generic parameters
      expect(content).toMatch(/useStatisticsPage<.*>\(\{/)

      // ❌ Should NOT have: Missing parenthesis (syntax error)
      expect(content).not.toMatch(/useStatisticsPage<.*>\{/)
    })

    it('should have correct useStatisticsPage hook syntax in mixed-model', () => {
      const filePath = 'app/(dashboard)/statistics/mixed-model/page.tsx'
      const fs = require('fs')
      const path = require('path')
      const fullPath = path.join(__dirname, '../../', filePath)

      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${fullPath}`)
      }

      const content = fs.readFileSync(fullPath, 'utf-8')

      // ✅ Check: Opening parenthesis after generic parameters
      expect(content).toMatch(/useStatisticsPage<.*>\(\{/)

      // ❌ Should NOT have: Missing parenthesis (syntax error)
      expect(content).not.toMatch(/useStatisticsPage<.*>\{/)
    })

    it('should have correct useStatisticsPage hook syntax in reliability', () => {
      const filePath = 'app/(dashboard)/statistics/reliability/page.tsx'
      const fs = require('fs')
      const path = require('path')
      const fullPath = path.join(__dirname, '../../', filePath)

      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${fullPath}`)
      }

      const content = fs.readFileSync(fullPath, 'utf-8')

      // ✅ Check: Opening parenthesis after generic parameters
      expect(content).toMatch(/useStatisticsPage<.*>\(\{/)

      // ❌ Should NOT have: Missing parenthesis (syntax error)
      expect(content).not.toMatch(/useStatisticsPage<.*>\{/)
    })
  })

  describe('Option 4: Worker Verification Files', () => {
    it('should have verify-worker-support.ts script', () => {
      const fs = require('fs')
      const path = require('path')
      const scriptPath = path.join(__dirname, '../../../scripts/verify-worker-support.ts')

      expect(fs.existsSync(scriptPath)).toBe(true)

      const content = fs.readFileSync(scriptPath, 'utf-8')

      // ✅ Check: Essential classes and methods
      expect(content).toContain('class WorkerEnvironmentVerifier')
      expect(content).toContain('checkWorkerAPI')
      expect(content).toContain('checkSharedArrayBuffer')
      expect(content).toContain('checkWorkerModules')
      expect(content).toContain('checkIndexedDB')
      expect(content).toContain('checkNextJsEnvironment')
      expect(content).toContain('checkMemoryLimits')

      // ✅ Check: Verification result interface
      expect(content).toContain('interface VerificationResult')
      expect(content).toContain('feature: string')
      expect(content).toContain('supported: boolean')
      expect(content).toContain('required: boolean')
    })

    it('should have verify-worker.html page', () => {
      const fs = require('fs')
      const path = require('path')
      const htmlPath = path.join(__dirname, '../../../public/verify-worker.html')

      expect(fs.existsSync(htmlPath)).toBe(true)

      const content = fs.readFileSync(htmlPath, 'utf-8')

      // ✅ Check: HTML structure
      expect(content).toContain('<!DOCTYPE html>')
      expect(content).toContain('<title>Web Worker 환경 검증</title>')

      // ✅ Check: Verification function
      expect(content).toContain('function runVerification()')
      expect(content).toContain('function displayResults(results)')

      // ✅ Check: All 6 verification items
      expect(content).toContain('Web Worker API')
      expect(content).toContain('SharedArrayBuffer')
      expect(content).toContain('Worker Modules')
      expect(content).toContain('IndexedDB')
      expect(content).toContain('Memory Limits')
      expect(content).toContain('Browser')
    })

    it('should have WORKER_ENVIRONMENT_VERIFICATION.md documentation', () => {
      const fs = require('fs')
      const path = require('path')
      const docPath = path.join(__dirname, '../../../docs/WORKER_ENVIRONMENT_VERIFICATION.md')

      expect(fs.existsSync(docPath)).toBe(true)

      const content = fs.readFileSync(docPath, 'utf-8')

      // ✅ Check: Essential sections
      expect(content).toContain('# Web Worker 환경 검증 가이드')
      expect(content).toContain('## 📋 개요')
      expect(content).toContain('## 🚀 사용 방법')
      expect(content).toContain('## 📊 검증 항목 상세')
      expect(content).toContain('## 🔧 문제 해결 가이드')
      expect(content).toContain('## 📈 환경별 권장사항')

      // ✅ Check: All 6 verification items documented
      expect(content).toContain('### 1. Web Worker API (필수)')
      expect(content).toContain('### 2. SharedArrayBuffer (선택, 성능 최적화)')
      expect(content).toContain('### 3. Worker Modules (선택, ES Modules)')
      expect(content).toContain('### 4. IndexedDB (선택, 캐싱)')
      expect(content).toContain('### 5. Memory Limits (선택, 대용량 데이터)')

      // ✅ Check: COOP/COEP headers solution
      expect(content).toContain('Cross-Origin-Opener-Policy')
      expect(content).toContain('Cross-Origin-Embedder-Policy')
      expect(content).toContain('next.config.ts')
    })

    it('should have package.json script', () => {
      const fs = require('fs')
      const path = require('path')
      const packagePath = path.join(__dirname, '../../package.json')

      expect(fs.existsSync(packagePath)).toBe(true)

      const content = fs.readFileSync(packagePath, 'utf-8')
      const packageJson = JSON.parse(content)

      // ✅ Check: verify:worker script exists
      expect(packageJson.scripts).toHaveProperty('verify:worker')
      expect(packageJson.scripts['verify:worker']).toContain('verify-worker.html')
    })
  })

  describe('HTML Validation', () => {
    it('should have valid HTML structure in verify-worker.html', () => {
      const fs = require('fs')
      const path = require('path')
      const htmlPath = path.join(__dirname, '../../../public/verify-worker.html')

      const content = fs.readFileSync(htmlPath, 'utf-8')

      // ✅ Check: Essential HTML tags
      expect(content).toMatch(/<html[^>]*>/i)
      expect(content).toMatch(/<head>/i)
      expect(content).toMatch(/<body>/i)
      expect(content).toMatch(/<\/html>/i)

      // ✅ Check: Meta tags
      expect(content).toContain('<meta charset="UTF-8">')
      expect(content).toContain('<meta name="viewport"')

      // ✅ Check: Button element
      expect(content).toMatch(/<button[^>]*onclick="runVerification\(\)"/)

      // ✅ Check: Results container
      expect(content).toMatch(/<div[^>]*id="results"/)

      // ✅ Check: JavaScript verification logic
      expect(content).toContain('typeof Worker')
      expect(content).toContain('typeof SharedArrayBuffer')
      expect(content).toContain('typeof indexedDB')
      expect(content).toContain('performance.memory')
    })

    it('should have proper CSS styling in verify-worker.html', () => {
      const fs = require('fs')
      const path = require('path')
      const htmlPath = path.join(__dirname, '../../../public/verify-worker.html')

      const content = fs.readFileSync(htmlPath, 'utf-8')

      // ✅ Check: Style tags
      expect(content).toMatch(/<style>/i)
      expect(content).toMatch(/<\/style>/i)

      // ✅ Check: Key CSS classes
      expect(content).toContain('.container')
      expect(content).toContain('.result')
      expect(content).toContain('.result.pass')
      expect(content).toContain('.result.fail')
      expect(content).toContain('.result.warn')
    })
  })

  describe('Documentation Completeness', () => {
    it('should document all verification items in markdown', () => {
      const fs = require('fs')
      const path = require('path')
      const docPath = path.join(__dirname, '../../../docs/WORKER_ENVIRONMENT_VERIFICATION.md')

      const content = fs.readFileSync(docPath, 'utf-8')

      // ✅ Check: Table with all items (allowing for bold formatting)
      expect(content).toMatch(/\|\s*\*?\*?Web Worker API\*?\*?\s*\|\s*필수/)
      expect(content).toMatch(/\|\s*\*?\*?SharedArrayBuffer\*?\*?\s*\|\s*선택/)
      expect(content).toMatch(/\|\s*\*?\*?Worker Modules\*?\*?\s*\|\s*선택/)
      expect(content).toMatch(/\|\s*\*?\*?IndexedDB\*?\*?\s*\|\s*선택/)
      expect(content).toMatch(/\|\s*\*?\*?Memory Limits\*?\*?\s*\|\s*선택/)

      // ✅ Check: Solution for each blocker
      expect(content).toContain('브라우저 업데이트')
      expect(content).toContain('COOP/COEP 헤더 설정')

      // ✅ Check: Test scenarios
      expect(content).toContain('### 시나리오 1: 로컬 개발')
      expect(content).toContain('### 시나리오 2: Vercel 배포')

      // ✅ Check: Checklist
      expect(content).toContain('## ✅ 체크리스트')
      expect(content).toContain('Phase 5-3 시작 전 확인')
    })

    it('should have proper code examples in markdown', () => {
      const fs = require('fs')
      const path = require('path')
      const docPath = path.join(__dirname, '../../../docs/WORKER_ENVIRONMENT_VERIFICATION.md')

      const content = fs.readFileSync(docPath, 'utf-8')

      // ✅ Check: next.config.ts example
      const configExample = content.match(/```typescript[\s\S]*?next\.config\.ts[\s\S]*?```/g)
      expect(configExample).toBeTruthy()
      expect(configExample!.length).toBeGreaterThan(0)

      // ✅ Check: JavaScript verification examples
      const jsExample = content.match(/```javascript[\s\S]*?typeof Worker[\s\S]*?```/g)
      expect(jsExample).toBeTruthy()

      // ✅ Check: Bash examples
      const bashExample = content.match(/```bash[\s\S]*?npm run[\s\S]*?```/g)
      expect(bashExample).toBeTruthy()
    })
  })

  describe('Integration Tests', () => {
    it('should have consistent verification items across all 3 files', () => {
      const fs = require('fs')
      const path = require('path')

      // Read all 3 files
      const tsPath = path.join(__dirname, '../../../scripts/verify-worker-support.ts')
      const htmlPath = path.join(__dirname, '../../../public/verify-worker.html')
      const docPath = path.join(__dirname, '../../../docs/WORKER_ENVIRONMENT_VERIFICATION.md')

      const tsContent = fs.readFileSync(tsPath, 'utf-8')
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8')
      const docContent = fs.readFileSync(docPath, 'utf-8')

      // ✅ All files should mention the same verification items
      const items = [
        'Web Worker API',
        'SharedArrayBuffer',
        'IndexedDB'
      ]

      items.forEach(item => {
        expect(tsContent).toContain(item)
        expect(htmlContent).toContain(item)
        expect(docContent).toContain(item)
      })
    })

    it('should have matching COOP/COEP header values across files', () => {
      const fs = require('fs')
      const path = require('path')

      const tsPath = path.join(__dirname, '../../../scripts/verify-worker-support.ts')
      const docPath = path.join(__dirname, '../../../docs/WORKER_ENVIRONMENT_VERIFICATION.md')

      const tsContent = fs.readFileSync(tsPath, 'utf-8')
      const docContent = fs.readFileSync(docPath, 'utf-8')

      // ✅ Both files should recommend same header values
      expect(tsContent).toContain('Cross-Origin-Opener-Policy')
      expect(tsContent).toContain('same-origin')
      expect(tsContent).toContain('Cross-Origin-Embedder-Policy')
      expect(tsContent).toContain('require-corp')

      expect(docContent).toContain('Cross-Origin-Opener-Policy')
      expect(docContent).toContain('same-origin')
      expect(docContent).toContain('Cross-Origin-Embedder-Policy')
      expect(docContent).toContain('require-corp')
    })
  })

  describe('File Permissions & Structure', () => {
    it('should have correct file locations', () => {
      const fs = require('fs')
      const path = require('path')

      const files = [
        '../../../scripts/verify-worker-support.ts',
        '../../../public/verify-worker.html',
        '../../../docs/WORKER_ENVIRONMENT_VERIFICATION.md',
        '../../package.json'
      ]

      files.forEach(relativePath => {
        const fullPath = path.join(__dirname, relativePath)
        expect(fs.existsSync(fullPath)).toBe(true)
      })
    })

    it('should have reasonable file sizes', () => {
      const fs = require('fs')
      const path = require('path')

      const tsPath = path.join(__dirname, '../../../scripts/verify-worker-support.ts')
      const htmlPath = path.join(__dirname, '../../../public/verify-worker.html')
      const docPath = path.join(__dirname, '../../../docs/WORKER_ENVIRONMENT_VERIFICATION.md')

      const tsStats = fs.statSync(tsPath)
      const htmlStats = fs.statSync(htmlPath)
      const docStats = fs.statSync(docPath)

      // ✅ Check: Files are not empty and not unreasonably large
      expect(tsStats.size).toBeGreaterThan(1000) // > 1KB
      expect(tsStats.size).toBeLessThan(100000) // < 100KB

      expect(htmlStats.size).toBeGreaterThan(1000)
      expect(htmlStats.size).toBeLessThan(50000)

      expect(docStats.size).toBeGreaterThan(5000) // > 5KB (detailed guide)
      expect(docStats.size).toBeLessThan(100000) // < 100KB
    })
  })
})
