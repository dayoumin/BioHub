/**
 * chi-square (Fisher Exact Test) 페이지 TwoPanelLayout 마이그레이션 검증 테스트
 *
 * 검증 항목:
 * 1. TwoPanelLayout 사용 여부
 * 2. Step 정의 형식 (id, label, completed)
 * 3. useCallback 적용 여부
 * 4. PyodideCore 사용 여부
 * 5. 타입 안전성 (any 타입 미사용)
 */

import { describe, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('chi-square 페이지 TwoPanelLayout 마이그레이션 검증', () => {
  const pagePath = join(process.cwd(), 'app/(dashboard)/statistics/chi-square/page.tsx')
  const pageContent = readFileSync(pagePath, 'utf-8')

  describe('1. TwoPanelLayout 마이그레이션', () => {
    it('TwoPanelLayout import를 사용해야 함', () => {
      expect(pageContent).toContain("import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'")
    })

    it('StatisticsPageLayout을 사용하지 않아야 함', () => {
      expect(pageContent).not.toContain('StatisticsPageLayout')
    })

    it('TwoPanelLayout 컴포넌트를 사용해야 함', () => {
      expect(pageContent).toContain('<TwoPanelLayout')
      expect(pageContent).toContain('</TwoPanelLayout>')
    })
  })

  describe('2. Step 정의 표준 준수', () => {
    it('STEPS 배열을 정의해야 함', () => {
      expect(pageContent).toContain('const STEPS = [')
    })

    it('Step은 { id, label } 형식이어야 함', () => {
      expect(pageContent).toMatch(/\{\s*id:\s*\d+,\s*label:\s*['"]/)
    })

    it('stepsWithCompleted를 생성해야 함', () => {
      expect(pageContent).toContain('const stepsWithCompleted = STEPS.map(step => ({')
      expect(pageContent).toContain('completed:')
    })

    it('3개 단계를 정의해야 함', () => {
      const stepsMatch = pageContent.match(/const STEPS = \[([\s\S]*?)\]/)
      expect(stepsMatch).toBeTruthy()
      const stepsContent = stepsMatch![1]
      const stepCount = (stepsContent.match(/\{\s*id:/g) || []).length
      expect(stepCount).toBe(3)
    })
  })

  describe('3. TwoPanelLayout Props 검증', () => {
    it('currentStep prop을 전달해야 함', () => {
      expect(pageContent).toMatch(/currentStep=\{state\.currentStep\}/)
    })

    it('steps prop을 전달해야 함', () => {
      expect(pageContent).toMatch(/steps=\{stepsWithCompleted\}/)
    })

    it('analysisTitle prop을 전달해야 함', () => {
      expect(pageContent).toMatch(/analysisTitle=/)
    })

    it('analysisSubtitle prop을 전달해야 함', () => {
      expect(pageContent).toMatch(/analysisSubtitle=/)
    })

    it('analysisIcon prop을 전달해야 함', () => {
      expect(pageContent).toMatch(/analysisIcon=/)
    })

    it('breadcrumbs prop을 전달해야 함', () => {
      expect(pageContent).toMatch(/breadcrumbs=\{breadcrumbs\}/)
    })
  })

  describe('4. Breadcrumb 정의', () => {
    it('breadcrumbs 배열을 정의해야 함', () => {
      expect(pageContent).toContain('const breadcrumbs = [')
    })

    it('홈 링크를 포함해야 함', () => {
      expect(pageContent).toMatch(/\{\s*label:\s*['"]홈['"],\s*href:\s*['"]\/['"]/)
    })

    it('현재 페이지 레이블을 포함해야 함', () => {
      expect(pageContent).toMatch(/\{\s*label:\s*['"]Fisher 정확 검정['"]/)
    })
  })

  describe('5. useCallback 적용 검증', () => {
    it('updateCell 함수에 useCallback을 적용해야 함', () => {
      expect(pageContent).toMatch(/const updateCell = useCallback\(/)
    })

    it('handleAlternativeChange 함수에 useCallback을 적용해야 함', () => {
      expect(pageContent).toMatch(/const handleAlternativeChange = useCallback\(/)
    })

    it('handleAlphaChange 함수에 useCallback을 적용해야 함', () => {
      expect(pageContent).toMatch(/const handleAlphaChange = useCallback\(/)
    })

    it('handleAlphaBlur 함수에 useCallback을 적용해야 함', () => {
      expect(pageContent).toMatch(/const handleAlphaBlur = useCallback\(/)
    })

    it('runAnalysis 함수에 useCallback을 적용해야 함', () => {
      expect(pageContent).toMatch(/const runAnalysis = useCallback\(/)
    })
  })

  describe('6. PyodideCore 사용 검증', () => {
    it('PyodideCoreService를 import 해야 함', () => {
      expect(pageContent).toContain("import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'")
    })

    it('PyodideWorker enum을 import 해야 함', () => {
      expect(pageContent).toContain("import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'")
    })

    it('PyodideCoreService.getInstance()를 사용해야 함', () => {
      expect(pageContent).toMatch(/PyodideCoreService\.getInstance\(\)/)
    })

    it('callWorkerMethod를 사용해야 함', () => {
      expect(pageContent).toContain('callWorkerMethod<FisherExactTestResult>')
    })

    it('PyodideWorker.Hypothesis를 사용해야 함', () => {
      expect(pageContent).toContain('PyodideWorker.Hypothesis')
    })

    it('fisher_exact_test 메서드를 호출해야 함', () => {
      expect(pageContent).toContain("'fisher_exact_test'")
    })
  })

  describe('7. 타입 안전성 검증', () => {
    it('any 타입을 사용하지 않아야 함', () => {
      // 주석이나 문자열 내부는 제외
      const codeLines = pageContent.split('\n').filter(line => {
        const trimmed = line.trim()
        return !trimmed.startsWith('//') && !trimmed.startsWith('*')
      })
      const codeWithoutComments = codeLines.join('\n')

      const anyTypeMatches = codeWithoutComments.match(/:\s*any[\s,;\)\]]/g)
      expect(anyTypeMatches).toBeNull()
    })

    it('unknown 타입과 타입 가드를 사용해야 함', () => {
      expect(pageContent).toContain('err: unknown')
      expect(pageContent).toContain('err instanceof Error')
    })

    it('FisherExactTestResult 타입을 import 해야 함', () => {
      expect(pageContent).toContain("import type { FisherExactTestResult } from '@/types/pyodide-results'")
    })

    it('ChiSquareVariables 타입을 import 해야 함', () => {
      expect(pageContent).toContain("import type { ChiSquareVariables } from '@/types/statistics'")
    })
  })

  describe('8. 에러 처리 검증', () => {
    it('try-catch 블록을 사용해야 함', () => {
      expect(pageContent).toMatch(/try\s*\{/)
      expect(pageContent).toMatch(/\}\s*catch\s*\(/)
    })

    it('actions.setError를 사용해야 함', () => {
      expect(pageContent).toContain('actions.setError')
    })

    it('유효성 검사를 수행해야 함', () => {
      expect(pageContent).toContain('// Validation')
      expect(pageContent).toMatch(/if \(table\.some\(/)
      expect(pageContent).toContain('모든 값은 0 이상이어야 합니다')
      expect(pageContent).toContain('모든 값이 0일 수 없습니다')
    })
  })

  describe('9. State 관리 검증', () => {
    it('useStatisticsPage hook을 사용해야 함', () => {
      expect(pageContent).toContain('const { state, actions } = useStatisticsPage')
    })

    it('withUploadedData: false를 설정해야 함', () => {
      expect(pageContent).toContain('withUploadedData: false')
    })

    it('withError: true를 설정해야 함', () => {
      expect(pageContent).toContain('withError: true')
    })

    it('state에서 필요한 값을 destructure 해야 함', () => {
      expect(pageContent).toMatch(/const \{ results, isAnalyzing, error \} = state/)
    })
  })

  describe('10. UI 컴포넌트 사용 검증', () => {
    it('Card 컴포넌트를 사용해야 함', () => {
      expect(pageContent).toContain('<Card>')
      expect(pageContent).toContain('</Card>')
    })

    it('Table 컴포넌트를 사용해야 함', () => {
      expect(pageContent).toContain('<Table>')
      expect(pageContent).toContain('</Table>')
    })

    it('Input 컴포넌트를 사용해야 함', () => {
      expect(pageContent).toContain('<Input')
    })

    it('Button 컴포넌트를 사용해야 함', () => {
      expect(pageContent).toContain('<Button')
    })

    it('Alert 컴포넌트를 사용해야 함', () => {
      expect(pageContent).toContain('<Alert')
    })

    it('PValueBadge 컴포넌트를 사용해야 함', () => {
      expect(pageContent).toContain('<PValueBadge')
    })
  })

  describe('11. Render 함수 패턴 검증', () => {
    it('renderMethodology 함수를 정의해야 함', () => {
      expect(pageContent).toContain('const renderMethodology = () => (')
    })

    it('renderInput 함수를 정의해야 함', () => {
      expect(pageContent).toContain('const renderInput = () => (')
    })

    it('renderResults 함수를 정의해야 함', () => {
      expect(pageContent).toContain('const renderResults = () => {')
    })

    it('children으로 모든 렌더 함수를 호출해야 함', () => {
      expect(pageContent).toContain('{renderMethodology()}')
      expect(pageContent).toContain('{renderInput()}')
      expect(pageContent).toContain('{results && renderResults()}')
    })
  })

  describe('12. 최근 사용 통계 추가', () => {
    it('addToRecentStatistics를 import 해야 함', () => {
      expect(pageContent).toContain("import { addToRecentStatistics } from '@/lib/utils/recent-statistics'")
    })

    it('useEffect에서 addToRecentStatistics를 호출해야 함', () => {
      expect(pageContent).toMatch(/useEffect\(\(\) => \{[\s\S]*?addToRecentStatistics/)
      expect(pageContent).toContain("addToRecentStatistics('chi-square')")
    })
  })

  describe('13. 코드 품질 지표', () => {
    it('파일이 600줄 이하여야 함', () => {
      const lineCount = pageContent.split('\n').length
      expect(lineCount).toBeLessThanOrEqual(600)
    })

    it('함수 컴포넌트를 사용해야 함', () => {
      expect(pageContent).toContain('export default function FisherExactTestPage()')
    })

    it('JSX 주석을 적절히 사용해야 함', () => {
      expect(pageContent).toMatch(/\{\/\*[\s\S]*?\*\/\}/)
    })
  })
})
