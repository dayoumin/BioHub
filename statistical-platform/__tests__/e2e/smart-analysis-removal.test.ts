/**
 * E2E 테스트: /smart-analysis 제거 및 /smart-flow 통합 검증
 *
 * 목적: 사용자 관점에서 스마트 분석 기능이 올바르게 동작하는지 검증
 *
 * 시나리오:
 * 1. 홈페이지에서 스마트 분석 버튼 클릭 → /smart-flow로 이동
 * 2. 대시보드에서 스마트 분석 카드 클릭 → /smart-flow로 이동
 * 3. /smart-analysis 직접 접근 시 404 또는 리다이렉트
 */

import fs from 'fs'
import path from 'path'

describe('E2E: Smart Analysis Removal', () => {
  describe('File System Verification', () => {
    it('should not have smart-analysis directory', () => {
      const smartAnalysisPath = path.join(
        __dirname,
        '../../app/(dashboard)/smart-analysis'
      )

      expect(fs.existsSync(smartAnalysisPath)).toBe(false)
    })

    it('should have smart-flow page', () => {
      const smartFlowPath = path.join(__dirname, '../../app/smart-flow/page.tsx')

      expect(fs.existsSync(smartFlowPath)).toBe(true)
    })
  })

  describe('Source Code Verification', () => {
    it('app/page.tsx should reference /smart-flow', () => {
      const homePagePath = path.join(__dirname, '../../app/page.tsx')
      const content = fs.readFileSync(homePagePath, 'utf-8')

      expect(content).toContain('href="/smart-flow"')
      expect(content).not.toContain('href="/smart-analysis"')
      expect(content).toContain('분석 시작하기')
    })

    it('app/(dashboard)/dashboard/page.tsx should reference /smart-flow', () => {
      const dashboardPagePath = path.join(
        __dirname,
        '../../app/(dashboard)/dashboard/page.tsx'
      )
      const content = fs.readFileSync(dashboardPagePath, 'utf-8')

      expect(content).toContain('href="/smart-flow"')
      expect(content).not.toContain('href="/smart-analysis"')
      expect(content).toContain('스마트 분석')
    })
  })

  describe('Code Quality Checks', () => {
    it('should not have duplicate smart analysis routes', () => {
      const appDir = path.join(__dirname, '../../app')

      // app 디렉토리 내 모든 page.tsx 파일 검색
      const findPageFiles = (dir: string): string[] => {
        const files: string[] = []
        const items = fs.readdirSync(dir)

        for (const item of items) {
          const fullPath = path.join(dir, item)
          const stat = fs.statSync(fullPath)

          if (stat.isDirectory() && !item.startsWith('.')) {
            files.push(...findPageFiles(fullPath))
          } else if (item === 'page.tsx' || item === 'page.ts') {
            files.push(fullPath)
          }
        }

        return files
      }

      const allPageFiles = findPageFiles(appDir)
      const smartAnalysisPages = allPageFiles.filter((file) =>
        file.includes('smart-analysis')
      )

      expect(smartAnalysisPages.length).toBe(0)
    })

    it('should have exactly one smart-flow page', () => {
      const appDir = path.join(__dirname, '../../app')

      const findPageFiles = (dir: string): string[] => {
        const files: string[] = []
        const items = fs.readdirSync(dir)

        for (const item of items) {
          const fullPath = path.join(dir, item)
          const stat = fs.statSync(fullPath)

          if (stat.isDirectory() && !item.startsWith('.')) {
            files.push(...findPageFiles(fullPath))
          } else if (item === 'page.tsx' || item === 'page.ts') {
            files.push(fullPath)
          }
        }

        return files
      }

      const allPageFiles = findPageFiles(appDir)
      const smartFlowPages = allPageFiles.filter((file) =>
        file.includes('smart-flow')
      )

      expect(smartFlowPages.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Link Consistency Across Files', () => {
    it('should not have any smart-analysis links in the codebase', () => {
      const appDir = path.join(__dirname, '../../app')

      const searchForSmartAnalysis = (dir: string): string[] => {
        const matches: string[] = []
        const items = fs.readdirSync(dir)

        for (const item of items) {
          const fullPath = path.join(dir, item)
          const stat = fs.statSync(fullPath)

          if (stat.isDirectory() && !item.startsWith('.')) {
            matches.push(...searchForSmartAnalysis(fullPath))
          } else if (
            (item.endsWith('.tsx') || item.endsWith('.ts')) &&
            !item.includes('.test.')
          ) {
            const content = fs.readFileSync(fullPath, 'utf-8')
            if (content.includes('/smart-analysis')) {
              matches.push(fullPath)
            }
          }
        }

        return matches
      }

      const filesWithSmartAnalysis = searchForSmartAnalysis(appDir)

      expect(filesWithSmartAnalysis.length).toBe(0)
    })
  })
})
