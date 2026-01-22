/**
 * Batch 4-11: dose-response 페이지 마이그레이션 검증 테스트
 *
 * 검증 항목:
 * 1. TwoPanelLayout 사용 확인
 * 2. StatisticsPageLayout 제거 확인
 * 3. breadcrumbs 추가 확인
 * 4. 0-based indexing 확인
 * 5. useCallback/useMemo 사용 확인
 */

import { describe, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const PAGE_PATH = join(process.cwd(), 'app/(dashboard)/statistics/dose-response/page.tsx')

describe('Batch 4-11: dose-response 페이지 마이그레이션 검증', () => {
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

  describe('2. React 최적화', () => {
    it('breadcrumbs는 useMemo를 사용해야 함', () => {
      expect(fileContent).toMatch(/const breadcrumbs = useMemo\(\(\) => \[/)
    })

    it('STEPS는 useMemo를 사용해야 함', () => {
      expect(fileContent).toMatch(/const STEPS: TwoPanelStep\[\] = useMemo\(\(\) => \[/)
    })

    it('renderMethodIntroduction은 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderMethodIntroduction = useCallback/)
    })
  })

  describe('3. 0-based indexing', () => {
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

  describe('4. TwoPanelLayout Props', () => {
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

    it('analysisTitle을 전달해야 함', () => {
      expect(fileContent).toMatch(/analysisTitle="용량-반응 분석"/)
    })

    it('analysisSubtitle을 전달해야 함', () => {
      expect(fileContent).toMatch(/analysisSubtitle="Dose-Response Analysis"/)
    })
  })


  describe('6. TypeScript 타입 안전성', () => {
    it('DoseResponseResult 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface DoseResponseResult/)
    })

    it('DoseResponseVariables를 import 해야 함', () => {
      expect(fileContent).toMatch(/DoseResponseVariables/)
    })

    it('useStatisticsPage를 사용해야 함', () => {
      expect(fileContent).toMatch(/useStatisticsPage/)
    })

    it('onStepChange에 타입 명시가 있어야 함', () => {
      expect(fileContent).toMatch(/\(step: number\)/)
    })
  })

  describe('7. PyodideCore 통합', () => {
    it('PyodideCoreService를 import 해야 함', () => {
      expect(fileContent).toMatch(/PyodideCoreService/)
    })

    it('Worker 4를 호출해야 함 (dose_response_analysis)', () => {
      expect(fileContent).toMatch(/\/\/\s*Call Worker 4|\/\/\s*Worker 4/)
    })

    it('dose_response_analysis 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]dose_response_analysis['"]/)
    })
  })

  describe('8. Dose-Response 특화 기능', () => {
    it('5개 모델이 정의되어 있어야 함', () => {
      expect(fileContent).toMatch(/logistic4/)
      expect(fileContent).toMatch(/logistic3/)
      expect(fileContent).toMatch(/weibull/)
      expect(fileContent).toMatch(/gompertz/)
      expect(fileContent).toMatch(/biphasic/)
    })

    it('모델 선택 UI가 있어야 함 (RadioGroup)', () => {
      expect(fileContent).toMatch(/RadioGroup/)
      expect(fileContent).toMatch(/selectedModel/)
    })

    it('DoseResponseAnalysis 컴포넌트를 사용해야 함', () => {
      expect(fileContent).toMatch(/DoseResponseAnalysis/)
    })

    it('EC50/IC50 매개변수가 포함되어야 함', () => {
      expect(fileContent).toMatch(/EC50|IC50/)
    })

    it('Hill 기울기가 포함되어야 함', () => {
      expect(fileContent).toMatch(/Hill|hill/)
    })

    it('모델 적합도(R²)가 포함되어야 함', () => {
      expect(fileContent).toMatch(/rSquared|R²/)
    })
  })

  describe('9. Step별 렌더링', () => {
    it('Step 0: renderMethodIntroduction 호출', () => {
      expect(fileContent).toMatch(/currentStep === 0 && renderMethodIntroduction\(\)/)
    })

    it('Step 1: 데이터 업로드', () => {
      expect(fileContent).toMatch(/currentStep === 1 &&/)
    })

    it('Step 2: 모델 선택 및 분석', () => {
      expect(fileContent).toMatch(/currentStep === 2 &&/)
    })

    it('Step 3: 결과 확인', () => {
      expect(fileContent).toMatch(/currentStep === 3 &&/)
    })
  })

  describe('10. 모델 제약조건', () => {
    it('모델 제약조건(bottom/top) 설정이 가능해야 함', () => {
      expect(fileContent).toMatch(/bottom|top/)
    })

    it('제약조건 입력 UI가 있어야 함', () => {
      expect(fileContent).toMatch(/constraints|제약/)
    })
  })

  describe('11. 결과 탭 구조', () => {
    it('매개변수 탭이 있어야 함', () => {
      expect(fileContent).toMatch(/id:\s*['"]parameters['"]|tabId="parameters"/)
      expect(fileContent).toMatch(/매개변수|Parameters/)
    })

    it('통계 탭이 있어야 함', () => {
      expect(fileContent).toMatch(/id:\s*['"]statistics['"]|tabId="statistics"/)
      expect(fileContent).toMatch(/통계/)
    })

    it('해석 탭이 있어야 함', () => {
      expect(fileContent).toMatch(/id:\s*['"]interpretation['"]|tabId="interpretation"/)
      expect(fileContent).toMatch(/해석|Interpretation/)
    })

    it('진단 탭이 있어야 함', () => {
      expect(fileContent).toMatch(/id:\s*['"]diagnostics['"]|tabId="diagnostics"/)
      expect(fileContent).toMatch(/진단|Diagnostics/)
    })
  })

  describe('12. 주요 매개변수 표시', () => {
    it('Top 매개변수가 표시되어야 함', () => {
      expect(fileContent).toMatch(/Top|최대/)
    })

    it('Bottom 매개변수가 표시되어야 함', () => {
      expect(fileContent).toMatch(/Bottom|최소/)
    })

    it('EC50 값이 표시되어야 함', () => {
      expect(fileContent).toMatch(/EC50/)
    })

    it('Hill 기울기가 표시되어야 함', () => {
      expect(fileContent).toMatch(/Hill/)
    })
  })
})

describe('Batch 4-11: 코드 품질 체크', () => {
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
