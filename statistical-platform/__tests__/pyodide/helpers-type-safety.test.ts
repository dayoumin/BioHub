/**
 * Python Worker helpers.py 타입 안전성 테스트
 *
 * 목적:
 * - clean_array, clean_paired_arrays 등 함수의 문자열 처리 검증
 * - TypeError 방지 (np.isnan() 문자열 에러)
 * - 다양한 타입 입력에 대한 안전성 확보
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

// Pyodide 타입 정의
interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>
  globals: {
    get: (name: string) => unknown
  }
}

describe('Python helpers.py Type Safety', () => {
  let pyodide: PyodideInterface | null = null

  beforeAll(async () => {
    // Pyodide 로드 (CDN에서)
    const { loadPyodide } = await import('pyodide')
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
    }) as PyodideInterface

    // NumPy 패키지 로드
    await pyodide.runPythonAsync('import micropip')
    await pyodide.runPythonAsync('await micropip.install("numpy")')

    // helpers.py 로드
    const helpersCode = `
import numpy as np
from typing import List, Tuple, Union

def clean_array(data):
    result = []
    for x in data:
        if x is None:
            continue
        try:
            x_float = float(x)
            if not (np.isnan(x_float) or np.isinf(x_float)):
                result.append(x_float)
        except (TypeError, ValueError):
            continue
    return np.array(result)

def clean_paired_arrays(array1, array2):
    if len(array1) != len(array2):
        raise ValueError(f"Arrays must have same length: {len(array1)} != {len(array2)}")

    clean1 = []
    clean2 = []

    for i in range(len(array1)):
        val1 = array1[i]
        val2 = array2[i]

        if val1 is None or val2 is None:
            continue

        try:
            val1_float = float(val1)
            val2_float = float(val2)

            if (np.isnan(val1_float) or np.isinf(val1_float) or
                np.isnan(val2_float) or np.isinf(val2_float)):
                continue

            clean1.append(val1_float)
            clean2.append(val2_float)
        except (TypeError, ValueError):
            continue

    return np.array(clean1), np.array(clean2)

def clean_groups(groups):
    return [clean_array(group) for group in groups]

def is_valid_number(value):
    if value is None:
        return False
    try:
        value_float = float(value)
        return not (np.isnan(value_float) or np.isinf(value_float))
    except (TypeError, ValueError):
        return False
`
    await pyodide.runPythonAsync(helpersCode)
  }, 60000) // 60초 타임아웃

  afterAll(() => {
    pyodide = null
  })

  describe('clean_array()', () => {
    it('should handle pure numeric data', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      const result = await pyodide.runPythonAsync(`
result = clean_array([1, 2, 3, 4, 5])
result.tolist()
`)
      expect(result).toEqual([1, 2, 3, 4, 5])
    })

    it('should skip None values', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      const result = await pyodide.runPythonAsync(`
result = clean_array([1, None, 3, None, 5])
result.tolist()
`)
      expect(result).toEqual([1, 3, 5])
    })

    it('should skip NaN values', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      const result = await pyodide.runPythonAsync(`
result = clean_array([1, float('nan'), 3, float('nan'), 5])
result.tolist()
`)
      expect(result).toEqual([1, 3, 5])
    })

    it('should skip Inf values', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      const result = await pyodide.runPythonAsync(`
result = clean_array([1, float('inf'), 3, float('-inf'), 5])
result.tolist()
`)
      expect(result).toEqual([1, 3, 5])
    })

    it('should handle string numbers (convert to float)', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      const result = await pyodide.runPythonAsync(`
result = clean_array(["1", "2.5", "3", "4.7", "5"])
result.tolist()
`)
      expect(result).toEqual([1, 2.5, 3, 4.7, 5])
    })

    it('should skip non-numeric strings (CRITICAL FIX)', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      // 이전에는 TypeError 발생!
      const result = await pyodide.runPythonAsync(`
result = clean_array([1, "hello", 3, "world", 5])
result.tolist()
`)
      expect(result).toEqual([1, 3, 5])
    })

    it('should handle mixed types (numbers, strings, None, NaN)', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      const result = await pyodide.runPythonAsync(`
result = clean_array([1, "2", None, "hello", float('nan'), 5, "6.5", float('inf')])
result.tolist()
`)
      expect(result).toEqual([1, 2, 5, 6.5])
    })

    it('should return empty array for all invalid data', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      const result = await pyodide.runPythonAsync(`
result = clean_array([None, "hello", float('nan'), "world", float('inf')])
result.tolist()
`)
      expect(result).toEqual([])
    })
  })

  describe('clean_paired_arrays()', () => {
    it('should handle pure numeric pairs', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      const result = await pyodide.runPythonAsync(`
arr1, arr2 = clean_paired_arrays([1, 2, 3], [4, 5, 6])
[arr1.tolist(), arr2.tolist()]
`)
      expect(result).toEqual([[1, 2, 3], [4, 5, 6]])
    })

    it('should skip pairs with None', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      const result = await pyodide.runPythonAsync(`
arr1, arr2 = clean_paired_arrays([1, None, 3], [4, 5, None])
[arr1.tolist(), arr2.tolist()]
`)
      expect(result).toEqual([[1], [4]])
    })

    it('should skip pairs with string (CRITICAL FIX)', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      const result = await pyodide.runPythonAsync(`
arr1, arr2 = clean_paired_arrays([1, "hello", 3], [4, 5, 6])
[arr1.tolist(), arr2.tolist()]
`)
      expect(result).toEqual([[1, 3], [4, 6]])
    })

    it('should handle string numbers in pairs', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      const result = await pyodide.runPythonAsync(`
arr1, arr2 = clean_paired_arrays(["1", "2", "3"], ["4", "5", "6"])
[arr1.tolist(), arr2.tolist()]
`)
      expect(result).toEqual([[1, 2, 3], [4, 5, 6]])
    })

    it('should throw error for different lengths', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      await expect(
        pyodide.runPythonAsync(`
clean_paired_arrays([1, 2, 3], [4, 5])
`)
      ).rejects.toThrow()
    })
  })

  describe('clean_groups()', () => {
    it('should clean multiple groups (CRITICAL - Kruskal-Wallis fix)', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      const result = await pyodide.runPythonAsync(`
groups = clean_groups([
    [1, 2, "hello", 3],
    [4, None, 5, 6],
    ["7", "8", float('nan'), 9]
])
[g.tolist() for g in groups]
`)
      expect(result).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ])
    })

    it('should handle empty groups after cleaning', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      const result = await pyodide.runPythonAsync(`
groups = clean_groups([
    [1, 2, 3],
    ["hello", "world"],
    [7, 8, 9]
])
[g.tolist() for g in groups]
`)
      expect(result).toEqual([
        [1, 2, 3],
        [], // 모두 문자열이면 빈 배열
        [7, 8, 9],
      ])
    })
  })

  describe('is_valid_number()', () => {
    it('should return true for valid numbers', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      const result = await pyodide.runPythonAsync(`
[
    is_valid_number(1),
    is_valid_number(2.5),
    is_valid_number(-10),
    is_valid_number(0)
]
`)
      expect(result).toEqual([true, true, true, true])
    })

    it('should return false for invalid values', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      const result = await pyodide.runPythonAsync(`
[
    is_valid_number(None),
    is_valid_number(float('nan')),
    is_valid_number(float('inf')),
    is_valid_number(float('-inf'))
]
`)
      expect(result).toEqual([false, false, false, false])
    })

    it('should return false for strings (CRITICAL FIX)', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      const result = await pyodide.runPythonAsync(`
[
    is_valid_number("hello"),
    is_valid_number("world"),
    is_valid_number("")
]
`)
      expect(result).toEqual([false, false, false])
    })

    it('should return true for string numbers', async () => {
      if (!pyodide) throw new Error('Pyodide not loaded')

      const result = await pyodide.runPythonAsync(`
[
    is_valid_number("1"),
    is_valid_number("2.5"),
    is_valid_number("-10")
]
`)
      expect(result).toEqual([true, true, true])
    })
  })
})
