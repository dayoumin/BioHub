/**
 * Batch 4-17: regression 페이지 마이그레이션 검증 테스트
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

const PAGE_PATH = join(process.cwd(), 'app/(dashboard)/statistics/regression/page.tsx')

describe('Batch 4-17: regression 페이지 마이그레이션 검증', () => {
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

    it('regressionTypeInfo는 useMemo를 사용해야 함', () => {
      expect(fileContent).toMatch(/const regressionTypeInfo = useMemo\(\(\) => \({/)
    })

    it('extractRowValue는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const extractRowValue = useCallback/)
    })

    it('handleSimpleRegression은 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleSimpleRegression = useCallback/)
    })

    it('handleMultipleRegression은 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleMultipleRegression = useCallback/)
    })

    it('handleLogisticRegression은 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleLogisticRegression = useCallback/)
    })

    it('handleMethodSelect는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleMethodSelect = useCallback/)
    })

    it('handleDataUpload는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleDataUpload = useCallback/)
    })

    it('handleVariableSelection은 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleVariableSelection = useCallback/)
    })

    it('handleAnalysis는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleAnalysis = useCallback/)
    })

    it('renderMethodSelection은 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderMethodSelection = useCallback/)
    })

    it('renderDataUpload는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderDataUpload = useCallback/)
    })

    it('renderVariableSelection은 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderVariableSelection = useCallback/)
    })

    it('renderLinearResults는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderLinearResults = useCallback/)
    })

    it('renderLogisticResults는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderLogisticResults = useCallback/)
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
      expect(fileContent).toMatch(/onStepChange=\{\(step: number\) => actions\?\.setCurrentStep\?\.\(step\)\}/)
    })

    it('bottomPreview prop을 전달해야 함', () => {
      expect(fileContent).toMatch(/bottomPreview=\{uploadedData && currentStep >= 1/)
    })

    it('analysisTitle을 전달해야 함', () => {
      expect(fileContent).toMatch(/analysisTitle="회귀분석"/)
    })

    it('analysisSubtitle을 전달해야 함', () => {
      expect(fileContent).toMatch(/analysisSubtitle="Regression Analysis"/)
    })
  })

  describe('5. 백업 파일', () => {
    it('page.tsx.backup 파일이 존재해야 함', () => {
      const backupPath = join(process.cwd(), 'app/(dashboard)/statistics/regression/page.tsx.backup')
      expect(() => readFileSync(backupPath, 'utf-8')).not.toThrow()
    })
  })

  describe('6. TypeScript 타입 안전성', () => {
    it('LinearRegressionResults 타입이 있어야 함', () => {
      expect(fileContent).toMatch(/type LinearRegressionResults/)
    })

    it('LogisticRegressionResults 타입이 있어야 함', () => {
      expect(fileContent).toMatch(/type LogisticRegressionResults/)
    })

    it('RegressionResults 타입이 있어야 함', () => {
      expect(fileContent).toMatch(/type RegressionResults/)
    })

    it('RegressionVariables를 import 해야 함', () => {
      expect(fileContent).toMatch(/RegressionVariables/)
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

    it('Worker 4를 호출해야 함 (regression)', () => {
      expect(fileContent).toMatch(/4,/)
    })

    it('linear_regression 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]linear_regression['"]/)
    })

    it('multiple_regression 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]multiple_regression['"]/)
    })

    it('logistic_regression 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]logistic_regression['"]/)
    })
  })

  describe('8. 회귀분석 3가지 타입', () => {
    it('simple 타입이 정의되어 있어야 함', () => {
      expect(fileContent).toMatch(/simple/)
    })

    it('multiple 타입이 정의되어 있어야 함', () => {
      expect(fileContent).toMatch(/multiple/)
    })

    it('logistic 타입이 정의되어 있어야 함', () => {
      expect(fileContent).toMatch(/logistic/)
    })

    it('regressionType state가 있어야 함', () => {
      expect(fileContent).toMatch(/regressionType/)
    })
  })

  describe('9. Step별 렌더링', () => {
    it('Step 0: renderMethodSelection 호출', () => {
      expect(fileContent).toMatch(/currentStep === 0 && renderMethodSelection\(\)/)
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

  describe('10. 회귀 유형별 정보', () => {
    it('단순 선형 회귀 정보가 있어야 함', () => {
      expect(fileContent).toMatch(/단순 선형 회귀/)
    })

    it('다중 회귀분석 정보가 있어야 함', () => {
      expect(fileContent).toMatch(/다중 회귀분석/)
    })

    it('로지스틱 회귀 정보가 있어야 함', () => {
      expect(fileContent).toMatch(/로지스틱 회귀/)
    })

    it('equation 정보가 있어야 함', () => {
      expect(fileContent).toMatch(/equation/)
    })

    it('assumptions 정보가 있어야 함', () => {
      expect(fileContent).toMatch(/assumptions/)
    })
  })

  describe('11. Linear Regression 결과', () => {
    it('coefficients가 표시되어야 함', () => {
      expect(fileContent).toMatch(/coefficients/)
    })

    it('rSquared가 표시되어야 함', () => {
      expect(fileContent).toMatch(/rSquared/)
    })

    it('adjustedRSquared가 표시되어야 함', () => {
      expect(fileContent).toMatch(/adjustedRSquared/)
    })

    it('fStatistic이 표시되어야 함', () => {
      expect(fileContent).toMatch(/fStatistic/)
    })

    it('residualStdError가 표시되어야 함', () => {
      expect(fileContent).toMatch(/residualStdError/)
    })

    it('scatterData가 있어야 함 (simple)', () => {
      expect(fileContent).toMatch(/scatterData/)
    })

    it('residualPlot이 있어야 함', () => {
      expect(fileContent).toMatch(/residualPlot/)
    })

    it('vif가 있어야 함 (multiple)', () => {
      expect(fileContent).toMatch(/vif/)
    })
  })

  describe('12. Logistic Regression 결과', () => {
    it('modelFit이 표시되어야 함', () => {
      expect(fileContent).toMatch(/modelFit/)
    })

    it('confusionMatrix가 표시되어야 함', () => {
      expect(fileContent).toMatch(/confusionMatrix/)
    })

    it('rocCurve가 표시되어야 함', () => {
      expect(fileContent).toMatch(/rocCurve/)
    })

    it('oddsRatio가 표시되어야 함', () => {
      expect(fileContent).toMatch(/oddsRatio/)
    })

    it('accuracy가 표시되어야 함', () => {
      expect(fileContent).toMatch(/accuracy/)
    })

    it('auc가 표시되어야 함', () => {
      expect(fileContent).toMatch(/auc/)
    })

    it('sensitivity가 표시되어야 함', () => {
      expect(fileContent).toMatch(/sensitivity/)
    })

    it('specificity가 표시되어야 함', () => {
      expect(fileContent).toMatch(/specificity/)
    })
  })

  describe('13. StatisticsTable 사용', () => {
    it('StatisticsTable 컴포넌트를 import 해야 함', () => {
      expect(fileContent).toMatch(/StatisticsTable/)
    })

    it('회귀계수 테이블에 사용해야 함', () => {
      expect(fileContent).toMatch(/회귀계수 및 통계적 유의성/)
    })

    it('로지스틱 회귀계수 테이블에 사용해야 함', () => {
      expect(fileContent).toMatch(/로지스틱 회귀계수 및 오즈비/)
    })
  })

  describe('14. 차트 라이브러리', () => {
    it('Recharts를 사용해야 함', () => {
      expect(fileContent).toMatch(/ResponsiveContainer/)
    })

    it('ScatterChart를 사용해야 함', () => {
      expect(fileContent).toMatch(/ScatterChart/)
    })

    it('ComposedChart를 사용해야 함', () => {
      expect(fileContent).toMatch(/ComposedChart/)
    })

    it('RechartsLineChart를 사용해야 함 (ROC curve)', () => {
      expect(fileContent).toMatch(/RechartsLineChart/)
    })
  })

  describe('15. Framer Motion', () => {
    it('framer-motion을 import 해야 함', () => {
      expect(fileContent).toMatch(/from ['"]framer-motion['"]/)
    })

    it('motion.div를 사용해야 함', () => {
      expect(fileContent).toMatch(/motion\.div/)
    })

    it('whileHover 애니메이션이 있어야 함', () => {
      expect(fileContent).toMatch(/whileHover/)
    })

    it('whileTap 애니메이션이 있어야 함', () => {
      expect(fileContent).toMatch(/whileTap/)
    })
  })

  describe('16. StepCard 제거 확인', () => {
    it('StepCard를 사용하지 않아야 함', () => {
      expect(fileContent).not.toMatch(/StepCard/)
    })
  })

  describe('17. 데이터 처리', () => {
    it('extractRowValue 함수가 있어야 함', () => {
      expect(fileContent).toMatch(/extractRowValue/)
    })

    it('xData, yData 추출 로직이 있어야 함', () => {
      expect(fileContent).toMatch(/xData/)
      expect(fileContent).toMatch(/yData/)
    })

    it('XData (다중변수)가 있어야 함', () => {
      expect(fileContent).toMatch(/XData/)
    })
  })

  describe('18. 에러 처리', () => {
    it('에러 메시지를 표시해야 함', () => {
      expect(fileContent).toMatch(/error &&/)
    })

    it('최소 데이터 요구사항 검증이 있어야 함', () => {
      expect(fileContent).toMatch(/최소/)
    })
  })
})

describe('Batch 4-17: 코드 품질 체크', () => {
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
