/**
 * Batch 4-1: cluster 페이지 마이그레이션 검증 테스트
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

const PAGE_PATH = join(process.cwd(), 'app/(dashboard)/statistics/cluster/page.tsx')

describe('Batch 4-1: cluster 페이지 마이그레이션 검증', () => {
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
    it('handleVariableSelect는 setCurrentStep을 호출하지 않아야 함', () => {
      const handlerMatch = fileContent.match(/const handleVariableSelect = useCallback\(([\s\S]*?)\}, \[/)
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
      expect(fileContent).toMatch(/onClick=\{[^}]*handleVariableSelect/)
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

    it('handleVariableSelect는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleVariableSelect = useCallback/)
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
    it('ClusterVariables 타입을 사용해야 함 (types/statistics.ts에 정의)', () => {
      expect(fileContent).toMatch(/ClusterVariables/)
    })

    it('Alert 컴포넌트로 변수 선택 안내가 있어야 함 (또는 설명 텍스트)', () => {
      const hasAlert = fileContent.includes('최소 2개 이상의 변수')
      const hasDescription = fileContent.includes('군집분석에 사용할')
      expect(hasAlert || hasDescription).toBe(true)
    })

    it('"다음 단계" 버튼이 있어야 함', () => {
      expect(fileContent).toMatch(/onClick=\{handleNextStep\}/)
    })
  })

  describe('8. 백업 파일', () => {
    it('page.tsx.backup 파일이 존재해야 함', () => {
      const backupPath = join(process.cwd(), 'app/(dashboard)/statistics/cluster/page.tsx.backup')
      expect(() => readFileSync(backupPath, 'utf-8')).not.toThrow()
    })
  })

  describe('9. TypeScript 타입 안전성', () => {
    it('ClusterVariables 타입을 import 해야 함', () => {
      expect(fileContent).toMatch(/import type \{ ClusterVariables \}/)
    })

    it('ClusterAnalysisResult 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface ClusterAnalysisResult/)
    })

    it('useStatisticsPage에 타입 파라미터를 전달해야 함', () => {
      expect(fileContent).toMatch(/useStatisticsPage<ClusterAnalysisResult, ClusterVariables>/)
    })

    it('onStepChange에 타입 명시가 있어야 함', () => {
      expect(fileContent).toMatch(/\(step: number\)/)
    })
  })

  describe('10. PyodideCore 통합', () => {
    it('PyodideCoreService를 동적 import 해야 함', () => {
      expect(fileContent).toMatch(/PyodideCoreService/)
    })

    it('Worker 4를 호출해야 함 (ml)', () => {
      expect(fileContent).toMatch(/callWorkerMethod[\s\S]{0,200}4/)
    })

    it('cluster_analysis 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]cluster_analysis['"]/)
    })
  })

  describe('11. Cluster Analysis 특화 기능', () => {
    it('Select 컴포넌트를 사용해야 함 (군집분석 방법 선택)', () => {
      expect(fileContent).toMatch(/<Select/)
    })

    it('군집 방법 옵션이 있어야 함 (K-means, Hierarchical)', () => {
      expect(fileContent).toMatch(/kmeans/)
      expect(fileContent).toMatch(/hierarchical/)
    })

    it('군집 수 설정이 있어야 함', () => {
      expect(fileContent).toMatch(/numClusters/)
    })

    it('최적 군집 수 자동 결정 옵션이 있어야 함', () => {
      expect(fileContent).toMatch(/autoOptimalK/)
    })

    it('계층적 군집분석 옵션이 있어야 함 (연결 방법, 거리 측정법)', () => {
      expect(fileContent).toMatch(/linkageMethod/)
      expect(fileContent).toMatch(/distanceMetric/)
    })
  })
})

describe('Batch 4-1: 코드 품질 체크', () => {
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
