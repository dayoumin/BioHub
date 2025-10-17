/**
 * Python 반환값 문제 정확한 진단
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'

let pyodideService: PyodideStatisticsService
const INIT_TIMEOUT = 60000

describe.skip('Python 반환값 테스트', () => {
  beforeAll(async () => {
    pyodideService = PyodideStatisticsService.getInstance()
    await pyodideService.initialize()
  }, INIT_TIMEOUT)

  afterAll(() => {
    if (pyodideService) {
      pyodideService.dispose()
    }
  })

  test('다양한 반환 패턴 테스트', async () => {
    // @ts-expect-error
    const pyodide = pyodideService.pyodide

    if (!pyodide) {
      throw new Error('Pyodide not initialized')
    }

    console.log('\n=== 다양한 반환 패턴 테스트 ===\n')

    // 테스트 1: 단순 변수
    const test1 = await pyodide.runPythonAsync(`
      x = 42
      x
    `)
    console.log('테스트 1 (변수):', test1)

    // 테스트 2: 딕셔너리 변수
    const test2 = await pyodide.runPythonAsync(`
      result = {'a': 1, 'b': 2}
      result
    `)
    console.log('테스트 2 (딕셔너리 변수):', test2)

    // 테스트 3: 직접 딕셔너리
    const test3 = await pyodide.runPythonAsync(`
      {'a': 1, 'b': 2}
    `)
    console.log('테스트 3 (직접 딕셔너리):', test3)

    // 테스트 4: 다른 변수를 거친 경우
    const test4 = await pyodide.runPythonAsync(`
      data = {'a': 1, 'b': 2}
      result = data
      result
    `)
    console.log('테스트 4 (변수 할당):', test4)

    // 테스트 5: 함수에서 반환
    const test5 = await pyodide.runPythonAsync(`
      def get_result():
        return {'a': 1, 'b': 2}

      get_result()
    `)
    console.log('테스트 5 (함수 반환):', test5)

    // 테스트 6: globals 사용
    const test6 = await pyodide.runPythonAsync(`
      result = {'a': 1, 'b': 2}
      globals()['output'] = result
      globals()['output']
    `)
    console.log('테스트 6 (globals):', test6)

    // 테스트 7: 마지막에 명시적 result
    const test7 = await pyodide.runPythonAsync(`
      # 복잡한 계산
      a = 1
      b = 2
      result = {'a': a, 'b': b}
      # 마지막 줄
      result
    `)
    console.log('테스트 7 (명시적 result):', test7)

    // 테스트 8: Python eval 사용
    const test8 = await pyodide.runPythonAsync(`
      result = {'a': 1, 'b': 2}
      eval('result')
    `)
    console.log('테스트 8 (eval):', test8)

    // 테스트 9: globals().get 사용
    pyodide.globals.set('test_result', null)
    const test9 = await pyodide.runPythonAsync(`
      result = {'a': 1, 'b': 2}
      import sys
      sys.modules['__main__'].test_result = result
      sys.modules['__main__'].test_result
    `)
    console.log('테스트 9 (sys.modules):', test9)
    console.log('globals에서 직접 가져오기:', pyodide.globals.get('test_result'))

    expect(test2).toBeDefined()
    expect(test2.a).toBe(1)
    expect(test2.b).toBe(2)
  })
})