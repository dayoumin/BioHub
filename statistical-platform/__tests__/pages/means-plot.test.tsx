/**
 * Means Plot Page - Pattern A Conversion Test
 *
 * 테스트 목적:
 * 1. useStatisticsPage hook 사용 확인 (Pattern A)
 * 2. useState 제거 확인
 * 3. actions.* 메서드 사용 확인
 * 4. DataUploadStep props 통합 확인
 */

import { describe, it, expect } from '@jest/globals'
import fs from 'fs'
import path from 'path'

describe('Means Plot Page - Pattern Conversion Test', () => {
  const filePath = path.join(
    __dirname,
    '../../app/(dashboard)/statistics/means-plot/page.tsx'
  )
  const fileContent = fs.readFileSync(filePath, 'utf-8')

  it('should use useStatisticsPage hook (Pattern A)', () => {
    // useStatisticsPage hook import 확인
    expect(fileContent).toContain("import { useStatisticsPage } from '@/hooks/use-statistics-page'")

    // Hook 사용 확인
    expect(fileContent).toMatch(/const \{ state, actions \} = useStatisticsPage/)

    // state destructuring 확인
    expect(fileContent).toMatch(/const \{ currentStep, uploadedData, selectedVariables, isAnalyzing, results, error \} = state/)

    console.log('✅ Means Plot Page: Pattern A 전환 완료')
  })

  it('should not have ReferenceError on actions', () => {
    // actions 정의 확인 (useStatisticsPage에서 가져와야 함)
    const actionsDefinitionMatch = fileContent.match(/const \{ state, actions \} = useStatisticsPage/)
    expect(actionsDefinitionMatch).toBeTruthy()

    // actions.* 메서드 사용 확인
    expect(fileContent).toMatch(/actions\.(setUploadedData|setCurrentStep|startAnalysis|completeAnalysis|setError)/)

    console.log('✅ actions 정의 순서 정상')
  })

  it('should use actions.setCurrentStep instead of setCurrentStep', () => {
    // useState(currentStep) 제거 확인
    expect(fileContent).not.toMatch(/const \[currentStep, setCurrentStep\] = useState/)

    // setCurrentStep 단독 사용 없어야 함 (actions.setCurrentStep만 허용)
    const setCurrentStepMatches = fileContent.match(/(?<!actions\.)setCurrentStep\(/g)
    expect(setCurrentStepMatches).toBeNull()

    // actions.setCurrentStep 사용 확인
    expect(fileContent).toMatch(/actions\.setCurrentStep\(/)

    console.log('✅ useState 제거 완료 (Pattern A)')
  })

  it('should handle DataUploadStep with onUploadComplete', () => {
    // DataUploadStep에 onUploadComplete prop 전달 확인
    expect(fileContent).toMatch(/<DataUploadStep[\s\S]*?onUploadComplete=/)

    // onNext prop 전달 확인
    expect(fileContent).toMatch(/onNext=\{.*actions\.setCurrentStep/)

    console.log('✅ DataUploadStep props 정상')
  })

  it('should use uploadedData from state', () => {
    // uploadedData 사용 확인
    expect(fileContent).toMatch(/uploadedData\.data/)

    // 직접 선언한 data state 없어야 함
    expect(fileContent).not.toMatch(/const \[data, setData\] = useState/)

    console.log('✅ uploadedData 사용 확인')
  })

  it('should use actions.completeAnalysis for results', () => {
    // setResults 직접 사용 없어야 함
    expect(fileContent).not.toMatch(/setResults\(/)

    // actions.completeAnalysis 또는 actions.setResults 사용 확인
    const hasCompleteOrSet =
      fileContent.includes('actions.completeAnalysis(') ||
      fileContent.includes('actions.setResults(')

    expect(hasCompleteOrSet).toBe(true)

    console.log('✅ actions.completeAnalysis 사용')
  })
})
