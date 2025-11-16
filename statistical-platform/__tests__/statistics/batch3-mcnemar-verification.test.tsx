/**
 * Batch 3-5: mcnemar 페이지 마이그레이션 검증 테스트
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

const PAGE_PATH = join(process.cwd(), 'app/(dashboard)/statistics/mcnemar/page.tsx')

describe('Batch 3-5: mcnemar 페이지 마이그레이션 검증', () => {
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
    it('handleFirstVariableSelect는 setCurrentStep을 호출하지 않아야 함', () => {
      const handlerMatch = fileContent.match(/const handleFirstVariableSelect = useCallback\(([\s\S]*?)\}, \[/)
      expect(handlerMatch).toBeTruthy()

      if (handlerMatch) {
        const handlerBody = handlerMatch[1]
        // 주석을 제외하고 실제 코드만 검사
        const codeOnly = handlerBody.replace(/\/\/.*$/gm, '')
        expect(codeOnly).not.toMatch(/actions\.setCurrentStep\(/)
        expect(handlerBody).toMatch(/setSelectedVariables/)
      }
    })

    it('handleSecondVariableSelect는 setCurrentStep을 호출하지 않아야 함', () => {
      const handlerMatch = fileContent.match(/const handleSecondVariableSelect = useCallback\(([\s\S]*?)\}, \[/)
      expect(handlerMatch).toBeTruthy()

      if (handlerMatch) {
        const handlerBody = handlerMatch[1]
        // 주석을 제외하고 실제 코드만 검사
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

    it('Badge onClick 핸들러가 있어야 함 (첫 번째 변수)', () => {
      expect(fileContent).toMatch(/onClick=\{[^}]*handleFirstVariableSelect/)
    })

    it('Badge onClick 핸들러가 있어야 함 (두 번째 변수)', () => {
      expect(fileContent).toMatch(/onClick=\{[^}]*handleSecondVariableSelect/)
    })

    it('교차 비활성화 로직이 있어야 함 (isSameAsSecond)', () => {
      expect(fileContent).toMatch(/isSameAsSecond/)
    })

    it('교차 비활성화 로직이 있어야 함 (isSameAsFirst)', () => {
      expect(fileContent).toMatch(/isSameAsFirst/)
    })
  })

  describe('4. React 최적화', () => {
    it('breadcrumbs는 useMemo를 사용해야 함', () => {
      expect(fileContent).toMatch(/const breadcrumbs = useMemo\(\(\) => \[/)
    })

    it('STEPS는 useMemo를 사용해야 함', () => {
      expect(fileContent).toMatch(/const STEPS: TwoPanelStep\[\] = useMemo\(\(\) => \[/)
    })

    it('handleFirstVariableSelect는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleFirstVariableSelect = useCallback/)
    })

    it('handleSecondVariableSelect는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleSecondVariableSelect = useCallback/)
    })

    it('handleNextStep은 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleNextStep = useCallback/)
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
    it('initialStep: 0을 사용해야 함', () => {
      expect(fileContent).toMatch(/initialStep: 0/)
    })

    it('currentStep === 0 조건을 사용해야 함', () => {
      expect(fileContent).toMatch(/currentStep === 0/)
    })

    it('currentStep === 1 조건을 사용해야 함', () => {
      expect(fileContent).toMatch(/currentStep === 1/)
    })

    it('currentStep === 2 조건을 사용해야 함', () => {
      expect(fileContent).toMatch(/currentStep === 2/)
    })

    it('currentStep === 3 조건을 사용해야 함', () => {
      expect(fileContent).toMatch(/currentStep === 3/)
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
    it('2개 변수 선택 검증 로직이 있어야 함', () => {
      expect(fileContent).toMatch(/isValid = currentDependent\.length === 2/)
    })

    it('첫 번째 변수 카드가 있어야 함', () => {
      expect(fileContent).toMatch(/첫 번째 변수 \(처리 전 \/ 첫 번째 측정\)/)
    })

    it('두 번째 변수 카드가 있어야 함', () => {
      expect(fileContent).toMatch(/두 번째 변수 \(처리 후 \/ 두 번째 측정\)/)
    })

    it('"다음 단계" 버튼이 있어야 함', () => {
      expect(fileContent).toMatch(/onClick=\{handleNextStep\}/)
    })

    it('변수 검증 Alert가 있어야 함', () => {
      expect(fileContent).toMatch(/McNemar 검정은 정확히 2개의 이진 변수가 필요합니다/)
    })
  })

  describe('8. 백업 파일', () => {
    it('page.tsx.backup 파일이 존재해야 함', () => {
      const backupPath = join(process.cwd(), 'app/(dashboard)/statistics/mcnemar/page.tsx.backup')
      expect(() => readFileSync(backupPath, 'utf-8')).not.toThrow()
    })
  })

  describe('9. TypeScript 타입 안전성', () => {
    it('McNemarVariables 타입을 import 해야 함', () => {
      expect(fileContent).toMatch(/import type \{ McNemarVariables \}/)
    })

    it('McNemarTestResult 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface McNemarTestResult/)
    })

    it('useStatisticsPage에 타입 파라미터를 전달해야 함', () => {
      expect(fileContent).toMatch(/useStatisticsPage<McNemarTestResult, McNemarVariables>/)
    })

    it('onStepChange에 타입 명시가 있어야 함', () => {
      expect(fileContent).toMatch(/\(step: number\)/)
    })
  })

  describe('10. PyodideCore 통합', () => {
    it('PyodideCoreService를 동적 import 해야 함', () => {
      expect(fileContent).toMatch(/await import\(['"]@\/lib\/services\/pyodide\/core\/pyodide-core\.service['"]/)
    })

    it('Worker 3을 호출해야 함 (nonparametric)', () => {
      expect(fileContent).toMatch(/callWorkerMethod[\s\S]{0,200}3,?\s*\/\/ worker3-nonparametric/)
    })

    it('mcnemar_test 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]mcnemar_test['"]/)
    })
  })
})

describe('Batch 3-5: 코드 품질 체크', () => {
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
