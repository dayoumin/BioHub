/**
 * 스냅샷 검증 테스트
 *
 * 목적: 생성된 스냅샷 JSON의 expectedOutput이 실제 engine.ts 출력과 일치하는지 검증
 */

import { describe, it, expect } from '@jest/globals'
import { getInterpretation } from '@/lib/interpretation/engine'
import type { AnalysisResult } from '@/types/smart-flow'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

// 스냅샷 디렉토리
const SNAPSHOTS_DIR = join(__dirname, 'snapshots')

// 모든 스냅샷 JSON 파일 로드
const snapshotFiles = readdirSync(SNAPSHOTS_DIR)
  .filter(f => f.endsWith('.json'))
  .map(f => join(SNAPSHOTS_DIR, f))

describe('스냅샷 검증: expectedOutput vs 실제 engine.ts 출력', () => {
  snapshotFiles.forEach(filePath => {
    const filename = filePath.split(/[\\/]/).pop()!
    const snapshotData = JSON.parse(readFileSync(filePath, 'utf8'))

    describe(`${filename} (${snapshotData.method})`, () => {
      snapshotData.scenarios.forEach((scenario: any, idx: number) => {
        it(`Scenario ${idx + 1}: ${scenario.name}`, () => {
          // 실제 engine.ts 출력 얻기 (purpose 있으면 전달)
          const actualOutput = snapshotData.purpose
            ? getInterpretation(scenario.input as AnalysisResult, snapshotData.purpose)
            : getInterpretation(scenario.input as AnalysisResult)

          // null 체크
          expect(actualOutput).not.toBeNull()

          // 각 필드 검증
          expect(actualOutput!.title).toBe(scenario.expectedOutput.title)
          expect(actualOutput!.summary).toBe(scenario.expectedOutput.summary)
          expect(actualOutput!.statistical).toBe(scenario.expectedOutput.statistical)
          expect(actualOutput!.practical).toBe(scenario.expectedOutput.practical)
        })
      })
    })
  })
})

describe('스냅샷 메타 검증', () => {
  it('총 13개 스냅샷 파일 존재', () => {
    expect(snapshotFiles.length).toBe(13)
  })

  it('각 스냅샷은 정확히 3개 시나리오 포함', () => {
    snapshotFiles.forEach(filePath => {
      const data = JSON.parse(readFileSync(filePath, 'utf8'))
      expect(data.scenarios).toHaveLength(3)
    })
  })

  it('모든 시나리오는 필수 필드 포함', () => {
    snapshotFiles.forEach(filePath => {
      const data = JSON.parse(readFileSync(filePath, 'utf8'))
      data.scenarios.forEach((scenario: any) => {
        expect(scenario).toHaveProperty('name')
        expect(scenario).toHaveProperty('description')
        expect(scenario).toHaveProperty('input')
        expect(scenario).toHaveProperty('expectedOutput')

        expect(scenario.expectedOutput).toHaveProperty('title')
        expect(scenario.expectedOutput).toHaveProperty('summary')
        expect(scenario.expectedOutput).toHaveProperty('statistical')
        expect(scenario.expectedOutput).toHaveProperty('practical')
      })
    })
  })
})
