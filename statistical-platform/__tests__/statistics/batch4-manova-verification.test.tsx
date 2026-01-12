/**
 * Batch 4-15: manova 페이지 마이그레이션 검증 테스트
 *
 * 검증 항목:
 * 1. TwoPanelLayout 사용 확인
 * 2. StatisticsPageLayout 제거 확인
 * 3. breadcrumbs 추가 확인
 * 4. 0-based indexing 확인
 * 5. useCallback/useMemo 사용 확인
 */

import { describe, it } from '@jest/globals'
import { readFileSync } from 'fs'
import { join } from 'path'

const PAGE_PATH = join(process.cwd(), 'app/(dashboard)/statistics/manova/page.tsx')

describe('Batch 4-15: manova 페이지 마이그레이션 검증', () => {
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

    it('renderDataUpload는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderDataUpload = useCallback/)
    })

    it('renderVariableSelection은 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderVariableSelection = useCallback/)
    })

    it('renderResults는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderResults = useCallback/)
    })

    it('getEffectSizeInterpretation은 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const getEffectSizeInterpretation = useCallback/)
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
      expect(fileContent).toMatch(/analysisTitle="다변량 분산분석"/)
    })

    it('analysisSubtitle을 전달해야 함', () => {
      expect(fileContent).toMatch(/analysisSubtitle="Multivariate Analysis of Variance \(MANOVA\)"/)
    })
  })


  describe('6. TypeScript 타입 안전성', () => {
    it('ManovaResult 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface ManovaResult/)
    })

    it('MANOVAVariables를 import 해야 함', () => {
      expect(fileContent).toMatch(/MANOVAVariables/)
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

    it('Worker 2를 호출해야 함 (manova)', () => {
      expect(fileContent).toMatch(/\/\/\s*Call Worker 2/)
    })

    it('manova 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]manova['"]/)
    })
  })

  describe('8. MANOVA 특화 기능', () => {
    it('다변량 검정(overallTests)이 있어야 함', () => {
      expect(fileContent).toMatch(/overallTests/)
    })

    it('단변량 검정(univariateTests)이 있어야 함', () => {
      expect(fileContent).toMatch(/univariateTests/)
    })

    it('정준 판별분석(canonicalAnalysis)이 있어야 함', () => {
      expect(fileContent).toMatch(/canonicalAnalysis/)
    })

    it('판별함수(discriminantFunctions)가 있어야 함', () => {
      expect(fileContent).toMatch(/discriminantFunctions/)
    })

    it('기술통계(descriptiveStats)가 있어야 함', () => {
      expect(fileContent).toMatch(/descriptiveStats/)
    })

    it('가정검정(assumptions)이 있어야 함', () => {
      expect(fileContent).toMatch(/assumptions/)
    })

    it('모델 적합도(modelFit)가 있어야 함', () => {
      expect(fileContent).toMatch(/modelFit/)
    })

    it('해석(interpretation)이 있어야 함', () => {
      expect(fileContent).toMatch(/interpretation/)
    })
  })

  describe('9. Step별 렌더링', () => {
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

  describe('10. Tabs 구조 (Step 3 결과)', () => {
    it('7개 탭이 있어야 함', () => {
      expect(fileContent).toMatch(/id:\s*['"]multivariate['"]/)
      expect(fileContent).toMatch(/id:\s*['"]univariate['"]/)
      expect(fileContent).toMatch(/id:\s*['"]posthoc['"]/)
      expect(fileContent).toMatch(/id:\s*['"]descriptives['"]/)
      expect(fileContent).toMatch(/id:\s*['"]discriminant['"]/)
      expect(fileContent).toMatch(/id:\s*['"]assumptions['"]/)
      expect(fileContent).toMatch(/id:\s*['"]interpretation['"]/)
    })

    it('ContentTabs 컴포넌트를 사용해야 함', () => {
      expect(fileContent).toMatch(/ContentTabs/)
    })
  })

  describe('11. 다변량 검정 통계량', () => {
    it('Pillai Trace가 있어야 함', () => {
      expect(fileContent).toMatch(/Pillai/)
    })

    it('Wilks Lambda가 있어야 함', () => {
      expect(fileContent).toMatch(/Wilks/)
    })

    it('Hotelling Trace가 있어야 함', () => {
      expect(fileContent).toMatch(/Hotelling/)
    })

    it('Roy Max Root가 있어야 함', () => {
      expect(fileContent).toMatch(/Roy/)
    })
  })

  describe('12. 가정 검정', () => {
    it('다변량 정규성 검정이 있어야 함', () => {
      expect(fileContent).toMatch(/multivariateNormality/)
    })

    it('공분산 행렬 동질성(Box M)이 있어야 함', () => {
      expect(fileContent).toMatch(/homogeneityOfCovariance/)
      expect(fileContent).toMatch(/Box/)
    })

    it('다변량 이상치(Mahalanobis)가 있어야 함', () => {
      expect(fileContent).toMatch(/Mahalanobis/)
    })
  })

  describe('13. 효과크기', () => {
    it('에타제곱(etaSquared)이 있어야 함', () => {
      expect(fileContent).toMatch(/etaSquared/)
    })

    it('다변량 R²가 있어야 함', () => {
      expect(fileContent).toMatch(/rSquaredMultivariate/)
    })

    it('효과크기 해석 함수가 있어야 함', () => {
      expect(fileContent).toMatch(/getEffectSizeInterpretation/)
    })
  })

  describe('14. StatisticsTable 사용', () => {
    it('StatisticsTable을 import 해야 함', () => {
      expect(fileContent).toMatch(/import.*StatisticsTable/)
    })

    it('StatisticsTable을 사용해야 함', () => {
      expect(fileContent).toMatch(/<StatisticsTable/)
    })
  })

  describe('15. StepCard 제거 확인', () => {
    it('StepCard를 사용하지 않아야 함', () => {
      expect(fileContent).not.toMatch(/StepCard/)
    })
  })
})

describe('Batch 4-15: 코드 품질 체크', () => {
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
