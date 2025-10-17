/**
 * Python 코드 직접 실행 테스트
 * runPythonAsync의 정확한 동작 확인
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'

let pyodideService: PyodideStatisticsService
const INIT_TIMEOUT = 60000

describe('Python 직접 실행 테스트', () => {
  beforeAll(async () => {
    pyodideService = PyodideStatisticsService.getInstance()
    await pyodideService.initialize()
  }, INIT_TIMEOUT)

  afterAll(() => {
    if (pyodideService) {
      pyodideService.dispose()
    }
  })

  test('다양한 반환 방식 테스트', async () => {
    // @ts-expect-error
    const pyodide = pyodideService.pyodide

    if (!pyodide) {
      throw new Error('Pyodide not initialized')
    }

    console.log('\n=== Python 반환값 테스트 ===\n')

    // 테스트 1: 단순 숫자 반환
    const test1 = await pyodide.runPythonAsync(`42`)
    console.log('테스트 1 (숫자):', test1, '타입:', typeof test1)

    // 테스트 2: 문자열 반환
    const test2 = await pyodide.runPythonAsync(`"hello"`)
    console.log('테스트 2 (문자열):', test2, '타입:', typeof test2)

    // 테스트 3: 딕셔너리 반환
    const test3 = await pyodide.runPythonAsync(`{'a': 1, 'b': 2}`)
    console.log('테스트 3 (딕셔너리):', test3, '타입:', typeof test3)

    // 테스트 4: json.dumps 사용
    const test4 = await pyodide.runPythonAsync(`
import json
result = {'a': 1, 'b': 2}
json.dumps(result)
    `)
    console.log('테스트 4 (json.dumps):', test4, '타입:', typeof test4)

    // 테스트 5: json.dumps 변수 할당
    const test5 = await pyodide.runPythonAsync(`
import json
result = {'a': 1, 'b': 2}
result_json = json.dumps(result)
result_json
    `)
    console.log('테스트 5 (json.dumps 변수):', test5, '타입:', typeof test5)

    // 테스트 6: json import 분리
    const test6 = await pyodide.runPythonAsync(`
result = {'a': 1, 'b': 2}

import json
json.dumps(result)
    `)
    console.log('테스트 6 (import 분리):', test6, '타입:', typeof test6)

    // 테스트 7: import json을 두 줄로
    const test7 = await pyodide.runPythonAsync(`
result = {'a': 1, 'b': 2}

import json
result_json = json.dumps(result)
result_json
    `)
    console.log('테스트 7 (import 두 줄):', test7, '타입:', typeof test7)

    // 파싱 테스트
    if (typeof test5 === 'string') {
      try {
        const parsed = JSON.parse(test5)
        console.log('\n테스트 5 파싱 성공:', parsed)
      } catch (e) {
        console.log('\n테스트 5 파싱 실패:', e.message)
      }
    }

    expect(test1).toBe(42)
    expect(test2).toBe('hello')
    expect(typeof test5).toBe('string')
  })

  test('실제 메서드와 동일한 구조 테스트', async () => {
    // @ts-expect-error
    const pyodide = pyodideService.pyodide

    console.log('\n=== 실제 메서드 구조 테스트 ===\n')

    const result = await pyodide.runPythonAsync(`
      import numpy as np
      from scipy import stats

      groups = [[1,2,3], [4,5,6], [7,8,9]]

      # F-통계량과 p-value 계산
      f_stat, p_value = stats.f_oneway(*groups)

      result = {
        'f_statistic': float(f_stat),
        'p_value': float(p_value)
      }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    console.log('반환값:', result)
    console.log('타입:', typeof result)

    if (typeof result === 'string') {
      const parsed = JSON.parse(result)
      console.log('파싱된 값:', parsed)
      expect(parsed.f_statistic).toBeDefined()
      expect(parsed.p_value).toBeDefined()
    }

    expect(typeof result).toBe('string')
  })
})