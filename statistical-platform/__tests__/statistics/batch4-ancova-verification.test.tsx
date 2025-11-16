/**
 * Batch 4-8: ancova 페이지 마이그레이션 검증 테스트
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

const PAGE_PATH = join(process.cwd(), 'app/(dashboard)/statistics/ancova/page.tsx')

describe('Batch 4-8: ancova 페이지 마이그레이션 검증', () => {
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
  })

  describe('5. 백업 파일', () => {
    it('page.tsx.backup 파일이 존재해야 함', () => {
      const backupPath = join(process.cwd(), 'app/(dashboard)/statistics/ancova/page.tsx.backup')
      expect(() => readFileSync(backupPath, 'utf-8')).not.toThrow()
    })
  })

  describe('6. TypeScript 타입 안전성', () => {
    it('ANCOVAResult 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface ANCOVAResult/)
    })

    it('ANCOVAVariables를 import 해야 함', () => {
      expect(fileContent).toMatch(/ANCOVAVariables/)
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

    it('Worker 2를 호출해야 함 (ancova_analysis)', () => {
      expect(fileContent).toMatch(/callWorkerMethod[\s\S]{0,200}2/)
    })

    it('ancova_analysis 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]ancova_analysis['"]/)
    })
  })

  describe('8. ANCOVA 특화 기능', () => {
    it('VariableSelectorModern을 사용해야 함 (복잡한 구조)', () => {
      expect(fileContent).toMatch(/VariableSelectorModern/)
    })

    it('수정된 평균(adjustedMeans)이 결과에 포함되어야 함', () => {
      expect(fileContent).toMatch(/adjustedMeans/)
    })

    it('공변량(covariates) 효과가 결과에 포함되어야 함', () => {
      expect(fileContent).toMatch(/covariates/)
    })

    it('회귀직선 동질성 검정이 포함되어야 함', () => {
      expect(fileContent).toMatch(/homogeneityOfSlopes/)
    })

    it('공변량 선형성 검정이 포함되어야 함', () => {
      expect(fileContent).toMatch(/linearityOfCovariate/)
    })

    it('부분 에타제곱(partialEtaSquared)이 포함되어야 함', () => {
      expect(fileContent).toMatch(/partialEtaSquared/)
    })

    it('사후검정(postHoc)이 포함되어야 함', () => {
      expect(fileContent).toMatch(/postHoc/)
    })
  })

  describe('9. Step별 렌더링', () => {
    it('Step 0: renderMethodIntroduction 호출', () => {
      expect(fileContent).toMatch(/currentStep === 0 && renderMethodIntroduction\(\)/)
    })

    it('Step 1: 데이터 업로드', () => {
      expect(fileContent).toMatch(/currentStep === 1 &&/)
    })

    it('Step 2: 변수 선택', () => {
      expect(fileContent).toMatch(/currentStep === 2 &&/)
    })

    it('Step 3: 결과 확인', () => {
      expect(fileContent).toMatch(/currentStep === 3 &&/)
    })
  })

  describe('10. 가정 검정', () => {
    it('등분산성 검정(Levene)이 포함되어야 함', () => {
      expect(fileContent).toMatch(/homogeneityOfVariance/)
      expect(fileContent).toMatch(/leveneStatistic/)
    })

    it('정규성 검정(Shapiro-Wilk)이 포함되어야 함', () => {
      expect(fileContent).toMatch(/normalityOfResiduals/)
      expect(fileContent).toMatch(/shapiroW/)
    })

    it('가정 만족 여부를 표시해야 함', () => {
      expect(fileContent).toMatch(/assumptionMet/)
    })
  })

  describe('11. 탭 구조', () => {
    it('수정된 평균 탭이 있어야 함', () => {
      expect(fileContent).toMatch(/value="means"/)
      expect(fileContent).toMatch(/수정된 평균/)
    })

    it('ANCOVA 결과 탭이 있어야 함', () => {
      expect(fileContent).toMatch(/value="anova"/)
      expect(fileContent).toMatch(/ANCOVA 결과/)
    })

    it('사후검정 탭이 있어야 함', () => {
      expect(fileContent).toMatch(/value="posthoc"/)
      expect(fileContent).toMatch(/사후검정/)
    })

    it('가정검정 탭이 있어야 함', () => {
      expect(fileContent).toMatch(/value="assumptions"/)
      expect(fileContent).toMatch(/가정 검정/)
    })

    it('해석 탭이 있어야 함', () => {
      expect(fileContent).toMatch(/value="interpretation"/)
      expect(fileContent).toMatch(/결과 해석/)
    })
  })
})

describe('Batch 4-8: 코드 품질 체크', () => {
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
