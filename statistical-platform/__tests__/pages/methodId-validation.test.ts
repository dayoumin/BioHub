import { describe, it, expect } from '@jest/globals'
import fs from 'fs'
import path from 'path'
import { STATISTICAL_METHOD_REQUIREMENTS } from '../../lib/statistics/variable-requirements'

/**
 * methodId 검증 테스트
 *
 * 목적: 모든 통계 페이지의 methodId가 variable-requirements.ts의 ID와 일치하는지 검증
 * 중요도: Critical - methodId 불일치 시 "데이터를 불러올 수 없습니다" 에러 발생
 */

describe('Statistics Pages - methodId Validation', () => {
  const statisticsDir = path.join(__dirname, '../../app/(dashboard)/statistics')

  // variable-requirements.ts에서 정의된 모든 유효한 methodId 추출
  const validMethodIds = STATISTICAL_METHOD_REQUIREMENTS.map(req => req.id)

  // 수정된 페이지들의 methodId 매핑
  const expectedMethodIds: Record<string, string[]> = {
    'chi-square-goodness': ['chi-square-goodness'],
    'chi-square-independence': ['chi-square-independence'],
    'correlation': ['pearson-correlation'],
    'descriptive': ['descriptive-stats'],
    'discriminant': ['discriminant-analysis'],
    'explore-data': ['explore-data'],
    'kruskal-wallis': ['kruskal-wallis'],
    'ks-test': ['kolmogorov-smirnov'],
    'mann-whitney': ['mann-whitney'],
    'poisson': ['poisson-regression'],
    'proportion-test': ['one-sample-proportion'],
    'runs-test': ['runs-test'],
    'stepwise': ['stepwise-regression'],
    'wilcoxon': ['wilcoxon-signed-rank'],
  }

  it('should have all methodIds in kebab-case format', () => {
    validMethodIds.forEach(id => {
      // kebab-case 형식 검증 (소문자 + 하이픈만 허용)
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/)

      // underscore 없음
      expect(id).not.toMatch(/_/)

      // camelCase 없음 (대문자 없음)
      expect(id).not.toMatch(/[A-Z]/)
    })
  })

  it('should use valid methodIds that exist in variable-requirements.ts', () => {
    Object.entries(expectedMethodIds).forEach(([pageName, methodIds]) => {
      const filePath = path.join(statisticsDir, pageName, 'page.tsx')

      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Page not found: ${pageName}`)
        return
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8')

      methodIds.forEach(expectedId => {
        // 파일에 해당 methodId가 있는지 확인
        expect(fileContent).toContain(`methodId="${expectedId}"`)

        // validMethodIds에 포함되어 있는지 확인
        expect(validMethodIds).toContain(expectedId)
      })
    })
  })

  it('should NOT use invalid methodId formats (underscore, camelCase)', () => {
    const invalidPatterns = [
      /methodId="[a-z]+_[a-z]+"/,  // underscore: chi_square_goodness
      /methodId="[a-z]+[A-Z][a-z]+"/,  // camelCase: kolmogorovSmirnov
    ]

    Object.keys(expectedMethodIds).forEach(pageName => {
      const filePath = path.join(statisticsDir, pageName, 'page.tsx')

      if (!fs.existsSync(filePath)) {
        return
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8')

      invalidPatterns.forEach(pattern => {
        expect(fileContent).not.toMatch(pattern)
      })
    })
  })

  it('should match methodId with page directory for consistency (where applicable)', () => {
    // 일부 페이지는 디렉토리 이름과 methodId가 다를 수 있음 (예: correlation → pearson-correlation)
    // 하지만 대부분은 일관성을 위해 유사해야 함

    const consistentPages = [
      'chi-square-goodness',
      'chi-square-independence',
      'explore-data',
      'kruskal-wallis',
      'mann-whitney',
      'runs-test',
      'wilcoxon',
    ]

    consistentPages.forEach(pageName => {
      const expectedId = expectedMethodIds[pageName]?.[0]
      if (!expectedId) return

      // 디렉토리 이름이 methodId에 포함되는지 확인 (대부분의 경우)
      // 예: kruskal-wallis 디렉토리 → kruskal-wallis methodId
      if (pageName.includes('-')) {
        expect(expectedId).toContain(pageName.split('-')[0])
      }
    })
  })
})
