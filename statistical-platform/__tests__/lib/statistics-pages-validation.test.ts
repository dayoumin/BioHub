/**
 * 43개 통계 페이지 검증 테스트
 * 각 페이지가 필수 요소를 갖추고 있는지 확인
 */

import * as fs from 'fs'
import * as path from 'path'

// 43개 통계 페이지 목록
const STATISTICS_PAGES = [
  'ancova', 'anova', 'binomial-test', 'chi-square', 'chi-square-goodness',
  'chi-square-independence', 'cluster', 'cochran-q', 'correlation', 'descriptive',
  'discriminant', 'dose-response', 'explore-data', 'factor-analysis', 'friedman',
  'kruskal-wallis', 'ks-test', 'mann-kendall', 'mann-whitney', 'manova',
  'mcnemar', 'means-plot', 'mixed-model', 'mood-median', 'non-parametric',
  'normality-test', 'one-sample-t', 'ordinal-regression', 'partial-correlation',
  'pca', 'poisson', 'power-analysis', 'proportion-test', 'regression',
  'reliability', 'repeated-measures-anova', 'response-surface', 'runs-test',
  'sign-test', 'stepwise', 't-test', 'welch-t', 'wilcoxon'
]

// 분석 함수 패턴
const ANALYSIS_FUNCTION_PATTERNS = [
  /runAnalysis/,
  /handleAnalysis/,
  /executeAnalysis/,
  /handleCalculate/,
  /handleRunAnalysis/,
  /handleAnalyze/,
  /run\w+Analysis/,
  /run\w+Test/,
  /run\w+Regression/
]

describe('통계 페이지 검증', () => {
  const pagesDir = path.join(__dirname, '..', '..', 'app', '(dashboard)', 'statistics')

  describe('페이지 파일 존재 여부', () => {
    STATISTICS_PAGES.forEach(page => {
      it(`${page} 페이지가 존재해야 한다`, () => {
        const pagePath = path.join(pagesDir, page, 'page.tsx')
        expect(fs.existsSync(pagePath)).toBe(true)
      })
    })
  })

  describe('PyodideWorker 사용', () => {
    STATISTICS_PAGES.forEach(page => {
      it(`${page} 페이지가 PyodideWorker 또는 PyodideCoreService를 사용해야 한다`, () => {
        const pagePath = path.join(pagesDir, page, 'page.tsx')
        if (!fs.existsSync(pagePath)) {
          fail(`페이지 파일 없음: ${page}`)
          return
        }

        const content = fs.readFileSync(pagePath, 'utf-8')
        const usesPyodide = content.includes('PyodideWorker') || content.includes('PyodideCoreService')
        expect(usesPyodide).toBe(true)
      })
    })
  })

  describe('분석 실행 함수', () => {
    STATISTICS_PAGES.forEach(page => {
      it(`${page} 페이지에 분석 실행 함수가 있어야 한다`, () => {
        const pagePath = path.join(pagesDir, page, 'page.tsx')
        if (!fs.existsSync(pagePath)) {
          fail(`페이지 파일 없음: ${page}`)
          return
        }

        const content = fs.readFileSync(pagePath, 'utf-8')
        const hasFunction = ANALYSIS_FUNCTION_PATTERNS.some(pattern => pattern.test(content))
        expect(hasFunction).toBe(true)
      })
    })
  })

  describe('에러 처리', () => {
    STATISTICS_PAGES.forEach(page => {
      it(`${page} 페이지에 try-catch 에러 처리가 있어야 한다`, () => {
        const pagePath = path.join(pagesDir, page, 'page.tsx')
        if (!fs.existsSync(pagePath)) {
          fail(`페이지 파일 없음: ${page}`)
          return
        }

        const content = fs.readFileSync(pagePath, 'utf-8')
        const hasErrorHandling = content.includes('try') && content.includes('catch')
        expect(hasErrorHandling).toBe(true)
      })
    })
  })

  describe('useStatisticsPage 훅 사용', () => {
    STATISTICS_PAGES.forEach(page => {
      it(`${page} 페이지가 useStatisticsPage 훅을 사용해야 한다`, () => {
        const pagePath = path.join(pagesDir, page, 'page.tsx')
        if (!fs.existsSync(pagePath)) {
          fail(`페이지 파일 없음: ${page}`)
          return
        }

        const content = fs.readFileSync(pagePath, 'utf-8')
        expect(content.includes('useStatisticsPage')).toBe(true)
      })
    })
  })

  describe('표준 레이아웃 사용', () => {
    STATISTICS_PAGES.forEach(page => {
      it(`${page} 페이지가 TwoPanelLayout 또는 StatisticsPageLayout을 사용해야 한다`, () => {
        const pagePath = path.join(pagesDir, page, 'page.tsx')
        if (!fs.existsSync(pagePath)) {
          fail(`페이지 파일 없음: ${page}`)
          return
        }

        const content = fs.readFileSync(pagePath, 'utf-8')
        const usesLayout = content.includes('TwoPanelLayout') || content.includes('StatisticsPageLayout')
        expect(usesLayout).toBe(true)
      })
    })
  })

  describe('종합 통계', () => {
    it('모든 페이지가 필수 요소를 갖추고 있어야 한다', () => {
      const results = {
        total: STATISTICS_PAGES.length,
        pyodide: 0,
        analysisFunction: 0,
        errorHandling: 0,
        useStatisticsPage: 0,
        standardLayout: 0
      }

      STATISTICS_PAGES.forEach(page => {
        const pagePath = path.join(pagesDir, page, 'page.tsx')
        if (!fs.existsSync(pagePath)) return

        const content = fs.readFileSync(pagePath, 'utf-8')

        if (content.includes('PyodideWorker') || content.includes('PyodideCoreService')) {
          results.pyodide++
        }
        if (ANALYSIS_FUNCTION_PATTERNS.some(p => p.test(content))) {
          results.analysisFunction++
        }
        if (content.includes('try') && content.includes('catch')) {
          results.errorHandling++
        }
        if (content.includes('useStatisticsPage')) {
          results.useStatisticsPage++
        }
        if (content.includes('TwoPanelLayout') || content.includes('StatisticsPageLayout')) {
          results.standardLayout++
        }
      })

      console.log('\n📊 통계 페이지 검증 결과:')
      console.log(`   • PyodideWorker: ${results.pyodide}/${results.total}`)
      console.log(`   • 분석 함수: ${results.analysisFunction}/${results.total}`)
      console.log(`   • 에러 처리: ${results.errorHandling}/${results.total}`)
      console.log(`   • useStatisticsPage: ${results.useStatisticsPage}/${results.total}`)
      console.log(`   • 표준 레이아웃: ${results.standardLayout}/${results.total}`)

      // 모든 항목이 100%여야 함
      expect(results.pyodide).toBe(results.total)
      expect(results.analysisFunction).toBe(results.total)
      expect(results.errorHandling).toBe(results.total)
      expect(results.useStatisticsPage).toBe(results.total)
      expect(results.standardLayout).toBe(results.total)
    })
  })
})
