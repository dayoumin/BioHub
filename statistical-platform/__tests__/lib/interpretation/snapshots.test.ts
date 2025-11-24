/**
 * Golden Snapshot Tests for Interpretation Engine
 *
 * 목적: 해석 엔진 출력 결과 회귀 방지
 * - Phase 1 of Test Automation Roadmap
 * - 43개 통계 × 3 시나리오 = 129개 스냅샷 (예정)
 * - 현재: 3개 통계 × 3 시나리오 = 9개 스냅샷
 */

import { describe, it, expect } from '@jest/globals'
import { getInterpretation } from '@/lib/interpretation/engine'
import type { AnalysisResult } from '@/types/smart-flow'
import fs from 'fs'
import path from 'path'

/**
 * 스냅샷 파일 구조
 */
interface SnapshotScenario {
  name: string
  description: string
  input: AnalysisResult
  expectedOutput: {
    title: string
    summary: string
    statistical: string
    practical: string | null
  }
}

interface SnapshotFile {
  method: string
  scenarios: SnapshotScenario[]
}

/**
 * 스냅샷 디렉토리에서 모든 JSON 파일 로드
 */
function loadSnapshotFiles(): Map<string, SnapshotFile> {
  const snapshotDir = path.join(__dirname, 'snapshots')
  const files = fs.readdirSync(snapshotDir).filter(f => f.endsWith('.json'))

  const snapshots = new Map<string, SnapshotFile>()

  files.forEach(file => {
    const filePath = path.join(snapshotDir, file)
    const content = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(content) as SnapshotFile
    const key = file.replace('.json', '')
    snapshots.set(key, data)
  })

  return snapshots
}

/**
 * Golden Snapshot Tests
 */
describe('Golden Snapshot Tests', () => {
  const snapshots = loadSnapshotFiles()

  // 각 스냅샷 파일마다 describe 블록 생성
  snapshots.forEach((snapshotFile, fileName) => {
    describe(`${snapshotFile.method} (${fileName})`, () => {
      // 각 시나리오마다 테스트 생성
      snapshotFile.scenarios.forEach(scenario => {
        it(`Scenario: ${scenario.name}`, () => {
          // 1. 해석 엔진 실행
          const result = getInterpretation(scenario.input)

          // 2. null이 아니어야 함
          expect(result).not.toBeNull()

          if (result === null) {
            throw new Error('Interpretation result is null')
          }

          // 3. 각 필드가 기대값과 정확히 일치해야 함
          expect(result.title).toBe(scenario.expectedOutput.title)
          expect(result.summary).toBe(scenario.expectedOutput.summary)
          expect(result.statistical).toBe(scenario.expectedOutput.statistical)
          expect(result.practical).toBe(scenario.expectedOutput.practical)

          // 4. Jest 스냅샷 (전체 객체 저장)
          expect(result).toMatchSnapshot()
        })
      })
    })
  })

  // 메타 테스트: 최소한의 스냅샷 파일이 있는지 확인
  it('Meta: 최소 3개 이상의 스냅샷 파일이 있어야 함', () => {
    expect(snapshots.size).toBeGreaterThanOrEqual(3)
  })

  // 메타 테스트: 각 파일마다 3개 시나리오가 있는지 확인
  it('Meta: 각 스냅샷 파일은 3개의 시나리오를 가져야 함', () => {
    snapshots.forEach((snapshotFile, fileName) => {
      expect(snapshotFile.scenarios.length).toBe(3)
    })
  })
})

/**
 * Purpose 기반 해석 테스트 (Smart Flow용)
 */
describe('Golden Snapshot Tests (Purpose-based)', () => {
  describe('그룹 비교 (purpose: "비교")', () => {
    it('t-test significant with purpose', () => {
      const result = getInterpretation(
        {
          method: 'Independent t-test',
          statistic: 3.45,
          pValue: 0.001,
          df: 98,
          effectSize: { value: 0.8, type: "Cohen's d" },
          groupStats: [
            { name: 'Control', mean: 50, std: 10, n: 50 },
            { name: 'Treatment', mean: 58, std: 12, n: 50 }
          ]
        } as AnalysisResult,
        '비교'  // purpose
      )

      expect(result).not.toBeNull()
      expect(result!.title).toBe('그룹 비교 결과')
      expect(result).toMatchSnapshot()
    })
  })

  describe('상관관계 (purpose: "상관")', () => {
    it('Correlation strong positive with purpose', () => {
      const result = getInterpretation(
        {
          method: 'Pearson Correlation',
          statistic: 0.85,
          pValue: 0.0001,
          additional: { rSquared: 0.7225 }
        } as AnalysisResult,
        '상관'  // purpose
      )

      expect(result).not.toBeNull()
      expect(result!.title).toBe('변수 간 관계 분석')
      expect(result).toMatchSnapshot()
    })
  })

  describe('예측/회귀 (purpose: "예측")', () => {
    it('Regression with purpose', () => {
      const result = getInterpretation(
        {
          method: 'Linear Regression',
          statistic: 15.3,
          pValue: 0.001,
          coefficients: [
            { variable: 'Intercept', value: 10.5 },
            { variable: 'X1', value: 2.3 }
          ],
          additional: { rSquared: 0.75 }
        } as AnalysisResult,
        '예측'  // purpose
      )

      expect(result).not.toBeNull()
      expect(result!.title).toBe('예측 모델 결과')
      expect(result).toMatchSnapshot()
    })
  })
})

/**
 * Edge Cases: 해석 엔진 경계값 테스트
 */
describe('Golden Snapshot Tests (Edge Cases)', () => {
  it('p-value = 0 (극단값)', () => {
    const result = getInterpretation({
      method: 'Independent t-test',
      statistic: 10.5,
      pValue: 0,
      groupStats: [
        { mean: 50, std: 10, n: 50 },
        { mean: 70, std: 12, n: 50 }
      ]
    } as AnalysisResult)

    expect(result).not.toBeNull()
    expect(result!.statistical).toContain('< 0.001')
    expect(result).toMatchSnapshot()
  })

  it('p-value = 1 (극단값)', () => {
    const result = getInterpretation({
      method: 'Independent t-test',
      statistic: 0.001,
      pValue: 1,
      groupStats: [
        { mean: 50, std: 10, n: 50 },
        { mean: 50.1, std: 10, n: 50 }
      ]
    } as AnalysisResult)

    expect(result).not.toBeNull()
    expect(result!.statistical).toContain('유의한 차이가 없습니다')
    expect(result).toMatchSnapshot()
  })

  it('effectSize = 0 (효과 없음)', () => {
    const result = getInterpretation({
      method: 'Independent t-test',
      statistic: 0.1,
      pValue: 0.92,
      effectSize: { value: 0, type: "Cohen's d" },
      groupStats: [
        { mean: 50, std: 10, n: 50 },
        { mean: 50, std: 10, n: 50 }
      ]
    } as AnalysisResult)

    expect(result).not.toBeNull()
    expect(result).toMatchSnapshot()
  })

  it('그룹 간 평균 차이가 음수 (group1 < group2)', () => {
    const result = getInterpretation({
      method: 'Independent t-test',
      statistic: -2.5,
      pValue: 0.014,
      groupStats: [
        { name: 'Control', mean: 45, std: 10, n: 50 },
        { name: 'Treatment', mean: 55, std: 12, n: 50 }
      ]
    } as AnalysisResult)

    expect(result).not.toBeNull()
    expect(result!.summary).toContain('10.00점 낮습니다')
    expect(result).toMatchSnapshot()
  })
})
