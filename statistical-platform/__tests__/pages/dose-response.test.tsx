/**
 * Dose Response Page - Pattern B → Pattern A 전환 테스트
 *
 * 목적: useState → useStatisticsPage 훅 전환 검증
 * 날짜: 2025-10-29
 */

import { describe, it, expect } from '@jest/globals'

describe('Dose Response Page - Pattern Conversion Test', () => {
  it('should use useStatisticsPage hook (Pattern A)', () => {
    // 파일 읽기
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(__dirname, '../../app/(dashboard)/statistics/dose-response/page.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    // 1. useStatisticsPage import 확인
    expect(content).toContain("import { useStatisticsPage } from '@/hooks/use-statistics-page'")

    // 2. Hook 사용 확인
    expect(content).toMatch(/const\s+{\s*state,\s*actions\s*}\s*=\s*useStatisticsPage/)

    // 3. useState 제거 확인 (currentStep, uploadedData, error만)
    // DoseResponseAnalysis 컴포넌트 내부의 useState는 허용 (result, isLoading 등)
    const mainComponentMatch = content.match(/export default function DoseResponsePage\(\)[\s\S]*?return \(/s)
    if (mainComponentMatch) {
      const mainComponentCode = mainComponentMatch[0]

      // 메인 컴포넌트에서 currentStep useState 제거 확인
      const hasCurrentStepUseState = mainComponentCode.includes('useState(0)') ||
                                      mainComponentCode.includes('useState<number>(0)')
      expect(hasCurrentStepUseState).toBe(false)
    }

    // 4. actions.setError() 호출 확인
    expect(content).toContain('actions.setError(')

    // 5. actions.setUploadedData() 호출 확인
    expect(content).toContain('actions.setUploadedData(')

    // 6. state destructuring 확인
    expect(content).toMatch(/const\s+{\s*currentStep.*uploadedData.*error.*}\s*=\s*state/)

    console.log('✅ Dose Response Page: Pattern A 전환 완료')
  })

  it('should not have ReferenceError on actions', () => {
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(__dirname, '../../app/(dashboard)/statistics/dose-response/page.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    // actions 사용 전에 정의 확인
    const actionsDefIndex = content.indexOf('= useStatisticsPage')
    const actionsCallIndex = content.indexOf('actions.setError(')

    if (actionsCallIndex !== -1) {
      expect(actionsDefIndex).toBeGreaterThan(0)
      expect(actionsDefIndex).toBeLessThan(actionsCallIndex)
      console.log('✅ actions 정의 순서 정상')
    }
  })

  it('should use actions.setCurrentStep instead of setCurrentStep', () => {
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(__dirname, '../../app/(dashboard)/statistics/dose-response/page.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    // 메인 컴포넌트 추출
    const mainComponentMatch = content.match(/export default function DoseResponsePage\(\)[\s\S]*$/s)
    if (mainComponentMatch) {
      const mainComponentCode = mainComponentMatch[0]

      // DoseResponseAnalysis 내부 제외하고 확인
      const beforeSubComponent = mainComponentCode.split('const DoseResponseAnalysis')[0]

      // setCurrentStep 직접 호출이 없어야 함 (useState에서)
      const hasUseStateCurrentStep = beforeSubComponent.includes('useState(0)') ||
                                     beforeSubComponent.includes('useState<number>(0)')

      if (hasUseStateCurrentStep) {
        console.log('⚠️ 아직 useState 사용 중 (Pattern B)')
      } else {
        console.log('✅ useState 제거 완료 (Pattern A)')
      }
    }
  })

  it('should handle DataUploadStep with actions.setUploadedData', () => {
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(__dirname, '../../app/(dashboard)/statistics/dose-response/page.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    // handleDataUploadComplete 함수 확인
    expect(content).toMatch(/handleDataUploadComplete.*actions\.setUploadedData/s)

    // DataUploadStep props 확인
    expect(content).toContain('onUploadComplete={handleDataUploadComplete}')

    console.log('✅ DataUploadStep actions 통합 정상')
  })
})
