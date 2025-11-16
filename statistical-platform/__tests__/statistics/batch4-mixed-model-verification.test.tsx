/**
 * Batch 4-16: mixed-model 페이지 마이그레이션 검증 테스트
 *
 * 검증 항목:
 * 1. TwoPanelLayout 사용 확인
 * 2. StatisticsPageLayout 제거 확인
 * 3. breadcrumbs 추가 확인
 * 4. 0-based indexing 확인
 * 5. useCallback/useMemo 사용 확인
 */

import { describe, it, expect } from '@jest/globals'
import { readFileSync } from 'fs'
import { join } from 'path'

const PAGE_PATH = join(process.cwd(), 'app/(dashboard)/statistics/mixed-model/page.tsx')

describe('Batch 4-16: mixed-model 페이지 마이그레이션 검증', () => {
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

    it('getSignificanceColor는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const getSignificanceColor = useCallback/)
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
      expect(fileContent).toMatch(/onStepChange=\{\(step: number\) => actions\?\.setCurrentStep\?\.\(step\)\}/)
    })

    it('bottomPreview prop을 전달해야 함', () => {
      expect(fileContent).toMatch(/bottomPreview=\{uploadedData && currentStep >= 1/)
    })

    it('analysisTitle을 전달해야 함', () => {
      expect(fileContent).toMatch(/analysisTitle="선형 혼합 모형"/)
    })

    it('analysisSubtitle을 전달해야 함', () => {
      expect(fileContent).toMatch(/analysisSubtitle="Linear Mixed Model \(LMM\)"/)
    })
  })

  describe('5. 백업 파일', () => {
    it('page.tsx.backup 파일이 존재해야 함', () => {
      const backupPath = join(process.cwd(), 'app/(dashboard)/statistics/mixed-model/page.tsx.backup')
      expect(() => readFileSync(backupPath, 'utf-8')).not.toThrow()
    })
  })

  describe('6. TypeScript 타입 안전성', () => {
    it('MixedModelResult 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface MixedModelResult/)
    })

    it('MixedModelVariables를 import 해야 함', () => {
      expect(fileContent).toMatch(/MixedModelVariables/)
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

    it('Worker 2를 호출해야 함 (mixed_model)', () => {
      expect(fileContent).toMatch(/2,/)
    })

    it('mixed_model 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]mixed_model['"]/)
    })
  })

  describe('8. Mixed Model 특화 기능', () => {
    it('고정효과(fixedEffects)가 있어야 함', () => {
      expect(fileContent).toMatch(/fixedEffects/)
    })

    it('무선효과(randomEffects)가 있어야 함', () => {
      expect(fileContent).toMatch(/randomEffects/)
    })

    it('분산 성분(varianceComponents)이 있어야 함', () => {
      expect(fileContent).toMatch(/varianceComponents/)
    })

    it('모형 적합도(modelFit)가 있어야 함', () => {
      expect(fileContent).toMatch(/modelFit/)
    })

    it('잔차 분석(residualAnalysis)이 있어야 함', () => {
      expect(fileContent).toMatch(/residualAnalysis/)
    })

    it('예측값(predictedValues)이 있어야 함', () => {
      expect(fileContent).toMatch(/predictedValues/)
    })

    it('무선효과 테이블(randomEffectsTable)이 있어야 함', () => {
      expect(fileContent).toMatch(/randomEffectsTable/)
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
    it('6개 탭이 있어야 함 (fixed, random, variance, fit, diagnostics, interpretation)', () => {
      expect(fileContent).toMatch(/value="fixed"/)
      expect(fileContent).toMatch(/value="random"/)
      expect(fileContent).toMatch(/value="variance"/)
      expect(fileContent).toMatch(/value="fit"/)
      expect(fileContent).toMatch(/value="diagnostics"/)
      expect(fileContent).toMatch(/value="interpretation"/)
    })

    it('TabsList는 6칸으로 나누어야 함', () => {
      expect(fileContent).toMatch(/grid-cols-6/)
    })
  })

  describe('11. 고정효과 (Fixed Effects)', () => {
    it('계수(coefficient)가 표시되어야 함', () => {
      expect(fileContent).toMatch(/coefficient/)
    })

    it('표준오차(standardError)가 표시되어야 함', () => {
      expect(fileContent).toMatch(/standardError/)
    })

    it('t값(tValue)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/tValue/)
    })

    it('p-value가 표시되어야 함', () => {
      expect(fileContent).toMatch(/pValue/)
    })

    it('신뢰구간(ci95Lower, ci95Upper)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/ci95Lower/)
      expect(fileContent).toMatch(/ci95Upper/)
    })

    it('유의성(significance)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/significance/)
    })
  })

  describe('12. 무선효과 (Random Effects)', () => {
    it('분산(variance)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/variance/)
    })

    it('표준편차(standardDeviation)가 표시되어야 함', () => {
      expect(fileContent).toMatch(/standardDeviation/)
    })

    it('상관계수(correlations)가 있어야 함', () => {
      expect(fileContent).toMatch(/correlations/)
    })

    it('개체별 무선효과(randomEffectsTable)가 표시되어야 함', () => {
      expect(fileContent).toMatch(/randomEffectsTable/)
    })

    it('절편 편차(intercept)가 표시되어야 함', () => {
      expect(fileContent).toMatch(/intercept/)
    })

    it('기울기 편차(slopes)가 표시되어야 함', () => {
      expect(fileContent).toMatch(/slopes/)
    })
  })

  describe('13. 분산 성분 (Variance Components)', () => {
    it('분산 성분(component)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/component/)
    })

    it('분산 비율(proportion)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/proportion/)
    })

    it('Z값(zValue)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/zValue/)
    })

    it('ICC가 표시되어야 함', () => {
      expect(fileContent).toMatch(/icc/)
    })
  })

  describe('14. 모형 적합도 (Model Fit)', () => {
    it('AIC가 표시되어야 함', () => {
      expect(fileContent).toMatch(/aic/)
    })

    it('BIC가 표시되어야 함', () => {
      expect(fileContent).toMatch(/bic/)
    })

    it('주변 R²(marginalRSquared)가 표시되어야 함', () => {
      expect(fileContent).toMatch(/marginalRSquared/)
    })

    it('조건부 R²(conditionalRSquared)가 표시되어야 함', () => {
      expect(fileContent).toMatch(/conditionalRSquared/)
    })

    it('Log-likelihood가 표시되어야 함', () => {
      expect(fileContent).toMatch(/logLikelihood/)
    })

    it('Deviance가 표시되어야 함', () => {
      expect(fileContent).toMatch(/deviance/)
    })
  })

  describe('15. 잔차 진단 (Residual Analysis)', () => {
    it('정규성 검정(normality)이 있어야 함', () => {
      expect(fileContent).toMatch(/normality/)
    })

    it('Shapiro-Wilk W가 표시되어야 함', () => {
      expect(fileContent).toMatch(/shapiroW/)
    })

    it('등분산성 검정(homoscedasticity)이 있어야 함', () => {
      expect(fileContent).toMatch(/homoscedasticity/)
    })

    it('Levene 통계량이 표시되어야 함', () => {
      expect(fileContent).toMatch(/leveneStatistic/)
    })

    it('독립성 검정(independence)이 있어야 함', () => {
      expect(fileContent).toMatch(/independence/)
    })

    it('Durbin-Watson이 표시되어야 함', () => {
      expect(fileContent).toMatch(/durbinWatson/)
    })

    it('가정 충족 여부(assumptionMet)가 표시되어야 함', () => {
      expect(fileContent).toMatch(/assumptionMet/)
    })
  })

  describe('16. 예측값과 잔차', () => {
    it('관측값(observation)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/observation/)
    })

    it('관측된 값(observed)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/observed/)
    })

    it('예측값(fitted)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/fitted/)
    })

    it('잔차(residual)가 표시되어야 함', () => {
      expect(fileContent).toMatch(/residual/)
    })

    it('표준화 잔차(standardizedResidual)가 표시되어야 함', () => {
      expect(fileContent).toMatch(/standardizedResidual/)
    })
  })

  describe('17. 해석 (Interpretation)', () => {
    it('분석 요약(summary)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/summary/)
    })

    it('고정효과 해석(fixedEffectsInterpretation)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/fixedEffectsInterpretation/)
    })

    it('무선효과 해석(randomEffectsInterpretation)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/randomEffectsInterpretation/)
    })

    it('분산 설명(varianceExplained)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/varianceExplained/)
    })

    it('권장사항(recommendations)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/recommendations/)
    })
  })

  describe('18. StepCard 제거 확인', () => {
    it('StepCard를 사용하지 않아야 함', () => {
      expect(fileContent).not.toMatch(/StepCard/)
    })
  })

  describe('19. 변수 선택 검증', () => {
    it('dependent_var를 전달해야 함', () => {
      expect(fileContent).toMatch(/dependent_var/)
    })

    it('fixed_effects를 전달해야 함', () => {
      expect(fileContent).toMatch(/fixed_effects/)
    })

    it('random_effects를 전달해야 함', () => {
      expect(fileContent).toMatch(/random_effects/)
    })

    it('blocking 변수를 사용해야 함 (random effects)', () => {
      expect(fileContent).toMatch(/blocking/)
    })
  })
})

describe('Batch 4-16: 코드 품질 체크', () => {
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
