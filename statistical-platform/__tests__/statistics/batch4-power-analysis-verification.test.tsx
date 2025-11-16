/**
 * Batch 4-3: power-analysis 페이지 마이그레이션 검증 테스트
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

const PAGE_PATH = join(process.cwd(), 'app/(dashboard)/statistics/power-analysis/page.tsx')

describe('Batch 4-3: power-analysis 페이지 마이그레이션 검증', () => {
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

    it('updateConfig는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const updateConfig = useCallback/)
    })

    it('handleAnalysis는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const handleAnalysis = useCallback/)
    })

    it('renderResultsTable는 useCallback을 사용해야 함', () => {
      expect(fileContent).toMatch(/const renderResultsTable = useCallback/)
    })
  })

  describe('3. 0-based indexing', () => {
    it('initialStep: 0을 사용해야 함', () => {
      expect(fileContent).toMatch(/initialStep: 0/)
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
  })

  describe('5. 백업 파일', () => {
    it('page.tsx.backup 파일이 존재해야 함', () => {
      const backupPath = join(process.cwd(), 'app/(dashboard)/statistics/power-analysis/page.tsx.backup')
      expect(() => readFileSync(backupPath, 'utf-8')).not.toThrow()
    })
  })

  describe('6. TypeScript 타입 안전성', () => {
    it('PowerAnalysisResult 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface PowerAnalysisResult/)
    })

    it('PowerAnalysisConfig 인터페이스가 있어야 함', () => {
      expect(fileContent).toMatch(/interface PowerAnalysisConfig/)
    })

    it('useStatisticsPage에 타입 파라미터를 전달해야 함', () => {
      expect(fileContent).toMatch(/useStatisticsPage<PowerAnalysisResult, never>/)
    })

    it('onStepChange에 타입 명시가 있어야 함', () => {
      expect(fileContent).toMatch(/\(step: number\)/)
    })
  })

  describe('7. PyodideCore 통합', () => {
    it('PyodideCoreService를 import 해야 함', () => {
      expect(fileContent).toMatch(/PyodideCoreService/)
    })

    it('Worker 2를 호출해야 함 (hypothesis)', () => {
      expect(fileContent).toMatch(/callWorkerMethod[\s\S]{0,200}2/)
    })

    it('power_analysis 메서드를 호출해야 함', () => {
      expect(fileContent).toMatch(/['"]power_analysis['"]/)
    })
  })

  describe('8. Power Analysis 특화 기능', () => {
    it('검정 유형 선택이 있어야 함 (t-test, ANOVA, etc)', () => {
      expect(fileContent).toMatch(/t-test/)
      expect(fileContent).toMatch(/anova/)
    })

    it('분석 유형 선택이 있어야 함 (a-priori, post-hoc, etc)', () => {
      expect(fileContent).toMatch(/a-priori/)
      expect(fileContent).toMatch(/post-hoc/)
    })

    it('모수 설정이 있어야 함 (alpha, power, effect size, sample size)', () => {
      expect(fileContent).toMatch(/alpha/)
      expect(fileContent).toMatch(/power/)
      expect(fileContent).toMatch(/effectSize/)
      expect(fileContent).toMatch(/sampleSize/)
    })

    it('통계 테이블 컴포넌트를 사용해야 함', () => {
      expect(fileContent).toMatch(/StatisticsTable/)
    })
  })

  describe('9. 불필요한 핸들러 제거', () => {
    it('handleStepChange는 제거되어야 함 (TwoPanelLayout이 처리)', () => {
      expect(fileContent).not.toMatch(/const handleStepChange/)
    })

    it('handleReset은 제거되어야 함 (불필요)', () => {
      expect(fileContent).not.toMatch(/const handleReset/)
    })
  })
})

describe('Batch 4-3: 코드 품질 체크', () => {
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
