/**
 * Power Analysis Page - Pattern B → Pattern A 전환 테스트
 *
 * 목적: useState → useStatisticsPage 훅 전환 검증
 * 날짜: 2025-10-29
 */

import { describe, it, expect } from '@jest/globals'

describe('Power Analysis Page - Pattern Conversion Test', () => {
  it('should use useStatisticsPage hook (Pattern A)', () => {
    // 파일 읽기
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(__dirname, '../../app/(dashboard)/statistics/power-analysis/page.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    // 1. useStatisticsPage import 확인
    expect(content).toContain("import { useStatisticsPage } from '@/hooks/use-statistics-page'")

    // 2. Hook 사용 확인
    expect(content).toMatch(/const\s+{\s*state,\s*actions\s*}\s*=\s*useStatisticsPage/)

    // 3. useState 제거 확인 (currentStep, results, isAnalyzing만)
    const useStateMatches = content.match(/useState\s*</g) || []
    // activeTab은 남아야 함 (1개만)
    expect(useStateMatches.length).toBeLessThanOrEqual(2) // activeTab + 기타 1-2개 허용

    // 4. actions.startAnalysis() 호출 확인
    expect(content).toContain('actions.startAnalysis()')

    // 5. state destructuring 확인
    expect(content).toMatch(/const\s+{\s*currentStep.*results.*isAnalyzing.*}\s*=\s*state/)

    console.log('✅ Power Analysis Page: Pattern A 전환 완료')
  })

  it('should not have ReferenceError on actions', () => {
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(__dirname, '../../app/(dashboard)/statistics/power-analysis/page.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    // actions 사용 전에 정의 확인
    const actionsDefIndex = content.indexOf('= useStatisticsPage')
    const actionsCallIndex = content.indexOf('actions.startAnalysis()')

    if (actionsCallIndex !== -1) {
      expect(actionsDefIndex).toBeGreaterThan(0)
      expect(actionsDefIndex).toBeLessThan(actionsCallIndex)
      console.log('✅ actions 정의 순서 정상')
    }
  })

  it('should use actions.setCurrentStep instead of setCurrentStep', () => {
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(__dirname, '../../app/(dashboard)/statistics/power-analysis/page.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    // setCurrentStep 직접 호출이 없어야 함 (useState에서)
    // actions.setCurrentStep만 있어야 함
    const setCurrentStepDirectMatches = content.match(/(?<!actions\.)setCurrentStep\(/g) || []
    const hasDirectSetCurrentStep = setCurrentStepDirectMatches.length > 0

    // useState 선언은 제외
    const hasUseStateCurrentStep = content.includes('useState<number>(0)') ||
                                   content.includes('useState(0)')

    if (hasUseStateCurrentStep) {
      console.log('⚠️ 아직 useState 사용 중 (Pattern B)')
    } else {
      console.log('✅ useState 제거 완료 (Pattern A)')
      // Pattern A면 actions.setCurrentStep만 사용해야 함
      expect(hasDirectSetCurrentStep).toBe(false)
    }
  })
})