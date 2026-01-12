/**
 * Batch 4-12: pca 페이지 마이그레이션 검증 테스트
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

const PAGE_PATH = join(process.cwd(), 'app/(dashboard)/statistics/pca/page.tsx')

describe('Batch 4-12: pca 페이지 마이그레이션 검증', () => {
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
      expect(fileContent).toMatch(/analysisTitle="주성분분석 \(PCA\)"/)
    })

    it('analysisSubtitle을 전달해야 함', () => {
      expect(fileContent).toMatch(/analysisSubtitle="Principal Component Analysis"/)
    })
  })


  describe('6. TypeScript 타입 안전성', () => {
    it('PCAResult 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface PCAResult/)
    })

    it('PCAVariables를 import 해야 함', () => {
      expect(fileContent).toMatch(/PCAVariables/)
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

    it('Worker 4를 호출해야 함 (pca_analysis)', () => {
      expect(fileContent).toMatch(/\/\/\s*Call Worker 4|\/\/\s*Worker 4/)
    })

    it('pca_analysis 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]pca_analysis['"]/)
    })
  })

  describe('8. PCA 특화 기능', () => {
    it('VariableSelectorModern을 사용해야 함', () => {
      expect(fileContent).toMatch(/VariableSelectorModern/)
    })

    it('고유값(eigenvalue)이 결과에 포함되어야 함', () => {
      expect(fileContent).toMatch(/eigenvalue/)
    })

    it('분산설명력(varianceExplained)이 포함되어야 함', () => {
      expect(fileContent).toMatch(/varianceExplained/)
    })

    it('누적분산(cumulativeVariance)이 포함되어야 함', () => {
      expect(fileContent).toMatch(/cumulativeVariance/)
    })

    it('적재값(loadings)이 포함되어야 함', () => {
      expect(fileContent).toMatch(/loadings/)
    })

    it('KMO 측도가 포함되어야 함', () => {
      expect(fileContent).toMatch(/kmo|KMO/)
    })

    it('Bartlett 검정이 포함되어야 함', () => {
      expect(fileContent).toMatch(/bartlett|Bartlett/)
    })

    it('Scree plot 데이터가 포함되어야 함', () => {
      expect(fileContent).toMatch(/scree|Scree/)
    })
  })

  describe('9. Step별 렌더링', () => {
    it('Step 0: renderMethodIntroduction 호출', () => {
      expect(fileContent).toMatch(/currentStep === 0 && renderMethodIntroduction\(\)/)
    })

    it('Step 1: 데이터 업로드', () => {
      expect(fileContent).toMatch(/currentStep === 1 && renderDataUpload\(\)/)
    })

    it('Step 2: 변수 선택', () => {
      expect(fileContent).toMatch(/currentStep === 2 && renderVariableSelection\(\)/)
    })

    it('Step 3: 결과 확인', () => {
      expect(fileContent).toMatch(/currentStep === 3 && renderResults\(\)/)
    })
  })

  describe('10. 주성분 추출', () => {
    it('Kaiser 기준이 적용되어야 함 (고유값 > 1)', () => {
      expect(fileContent).toMatch(/Kaiser/)
    })

    it('선택된 주성분 개수가 표시되어야 함', () => {
      expect(fileContent).toMatch(/selectedComponents/)
    })

    it('주성분 번호가 표시되어야 함 (PC1, PC2 등)', () => {
      expect(fileContent).toMatch(/PC\d+|componentNumber/)
    })
  })

  describe('11. 변환 데이터', () => {
    it('변환된 데이터(transformedData)가 포함되어야 함', () => {
      expect(fileContent).toMatch(/transformedData/)
    })

    it('변수 기여도(variableContributions)가 포함되어야 함', () => {
      expect(fileContent).toMatch(/variableContributions/)
    })
  })

  describe('12. 적합도 평가', () => {
    it('KMO 측도 해석 기준이 있어야 함', () => {
      expect(fileContent).toMatch(/우수|보통|부족/)
    })

    it('Bartlett 검정 유의성 판정이 있어야 함', () => {
      expect(fileContent).toMatch(/significant/)
    })
  })
})

describe('Batch 4-12: 코드 품질 체크', () => {
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

  it('StepCard를 사용하지 않아야 함', () => {
    expect(fileContent).not.toMatch(/StepCard/)
  })
})
