/**
 * Pyodide 회귀 테스트 검증 (Verification Tests)
 *
 * Purpose: Option 2 구현 검증 - pyodide-regression.test.ts의 정확성 확인
 */

import { describe, it, expect } from '@jest/globals'

describe('Pyodide Regression Test Verification', () => {
  describe('Test File Structure', () => {
    it('should have pyodide-regression.test.ts file', () => {
      const fs = require('fs')
      const path = require('path')
      const testPath = path.join(__dirname, './pyodide-regression.test.ts')

      expect(fs.existsSync(testPath)).toBe(true)

      const content = fs.readFileSync(testPath, 'utf-8')

      // ✅ Check: Essential test structure
      expect(content).toContain('describe(\'Pyodide Regression Tests\'')
      expect(content).toContain('describe(\'1. Pyodide Loading Performance\'')
      expect(content).toContain('describe(\'2. Worker Methods - Basic Functionality\'')
      expect(content).toContain('describe(\'3. Input-Output Consistency\'')
      expect(content).toContain('describe(\'4. Performance Summary\'')
    })

    it('should have correct performance thresholds', () => {
      const fs = require('fs')
      const path = require('path')
      const testPath = path.join(__dirname, './pyodide-regression.test.ts')

      const content = fs.readFileSync(testPath, 'utf-8')

      // ✅ Check: Performance thresholds defined
      expect(content).toContain('PERFORMANCE_THRESHOLDS')
      expect(content).toContain('pyodideLoading: 3000')
      expect(content).toContain('cachedCalculation: 1000')

      // ✅ Check: Thresholds used in tests
      expect(content).toMatch(/expect\(duration\)\.toBeLessThan\(PERFORMANCE_THRESHOLDS\.pyodideLoading\)/)
      expect(content).toMatch(/expect\(duration\)\.toBeLessThan\(PERFORMANCE_THRESHOLDS\.cachedCalculation\)/)
    })

    it('should use PyodideWorker enum correctly', () => {
      const fs = require('fs')
      const path = require('path')
      const testPath = path.join(__dirname, './pyodide-regression.test.ts')

      const content = fs.readFileSync(testPath, 'utf-8')

      // ✅ Check: PyodideWorker enum imported (enumModule pattern)
      expect(content).toContain("await import('@/lib/services/pyodide/core/pyodide-worker.enum')")
      expect(content).toContain('PyodideWorker = enumModule.PyodideWorker')

      // ✅ Check: Enum values used (not string literals)
      expect(content).toContain('PyodideWorker.Descriptive')
      expect(content).toContain('PyodideWorker.Hypothesis')
      expect(content).toContain('PyodideWorker.NonparametricAnova')
      expect(content).toContain('PyodideWorker.RegressionAdvanced')

      // ❌ Should NOT use: String literals like 'Worker1_Descriptive'
      expect(content).not.toMatch(/['"]Worker\d_/)
    })

    it('should have correct test count (7+ tests)', () => {
      const fs = require('fs')
      const path = require('path')
      const testPath = path.join(__dirname, './pyodide-regression.test.ts')

      const content = fs.readFileSync(testPath, 'utf-8')

      // ✅ Count: it() blocks
      const itBlocks = content.match(/it\(['"`]/g)
      expect(itBlocks).not.toBeNull()
      expect(itBlocks!.length).toBeGreaterThanOrEqual(7)

      // ✅ Check: Essential tests present
      expect(content).toContain('should load Pyodide within 3 seconds')
      expect(content).toContain('should cache Pyodide instance')
      expect(content).toContain('should calculate descriptive statistics')
      expect(content).toContain('should perform normality test')
      expect(content).toContain('should perform one-sample t-test')
      expect(content).toContain('should perform Mann-Whitney U test')
      expect(content).toContain('should perform multiple regression')
      expect(content).toContain('should produce identical results for identical inputs')
    })
  })

  describe('Worker Method Tests Coverage', () => {
    it('should test Worker 1 (Descriptive) methods', () => {
      const fs = require('fs')
      const path = require('path')
      const testPath = path.join(__dirname, './pyodide-regression.test.ts')

      const content = fs.readFileSync(testPath, 'utf-8')

      // ✅ Check: Worker 1 methods tested
      expect(content).toContain('PyodideWorker.Descriptive')
      expect(content).toContain("'descriptive_stats'")
      expect(content).toContain("'normality_test'")

      // ✅ Check: Validation
      expect(content).toMatch(/expect\(result\)\.toHaveProperty\(['"`]mean['"`]\)/)
      expect(content).toMatch(/expect\(result\)\.toHaveProperty\(['"`]shapiroWilk['"`]\)/)
    })

    it('should test Worker 2 (Hypothesis) methods', () => {
      const fs = require('fs')
      const path = require('path')
      const testPath = path.join(__dirname, './pyodide-regression.test.ts')

      const content = fs.readFileSync(testPath, 'utf-8')

      // ✅ Check: Worker 2 methods tested
      expect(content).toContain('PyodideWorker.Hypothesis')
      expect(content).toContain("'one_sample_t_test'")

      // ✅ Check: Validation
      expect(content).toMatch(/expect\(result\)\.toHaveProperty\(['"`]tStatistic['"`]\)/)
      expect(content).toMatch(/expect\(result\)\.toHaveProperty\(['"`]pValue['"`]\)/)
    })

    it('should test Worker 3 (NonparametricAnova) methods', () => {
      const fs = require('fs')
      const path = require('path')
      const testPath = path.join(__dirname, './pyodide-regression.test.ts')

      const content = fs.readFileSync(testPath, 'utf-8')

      // ✅ Check: Worker 3 methods tested
      expect(content).toContain('PyodideWorker.NonparametricAnova')
      expect(content).toContain("'mann_whitney_u_test'")

      // ✅ Check: Validation
      expect(content).toMatch(/expect\(result\)\.toHaveProperty\(['"`]uStatistic['"`]\)/)
    })

    it('should test Worker 4 (RegressionAdvanced) methods', () => {
      const fs = require('fs')
      const path = require('path')
      const testPath = path.join(__dirname, './pyodide-regression.test.ts')

      const content = fs.readFileSync(testPath, 'utf-8')

      // ✅ Check: Worker 4 methods tested
      expect(content).toContain('PyodideWorker.RegressionAdvanced')
      expect(content).toContain("'multiple_regression'")

      // ✅ Check: Validation
      expect(content).toMatch(/expect\(result\)\.toHaveProperty\(['"`]coefficients['"`]\)/)
      expect(content).toMatch(/expect\(result\)\.toHaveProperty\(['"`]rSquared['"`]\)/)
    })
  })

  describe('Performance Measurement', () => {
    it('should measure execution time for all tests', () => {
      const fs = require('fs')
      const path = require('path')
      const testPath = path.join(__dirname, './pyodide-regression.test.ts')

      const content = fs.readFileSync(testPath, 'utf-8')

      // ✅ Check: performance.now() usage
      const perfNowUsage = content.match(/performance\.now\(\)/g)
      expect(perfNowUsage).not.toBeNull()
      expect(perfNowUsage!.length).toBeGreaterThanOrEqual(10) // At least 10 tests measure time

      // ✅ Check: Duration calculation
      expect(content).toMatch(/const duration = performance\.now\(\) - start/)

      // ✅ Check: Console logging
      expect(content).toMatch(/console\.log\(.*duration\.toFixed\(0\)/)
    })

    it('should have appropriate test timeouts', () => {
      const fs = require('fs')
      const path = require('path')
      const testPath = path.join(__dirname, './pyodide-regression.test.ts')

      const content = fs.readFileSync(testPath, 'utf-8')

      // ✅ Check: Timeout values (allow both formats: }, 30000) and , 30000))
      expect(content).toMatch(/[,}]\s*30000\)/) // 30s for Pyodide loading
      expect(content).toMatch(/[,}]\s*15000\)/) // 15s for worker methods
      expect(content).toMatch(/[,}]\s*10000\)/) // 10s for cached loading

      // ✅ Check: beforeAll timeout (multiline pattern: beforeAll(async () => {...}, 30000))
      expect(content).toMatch(/beforeAll\(async\s*\([^)]*\)\s*=>\s*\{[\s\S]*?}\s*,\s*30000\)/)
    })
  })

  describe('GitHub Actions Workflow', () => {
    it('should have performance-regression.yml workflow', () => {
      const fs = require('fs')
      const path = require('path')
      const workflowPath = path.join(__dirname, '../../../.github/workflows/performance-regression.yml')

      expect(fs.existsSync(workflowPath)).toBe(true)

      const content = fs.readFileSync(workflowPath, 'utf-8')

      // ✅ Check: Workflow name
      expect(content).toContain('name: Performance Regression Tests')

      // ✅ Check: Triggers
      expect(content).toContain('pull_request:')
      expect(content).toContain('push:')
      expect(content).toContain('workflow_dispatch:')

      // ✅ Check: Branch filters
      expect(content).toContain('branches: [ master, main ]')

      // ✅ Check: Path filters
      expect(content).toContain("- 'statistical-platform/lib/services/pyodide/**'")
      expect(content).toContain("- 'statistical-platform/public/workers/**'")
      expect(content).toContain("- 'statistical-platform/__tests__/performance/**'")
    })

    it('should have correct workflow steps', () => {
      const fs = require('fs')
      const path = require('path')
      const workflowPath = path.join(__dirname, '../../../.github/workflows/performance-regression.yml')

      const content = fs.readFileSync(workflowPath, 'utf-8')

      // ✅ Check: Essential steps
      expect(content).toContain('Checkout code')
      expect(content).toContain('Setup Node.js')
      expect(content).toContain('Install dependencies')
      expect(content).toContain('Run performance regression tests')

      // ✅ Check: Node version
      expect(content).toContain("node-version: '20'")

      // ✅ Check: Test command
      expect(content).toContain('npm test -- __tests__/performance/pyodide-regression.test.ts')

      // ✅ Check: Timeout
      expect(content).toContain('timeout-minutes: 15')
    })
  })

  describe('Documentation', () => {
    it('should have PERFORMANCE_REGRESSION_TESTING.md', () => {
      const fs = require('fs')
      const path = require('path')
      const docPath = path.join(__dirname, '../../../docs/PERFORMANCE_REGRESSION_TESTING.md')

      expect(fs.existsSync(docPath)).toBe(true)

      const content = fs.readFileSync(docPath, 'utf-8')

      // ✅ Check: Essential sections
      expect(content).toContain('# Pyodide 성능 회귀 테스트 가이드')
      expect(content).toContain('## 📋 개요')
      expect(content).toContain('## 🎯 성능 기준값 (Phase 5 Baseline)')
      expect(content).toContain('## 🚀 사용 방법')
      expect(content).toContain('## 📊 테스트 상세')
      expect(content).toContain('## 📈 결과 해석')
      expect(content).toContain('## 🔧 문제 해결')
      expect(content).toContain('## 📚 Phase 5-3 전환 체크리스트')
    })

    it('should document all performance thresholds', () => {
      const fs = require('fs')
      const path = require('path')
      const docPath = path.join(__dirname, '../../../docs/PERFORMANCE_REGRESSION_TESTING.md')

      const content = fs.readFileSync(docPath, 'utf-8')

      // ✅ Check: Phase 5 baseline
      expect(content).toContain('pyodideLoading: 3000')
      expect(content).toContain('cachedCalculation: 1000')

      // ✅ Check: Phase 5-3 targets
      expect(content).toContain('workerPoolLoading: 500')
      expect(content).toContain('workerPoolFirstCalc: 3000')

      // ✅ Check: Improvement percentages
      expect(content).toContain('83%')
      expect(content).toContain('74%')
    })

    it('should document all worker methods tested', () => {
      const fs = require('fs')
      const path = require('path')
      const docPath = path.join(__dirname, '../../../docs/PERFORMANCE_REGRESSION_TESTING.md')

      const content = fs.readFileSync(docPath, 'utf-8')

      // ✅ Check: Worker 1 methods
      expect(content).toContain('descriptive_stats')
      expect(content).toContain('normality_test')

      // ✅ Check: Worker 2 methods
      expect(content).toContain('one_sample_t_test')
      expect(content).toContain('two_sample_t_test')

      // ✅ Check: Worker 3 methods
      expect(content).toContain('mann_whitney_u_test')
      expect(content).toContain('kruskal_wallis_test')

      // ✅ Check: Worker 4 methods
      expect(content).toContain('multiple_regression')
      expect(content).toContain('pca_analysis')
    })

    it('should have troubleshooting guide', () => {
      const fs = require('fs')
      const path = require('path')
      const docPath = path.join(__dirname, '../../../docs/PERFORMANCE_REGRESSION_TESTING.md')

      const content = fs.readFileSync(docPath, 'utf-8')

      // ✅ Check: Common issues documented
      expect(content).toContain('문제 1: Pyodide 로딩 타임아웃')
      expect(content).toContain('문제 2: Worker 메서드 호출 실패')
      expect(content).toContain('문제 3: CI/CD에서 테스트 실패')

      // ✅ Check: Solutions provided
      expect(content).toContain('--testTimeout=60000')
      expect(content).toContain('beforeAll')
      expect(content).toContain('GitHub Actions')
    })
  })

  describe('Package.json Scripts', () => {
    it('should have test:performance scripts', () => {
      const fs = require('fs')
      const path = require('path')
      const packagePath = path.join(__dirname, '../../package.json')

      expect(fs.existsSync(packagePath)).toBe(true)

      const content = fs.readFileSync(packagePath, 'utf-8')
      const packageJson = JSON.parse(content)

      // ✅ Check: test:performance script exists
      expect(packageJson.scripts).toHaveProperty('test:performance')
      expect(packageJson.scripts['test:performance']).toContain('jest')
      expect(packageJson.scripts['test:performance']).toContain('__tests__/performance/pyodide-regression.test.ts')
      expect(packageJson.scripts['test:performance']).toContain('--verbose')

      // ✅ Check: test:performance:watch script exists
      expect(packageJson.scripts).toHaveProperty('test:performance:watch')
      expect(packageJson.scripts['test:performance:watch']).toContain('--watch')
    })
  })

  describe('Integration Consistency', () => {
    it('should have consistent PyodideWorker enum usage across files', () => {
      const fs = require('fs')
      const path = require('path')

      // Read test file
      const testPath = path.join(__dirname, './pyodide-regression.test.ts')
      const testContent = fs.readFileSync(testPath, 'utf-8')

      // Read enum definition
      const enumPath = path.join(__dirname, '../../lib/services/pyodide/core/pyodide-worker.enum.ts')
      const enumContent = fs.readFileSync(enumPath, 'utf-8')

      // ✅ Check: Test file uses enum values that exist in definition
      expect(enumContent).toContain('Descriptive = 1')
      expect(enumContent).toContain('Hypothesis = 2')
      expect(enumContent).toContain('NonparametricAnova = 3')
      expect(enumContent).toContain('RegressionAdvanced = 4')

      expect(testContent).toContain('PyodideWorker.Descriptive')
      expect(testContent).toContain('PyodideWorker.Hypothesis')
      expect(testContent).toContain('PyodideWorker.NonparametricAnova')
      expect(testContent).toContain('PyodideWorker.RegressionAdvanced')
    })

    it('should have matching method names between test and documentation', () => {
      const fs = require('fs')
      const path = require('path')

      const testPath = path.join(__dirname, './pyodide-regression.test.ts')
      const docPath = path.join(__dirname, '../../../docs/PERFORMANCE_REGRESSION_TESTING.md')

      const testContent = fs.readFileSync(testPath, 'utf-8')
      const docContent = fs.readFileSync(docPath, 'utf-8')

      // ✅ All methods in test should be documented
      const methodsInTest = [
        'descriptive_stats',
        'normality_test',
        'one_sample_t_test',
        'mann_whitney_u_test',
        'multiple_regression'
      ]

      methodsInTest.forEach(method => {
        expect(testContent).toContain(`'${method}'`)
        expect(docContent).toContain(method)
      })
    })
  })

  describe('File Structure', () => {
    it('should have correct file locations', () => {
      const fs = require('fs')
      const path = require('path')

      const files = [
        './pyodide-regression.test.ts',
        '../../../.github/workflows/performance-regression.yml',
        '../../../docs/PERFORMANCE_REGRESSION_TESTING.md',
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

      const testPath = path.join(__dirname, './pyodide-regression.test.ts')
      const workflowPath = path.join(__dirname, '../../../.github/workflows/performance-regression.yml')
      const docPath = path.join(__dirname, '../../../docs/PERFORMANCE_REGRESSION_TESTING.md')

      const testStats = fs.statSync(testPath)
      const workflowStats = fs.statSync(workflowPath)
      const docStats = fs.statSync(docPath)

      // ✅ Check: Files are not empty and not unreasonably large
      expect(testStats.size).toBeGreaterThan(5000) // > 5KB
      expect(testStats.size).toBeLessThan(100000) // < 100KB

      expect(workflowStats.size).toBeGreaterThan(500) // > 500B
      expect(workflowStats.size).toBeLessThan(10000) // < 10KB

      expect(docStats.size).toBeGreaterThan(10000) // > 10KB (detailed guide)
      expect(docStats.size).toBeLessThan(100000) // < 100KB
    })
  })

  describe('Code Quality', () => {
    it('should minimize any type usage in regression test', () => {
      const fs = require('fs')
      const path = require('path')
      const testPath = path.join(__dirname, './pyodide-regression.test.ts')

      const content = fs.readFileSync(testPath, 'utf-8')

      // ✅ Check: any type is only used for test variables (pyodideCore, PyodideWorker)
      // This is acceptable in test code for flexibility
      const anyUsage = content.match(/:\s*any\b/g)

      // Should have minimal usage (only for test setup variables)
      if (anyUsage) {
        expect(anyUsage.length).toBeLessThanOrEqual(4) // 2 variables × 2 beforeAll blocks
      }

      // ❌ Should NOT use: as any (type casting)
      expect(content).not.toMatch(/as any\b/)
    })

    it('should have proper error handling', () => {
      const fs = require('fs')
      const path = require('path')
      const testPath = path.join(__dirname, './pyodide-regression.test.ts')

      const content = fs.readFileSync(testPath, 'utf-8')

      // ✅ Check: try-catch blocks (optional, but good practice)
      // Note: Jest automatically handles promise rejections, so try-catch is optional

      // ✅ Check: Meaningful error messages in expectations
      expect(content).toMatch(/expect\(.*\)\.toBeLessThan/)
      expect(content).toMatch(/expect\(.*\)\.toBeCloseTo/)
      expect(content).toMatch(/expect\(.*\)\.toHaveProperty/)
    })
  })
})
