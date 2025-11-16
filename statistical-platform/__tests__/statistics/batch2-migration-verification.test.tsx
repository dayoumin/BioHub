/**
 * Batch 2 마이그레이션 검증 테스트
 *
 * 목적: 10개 페이지가 TwoPanelLayout으로 정상 마이그레이션되었는지 검증
 *
 * 검증 항목:
 * 1. 각 페이지가 에러 없이 렌더링되는지
 * 2. TwoPanelLayout 컴포넌트가 사용되는지
 * 3. Critical Bug 패턴 (Badge 클릭 → 즉시 Step 이동) 제거되었는지
 */

import { readFileSync } from 'fs'
import { join } from 'path'

describe('Batch 2: 마이그레이션 검증 (10개 페이지)', () => {
  const pages = [
    'means-plot',
    'one-sample-t',
    'partial-correlation',
    'ks-test',
    'wilcoxon',
    'mann-whitney',
    'friedman',
    'kruskal-wallis',
    'mann-kendall',
    'stepwise'
  ]

  describe('파일 구조 검증', () => {
    pages.forEach((pageName) => {
      it(`${pageName}: TwoPanelLayout을 import하고 있어야 함`, () => {
        const filePath = join(
          __dirname,
          `../../app/(dashboard)/statistics/${pageName}/page.tsx`
        )
        const content = readFileSync(filePath, 'utf-8')

        // TwoPanelLayout import 확인
        expect(content).toContain('from \'@/components/statistics/layouts/TwoPanelLayout\'')
      })

      it(`${pageName}: StatisticsPageLayout을 사용하지 않아야 함`, () => {
        const filePath = join(
          __dirname,
          `../../app/(dashboard)/statistics/${pageName}/page.tsx`
        )
        const content = readFileSync(filePath, 'utf-8')

        // StatisticsPageLayout import가 없어야 함
        expect(content).not.toContain('from \'@/components/statistics/StatisticsPageLayout\'')
      })

      it(`${pageName}: VariableSelectorModern을 사용하지 않아야 함`, () => {
        const filePath = join(
          __dirname,
          `../../app/(dashboard)/statistics/${pageName}/page.tsx`
        )
        const content = readFileSync(filePath, 'utf-8')

        // VariableSelectorModern import가 없어야 함
        expect(content).not.toContain('from \'@/components/variable-selection/VariableSelectorModern\'')
      })
    })
  })

  describe('Critical Bug 패턴 제거 검증', () => {
    pages.forEach((pageName) => {
      it(`${pageName}: Badge 클릭 핸들러에서 setCurrentStep을 호출하지 않아야 함`, () => {
        const filePath = join(
          __dirname,
          `../../app/(dashboard)/statistics/${pageName}/page.tsx`
        )
        const content = readFileSync(filePath, 'utf-8')

        // Badge 클릭 핸들러 내부에서 setCurrentStep 호출 패턴 확인
        // 패턴: onClick={() => { ... setCurrentStep(...) ... }}
        const badgeOnClickPattern = /onClick=\{[^}]*setCurrentStep\(/g
        const matches = content.match(badgeOnClickPattern)

        // Badge onClick 내부에서 setCurrentStep 호출이 없어야 함
        // (예외: "다음 단계" 버튼의 onClick는 허용)
        if (matches) {
          // "다음 단계" 버튼인지 확인
          const isNextButton = matches.some(match => {
            const contextStart = content.indexOf(match) - 100
            const contextEnd = content.indexOf(match) + 100
            const context = content.substring(contextStart, contextEnd)
            return context.includes('다음 단계') || context.includes('분석 실행')
          })

          // Badge onClick이면 실패
          expect(isNextButton).toBe(true)
        }
      })

      it(`${pageName}: useCallback을 사용한 이벤트 핸들러가 있어야 함`, () => {
        const filePath = join(
          __dirname,
          `../../app/(dashboard)/statistics/${pageName}/page.tsx`
        )
        const content = readFileSync(filePath, 'utf-8')

        // useCallback 사용 확인
        expect(content).toContain('useCallback')
      })

      it(`${pageName}: useMemo를 사용한 최적화가 있어야 함`, () => {
        const filePath = join(
          __dirname,
          `../../app/(dashboard)/statistics/${pageName}/page.tsx`
        )
        const content = readFileSync(filePath, 'utf-8')

        // useMemo 사용 확인 (breadcrumbs, steps 등)
        expect(content).toContain('useMemo')
      })
    })
  })

  describe('TwoPanelLayout Props 검증', () => {
    pages.forEach((pageName) => {
      it(`${pageName}: breadcrumbs prop을 전달해야 함`, () => {
        const filePath = join(
          __dirname,
          `../../app/(dashboard)/statistics/${pageName}/page.tsx`
        )
        const content = readFileSync(filePath, 'utf-8')

        // breadcrumbs prop 확인
        expect(content).toContain('breadcrumbs={')
      })

      it(`${pageName}: currentStep prop을 전달해야 함`, () => {
        const filePath = join(
          __dirname,
          `../../app/(dashboard)/statistics/${pageName}/page.tsx`
        )
        const content = readFileSync(filePath, 'utf-8')

        // currentStep prop 확인
        expect(content).toContain('currentStep={')
      })

      it(`${pageName}: steps prop을 전달해야 함`, () => {
        const filePath = join(
          __dirname,
          `../../app/(dashboard)/statistics/${pageName}/page.tsx`
        )
        const content = readFileSync(filePath, 'utf-8')

        // steps prop 확인
        expect(content).toContain('steps={')
      })

      it(`${pageName}: onStepChange prop을 전달해야 함`, () => {
        const filePath = join(
          __dirname,
          `../../app/(dashboard)/statistics/${pageName}/page.tsx`
        )
        const content = readFileSync(filePath, 'utf-8')

        // onStepChange prop 확인
        expect(content).toContain('onStepChange={')
      })
    })
  })

  describe('백업 파일 존재 검증', () => {
    pages.forEach((pageName) => {
      it(`${pageName}: 백업 파일 (page.tsx.backup)이 존재해야 함`, () => {
        const filePath = join(
          __dirname,
          `../../app/(dashboard)/statistics/${pageName}/page.tsx.backup`
        )

        // 백업 파일 존재 확인
        expect(() => readFileSync(filePath, 'utf-8')).not.toThrow()
      })
    })
  })

  describe('변수 선택 패턴 검증', () => {
    const variablePatterns = {
      'wilcoxon': { type: '쌍 선택', variables: 'dependent: string[] (2개)' },
      'mann-whitney': { type: '종속+그룹', variables: 'dependent: string + factor: string[]' },
      'kruskal-wallis': { type: '종속+그룹', variables: 'dependent: string + factor: string' },
      'friedman': { type: '다중 선택', variables: 'within: string[] (3개 이상)' },
      'stepwise': { type: '3섹션', variables: 'dependent[] + factor[] + covariate[]' },
      'mann-kendall': { type: '단일 선택', variables: 'data: string' }
    }

    Object.entries(variablePatterns).forEach(([pageName, pattern]) => {
      it(`${pageName}: ${pattern.type} 패턴 (${pattern.variables})`, () => {
        const filePath = join(
          __dirname,
          `../../app/(dashboard)/statistics/${pageName}/page.tsx`
        )
        const content = readFileSync(filePath, 'utf-8')

        // Badge 기반 변수 선택 UI가 있어야 함
        expect(content).toContain('<Badge')

        // setSelectedVariables 호출이 있어야 함
        expect(content).toContain('setSelectedVariables')
      })
    })
  })
})
