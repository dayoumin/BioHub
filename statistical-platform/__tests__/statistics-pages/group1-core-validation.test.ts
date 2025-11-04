/**
 * Group 1-4 핵심 통계 페이지 검증 테스트
 *
 * 목표: 11개 완료된 통계 페이지의 코드 패턴 검증
 * - useStatisticsPage hook 정상 사용
 * - DataUploadStep / VariableSelector 표준화
 * - Python workers (scipy) 직접 호출
 * - 타입 안전성 (any 금지, unknown + 타입 가드)
 * - 에러 처리 (early return, optional chaining)
 */

import fs from 'fs'
import path from 'path'

const STATISTICS_PAGES = [
  'anova',
  't-test',
  'one-sample-t',
  'normality-test',
  'means-plot',
  'ks-test',
  'friedman',
  'kruskal-wallis',
  'mann-kendall',
  'reliability',
  'regression'
]

describe('Group 1-4: 핵심 통계 페이지 검증', () => {
  const baseDir = path.join(__dirname, '../../app/(dashboard)/statistics')

  describe('✅ 공통 패턴 검증', () => {
    STATISTICS_PAGES.forEach(pageName => {
      describe(`${pageName}`, () => {
        let content: string

        beforeAll(() => {
          const filePath = path.join(baseDir, pageName, 'page.tsx')
          expect(fs.existsSync(filePath)).toBe(true)
          content = fs.readFileSync(filePath, 'utf-8')
        })

        test('파일 존재', () => {
          const filePath = path.join(baseDir, pageName, 'page.tsx')
          expect(fs.existsSync(filePath)).toBe(true)
        })

        test("'use client' 지시어", () => {
          expect(content).toMatch(/^['"]use client['"]/)
        })

        test('useStatisticsPage hook 사용', () => {
          expect(content).toContain('useStatisticsPage')
        })

        test('Generic types 명시', () => {
          expect(content).toMatch(/useStatisticsPage\s*<\s*\w+,\s*\w+\s*>/)
        })

        test('DataUploadStep 사용', () => {
          expect(content).toContain('DataUploadStep')
        })

        test('VariableSelector 사용', () => {
          expect(content).toContain('VariableSelector')
        })

        test('any 타입 금지', () => {
          const hasAnyType = content.match(/:\s*any\b|as\s+any\b/g)
          expect(hasAnyType).toBeNull()
        })

        test('Optional chaining 사용', () => {
          const hasOptionalChaining = content.match(/\?\./g)
          expect(hasOptionalChaining).not.toBeNull()
        })

        test('useCallback 적용', () => {
          expect(content).toContain('useCallback')
        })

        test('Python 라이브러리 사용', () => {
          expect(content).toMatch(/(?:scipy|statsmodels|numpy)/i)
        })

        test('타입 정의 포함', () => {
          expect(content).toMatch(/(?:interface|type)\s+\w+/)
        })
      })
    })
  })

  describe('📊 최종 검증 요약', () => {
    test('모든 페이지 코드 품질 확인', () => {
      const results = STATISTICS_PAGES.map(pageName => {
        const filePath = path.join(baseDir, pageName, 'page.tsx')
        const content = fs.readFileSync(filePath, 'utf-8')

        const checks = {
          useStatisticsPage: content.includes('useStatisticsPage'),
          genericTypes: /useStatisticsPage\s*<\s*\w+,\s*\w+\s*>/.test(content),
          dataUpload: content.includes('DataUploadStep'),
          variableSelector: content.includes('VariableSelector'),
          noAnyType: !/:?\s*any\b|as\s+any\b/.test(content),
          useCallback: content.includes('useCallback'),
          pythonLibs: /scipy|statsmodels|numpy/i.test(content),
          typeDefinition: /interface|type\s+\w+/.test(content)
        }

        const passed = Object.values(checks).filter(v => v).length
        const total = Object.keys(checks).length

        return {
          name: pageName,
          passed,
          total,
          score: (passed / total) * 5,
          checks
        }
      })

      // 콘솔 출력
      console.log('\n' + '='.repeat(70))
      console.log('📊 Group 1-4 (11개 통계 페이지) 코드 품질 검증 결과')
      console.log('='.repeat(70))

      results.forEach(r => {
        const status = r.passed === r.total ? '✅' : '⚠️'
        const score = r.score.toFixed(1)
        console.log(
          `${status} ${r.name.padEnd(20)} | ${r.passed}/${r.total} | 점수: ${score}/5.0`
        )
      })

      const totalPassed = results.reduce((sum, r) => sum + r.passed, 0)
      const totalChecks = results.reduce((sum, r) => sum + r.total, 0)
      const avgScore =
        results.reduce((sum, r) => sum + r.score, 0) / results.length

      console.log('='.repeat(70))
      console.log(`✅ 총 통과: ${totalPassed}/${totalChecks} 검사`)
      console.log(`📈 평균 점수: ${avgScore.toFixed(2)}/5.0`)
      console.log('='.repeat(70) + '\n')

      // 모든 페이지가 통과했는지 확인
      const allPassed = results.every(r => r.passed === r.total)
      expect(allPassed).toBe(true)
    })
  })

  describe('🎯 통계별 특화 검증', () => {
    test('ANOVA: 기본 구조 확인', () => {
      const filePath = path.join(baseDir, 'anova', 'page.tsx')
      const content = fs.readFileSync(filePath, 'utf-8')
      expect(content).toContain('ANOVAResults')
      expect(content).toContain('fStatistic')
    })

    test('Regression: Linear & Logistic 분리', () => {
      const filePath = path.join(baseDir, 'regression', 'page.tsx')
      const content = fs.readFileSync(filePath, 'utf-8')
      expect(content).toContain('LinearRegressionResults')
      expect(content).toContain('LogisticRegressionResults')
    })

    test('Mann-Kendall: scipy.stats 사용', () => {
      const filePath = path.join(baseDir, 'mann-kendall', 'page.tsx')
      const content = fs.readFileSync(filePath, 'utf-8')
      expect(content).toContain('scipy')
    })

    test('Reliability: Cronbach Alpha', () => {
      const filePath = path.join(baseDir, 'reliability', 'page.tsx')
      const content = fs.readFileSync(filePath, 'utf-8')
      expect(content).toMatch(/cronbach|alpha|reliability/i)
    })

    test('Means Plot: recharts 차트', () => {
      const filePath = path.join(baseDir, 'means-plot', 'page.tsx')
      const content = fs.readFileSync(filePath, 'utf-8')
      expect(content).toContain('recharts')
    })

    test('KS Test: Kolmogorov-Smirnov', () => {
      const filePath = path.join(baseDir, 'ks-test', 'page.tsx')
      const content = fs.readFileSync(filePath, 'utf-8')
      expect(content).toMatch(/kstest|kolmogorov/i)
    })
  })
})
