/**
 * Steps Implementation Test
 *
 * 모든 통계 페이지가 StatisticsStep을 올바르게 구현했는지 검증
 */

import fs from 'fs'
import path from 'path'

describe('Statistics Pages - Steps Implementation', () => {
  const statisticsDir = path.join(__dirname, '..')
  const pageFiles = fs.readdirSync(statisticsDir)
    .filter(dir => {
      const pagePath = path.join(statisticsDir, dir, 'page.tsx')
      return fs.existsSync(pagePath) && dir !== '__tests__'
    })
    .map(dir => ({
      dir,
      path: path.join(statisticsDir, dir, 'page.tsx')
    }))

  test('모든 통계 페이지가 존재해야 함', () => {
    expect(pageFiles.length).toBeGreaterThanOrEqual(40)
  })

  test.each(pageFiles)('$dir 페이지는 StatisticsStep import를 포함해야 함', ({ path: pagePath }) => {
    const content = fs.readFileSync(pagePath, 'utf-8')

    // StatisticsStep import 확인
    const hasImport = content.includes('StatisticsStep') ||
                      content.includes('import { StatisticsPageLayout')

    expect(hasImport).toBe(true)
  })

  test.each(pageFiles)('$dir 페이지는 steps 배열을 정의해야 함', ({ path: pagePath }) => {
    const content = fs.readFileSync(pagePath, 'utf-8')

    // steps 배열 정의 확인 (다양한 패턴 지원)
    // const steps: StatisticsStep[] = [ 또는
    // const steps = [ 또는
    // const steps: StatisticsStep[] = useMemo(() => [
    const hasStepsArray =
      /const\s+steps(?::\s*StatisticsStep\[\])?\s*=\s*\[/.test(content) ||
      /const\s+steps(?::\s*StatisticsStep\[\])?\s*=\s*useMemo/.test(content)

    expect(hasStepsArray).toBe(true)
  })

  test.each(pageFiles)('$dir 페이지는 StatisticsPageLayout에 steps prop을 전달해야 함', ({ path: pagePath }) => {
    const content = fs.readFileSync(pagePath, 'utf-8')

    // StatisticsPageLayout에 steps prop 전달 확인 (멀티라인 포함)
    const hasStepsProp =
      /steps=\{steps\}/.test(content) ||
      /steps=\{[^}]+\}/.test(content)

    expect(hasStepsProp).toBe(true)
  })

  test.each(pageFiles)('$dir 페이지의 steps 배열은 최소 2개 이상의 단계를 포함해야 함', ({ path: pagePath }) => {
    const content = fs.readFileSync(pagePath, 'utf-8')

    // steps 배열 추출
    const stepsMatch = content.match(/const\s+steps[:\s]*=?\s*\[[\s\S]*?\]/m)

    if (stepsMatch) {
      const stepsContent = stepsMatch[0]
      // 단계 객체 수 카운트 (id: 패턴으로)
      const stepCount = (stepsContent.match(/id:\s*['"`]/g) || []).length

      expect(stepCount).toBeGreaterThanOrEqual(2)
    }
  })

  test.each(pageFiles)('$dir 페이지의 각 단계는 필수 속성을 포함해야 함', ({ path: pagePath, dir }) => {
    const content = fs.readFileSync(pagePath, 'utf-8')

    // steps 배열 추출
    const stepsMatch = content.match(/const\s+steps[:\s]*=?\s*\[[\s\S]*?\n\s*\]/m)

    if (stepsMatch) {
      const stepsContent = stepsMatch[0]

      // 각 단계가 필수 속성을 가지는지 확인
      const hasId = /id:\s*['"`]/.test(stepsContent)
      const hasNumber = /number:\s*\d/.test(stepsContent)
      const hasTitle = /title:\s*['"`]/.test(stepsContent)
      const hasDescription = /description:\s*['"`]/.test(stepsContent)
      const hasStatus = /status:\s*/.test(stepsContent)

      expect({
        page: dir,
        hasId,
        hasNumber,
        hasTitle,
        hasDescription,
        hasStatus
      }).toEqual({
        page: dir,
        hasId: true,
        hasNumber: true,
        hasTitle: true,
        hasDescription: true,
        hasStatus: true
      })
    }
  })

  test('Steps 구현률이 95% 이상이어야 함', () => {
    let implementedCount = 0
    const notImplemented: string[] = []

    pageFiles.forEach(({ path: pagePath, dir }) => {
      const content = fs.readFileSync(pagePath, 'utf-8')
      // const steps 패턴 인식 (일반 배열 또는 useMemo)
      const hasSteps =
        /const\s+steps(?::\s*StatisticsStep\[\])?\s*=\s*\[/.test(content) ||
        /const\s+steps(?::\s*StatisticsStep\[\])?\s*=\s*useMemo/.test(content)
      const hasStepsProp = /steps=\{/.test(content)

      if (hasSteps && hasStepsProp) {
        implementedCount++
      } else {
        notImplemented.push(`${dir} (hasSteps: ${hasSteps}, hasStepsProp: ${hasStepsProp})`)
      }
    })

    const implementationRate = (implementedCount / pageFiles.length) * 100

    if (implementationRate < 95) {
      console.log('미구현 페이지:', notImplemented)
    }

    console.log(`Steps 구현률: ${implementedCount}/${pageFiles.length} (${implementationRate.toFixed(1)}%)`)

    expect(implementationRate).toBeGreaterThanOrEqual(95)
  })

  test('각 페이지의 단계 수는 2~5개 사이여야 함', () => {
    pageFiles.forEach(({ path: pagePath, dir }) => {
      const content = fs.readFileSync(pagePath, 'utf-8')
      const stepsMatch = content.match(/const\s+steps[:\s]*=?\s*\[[\s\S]*?\]/m)

      if (stepsMatch) {
        const stepCount = (stepsMatch[0].match(/id:\s*['"`]/g) || []).length

        expect(stepCount).toBeGreaterThanOrEqual(2)
        expect(stepCount).toBeLessThanOrEqual(5)
      }
    })
  })
})
