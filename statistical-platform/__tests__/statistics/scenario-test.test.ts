/**
 * 시나리오별 상세 테스트
 * 각 메서드의 정확한 동작을 단계별로 확인
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'

let pyodideService: PyodideStatisticsService
const INIT_TIMEOUT = 60000

describe.skip('시나리오별 상세 테스트', () => {
  beforeAll(async () => {
    console.log('=== Pyodide 초기화 시작 ===')
    pyodideService = PyodideStatisticsService.getInstance()
    await pyodideService.initialize()
    console.log('=== Pyodide 초기화 완료 ===')
  }, INIT_TIMEOUT)

  afterAll(() => {
    if (pyodideService) {
      pyodideService.dispose()
    }
  })

  describe.skip('STEP 1: 작동하는 기존 메서드 확인', () => {
    test('oneWayANOVA - 기존 메서드 테스트', async () => {
      console.log('\n--- oneWayANOVA 테스트 시작 ---')

      const groups = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ]

      console.log('입력 데이터:', groups)

      try {
        const result = await pyodideService.oneWayANOVA(groups)
        console.log('결과 타입:', typeof result)
        console.log('결과:', JSON.stringify(result, null, 2))

        expect(result).toBeDefined()
        expect(result.fStatistic).toBeDefined()
        expect(result.pValue).toBeDefined()

        console.log('✅ oneWayANOVA 성공!')
      } catch (error) {
        console.error('❌ oneWayANOVA 실패:', error)
        throw error
      }
    })
  })

  describe.skip('STEP 2: 새로 추가한 메서드 개별 테스트', () => {
    test('twoWayANOVA - 최소 데이터로 테스트', async () => {
      console.log('\n--- twoWayANOVA 테스트 시작 ---')

      const data = [
        { factor1: 'A', factor2: 'X', value: 1 },
        { factor1: 'A', factor2: 'Y', value: 2 },
        { factor1: 'B', factor2: 'X', value: 3 },
        { factor1: 'B', factor2: 'Y', value: 4 }
      ]

      console.log('입력 데이터:', data)
      console.log('입력 타입:', typeof data)

      try {
        const result = await pyodideService.twoWayANOVA(data, true)
        console.log('반환값 타입:', typeof result)
        console.log('반환값:', result)

        if (result === undefined) {
          console.log('⚠️ undefined 반환됨')
        } else if (result === null) {
          console.log('⚠️ null 반환됨')
        } else if (typeof result === 'object') {
          console.log('객체 키:', Object.keys(result))
          console.log('상세 내용:', JSON.stringify(result, null, 2))
        }

        expect(result).toBeDefined()
      } catch (error) {
        console.error('❌ twoWayANOVA 에러:', error)
        console.error('에러 타입:', error.constructor.name)
        console.error('에러 메시지:', error.message)
        throw error
      }
    })

    test('performTukeyHSD - 단순 데이터 테스트', async () => {
      console.log('\n--- performTukeyHSD 테스트 시작 ---')

      const groups = [[1, 2], [3, 4], [5, 6]]
      const groupNames = ['A', 'B', 'C']

      console.log('입력 groups:', groups)
      console.log('입력 names:', groupNames)

      try {
        const result = await pyodideService.performTukeyHSD(groups, groupNames, 0.05)
        console.log('반환값 타입:', typeof result)
        console.log('반환값:', result)

        if (result && typeof result === 'object') {
          console.log('객체 키:', Object.keys(result))
        }

        expect(result).toBeDefined()
      } catch (error) {
        console.error('❌ performTukeyHSD 에러:', error)
        throw error
      }
    })

    test('performBonferroni - 단순 데이터 테스트', async () => {
      console.log('\n--- performBonferroni 테스트 시작 ---')

      const groups = [[1, 2], [3, 4], [5, 6]]
      const groupNames = ['A', 'B', 'C']

      console.log('입력 groups:', groups)
      console.log('입력 names:', groupNames)

      try {
        const result = await pyodideService.performBonferroni(groups, groupNames, 0.05)
        console.log('반환값 타입:', typeof result)
        console.log('반환값:', result)

        if (result && typeof result === 'object') {
          console.log('객체 키:', Object.keys(result))
        }

        expect(result).toBeDefined()
      } catch (error) {
        console.error('❌ performBonferroni 에러:', error)
        throw error
      }
    })

    test('multipleRegression - 단순 회귀 테스트', async () => {
      console.log('\n--- multipleRegression 테스트 시작 ---')

      const X = [[1, 2], [2, 3], [3, 4], [4, 5]]
      const y = [10, 20, 30, 40]
      const variableNames = ['X1', 'X2']

      console.log('입력 X:', X)
      console.log('입력 y:', y)
      console.log('변수명:', variableNames)

      try {
        const result = await pyodideService.multipleRegression(X, y, variableNames)
        console.log('반환값 타입:', typeof result)
        console.log('반환값:', result)

        if (result && typeof result === 'object') {
          console.log('객체 키:', Object.keys(result))
        }

        expect(result).toBeDefined()
      } catch (error) {
        console.error('❌ multipleRegression 에러:', error)
        throw error
      }
    })

    test('logisticRegression - 이진 분류 테스트', async () => {
      console.log('\n--- logisticRegression 테스트 시작 ---')

      const X = [[1, 2], [2, 3], [3, 4], [4, 5]]
      const y = [0, 0, 1, 1]
      const variableNames = ['X1', 'X2']

      console.log('입력 X:', X)
      console.log('입력 y:', y)
      console.log('변수명:', variableNames)

      try {
        const result = await pyodideService.logisticRegression(X, y, variableNames)
        console.log('반환값 타입:', typeof result)
        console.log('반환값:', result)

        if (result && typeof result === 'object') {
          console.log('객체 키:', Object.keys(result))
        }

        expect(result).toBeDefined()
      } catch (error) {
        console.error('❌ logisticRegression 에러:', error)
        throw error
      }
    })

    test('dunnTest - 비모수 검정 테스트', async () => {
      console.log('\n--- dunnTest 테스트 시작 ---')

      const groups = [[1, 2], [3, 4], [5, 6]]
      const groupNames = ['A', 'B', 'C']

      console.log('입력 groups:', groups)
      console.log('입력 names:', groupNames)

      try {
        const result = await pyodideService.dunnTest(groups, groupNames, 'holm', 0.05)
        console.log('반환값 타입:', typeof result)
        console.log('반환값:', result)

        if (result && typeof result === 'object') {
          console.log('객체 키:', Object.keys(result))
        }

        expect(result).toBeDefined()
      } catch (error) {
        console.error('❌ dunnTest 에러:', error)
        throw error
      }
    })

    test('gamesHowellTest - 등분산 미가정 테스트', async () => {
      console.log('\n--- gamesHowellTest 테스트 시작 ---')

      const groups = [[1, 2], [3, 4], [5, 6]]
      const groupNames = ['A', 'B', 'C']

      console.log('입력 groups:', groups)
      console.log('입력 names:', groupNames)

      try {
        const result = await pyodideService.gamesHowellTest(groups, groupNames, 0.05)
        console.log('반환값 타입:', typeof result)
        console.log('반환값:', result)

        if (result && typeof result === 'object') {
          console.log('객체 키:', Object.keys(result))
        }

        expect(result).toBeDefined()
      } catch (error) {
        console.error('❌ gamesHowellTest 에러:', error)
        throw error
      }
    })
  })

  describe.skip('STEP 3: Python 코드 직접 실행 테스트', () => {
    test('Python 코드 직접 실행 확인', async () => {
      console.log('\n--- Python 직접 실행 테스트 ---')

      try {
        // @ts-expect-error - pyodide 직접 접근
        const pyodide = pyodideService.pyodide

        if (!pyodide) {
          console.log('⚠️ Pyodide가 초기화되지 않음')
          return
        }

        // 간단한 Python 코드 실행
        const simpleResult = await pyodide.runPythonAsync(`
          import json
          result = {'test': 'hello', 'value': 123}
          json.dumps(result)
        `)

        console.log('간단한 Python 실행 결과:', simpleResult)
        console.log('결과 타입:', typeof simpleResult)

        // JSON 파싱 테스트
        if (typeof simpleResult === 'string') {
          const parsed = JSON.parse(simpleResult)
          console.log('파싱된 결과:', parsed)
        }

      } catch (error) {
        console.error('Python 직접 실행 에러:', error)
      }
    })
  })
})