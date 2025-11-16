/**
 * Batch 4-2: discriminant 페이지 마이그레이션 검증 테스트
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

const PAGE_PATH = join(process.cwd(), 'app/(dashboard)/statistics/discriminant/page.tsx')

describe('Batch 4-2: discriminant 페이지 마이그레이션 검증', () => {
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
    it('handleDependentSelect는 setCurrentStep을 호출하지 않아야 함', () => {
      const handlerMatch = fileContent.match(/const handleDependentSelect = useCallback\(([\s\S]*?)\}, \[/)
      expect(handlerMatch).toBeTruthy()

      if (handlerMatch) {
        const handlerBody = handlerMatch[1]
        const codeOnly = handlerBody.replace(/\/\/.*$/gm, '')
        expect(codeOnly).not.toMatch(/actions\.setCurrentStep\(/)
        expect(handlerBody).toMatch(/setSelectedVariables/)
      }
    })

    it('handleIndependentSelect는 setCurrentStep을 호출하지 않아야 함', () => {
      const handlerMatch = fileContent.match(/const handleIndependentSelect = useCallback\(([\s\S]*?)\}, \[/)
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
      expect(fileContent).toMatch(/onClick=\{[^}]*handleDependentSelect/)
      expect(fileContent).toMatch(/onClick=\{[^}]*handleIndependentSelect/)
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

    it('handleDependentSelect는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleDependentSelect = useCallback/)
    })

    it('handleIndependentSelect는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleIndependentSelect = useCallback/)
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
      expect(fileContent).toMatch(/onStepChange=\{\(step: number\) => actions\.setCurrentStep\?\.\(step\)\}/)
    })

    it('bottomPreview prop을 전달해야 함', () => {
      expect(fileContent).toMatch(/bottomPreview=\{uploadedData && currentStep >= 1/)
    })
  })

  describe('7. 변수 선택 검증', () => {
    it('DiscriminantVariables 타입을 사용해야 함 (types/statistics.ts에 정의)', () => {
      expect(fileContent).toMatch(/DiscriminantVariables/)
    })

    it('Alert 컴포넌트로 변수 선택 안내가 있어야 함', () => {
      const hasAlert = fileContent.includes('종속변수 (그룹)')
      const hasDescription = fileContent.includes('독립변수 (판별)')
      expect(hasAlert && hasDescription).toBe(true)
    })

    it('"다음 단계" 버튼이 있어야 함', () => {
      expect(fileContent).toMatch(/onClick=\{handleNextStep\}/)
    })

    it('종속변수와 독립변수 선택이 분리되어 있어야 함', () => {
      expect(fileContent).toMatch(/종속변수 \(그룹 변수, 1개 선택\)/)
      expect(fileContent).toMatch(/독립변수 \(판별 변수, 2개 이상 선택\)/)
    })
  })

  describe('8. 백업 파일', () => {
    it('page.tsx.backup 파일이 존재해야 함', () => {
      const backupPath = join(process.cwd(), 'app/(dashboard)/statistics/discriminant/page.tsx.backup')
      expect(() => readFileSync(backupPath, 'utf-8')).not.toThrow()
    })
  })

  describe('9. TypeScript 타입 안전성', () => {
    it('DiscriminantVariables 타입을 import 해야 함', () => {
      expect(fileContent).toMatch(/import type \{ DiscriminantVariables \}/)
    })

    it('DiscriminantResult 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface DiscriminantResult/)
    })

    it('useStatisticsPage에 타입 파라미터를 전달해야 함', () => {
      expect(fileContent).toMatch(/useStatisticsPage<DiscriminantResult, DiscriminantVariables>/)
    })

    it('onStepChange에 타입 명시가 있어야 함', () => {
      expect(fileContent).toMatch(/\(step: number\)/)
    })
  })

  describe('10. PyodideCore 통합', () => {
    it('PyodideCoreService를 import 해야 함', () => {
      expect(fileContent).toMatch(/PyodideCoreService/)
    })

    it('Worker 4를 호출해야 함 (ml)', () => {
      expect(fileContent).toMatch(/callWorkerMethod[\s\S]{0,200}4/)
    })

    it('discriminant_analysis 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]discriminant_analysis['"]/)
    })
  })

  describe('11. Discriminant Analysis 특화 기능', () => {
    it('분류 정확도(accuracy)가 결과에 포함되어야 함', () => {
      expect(fileContent).toMatch(/accuracy/)
    })

    it('혼동행렬(confusionMatrix)이 결과에 포함되어야 함', () => {
      expect(fileContent).toMatch(/confusionMatrix/)
    })

    it('판별함수(functions)가 결과에 포함되어야 함', () => {
      expect(fileContent).toMatch(/functions/)
    })

    it('그룹 중심점(groupCentroids)이 결과에 포함되어야 함', () => {
      expect(fileContent).toMatch(/groupCentroids/)
    })

    it('분류 결과(classificationResults)가 결과에 포함되어야 함', () => {
      expect(fileContent).toMatch(/classificationResults/)
    })

    it('동질성 검정(equalityTests)이 결과에 포함되어야 함', () => {
      expect(fileContent).toMatch(/equalityTests/)
    })
  })
})

describe('Batch 4-2: 코드 품질 체크', () => {
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
