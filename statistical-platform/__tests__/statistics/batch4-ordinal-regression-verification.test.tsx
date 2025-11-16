/**
 * Batch 4-14: ordinal-regression 페이지 마이그레이션 검증 테스트
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

const PAGE_PATH = join(process.cwd(), 'app/(dashboard)/statistics/ordinal-regression/page.tsx')

describe('Batch 4-14: ordinal-regression 페이지 마이그레이션 검증', () => {
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
      expect(fileContent).toMatch(/analysisTitle="서열 회귀분석"/)
    })

    it('analysisSubtitle을 전달해야 함', () => {
      expect(fileContent).toMatch(/analysisSubtitle="Ordinal Regression"/)
    })
  })

  describe('5. 백업 파일', () => {
    it('page.tsx.backup 파일이 존재해야 함', () => {
      const backupPath = join(process.cwd(), 'app/(dashboard)/statistics/ordinal-regression/page.tsx.backup')
      expect(() => readFileSync(backupPath, 'utf-8')).not.toThrow()
    })
  })

  describe('6. TypeScript 타입 안전성', () => {
    it('OrdinalRegressionResult 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface OrdinalRegressionResult/)
    })

    it('OrdinalRegressionVariables를 import 해야 함', () => {
      expect(fileContent).toMatch(/OrdinalRegressionVariables/)
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

    it('Worker 2를 호출해야 함 (ordinal_regression)', () => {
      expect(fileContent).toMatch(/\/\/\s*Call Worker 2|\/\/\s*Worker 2/)
    })

    it('ordinal_regression 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]ordinal_regression['"]/)
    })
  })

  describe('8. Ordinal Regression 특화 기능', () => {
    it('모델 정보가 있어야 함', () => {
      expect(fileContent).toMatch(/model_info/)
    })

    it('계수(coefficients)가 있어야 함', () => {
      expect(fileContent).toMatch(/coefficients/)
    })

    it('임계값(thresholds)이 있어야 함', () => {
      expect(fileContent).toMatch(/thresholds/)
    })

    it('비례 오즈 가정(proportional_odds)이 있어야 함', () => {
      expect(fileContent).toMatch(/proportional_odds/)
    })

    it('다중공선성(multicollinearity)이 있어야 함', () => {
      expect(fileContent).toMatch(/multicollinearity/)
    })

    it('예측 확률(predicted_probabilities)이 있어야 함', () => {
      expect(fileContent).toMatch(/predicted_probabilities/)
    })

    it('분류 지표(classification_metrics)가 있어야 함', () => {
      expect(fileContent).toMatch(/classification_metrics/)
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
    it('6개 탭이 있어야 함 (overview, coefficients, thresholds, assumptions, predictions, interpretation)', () => {
      expect(fileContent).toMatch(/value="overview"/)
      expect(fileContent).toMatch(/value="coefficients"/)
      expect(fileContent).toMatch(/value="thresholds"/)
      expect(fileContent).toMatch(/value="assumptions"/)
      expect(fileContent).toMatch(/value="predictions"/)
      expect(fileContent).toMatch(/value="interpretation"/)
    })

    it('TabsList는 6칸으로 나누어야 함', () => {
      expect(fileContent).toMatch(/grid-cols-6/)
    })
  })

  describe('11. 모델 적합도 지표', () => {
    it('AIC가 표시되어야 함', () => {
      expect(fileContent).toMatch(/AIC/)
    })

    it('BIC가 표시되어야 함', () => {
      expect(fileContent).toMatch(/BIC/)
    })

    it('McFadden R²가 표시되어야 함', () => {
      expect(fileContent).toMatch(/McFadden/)
    })

    it('Nagelkerke R²가 표시되어야 함', () => {
      expect(fileContent).toMatch(/Nagelkerke/)
    })
  })

  describe('12. 오즈비 표시', () => {
    it('오즈비(odds_ratio)가 표시되어야 함', () => {
      expect(fileContent).toMatch(/odds_ratio/)
    })

    it('오즈비 신뢰구간이 표시되어야 함', () => {
      expect(fileContent).toMatch(/or_ci_lower/)
      expect(fileContent).toMatch(/or_ci_upper/)
    })

    it('오즈비 시각화(BarChart)가 있어야 함', () => {
      expect(fileContent).toMatch(/BarChart/)
    })
  })

  describe('13. 비례 오즈 가정 검정', () => {
    it('test_name이 표시되어야 함', () => {
      expect(fileContent).toMatch(/test_name/)
    })

    it('test_statistic이 표시되어야 함', () => {
      expect(fileContent).toMatch(/test_statistic/)
    })

    it('assumption_met이 판정되어야 함', () => {
      expect(fileContent).toMatch(/assumption_met/)
    })
  })

  describe('14. 다중공선성 진단', () => {
    it('VIF가 표시되어야 함', () => {
      expect(fileContent).toMatch(/vif/)
    })

    it('Tolerance가 표시되어야 함', () => {
      expect(fileContent).toMatch(/tolerance/)
    })

    it('VIF 판정 기준이 있어야 함 (5, 10)', () => {
      expect(fileContent).toMatch(/vif < 5/)
      expect(fileContent).toMatch(/vif < 10/)
    })
  })

  describe('15. 예측 및 분류', () => {
    it('혼동 행렬(confusion_matrix)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/confusion_matrix/)
    })

    it('정밀도(precision)가 표시되어야 함', () => {
      expect(fileContent).toMatch(/precision/)
    })

    it('재현율(recall)이 표시되어야 함', () => {
      expect(fileContent).toMatch(/recall/)
    })

    it('F1-점수(f1_score)가 표시되어야 함', () => {
      expect(fileContent).toMatch(/f1_score/)
    })

    it('전체 정확도(accuracy)가 표시되어야 함', () => {
      expect(fileContent).toMatch(/accuracy/)
    })
  })

  describe('16. StepCard 제거 확인', () => {
    it('StepCard를 사용하지 않아야 함', () => {
      expect(fileContent).not.toMatch(/StepCard/)
    })
  })
})

describe('Batch 4-14: 코드 품질 체크', () => {
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
