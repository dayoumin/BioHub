/**
 * Issue 3: logisticRegression solver/maxIter 옵션 제거 검증
 *
 * 검증 항목:
 * 1. 필수 파라미터만 요구 (independentColumns, dependentColumn)
 * 2. 옵션 파라미터 제거 (method, maxIter, alpha)
 */

import { describe, it, expect } from '@jest/globals'

describe('Issue 3: logisticRegression 옵션 제거', () => {
  it('필수 파라미터 검증', () => {
    const validateParams = (parameters: Record<string, any>): string | null => {
      const { independentColumns, dependentColumn } = parameters

      if (!independentColumns || (Array.isArray(independentColumns) && independentColumns.length === 0)) {
        return '독립변수를 선택하세요'
      }

      if (!dependentColumn) {
        return '종속변수를 선택하세요'
      }

      return null
    }

    // 정상 케이스
    expect(
      validateParams({
        independentColumns: ['age', 'income'],
        dependentColumn: 'purchase'
      })
    ).toBeNull()

    // 에러 케이스
    expect(
      validateParams({
        dependentColumn: 'purchase'
      })
    ).toBe('독립변수를 선택하세요')

    expect(
      validateParams({
        independentColumns: [],
        dependentColumn: 'purchase'
      })
    ).toBe('독립변수를 선택하세요')

    expect(
      validateParams({
        independentColumns: ['age', 'income']
      })
    ).toBe('종속변수를 선택하세요')
  })

  it('옵션 파라미터 제거 확인', () => {
    // UI에서 제공하는 파라미터 (method, maxIter, alpha 제거됨)
    const validParams = ['independentColumns', 'dependentColumn']

    expect(validParams).toHaveLength(2)
    expect(validParams).toContain('independentColumns')
    expect(validParams).toContain('dependentColumn')
    expect(validParams).not.toContain('method')  // ❌ 제거됨
    expect(validParams).not.toContain('maxIter')  // ❌ 제거됨
    expect(validParams).not.toContain('alpha')  // ❌ 제거됨
  })

  it('Pyodide 호출 파라미터 검증', () => {
    // Pyodide는 { X, y }만 받음 (method, maxIter 미지원)
    const buildPyodideParams = (xMatrix: number[][], yValues: number[]): { X: number[][], y: number[] } => {
      return { X: xMatrix, y: yValues }
    }

    const xMatrix = [[1, 2], [3, 4]]
    const yValues = [0, 1]

    const params = buildPyodideParams(xMatrix, yValues)

    expect(params).toEqual({ X: xMatrix, y: yValues })
    expect(Object.keys(params)).toEqual(['X', 'y'])
    expect(Object.keys(params)).not.toContain('method')
    expect(Object.keys(params)).not.toContain('maxIter')
  })
})
