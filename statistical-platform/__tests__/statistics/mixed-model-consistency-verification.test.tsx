/**
 * mixed-model 페이지 일관성 검증 테스트
 *
 * 검증 항목:
 * 1. TwoPanelStep import 제거 확인
 * 2. STEPS 정의 표준 준수
 * 3. stepsWithCompleted 패턴 일치
 * 4. 타입 안전성
 */

import { describe, it } from '@jest/globals'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('mixed-model 페이지 일관성 검증', () => {
  const pagePath = join(process.cwd(), 'app/(dashboard)/statistics/mixed-model/page.tsx')
  const pageContent = readFileSync(pagePath, 'utf-8')

  describe('1. Import 정리', () => {
    it('TwoPanelLayout을 import 해야 함', () => {
      expect(pageContent).toContain("import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'")
    })

    it('TwoPanelStep 타입 import가 없어야 함', () => {
      expect(pageContent).not.toContain('import type { Step as TwoPanelStep }')
      expect(pageContent).not.toContain('TwoPanelStep')
    })
  })

  describe('2. STEPS 정의 표준 준수', () => {
    it('STEPS 배열을 정의해야 함', () => {
      expect(pageContent).toContain('const STEPS = [')
    })

    it('useMemo를 사용하지 않아야 함', () => {
      const stepsMatch = pageContent.match(/const STEPS[^=]*=/)
      expect(stepsMatch).toBeTruthy()
      const stepsLine = pageContent.split('\n').find(line => line.includes('const STEPS'))
      expect(stepsLine).not.toContain('useMemo')
    })

    it('Step은 { id, label } 형식이어야 함', () => {
      expect(pageContent).toMatch(/\{\s*id:\s*\d+,\s*label:\s*['"]/)
    })

    it('4개 단계를 정의해야 함', () => {
      const stepsMatch = pageContent.match(/const STEPS = \[([\s\S]*?)\]/)
      expect(stepsMatch).toBeTruthy()
      const stepsContent = stepsMatch![1]
      const stepCount = (stepsContent.match(/\{\s*id:/g) || []).length
      expect(stepCount).toBe(4)
    })
  })

  describe('3. stepsWithCompleted 패턴', () => {
    it('stepsWithCompleted를 생성해야 함', () => {
      expect(pageContent).toContain('const stepsWithCompleted = STEPS.map(step => ({')
      expect(pageContent).toContain('completed:')
    })

    it('각 단계별 조건을 명확히 해야 함', () => {
      const stepsWithCompletedMatch = pageContent.match(/const stepsWithCompleted = STEPS\.map\(step => \(\{[\s\S]*?\}\)\)/)
      expect(stepsWithCompletedMatch).toBeTruthy()

      // step.id === 0, 1, 2, 3 조건이 있어야 함
      const content = stepsWithCompletedMatch![0]
      expect(content).toContain('step.id === 0')
      expect(content).toContain('step.id === 1')
      expect(content).toContain('step.id === 2')
      expect(content).toContain('step.id === 3')
    })

    it('completed 로직에 주석이 있어야 함', () => {
      const stepsWithCompletedSection = pageContent.substring(
        pageContent.indexOf('const stepsWithCompleted'),
        pageContent.indexOf('const stepsWithCompleted') + 500
      )
      expect(stepsWithCompletedSection).toContain('//')
    })
  })

  describe('4. TwoPanelLayout Props', () => {
    it('stepsWithCompleted를 전달해야 함', () => {
      expect(pageContent).toMatch(/steps=\{stepsWithCompleted\}/)
    })

    it('STEPS를 직접 전달하지 않아야 함 (stepsWithCompleted 사용)', () => {
      // TwoPanelLayout에 전달하는 경우만 체크
      const layoutMatch = pageContent.match(/<TwoPanelLayout[\s\S]*?>/g)
      expect(layoutMatch).toBeTruthy()
      const layoutContent = layoutMatch![0]
      expect(layoutContent).not.toMatch(/steps=\{STEPS\}/)
    })

    it('currentStep prop을 전달해야 함', () => {
      expect(pageContent).toMatch(/currentStep=\{currentStep\}/)
    })

    it('analysisTitle prop을 전달해야 함', () => {
      expect(pageContent).toMatch(/analysisTitle=/)
    })

    it('analysisSubtitle prop을 전달해야 함', () => {
      expect(pageContent).toMatch(/analysisSubtitle=/)
    })
  })

  describe('5. 단계별 완료 조건', () => {
    it('step.id === 0 조건이 있어야 함 (방법 소개)', () => {
      expect(pageContent).toMatch(/step\.id === 0 \? true/)
    })

    it('step.id === 1 조건이 있어야 함 (데이터 업로드)', () => {
      expect(pageContent).toMatch(/step\.id === 1 \? !!uploadedData/)
    })

    it('step.id === 2 조건이 있어야 함 (변수 선택)', () => {
      expect(pageContent).toMatch(/step\.id === 2 \? !!selectedVariables/)
    })

    it('step.id === 3 조건이 있어야 함 (결과 확인)', () => {
      expect(pageContent).toMatch(/step\.id === 3 \? !!analysisResult/)
    })
  })

  describe('6. 타입 안전성', () => {
    it('any 타입을 사용하지 않아야 함', () => {
      const codeLines = pageContent.split('\n').filter(line => {
        const trimmed = line.trim()
        return !trimmed.startsWith('//') && !trimmed.startsWith('*')
      })
      const codeWithoutComments = codeLines.join('\n')

      const anyTypeMatches = codeWithoutComments.match(/:\s*any[\s,;\)\]]/g)
      expect(anyTypeMatches).toBeNull()
    })
  })

  describe('7. PyodideCore 사용', () => {
    it('PyodideCoreService를 import 해야 함', () => {
      expect(pageContent).toContain("import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'")
    })

    it('PyodideCoreService.getInstance()를 사용해야 함', () => {
      expect(pageContent).toMatch(/PyodideCoreService\.getInstance\(\)/)
    })
  })

  describe('8. 일관성 검증', () => {
    it('useStatisticsPage hook을 사용해야 함', () => {
      expect(pageContent).toContain('const { state, actions } = useStatisticsPage')
    })

    it('TwoPanelLayout을 사용해야 함', () => {
      expect(pageContent).toContain('<TwoPanelLayout')
      expect(pageContent).toContain('</TwoPanelLayout>')
    })

    it('함수 컴포넌트를 사용해야 함', () => {
      expect(pageContent).toMatch(/export default function \w+Page\(\)/)
    })
  })

  describe('9. 코드 품질', () => {
    it('파일이 1500줄 이하여야 함', () => {
      const lineCount = pageContent.split('\n').length
      expect(lineCount).toBeLessThanOrEqual(1500)
    })

    it('JSX 주석을 사용해야 함', () => {
      expect(pageContent).toMatch(/\{\/\*[\s\S]*?\*\/\}/)
    })
  })
})
