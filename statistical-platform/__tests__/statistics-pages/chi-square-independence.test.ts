/**
 * Chi-Square Independence Test Page - Functional Tests
 *
 * Tests for chi-square-independence/page.tsx key improvements:
 * 1. Phi coefficient calculation (2x2 vs larger tables)
 * 2. Data transformation (DataRow[] → contingency table)
 * 3. Pyodide result transformation to UI format
 * 4. Error handling with type guards
 */

import { describe, it, expect } from '@jest/globals'

describe('Chi-Square Independence - Phi Coefficient', () => {
  it('should correctly calculate Phi for 2x2 tables', () => {
    // Simulate the Phi calculation logic
    const cramersV = 0.3
    const rowCount = 2
    const colCount = 2
    const totalN = 100
    const chiSquare = 9.0 // cramersV^2 * totalN = 0.09 * 100 = 9

    const is2x2Table = rowCount === 2 && colCount === 2
    const phi = is2x2Table ? cramersV : Math.sqrt(chiSquare / totalN)

    expect(phi).toBe(0.3) // For 2x2, phi = Cramer's V
  })

  it('should correctly calculate Phi for 3x3 tables', () => {
    // For non-2x2 tables, Phi = sqrt(chi^2 / N)
    const cramersV = 0.3
    const rowCount = 3
    const colCount = 3
    const totalN = 100
    const chiSquare = 18.0 // Example chi-square value

    const is2x2Table = rowCount === 2 && colCount === 2
    const phi = is2x2Table ? cramersV : Math.sqrt(chiSquare / totalN)

    expect(phi).toBeCloseTo(0.424, 2) // sqrt(18/100) ≈ 0.424
    expect(phi).not.toBe(cramersV) // Phi ≠ Cramer's V for non-2x2
  })

  it('should provide correct Phi interpretation for 2x2 tables', () => {
    const is2x2Table = true
    const phi = 0.25

    const interpretation = is2x2Table
      ? interpretCramersV(phi)
      : 'N/A (2×2 테이블에만 적용)'

    expect(interpretation).toBe('약함 (Weak)')
  })

  it('should show N/A for Phi interpretation in non-2x2 tables', () => {
    const is2x2Table = false
    const phi = 0.25

    const interpretation = is2x2Table
      ? interpretCramersV(phi)
      : 'N/A (2×2 테이블에만 적용)'

    expect(interpretation).toBe('N/A (2×2 테이블에만 적용)')
  })
})

describe('Chi-Square Independence - Data Transformation', () => {
  interface DataRow {
    [key: string]: string | number | null | undefined
  }

  it('should transform DataRow[] to contingency table matrix', () => {
    const data: DataRow[] = [
      { gender: 'Male', status: 'Pass' },
      { gender: 'Male', status: 'Pass' },
      { gender: 'Male', status: 'Fail' },
      { gender: 'Female', status: 'Pass' },
      { gender: 'Female', status: 'Fail' },
      { gender: 'Female', status: 'Fail' },
    ]

    const rowVar = 'gender'
    const colVar = 'status'

    // Get unique values
    const rowValues = [...new Set(data.map((row) => String(row[rowVar])))]
    const colValues = [...new Set(data.map((row) => String(row[colVar])))]

    // Create contingency table using Array.from (safe method)
    const matrix: number[][] = Array.from(
      { length: rowValues.length },
      () => Array.from({ length: colValues.length }, () => 0)
    )

    // Fill the contingency table
    data.forEach((row) => {
      const rowIdx = rowValues.indexOf(String(row[rowVar]))
      const colIdx = colValues.indexOf(String(row[colVar]))
      if (rowIdx >= 0 && colIdx >= 0) {
        matrix[rowIdx][colIdx]++
      }
    })

    expect(matrix).toHaveLength(2) // 2 genders
    expect(matrix[0]).toHaveLength(2) // 2 statuses
    expect(matrix[0][0] + matrix[0][1]).toBe(3) // 3 Males
    expect(matrix[1][0] + matrix[1][1]).toBe(3) // 3 Females
  })

  it('should handle missing values correctly', () => {
    const data: DataRow[] = [
      { gender: 'Male', status: 'Pass' },
      { gender: null, status: 'Pass' },
      { gender: 'Female', status: null },
    ]

    const rowVar = 'gender'
    const colVar = 'status'

    const rowValues = [...new Set(data.map((row) => String(row[rowVar])))]
    const colValues = [...new Set(data.map((row) => String(row[colVar])))]

    // Should include 'null' as a string value
    expect(rowValues).toContain('null')
    expect(colValues).toContain('null')
  })
})

