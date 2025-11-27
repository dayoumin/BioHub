/**
 * Batch 4-6: factor-analysis 페이지 마이그레이션 검증 테스트
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

import { describe, it } from '@jest/globals'
import { readFileSync } from 'fs'
import { join } from 'path'

const PAGE_PATH = join(process.cwd(), 'app/(dashboard)/statistics/factor-analysis/page.tsx')

describe('Batch 4-6: factor-analysis 페이지 마이그레이션 검증', () => {
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

    it('handleDataUpload는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleDataUpload = useCallback/)
    })

    it('renderMethodIntroduction은 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderMethodIntroduction = useCallback/)
    })

    it('variableSelectionStep은 useMemo를 사용해야 함', () => {
      expect(fileContent).toMatch(/const variableSelectionStep = useMemo/)
    })

    it('resultsStep은 useMemo를 사용해야 함', () => {
      expect(fileContent).toMatch(/const resultsStep = useMemo/)
    })
  })

  describe('5. 0-based indexing', () => {
    it('STEPS id는 0, 1, 2, 3, 4이어야 함', () => {
      expect(fileContent).toMatch(/id: 0/)
      expect(fileContent).toMatch(/id: 1/)
      expect(fileContent).toMatch(/id: 2/)
      expect(fileContent).toMatch(/id: 3/)
      expect(fileContent).toMatch(/id: 4/)
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

  describe('7. 백업 파일', () => {
    it('page.tsx.backup 파일이 존재해야 함', () => {
      const backupPath = join(process.cwd(), 'app/(dashboard)/statistics/factor-analysis/page.tsx.backup')
      expect(() => readFileSync(backupPath, 'utf-8')).not.toThrow()
    })
  })

  describe('8. TypeScript 타입 안전성', () => {
    it('FactorAnalysisResult 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface FactorAnalysisResult/)
    })

    it('FactorAnalysisVariables를 import 해야 함', () => {
      expect(fileContent).toMatch(/FactorAnalysisVariables/)
    })

    it('useStatisticsPage에 타입 파라미터를 전달해야 함', () => {
      expect(fileContent).toMatch(/useStatisticsPage<FactorAnalysisResult, FactorAnalysisVariables>/)
    })

    it('onStepChange에 타입 명시가 있어야 함', () => {
      expect(fileContent).toMatch(/\(step: number\)/)
    })
  })

  describe('9. PyodideCore 통합', () => {
    it('PyodideCoreService를 import 해야 함', () => {
      expect(fileContent).toMatch(/PyodideCoreService/)
    })
  })

  describe('10. Factor Analysis 특화 기능', () => {
    it('분석 유형 선택이 있어야 함 (exploratory, confirmatory)', () => {
      expect(fileContent).toMatch(/exploratory/)
      expect(fileContent).toMatch(/confirmatory/)
    })

    it('요인 추출 방법 선택이 있어야 함', () => {
      expect(fileContent).toMatch(/principal/)
      expect(fileContent).toMatch(/maximum_likelihood/)
    })

    it('요인 회전 방법 선택이 있어야 함', () => {
      expect(fileContent).toMatch(/varimax/)
      expect(fileContent).toMatch(/promax/)
    })

    it('KMO와 Bartlett 검정이 결과에 포함되어야 함', () => {
      expect(fileContent).toMatch(/kmo/)
      expect(fileContent).toMatch(/bartlett/)
    })
  })

  describe('11. Step별 렌더링', () => {
    it('Step 0: renderMethodIntroduction 호출', () => {
      expect(fileContent).toMatch(/currentStep === 0 && renderMethodIntroduction\(\)/)
    })

    it('Step 1: DataUploadStep 사용', () => {
      expect(fileContent).toMatch(/currentStep === 1 &&/)
      expect(fileContent).toMatch(/DataUploadStep/)
    })

    it('Step 2: variableSelectionStep 사용', () => {
      expect(fileContent).toMatch(/currentStep === 2 && variableSelectionStep/)
    })

    it('Step 4: resultsStep 사용', () => {
      expect(fileContent).toMatch(/currentStep === 4 && resultsStep/)
    })
  })
})

describe('Batch 4-6: 코드 품질 체크', () => {
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
