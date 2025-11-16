/**
 * Batch 4-13: non-parametric 페이지 마이그레이션 검증 테스트
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

const PAGE_PATH = join(process.cwd(), 'app/(dashboard)/statistics/non-parametric/page.tsx')

describe('Batch 4-13: non-parametric 페이지 마이그레이션 검증', () => {
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
      expect(fileContent).toMatch(/analysisTitle="비모수 검정"/)
    })

    it('analysisSubtitle을 전달해야 함', () => {
      expect(fileContent).toMatch(/analysisSubtitle="Non-Parametric Tests"/)
    })
  })

  describe('5. 백업 파일', () => {
    it('page.tsx.backup 파일이 존재해야 함', () => {
      const backupPath = join(process.cwd(), 'app/(dashboard)/statistics/non-parametric/page.tsx.backup')
      expect(() => readFileSync(backupPath, 'utf-8')).not.toThrow()
    })
  })

  describe('6. TypeScript 타입 안전성', () => {
    it('NonParametricVariables를 import 해야 함', () => {
      expect(fileContent).toMatch(/NonParametricVariables/)
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

    it('Worker 3을 호출해야 함 (비모수 검정)', () => {
      expect(fileContent).toMatch(/3,/)
    })

    it('mann_whitney_test 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]mann_whitney_test['"]/)
    })

    it('wilcoxon_test 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]wilcoxon_test['"]/)
    })

    it('kruskal_wallis_test 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]kruskal_wallis_test['"]/)
    })

    it('friedman_test 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]friedman_test['"]/)
    })
  })

  describe('8. 비모수 검정 4가지 타입', () => {
    it('mann-whitney 타입이 정의되어 있어야 함', () => {
      expect(fileContent).toMatch(/'mann-whitney'/)
    })

    it('wilcoxon 타입이 정의되어 있어야 함', () => {
      expect(fileContent).toMatch(/'wilcoxon'/)
    })

    it('kruskal-wallis 타입이 정의되어 있어야 함', () => {
      expect(fileContent).toMatch(/'kruskal-wallis'/)
    })

    it('friedman 타입이 정의되어 있어야 함', () => {
      expect(fileContent).toMatch(/'friedman'/)
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

  describe('10. Worker 결과 타입', () => {
    it('MannWhitneyResult 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface MannWhitneyResult/)
    })

    it('WilcoxonResult 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface WilcoxonResult/)
    })

    it('KruskalWallisResult 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface KruskalWallisResult/)
    })

    it('FriedmanResult 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface FriedmanResult/)
    })
  })

  describe('11. 통계 결과 변환', () => {
    it('transformToStatisticalResult 함수가 있어야 함', () => {
      expect(fileContent).toMatch(/const transformToStatisticalResult = useCallback/)
    })

    it('통계량 이름이 올바르게 매핑되어야 함', () => {
      expect(fileContent).toMatch(/'U'/)  // Mann-Whitney
      expect(fileContent).toMatch(/'W'/)  // Wilcoxon
      expect(fileContent).toMatch(/'H'/)  // Kruskal-Wallis
      expect(fileContent).toMatch(/'χ²'/) // Friedman
    })
  })

  describe('12. Wilcoxon 특화 결과', () => {
    it('descriptives 데이터가 포함되어야 함', () => {
      expect(fileContent).toMatch(/descriptives/)
    })

    it('before, after, differences 데이터가 포함되어야 함', () => {
      expect(fileContent).toMatch(/before/)
      expect(fileContent).toMatch(/after/)
      expect(fileContent).toMatch(/differences/)
    })

    it('중앙값(median), 평균(mean), IQR이 포함되어야 함', () => {
      expect(fileContent).toMatch(/median/)
      expect(fileContent).toMatch(/mean/)
      expect(fileContent).toMatch(/iqr/)
    })

    it('효과크기(effectSize)가 포함되어야 함', () => {
      expect(fileContent).toMatch(/effectSize/)
    })
  })

  describe('13. 검정 방법 선택 UI', () => {
    it('RadioGroup을 사용해야 함', () => {
      expect(fileContent).toMatch(/RadioGroup/)
    })

    it('selectedTest state가 있어야 함', () => {
      expect(fileContent).toMatch(/selectedTest/)
    })

    it('testDescriptions 객체가 있어야 함', () => {
      expect(fileContent).toMatch(/testDescriptions/)
    })

    it('모수 대응 검정 정보가 있어야 함', () => {
      expect(fileContent).toMatch(/parametric_equivalent/)
    })
  })

  describe('14. 가정 확인', () => {
    it('AssumptionTestCard를 사용해야 함', () => {
      expect(fileContent).toMatch(/AssumptionTestCard/)
    })

    it('독립성 가정이 있어야 함', () => {
      expect(fileContent).toMatch(/독립성/)
    })

    it('측정 수준 가정이 있어야 함', () => {
      expect(fileContent).toMatch(/측정 수준/)
    })

    it('검정별 고려사항이 있어야 함', () => {
      expect(fileContent).toMatch(/고려사항/)
    })
  })

  describe('15. 데이터 그룹 처리', () => {
    it('그룹별 데이터 분리 로직이 있어야 함', () => {
      expect(fileContent).toMatch(/groups: Record<string, number\[\]>/)
    })

    it('그룹 개수 검증이 있어야 함', () => {
      expect(fileContent).toMatch(/groupKeys\.length/)
    })

    it('그룹 배열 변환이 있어야 함', () => {
      expect(fileContent).toMatch(/groupArrays/)
    })
  })

  describe('16. Tabs 제거 확인', () => {
    it('Tabs 컴포넌트를 사용하지 않아야 함', () => {
      expect(fileContent).not.toMatch(/<Tabs/)
    })

    it('TabsContent를 사용하지 않아야 함', () => {
      expect(fileContent).not.toMatch(/<TabsContent/)
    })

    it('TabsList를 사용하지 않아야 함', () => {
      expect(fileContent).not.toMatch(/<TabsList/)
    })
  })
})

describe('Batch 4-13: 코드 품질 체크', () => {
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

  it('activeTab state를 사용하지 않아야 함 (Tabs 제거)', () => {
    expect(fileContent).not.toMatch(/\[activeTab, setActiveTab\]/)
  })
})
