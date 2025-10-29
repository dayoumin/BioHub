/**
 * Option 3 문서 정리 검증 테스트
 *
 * Purpose: Option 3-1 (dailywork.md 정리) + Option 3-2 (문서 구조 정리) 검증
 */

import { describe, it, expect } from '@jest/globals'
import * as fs from 'fs'
import * as path from 'path'

describe('Option 3: 문서 정리 검증', () => {
  describe('Option 3-1: dailywork.md 정리', () => {
    const dailyworkPath = path.join(__dirname, '../../../dailywork.md')

    it('should have dailywork.md file', () => {
      expect(fs.existsSync(dailyworkPath)).toBe(true)
    })

    it('should contain recent 7 days only (10-23 ~ 10-29)', () => {
      const content = fs.readFileSync(dailyworkPath, 'utf-8')

      // ✅ Should contain: 10-23 ~ 10-29 (7 days)
      expect(content).toContain('## 2025-10-29')
      expect(content).toContain('## 2025-10-28')
      expect(content).toContain('## 2025-10-27')
      expect(content).toContain('## 2025-10-26')
      expect(content).toContain('## 2025-10-25')
      expect(content).toContain('## 2025-10-24')
      expect(content).toContain('## 2025-10-23')

      // ❌ Should NOT contain: 10-22 or earlier
      expect(content).not.toContain('## 2025-10-22')
      expect(content).not.toContain('## 2025-10-21')
    })

    it('should have updated today\'s work (Option 1, 2, 4)', () => {
      const content = fs.readFileSync(dailyworkPath, 'utf-8')

      // ✅ Check: Today's work section exists
      expect(content).toContain('## 2025-10-29 (수) - 오후')
      expect(content).toContain('### ✅ Option 1, 2, 4 완료: 병렬 작업 + 회귀 테스트')

      // ✅ Check: Option 1 documented
      expect(content).toContain('#### Option 1: Syntax 오류 수정')
      expect(content).toContain('chi-square-goodness/page.tsx')

      // ✅ Check: Option 4 documented
      expect(content).toContain('#### Option 4: Worker 환경 검증 시스템')
      expect(content).toContain('verify-worker-support.ts')

      // ✅ Check: Option 2 documented
      expect(content).toContain('#### Option 2: Pyodide 회귀 테스트')
      expect(content).toContain('pyodide-regression.test.ts')

      // ✅ Check: Test results documented
      expect(content).toContain('16/16 ✅') // Option 1, 4
      expect(content).toContain('23/23 ✅') // Option 2
    })

    it('should have archive policy note', () => {
      const content = fs.readFileSync(dailyworkPath, 'utf-8')

      expect(content).toContain('**보관 정책**: 최근 7일만 유지')
      expect(content).toContain('archive/dailywork/')
    })

    it('should be reasonably sized (< 40KB for AI efficiency)', () => {
      const stats = fs.statSync(dailyworkPath)
      expect(stats.size).toBeLessThan(40000) // 40KB (updated after Option 1-2-4 work added)
    })
  })

  describe('Option 3-2: 문서 구조 정리', () => {
    describe('Root Level Files', () => {
      const rootPath = path.join(__dirname, '../../..')

      it('should have exactly 5 root markdown files', () => {
        const files = fs.readdirSync(rootPath)
          .filter(f => f.endsWith('.md') && !fs.statSync(path.join(rootPath, f)).isDirectory())

        expect(files).toHaveLength(5)
        expect(files).toContain('CLAUDE.md')
        expect(files).toContain('README.md')
        expect(files).toContain('ROADMAP.md')
        expect(files).toContain('STATUS.md')
        expect(files).toContain('dailywork.md')
      })

      it('should NOT have CODE_REVIEW_RESPONSE.md or TESTING-GUIDE.md in root', () => {
        const rootFiles = fs.readdirSync(path.join(__dirname, '../../..'))

        expect(rootFiles).not.toContain('CODE_REVIEW_RESPONSE.md')
        expect(rootFiles).not.toContain('TESTING-GUIDE.md')
      })
    })

    describe('docs/ Directory Structure', () => {
      const docsPath = path.join(__dirname, '../../../docs')

      it('should have CODE_REVIEW_RESPONSE.md in docs/', () => {
        const docsFiles = fs.readdirSync(docsPath)
        expect(docsFiles).toContain('CODE_REVIEW_RESPONSE.md')
      })

      it('should have TESTING-GUIDE.md in docs/', () => {
        const docsFiles = fs.readdirSync(docsPath)
        expect(docsFiles).toContain('TESTING-GUIDE.md')
      })

      it('should have planning/ directory', () => {
        const planningPath = path.join(docsPath, 'planning')
        expect(fs.existsSync(planningPath)).toBe(true)
        expect(fs.statSync(planningPath).isDirectory()).toBe(true)
      })

      it('should have architecture/ directory', () => {
        const archPath = path.join(docsPath, 'architecture')
        expect(fs.existsSync(archPath)).toBe(true)
        expect(fs.statSync(archPath).isDirectory()).toBe(true)
      })

      it('should have guides/ directory', () => {
        const guidesPath = path.join(docsPath, 'guides')
        expect(fs.existsSync(guidesPath)).toBe(true)
        expect(fs.statSync(guidesPath).isDirectory()).toBe(true)
      })

      it('should have legal/ directory', () => {
        const legalPath = path.join(docsPath, 'legal')
        expect(fs.existsSync(legalPath)).toBe(true)
        expect(fs.statSync(legalPath).isDirectory()).toBe(true)
      })

      it('should NOT have dated docs in docs/ root', () => {
        const docsFiles = fs.readdirSync(docsPath)

        expect(docsFiles).not.toContain('CODE_REVIEW_FINAL_2025-10-17.md')
        expect(docsFiles).not.toContain('CODE_REVIEW_PHASE6_2025-10-17.md')
      })
    })

    describe('archive/ Directory Structure', () => {
      const archivePath = path.join(__dirname, '../../../archive')

      it('should have archive/2025-10/ directory', () => {
        const archive2025_10 = path.join(archivePath, '2025-10')
        expect(fs.existsSync(archive2025_10)).toBe(true)
        expect(fs.statSync(archive2025_10).isDirectory()).toBe(true)
      })

      it('should have CODE_REVIEW_FINAL_2025-10-17.md in archive/2025-10/', () => {
        const archiveFiles = fs.readdirSync(path.join(archivePath, '2025-10'))
        expect(archiveFiles).toContain('CODE_REVIEW_FINAL_2025-10-17.md')
      })

      it('should have CODE_REVIEW_PHASE6_2025-10-17.md in archive/2025-10/', () => {
        const archiveFiles = fs.readdirSync(path.join(archivePath, '2025-10'))
        expect(archiveFiles).toContain('CODE_REVIEW_PHASE6_2025-10-17.md')
      })

      it('should have archive/dailywork/ directory', () => {
        const dailyworkArchive = path.join(archivePath, 'dailywork')
        expect(fs.existsSync(dailyworkArchive)).toBe(true)
        expect(fs.statSync(dailyworkArchive).isDirectory()).toBe(true)
      })

      it('should have 2025-10-W3.md in archive/dailywork/', () => {
        const dailyworkFiles = fs.readdirSync(path.join(archivePath, 'dailywork'))
        expect(dailyworkFiles).toContain('2025-10-W3.md')
      })
    })

    describe('CLAUDE.md Documentation Structure', () => {
      const claudePath = path.join(__dirname, '../../../CLAUDE.md')

      it('should have updated docs/ structure section', () => {
        const content = fs.readFileSync(claudePath, 'utf-8')

        // ✅ Check: docs/ structure documented
        expect(content).toContain('### docs/ 디렉토리 구조')
        expect(content).toContain('planning/')
        expect(content).toContain('architecture/')
        expect(content).toContain('guides/')
        expect(content).toContain('legal/')
      })

      it('should document CODE_REVIEW_RESPONSE.md in docs/', () => {
        const content = fs.readFileSync(claudePath, 'utf-8')

        expect(content).toContain('CODE_REVIEW_RESPONSE.md')
      })

      it('should document TESTING-GUIDE.md in guides/', () => {
        const content = fs.readFileSync(claudePath, 'utf-8')

        expect(content).toContain('TESTING-GUIDE.md')
      })

      it('should document new docs files', () => {
        const content = fs.readFileSync(claudePath, 'utf-8')

        expect(content).toContain('PERFORMANCE_REGRESSION_TESTING.md')
        expect(content).toContain('WORKER_ENVIRONMENT_VERIFICATION.md')
        expect(content).toContain('PATTERN_A_CONVERSION_HANDOVER.md')
      })

      it('should have updated archive/ structure', () => {
        const content = fs.readFileSync(claudePath, 'utf-8')

        expect(content).toContain('### archive/ (완료된 문서)')
        expect(content).toContain('archive/')
        expect(content).toContain('2025-10/')
        expect(content).toContain('dailywork/')
        expect(content).toContain('2025-10-W3.md')
      })

      it('should document root files (5 only)', () => {
        const content = fs.readFileSync(claudePath, 'utf-8')

        expect(content).toContain('### 루트 문서 (5개만 유지)')
        expect(content).toContain('CLAUDE.md')
        expect(content).toContain('README.md')
        expect(content).toContain('ROADMAP.md')
        expect(content).toContain('STATUS.md')
        expect(content).toContain('dailywork.md')
      })
    })
  })

  describe('Integration: Complete Documentation Cleanup', () => {
    it('should have clean root directory (no stale docs)', () => {
      const rootPath = path.join(__dirname, '../../..')
      const rootFiles = fs.readdirSync(rootPath)
        .filter(f => f.endsWith('.md'))

      // ✅ Only 5 markdown files in root
      expect(rootFiles).toHaveLength(5)
    })

    it('should have all dated docs in archive/', () => {
      const archivePath = path.join(__dirname, '../../../archive/2025-10')
      const archiveFiles = fs.readdirSync(archivePath)

      // ✅ Dated docs should be in archive
      expect(archiveFiles).toContain('CODE_REVIEW_FINAL_2025-10-17.md')
      expect(archiveFiles).toContain('CODE_REVIEW_PHASE6_2025-10-17.md')
    })

    it('should have organized docs/ structure', () => {
      const docsPath = path.join(__dirname, '../../../docs')
      const subdirs = fs.readdirSync(docsPath)
        .filter(f => fs.statSync(path.join(docsPath, f)).isDirectory())

      // ✅ All required subdirectories exist
      expect(subdirs).toContain('planning')
      expect(subdirs).toContain('architecture')
      expect(subdirs).toContain('guides')
      expect(subdirs).toContain('legal')
    })

    it('should have dailywork.md with only recent 7 days', () => {
      const dailyworkPath = path.join(__dirname, '../../../dailywork.md')
      const content = fs.readFileSync(dailyworkPath, 'utf-8')

      // ✅ Recent dates present
      expect(content).toContain('## 2025-10-29')
      expect(content).toContain('## 2025-10-23')

      // ❌ Old dates removed
      expect(content).not.toContain('## 2025-10-22')
    })

    it('should have updated CLAUDE.md with current structure', () => {
      const claudePath = path.join(__dirname, '../../../CLAUDE.md')
      const content = fs.readFileSync(claudePath, 'utf-8')

      // ✅ All sections updated
      expect(content).toContain('### 루트 문서 (5개만 유지)')
      expect(content).toContain('### docs/ 디렉토리 구조')
      expect(content).toContain('### archive/ (완료된 문서)')
    })
  })

  describe('File Sizes (AI Efficiency)', () => {
    it('should have dailywork.md < 40KB', () => {
      const dailyworkPath = path.join(__dirname, '../../../dailywork.md')
      const stats = fs.statSync(dailyworkPath)

      expect(stats.size).toBeLessThan(40000) // 40KB (updated after Option 1-2-4 work added)
    })

    it('should have CLAUDE.md < 100KB', () => {
      const claudePath = path.join(__dirname, '../../../CLAUDE.md')
      const stats = fs.statSync(claudePath)

      expect(stats.size).toBeLessThan(100000)
    })
  })
})
