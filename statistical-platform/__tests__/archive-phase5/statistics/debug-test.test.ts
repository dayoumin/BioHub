/**
 * 디버깅용 간단한 테스트
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'

let pyodideService: PyodideStatisticsService
const INIT_TIMEOUT = 60000

describe.skip('디버깅 테스트', () => {
  beforeAll(async () => {
    pyodideService = PyodideStatisticsService.getInstance()
    await pyodideService.initialize()
  }, INIT_TIMEOUT)

  afterAll(() => {
    if (pyodideService) {
      pyodideService.dispose()
    }
  })

  test('twoWayANOVA 디버깅', async () => {
    const data = [
      { factor1: 'A', factor2: 'X', value: 10 },
      { factor1: 'A', factor2: 'Y', value: 12 },
      { factor1: 'B', factor2: 'X', value: 15 },
      { factor1: 'B', factor2: 'Y', value: 18 },
    ]

    try {
      console.log('테스트 데이터:', data)
      const result = await pyodideService.twoWayANOVA(data, true)
      console.log('결과:', result)
      expect(result).toBeDefined()
    } catch (error) {
      console.error('에러 발생:', error)
      throw error
    }
  })

  test('performTukeyHSD 디버깅', async () => {
    const groups = [
      [10, 11, 12],
      [15, 16, 17],
      [20, 21, 22],
    ]
    const groupNames = ['G1', 'G2', 'G3']

    try {
      console.log('테스트 그룹:', groups)
      const result = await pyodideService.performTukeyHSD(groups, groupNames, 0.05)
      console.log('결과:', result)
      expect(result).toBeDefined()
    } catch (error) {
      console.error('에러 발생:', error)
      throw error
    }
  })
})