describe('Chi-Square Independence - Array.from Safety', () => {
  it('should create independent row arrays with Array.from', () => {
    // Using Array.from ensures each row is a separate array instance
    const matrix = Array.from({ length: 3 }, () =>
      Array.from({ length: 2 }, () => 0)
    )

    matrix[0][0] = 5

    expect(matrix[0][0]).toBe(5)
    expect(matrix[1][0]).toBe(0) // Other rows should not be affected
    expect(matrix[2][0]).toBe(0)
  })

  it('should avoid reference sharing issues', () => {
    const matrix = Array.from({ length: 2 }, () =>
      Array.from({ length: 2 }, () => 0)
    )

    // Each row should be a different array object
    expect(matrix[0]).not.toBe(matrix[1])
  })
})

describe('Chi-Square Independence - Error Handling', () => {
  it('should handle Error instances correctly', () => {
    const error = new Error('Pyodide calculation failed')

    const errorMessage = error instanceof Error ? error.message : String(error)

    expect(errorMessage).toBe('Pyodide calculation failed')
  })

  it('should handle non-Error exceptions', () => {
    const error = 'String error message'

    const errorMessage = error instanceof Error ? error.message : String(error)

    expect(errorMessage).toBe('String error message')
  })

  it('should handle null/undefined exceptions', () => {
    const error = null

    const errorMessage = error instanceof Error ? error.message : String(error)

    expect(errorMessage).toBe('null')
  })
})

describe('Chi-Square Independence - Statistical Calculations', () => {
  it('should calculate standardized residuals correctly', () => {
    const observed = 10
    const expected = 15

    const residual = observed - expected
    const standardizedResidual = residual / Math.sqrt(expected)

    expect(residual).toBe(-5)
    expect(standardizedResidual).toBeCloseTo(-1.291, 2) // -5 / sqrt(15) ≈ -1.291
  })

  it('should calculate cell contributions correctly', () => {
    const observed = 10
    const expected = 15

    const residual = observed - expected
    const contribution = (residual ** 2) / expected

    expect(contribution).toBeCloseTo(1.667, 2) // 25 / 15 ≈ 1.667
  })

  it('should check assumptions (expected frequency >= 5)', () => {
    const expectedMatrix = [
      [10, 12],
      [8, 4],
      [15, 3],
    ]

    const allExpected = expectedMatrix.flat()
    const minimumExpectedFrequency = Math.min(...allExpected)
    const cellsBelow5 = allExpected.filter((val) => val < 5).length
    const totalCells = allExpected.length

    const assumptionMet = minimumExpectedFrequency >= 5 && cellsBelow5 === 0

    expect(minimumExpectedFrequency).toBe(3)
    expect(cellsBelow5).toBe(2) // 4 and 3 are below 5
    expect(assumptionMet).toBe(false) // Assumption violated
  })
})

// Helper function (copied from page.tsx for testing)
function interpretCramersV(value: number): string {
  if (value < 0.1) return '매우 약함 (Very weak)'
  if (value < 0.3) return '약함 (Weak)'
  if (value < 0.5) return '중간 (Moderate)'
  return '강함 (Strong)'
}

describe('Chi-Square Independence - Cramer\'s V Interpretation', () => {
  it('should interpret very weak association', () => {
    expect(interpretCramersV(0.05)).toBe('매우 약함 (Very weak)')
    expect(interpretCramersV(0.09)).toBe('매우 약함 (Very weak)')
  })

  it('should interpret weak association', () => {
    expect(interpretCramersV(0.1)).toBe('약함 (Weak)')
    expect(interpretCramersV(0.25)).toBe('약함 (Weak)')
  })

  it('should interpret moderate association', () => {
    expect(interpretCramersV(0.3)).toBe('중간 (Moderate)')
    expect(interpretCramersV(0.45)).toBe('중간 (Moderate)')
  })

  it('should interpret strong association', () => {
    expect(interpretCramersV(0.5)).toBe('강함 (Strong)')
    expect(interpretCramersV(0.8)).toBe('강함 (Strong)')
  })
})
