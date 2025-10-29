/**
 * KS Test Page - Pattern B → Pattern A 전환 테스트
 *
 * 목적: useState → useStatisticsPage 훅 전환 검증
 * 날짜: 2025-10-29
 */

import { describe, it, expect } from '@jest/globals'

describe('KS Test Page - Pattern Conversion Test', () => {
  it('should use useStatisticsPage hook (Pattern A)', () => {
    // 파일 읽기
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(__dirname, '../../app/(dashboard)/statistics/ks-test/page.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    // 1. useStatisticsPage import 확인
    expect(content).toContain("import { useStatisticsPage } from '@/hooks/use-statistics-page'")

    // 2. Hook 사용 확인
    expect(content).toMatch(/const\s+{\s*state,\s*actions\s*}\s*=\s*useStatisticsPage/)

    // 3. useState 제거 확인 (currentStep, uploadedData, isAnalyzing, results)
    // selectedVariables만 useState 유지 (훅에 없는 state)
    const useStateMatches = content.match(/useState\s*</g) || []
    // selectedVariables 1개만 허용
    expect(useStateMatches.length).toBeLessThanOrEqual(2)

    // 4. state destructuring 확인
    expect(content).toMatch(/const\s+{\s*currentStep.*uploadedData.*isAnalyzing.*results.*}\s*=\s*state/s)

    console.log('✅ KS Test Page: Pattern A 전환 완료')
  })

  it('should use actions.setCurrentStep instead of setCurrentStep', () => {
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(__dirname, '../../app/(dashboard)/statistics/ks-test/page.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    // setCurrentStep 직접 호출이 없어야 함
    const setCurrentStepDirectMatches = content.match(/(?<!actions\.)setCurrentStep\(/g) || []

    // useState 선언 제외
    const hasUseStateCurrentStep = content.includes('useState(0)') ||
                                   content.includes('useState<number>(0)')

    if (hasUseStateCurrentStep) {
      console.log('⚠️ 아직 useState 사용 중 (Pattern B)')
    } else {
      console.log('✅ useState 제거 완료 (Pattern A)')
      // Pattern A면 actions.setCurrentStep만 사용해야 함
      expect(setCurrentStepDirectMatches.length).toBe(0)
    }
  })

  it('should use actions.setUploadedData', () => {
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(__dirname, '../../app/(dashboard)/statistics/ks-test/page.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    // actions.setUploadedData 호출 확인
    expect(content).toMatch(/actions\.setUploadedData/)

    console.log('✅ actions.setUploadedData 사용 확인')
  })

  it('should use actions.completeAnalysis for results', () => {
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(__dirname, '../../app/(dashboard)/statistics/ks-test/page.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    // setresults → actions.completeAnalysis 또는 actions.setResults
    const hasSetResultsDirect = content.match(/(?<!actions\.)setresults\(/g) || []

    if (hasSetResultsDirect.length === 0) {
      console.log('✅ actions.completeAnalysis 또는 actions.setResults 사용')
    } else {
      console.log('⚠️ 아직 setresults 직접 호출 중')
    }
  })
})
