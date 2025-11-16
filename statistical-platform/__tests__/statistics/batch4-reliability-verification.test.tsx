/**
 * Batch 4-4: reliability 페이지 마이그레이션 검증 테스트
 *
 * 검증 항목:
 * 1. TwoPanelLayout 사용 확인
 * 2. StatisticsPageLayout 제거 확인
 * 3. Badge 기반 변수 선택 확인
 * 4. Critical Bug 예방 패턴 확인
 * 5. useCallback/useMemo 사용 확인
 * 6. 0-based indexing 확인
 * 7. breadcrumbs 추가 확인
 */

import { describe, it, expect } from '@jest/globals'
import { readFileSync } from 'fs'
import { join } from 'path'

const PAGE_PATH = join(process.cwd(), 'app/(dashboard)/statistics/reliability/page.tsx')

describe('Batch 4-4: reliability 페이지 마이그레이션 검증', () => {
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
    it('handleItemSelect는 setCurrentStep을 호출하지 않아야 함', () => {
      const handlerMatch = fileContent.match(/const handleItemSelect = useCallback\(([\s\S]*?)\}, \[/)
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
      expect(fileContent).toMatch(/onClick=\{[^}]*handleItemSelect/)
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

    it('handleItemSelect는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleItemSelect = useCallback/)
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
  })

  describe('5. 0-based indexing', () => {
    it('STEPS id는 0, 1, 2, 3이어야 함', () => {
      expect(fileContent).toMatch(/id: 0/)
      expect(fileContent).toMatch(/id: 1/)
      expect(fileContent).toMatch(/id: 2/)
      expect(fileContent).toMatch(/id: 3/)
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
      expect(fileContent).toMatch(/onStepChange=\{\(step: number\) => actions\.setCurrentStep\?\.\(step\)\}/)
    })

    it('bottomPreview prop을 전달해야 함', () => {
      expect(fileContent).toMatch(/bottomPreview=\{uploadedData && currentStep >= 1/)
    })
  })

  describe('7. 변수 선택 검증', () => {
    it('ReliabilityVariables 타입을 사용해야 함 (types/statistics.ts에 정의)', () => {
      expect(fileContent).toMatch(/ReliabilityVariables/)
    })

    it('Alert 컴포넌트로 변수 선택 안내가 있어야 함', () => {
      const hasAlert = fileContent.includes('변수 선택 안내')
      const hasDescription = fileContent.includes('최소 2개 이상')
      expect(hasAlert && hasDescription).toBe(true)
    })

    it('"다음 단계" 버튼이 있어야 함', () => {
      expect(fileContent).toMatch(/onClick=\{handleNextStep\}/)
    })

    it('항목 선택이 최소 2개 이상 필요함을 명시해야 함', () => {
      expect(fileContent).toMatch(/분석 항목 선택 \(2개 이상\)/)
    })
  })

  describe('8. 백업 파일', () => {
    it('page.tsx.backup 파일이 존재해야 함', () => {
      const backupPath = join(process.cwd(), 'app/(dashboard)/statistics/reliability/page.tsx.backup')
      expect(() => readFileSync(backupPath, 'utf-8')).not.toThrow()
    })
  })

  describe('9. TypeScript 타입 안전성', () => {
    it('ReliabilityVariables 타입을 import 해야 함', () => {
      expect(fileContent).toMatch(/import type \{ ReliabilityVariables \}/)
    })

    it('ReliabilityResult 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface ReliabilityResult/)
    })

    it('useStatisticsPage에 타입 파라미터를 전달해야 함', () => {
      expect(fileContent).toMatch(/useStatisticsPage<ReliabilityResult, ReliabilityVariables>/)
    })

    it('onStepChange에 타입 명시가 있어야 함', () => {
      expect(fileContent).toMatch(/\(step: number\)/)
    })
  })

  describe('10. PyodideCore 통합', () => {
    it('PyodideCoreService를 import 해야 함', () => {
      expect(fileContent).toMatch(/PyodideCoreService/)
    })

    it('Worker 1을 호출해야 함 (descriptive)', () => {
      expect(fileContent).toMatch(/callWorkerMethod[\s\S]{0,200}1/)
    })

    it('cronbach_alpha 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]cronbach_alpha['"]/)
    })
  })

  describe('11. Reliability Analysis 특화 기능', () => {
    it('Cronbach\'s Alpha 결과가 표시되어야 함', () => {
      expect(fileContent).toMatch(/cronbachAlpha/)
    })

    it('항목별 통계량(itemStatistics)이 결과에 포함되어야 함', () => {
      expect(fileContent).toMatch(/itemStatistics/)
    })

    it('항목 간 상관관계(interItemCorrelations)가 결과에 포함되어야 함', () => {
      expect(fileContent).toMatch(/interItemCorrelations/)
    })

    it('해석 기준 (신뢰도 수준)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/getAlphaInterpretation/)
    })

    it('StatisticsTable 컴포넌트를 사용해야 함', () => {
      expect(fileContent).toMatch(/StatisticsTable/)
    })

    it('분석 옵션 (신뢰도 모델)이 있어야 함', () => {
      expect(fileContent).toMatch(/Cronbach.*Alpha/)
      expect(fileContent).toMatch(/split-half/)
    })
  })

  describe('12. Step별 렌더링', () => {
    it('Step 0: renderMethodIntroduction 호출', () => {
      expect(fileContent).toMatch(/currentStep === 0 && renderMethodIntroduction\(\)/)
    })

    it('Step 1: renderDataUpload 호출', () => {
      expect(fileContent).toMatch(/currentStep === 1 && renderDataUpload\(\)/)
    })

    it('Step 2: renderVariableSelection 호출', () => {
      expect(fileContent).toMatch(/currentStep === 2 && renderVariableSelection\(\)/)
    })

    it('Step 3: renderResults 호출', () => {
      expect(fileContent).toMatch(/currentStep === 3 && renderResults\(\)/)
    })
  })
})

describe('Batch 4-4: 코드 품질 체크', () => {
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
