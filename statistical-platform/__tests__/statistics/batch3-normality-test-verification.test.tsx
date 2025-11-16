/**
 * Batch 3-9: normality-test 페이지 마이그레이션 검증 테스트
 *
 * 검증 항목:
 * 1. TwoPanelLayout 사용 확인
 * 2. StatisticsPageLayout 제거 확인
 * 3. VariableSelectorModern 제거 확인
 * 4. Badge 기반 변수 선택 확인
 * 5. Critical Bug 예방 패턴 확인
 * 6. useCallback/useMemo 사용 확인
 * 7. 0-based indexing 확인
 * 8. breadcrumbs 추가 확인
 */

import { describe, it, expect } from '@jest/globals'
import { readFileSync } from 'fs'
import { join } from 'path'

const PAGE_PATH = join(process.cwd(), 'app/(dashboard)/statistics/normality-test/page.tsx')

describe('Batch 3-9: normality-test 페이지 마이그레이션 검증', () => {
  let fileContent: string

  beforeAll(() => {
    fileContent = readFileSync(PAGE_PATH, 'utf-8')
  })

  describe('1. 필수 항목 - 레이아웃 변경', () => {
    it('TwoPanelLayout을 import 해야 함', () => {
      expect(fileContent).toMatch(/import \{ TwoPanelLayout \} from ['"]@\/components\/statistics\/layouts\/TwoPanelLayout['"]/)
    })

    it('Step 타입을 import 해야 함', () => {
      expect(fileContent).toMatch(/import type \{ Step as TwoPanelStep \} from ['"]@\/components\/statistics\/layouts\/TwoPanelLayout['"]/)
    })

    it('StatisticsPageLayout을 사용하지 않아야 함', () => {
      expect(fileContent).not.toMatch(/StatisticsPageLayout/)
    })

    it('VariableSelectorModern을 사용하지 않아야 함', () => {
      expect(fileContent).not.toMatch(/VariableSelectorModern/)
    })

    it('TwoPanelLayout 컴포넌트를 return 해야 함', () => {
      expect(fileContent).toMatch(/<TwoPanelLayout/)
    })
  })

  describe('2. Critical Bug 예방 패턴', () => {
    it('handleVariableSelect는 setCurrentStep을 호출하지 않아야 함', () => {
      const handlerMatch = fileContent.match(/const handleVariableSelect = useCallback\(([\s\S]*?)\}, \[/)
      expect(handlerMatch).toBeTruthy()

      if (handlerMatch) {
        const handlerBody = handlerMatch[1]
        const codeOnly = handlerBody.replace(/\/\/.*$/gm, '')
        expect(codeOnly).not.toMatch(/actions\.setCurrentStep\(/)
        expect(handlerBody).toMatch(/setSelectedVariables/)
      }
    })

    it('handleNextStep은 setCurrentStep과 runAnalysis를 모두 호출해야 함', () => {
      const handlerMatch = fileContent.match(/const handleNextStep = useCallback\(async \(\) => \{([\s\S]*?)\}, \[/)
      expect(handlerMatch).toBeTruthy()

      if (handlerMatch) {
        const handlerBody = handlerMatch[1]
        expect(handlerBody).toMatch(/actions\.setCurrentStep\?\.\(3\)/)
        expect(handlerBody).toMatch(/await runAnalysis/)
      }
    })

    it('Critical Bug 예방 주석이 있어야 함', () => {
      expect(fileContent).toMatch(/❌ NO setCurrentStep here - Critical Bug 예방!/)
    })
  })

  describe('3. Badge 기반 변수 선택', () => {
    it('Badge 컴포넌트를 import 해야 함', () => {
      expect(fileContent).toMatch(/import.*Badge.*from ['"]@\/components\/ui\/badge['"]/)
    })

    it('Badge onClick 핸들러가 있어야 함', () => {
      expect(fileContent).toMatch(/onClick=\{[^}]*handleVariableSelect/)
    })

    it('CheckCircle2 아이콘을 사용해야 함 (선택 표시)', () => {
      expect(fileContent).toMatch(/CheckCircle2/)
    })
  })

  describe('4. React 최적화', () => {
    it('breadcrumbs는 useMemo를 사용해야 함', () => {
      expect(fileContent).toMatch(/const breadcrumbs = useMemo\(\(\) => \[/)
    })

    it('STEPS는 useMemo를 사용해야 함', () => {
      expect(fileContent).toMatch(/const STEPS: TwoPanelStep\[\] = useMemo\(\(\) => \[/)
    })

    it('handleVariableSelect는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleVariableSelect = useCallback/)
    })

    it('handleNextStep은 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleNextStep = useCallback/)
    })

    it('runAnalysis는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const runAnalysis = useCallback/)
    })

    it('renderMethodIntroduction은 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderMethodIntroduction = useCallback/)
    })

    it('renderDataUpload는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderDataUpload = useCallback/)
    })

    it('renderVariableSelection은 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderVariableSelection = useCallback/)
    })

    it('renderResults는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderResults = useCallback/)
    })

    it('renderTestResultsTable은 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderTestResultsTable = useCallback/)
    })

    it('renderDescriptiveTable은 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderDescriptiveTable = useCallback/)
    })

    it('renderSummaryCards는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderSummaryCards = useCallback/)
    })

    it('renderOverallConclusion은 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderOverallConclusion = useCallback/)
    })

    it('renderTestDescriptions는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderTestDescriptions = useCallback/)
    })
  })

  describe('5. 0-based indexing', () => {
    it('initialStep: 0을 사용해야 함', () => {
      expect(fileContent).toMatch(/initialStep: 0/)
    })

    it('currentStep >= 1 조건을 사용해야 함 (bottomPreview)', () => {
      expect(fileContent).toMatch(/currentStep >= 1/)
    })
  })

  describe('6. TwoPanelLayout Props', () => {
    it('breadcrumbs prop을 전달해야 함', () => {
      expect(fileContent).toMatch(/breadcrumbs=\{breadcrumbs\}/)
    })

    it('currentStep prop을 전달해야 함', () => {
      expect(fileContent).toMatch(/currentStep=\{currentStep\}/)
    })

    it('steps prop을 전달해야 함', () => {
      expect(fileContent).toMatch(/steps=\{STEPS\}/)
    })

    it('onStepChange prop을 전달해야 함 (타입 명시)', () => {
      expect(fileContent).toMatch(/onStepChange=\{\(step: number\) => \{ actions\.setCurrentStep\?\.\(step\) \}\}/)
    })

    it('bottomPreview prop을 전달해야 함', () => {
      expect(fileContent).toMatch(/bottomPreview=\{uploadedData && currentStep >= 1/)
    })
  })

  describe('7. 변수 선택 검증', () => {
    it('단일 변수 선택 패턴이 있어야 함', () => {
      expect(fileContent).toMatch(/dependent: ''/)
    })

    it('Alert 컴포넌트로 변수 선택 안내가 있어야 함', () => {
      expect(fileContent).toMatch(/수치형 변수 1개를 선택해주세요/)
    })

    it('"다음 단계" 버튼이 있어야 함', () => {
      expect(fileContent).toMatch(/onClick=\{handleNextStep\}/)
    })

    it('Switch 컴포넌트로 검정 옵션 설정이 있어야 함', () => {
      expect(fileContent).toMatch(/showAllTests/)
      expect(fileContent).toMatch(/onCheckedChange=\{setShowAllTests\}/)
    })
  })

  describe('8. 백업 파일', () => {
    it('page.tsx.backup 파일이 존재해야 함', () => {
      const backupPath = join(process.cwd(), 'app/(dashboard)/statistics/normality-test/page.tsx.backup')
      expect(() => readFileSync(backupPath, 'utf-8')).not.toThrow()
    })
  })

  describe('9. TypeScript 타입 안전성', () => {
    it('NormalityTestVariables 타입을 import 해야 함', () => {
      expect(fileContent).toMatch(/import type \{ NormalityTestVariables \}/)
    })

    it('NormalityTestResult 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface NormalityTestResult/)
    })

    it('NormalityResults 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface NormalityResults/)
    })

    it('useStatisticsPage에 타입 파라미터를 전달해야 함', () => {
      expect(fileContent).toMatch(/useStatisticsPage<NormalityResults, NormalityTestVariables>/)
    })

    it('onStepChange에 타입 명시가 있어야 함', () => {
      expect(fileContent).toMatch(/\(step: number\)/)
    })
  })

  describe('10. PyodideCore 통합', () => {
    it('PyodideCoreService를 동적 import 해야 함', () => {
      expect(fileContent).toMatch(/await import\(['"]@\/lib\/services\/pyodide\/core\/pyodide-core\.service['"]/)
    })

    it('Worker 1을 호출해야 함 (descriptive)', () => {
      expect(fileContent).toMatch(/callWorkerMethod[\s\S]{0,200}1,?\s*\/\/ worker1-descriptive/)
    })

    it('normality_test 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]normality_test['"]/)
    })
  })

  describe('11. Normality Test 특화 기능', () => {
    it('Tabs 컴포넌트를 사용해야 함 (결과 탭)', () => {
      expect(fileContent).toMatch(/<Tabs/)
      expect(fileContent).toMatch(/TabsList/)
      expect(fileContent).toMatch(/TabsTrigger/)
    })

    it('4개 탭이 있어야 함 (요약, 검정결과, 결론, 방법설명)', () => {
      expect(fileContent).toMatch(/summary/)
      expect(fileContent).toMatch(/results/)
      expect(fileContent).toMatch(/conclusion/)
      expect(fileContent).toMatch(/methods/)
    })

    it('StatisticsTable을 사용해야 함', () => {
      expect(fileContent).toMatch(/StatisticsTable/)
    })

    it('5가지 검정 방법 설명이 있어야 함', () => {
      expect(fileContent).toMatch(/Shapiro-Wilk/)
      expect(fileContent).toMatch(/Anderson-Darling/)
      expect(fileContent).toMatch(/D\\'Agostino-Pearson K²/)
      expect(fileContent).toMatch(/Jarque-Bera/)
      expect(fileContent).toMatch(/Lilliefors/)
    })

    it('기술통계 테이블이 있어야 함 (왜도, 첨도 포함)', () => {
      expect(fileContent).toMatch(/skewness/)
      expect(fileContent).toMatch(/kurtosis/)
    })

    it('전체 결론 렌더링이 있어야 함', () => {
      expect(fileContent).toMatch(/renderOverallConclusion/)
    })

    it('검정 요약 카드가 있어야 함', () => {
      expect(fileContent).toMatch(/renderSummaryCards/)
    })
  })
})

describe('Batch 3-9: 코드 품질 체크', () => {
  let fileContent: string

  beforeAll(() => {
    fileContent = readFileSync(PAGE_PATH, 'utf-8')
  })

  it('any 타입을 사용하지 않아야 함', () => {
    const anyMatches = fileContent.match(/:\s*any[\s,\)\]]/g)
    expect(anyMatches).toBeNull()
  })

  it('console.log가 없어야 함 (console.error는 허용)', () => {
    expect(fileContent).not.toMatch(/console\.log/)
  })

  it('TODO 주석이 없어야 함', () => {
    expect(fileContent).not.toMatch(/\/\/\s*TODO/)
    expect(fileContent).not.toMatch(/\/\*\s*TODO/)
  })
})
