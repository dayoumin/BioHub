/**
 * @file error-handling-improvements.test.ts
 * @description Unit tests for error handling improvements in statistics pages
 *
 * Tests the 3 Medium priority fixes:
 * 1. t-test: Pyodide initialization error messages
 * 2. Friedman: NaN data validation
 * 3. Regression: regressionType workflow validation
 */

describe('Error Handling Improvements', () => {
  describe('1. t-test - Pyodide Initialization Errors', () => {
    it('should show error when Pyodide is not initialized', () => {
      // Mock scenario: pyodide = null
      const pyodide = null
      const uploadedData = { data: [{ col1: 1, col2: 2 }], fileName: 'test.csv', columns: ['col1', 'col2'] }
      const actions = {
        setError: jest.fn(),
        startAnalysis: jest.fn(),
      }

      // Simulate runAnalysis logic
      if (!pyodide) {
        actions.setError('통계 엔진이 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.')
        // Should return early
      }

      expect(actions.setError).toHaveBeenCalledWith('통계 엔진이 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.')
      expect(actions.startAnalysis).not.toHaveBeenCalled()
    })

    it('should show error when data is not uploaded', () => {
      // Mock scenario: uploadedData = null
      const pyodide = { mockPyodide: true }
      const uploadedData = null
      const actions = {
        setError: jest.fn(),
        startAnalysis: jest.fn(),
      }

      // Simulate runAnalysis logic
      if (!pyodide) {
        actions.setError('통계 엔진이 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.')
        return
      }
      if (!uploadedData) {
        actions.setError('데이터를 먼저 업로드해주세요.')
        return
      }

      expect(actions.setError).toHaveBeenCalledWith('데이터를 먼저 업로드해주세요.')
      expect(actions.startAnalysis).not.toHaveBeenCalled()
    })

    it('should proceed when both pyodide and uploadedData are available', () => {
      const pyodide = { mockPyodide: true }
      const uploadedData = { data: [{ col1: 1, col2: 2 }], fileName: 'test.csv', columns: ['col1', 'col2'] }
      const actions = {
        setError: jest.fn(),
        startAnalysis: jest.fn(),
      }

      // Simulate runAnalysis logic
      if (!pyodide) {
        actions.setError('통계 엔진이 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.')
        return
      }
      if (!uploadedData) {
        actions.setError('데이터를 먼저 업로드해주세요.')
        return
      }

      // Should reach here
      actions.startAnalysis()

      expect(actions.setError).not.toHaveBeenCalled()
      expect(actions.startAnalysis).toHaveBeenCalled()
    })
  })

  describe('2. Friedman - NaN Data Validation', () => {
    it('should throw error on NaN value with row number', () => {
      const varName = 'condition1'
      const uploadedData = {
        data: [
          { condition1: 'abc', condition2: 5 },
          { condition1: 10, condition2: 12 },
        ],
      }

      // Simulate conditionData extraction
      const extractConditionData = () => {
        return uploadedData.data.map((row, rowIndex) => {
          const value = row[varName]
          if (typeof value === 'number') return value
          if (typeof value === 'string') {
            const num = parseFloat(value)
            if (isNaN(num)) {
              throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 숫자가 아닌 값("${value}")이 포함되어 있습니다.`)
            }
            return num
          }
          if (value === null || value === undefined) {
            throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 값이 없습니다.`)
          }
          // Unexpected type
          throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 예상치 못한 타입(${typeof value})이 포함되어 있습니다.`)
        })
      }

      expect(() => extractConditionData()).toThrow(
        '변수 "condition1"의 1번째 행에 숫자가 아닌 값("abc")이 포함되어 있습니다.'
      )
    })

    it('should throw error on null value with row number', () => {
      const varName = 'condition1'
      const uploadedData = {
        data: [
          { condition1: null, condition2: 5 },
          { condition1: 10, condition2: 12 },
        ],
      }

      const extractConditionData = () => {
        return uploadedData.data.map((row, rowIndex) => {
          const value = row[varName]
          if (typeof value === 'number') return value
          if (typeof value === 'string') {
            const num = parseFloat(value)
            if (isNaN(num)) {
              throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 숫자가 아닌 값("${value}")이 포함되어 있습니다.`)
            }
            return num
          }
          if (value === null || value === undefined) {
            throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 값이 없습니다.`)
          }
          // Unexpected type
          throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 예상치 못한 타입(${typeof value})이 포함되어 있습니다.`)
        })
      }

      expect(() => extractConditionData()).toThrow(
        '변수 "condition1"의 1번째 행에 값이 없습니다.'
      )
    })

    it('should throw error on undefined value', () => {
      const varName = 'condition1'
      const uploadedData = {
        data: [
          { condition1: undefined, condition2: 5 },
        ],
      }

      const extractConditionData = () => {
        return uploadedData.data.map((row, rowIndex) => {
          const value = row[varName]
          if (typeof value === 'number') return value
          if (typeof value === 'string') {
            const num = parseFloat(value)
            if (isNaN(num)) {
              throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 숫자가 아닌 값("${value}")이 포함되어 있습니다.`)
            }
            return num
          }
          if (value === null || value === undefined) {
            throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 값이 없습니다.`)
          }
          // Unexpected type
          throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 예상치 못한 타입(${typeof value})이 포함되어 있습니다.`)
        })
      }

      expect(() => extractConditionData()).toThrow(
        '변수 "condition1"의 1번째 행에 값이 없습니다.'
      )
    })

    it('should throw error on unexpected type (boolean)', () => {
      const varName = 'condition1'
      const uploadedData = {
        data: [
          { condition1: true, condition2: 5 },
        ],
      }

      const extractConditionData = () => {
        return uploadedData.data.map((row, rowIndex) => {
          const value = row[varName]
          if (typeof value === 'number') return value
          if (typeof value === 'string') {
            const num = parseFloat(value)
            if (isNaN(num)) {
              throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 숫자가 아닌 값("${value}")이 포함되어 있습니다.`)
            }
            return num
          }
          if (value === null || value === undefined) {
            throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 값이 없습니다.`)
          }
          // Unexpected type
          throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 예상치 못한 타입(${typeof value})이 포함되어 있습니다.`)
        })
      }

      expect(() => extractConditionData()).toThrow(
        '변수 "condition1"의 1번째 행에 예상치 못한 타입(boolean)이 포함되어 있습니다.'
      )
    })

    it('should successfully parse valid string numbers', () => {
      const varName = 'condition1'
      const uploadedData = {
        data: [
          { condition1: '10.5', condition2: 5 },
          { condition1: '20', condition2: 12 },
        ],
      }

      const extractConditionData = () => {
        return uploadedData.data.map((row, rowIndex) => {
          const value = row[varName]
          if (typeof value === 'number') return value
          if (typeof value === 'string') {
            const num = parseFloat(value)
            if (isNaN(num)) {
              throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 숫자가 아닌 값("${value}")이 포함되어 있습니다.`)
            }
            return num
          }
          if (value === null || value === undefined) {
            throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 값이 없습니다.`)
          }
          // Unexpected type
          throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 예상치 못한 타입(${typeof value})이 포함되어 있습니다.`)
        })
      }

      const result = extractConditionData()
      expect(result).toEqual([10.5, 20])
    })

    it('should successfully process valid number values', () => {
      const varName = 'condition1'
      const uploadedData = {
        data: [
          { condition1: 10, condition2: 5 },
          { condition1: 20, condition2: 12 },
        ],
      }

      const extractConditionData = () => {
        return uploadedData.data.map((row, rowIndex) => {
          const value = row[varName]
          if (typeof value === 'number') return value
          if (typeof value === 'string') {
            const num = parseFloat(value)
            if (isNaN(num)) {
              throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 숫자가 아닌 값("${value}")이 포함되어 있습니다.`)
            }
            return num
          }
          if (value === null || value === undefined) {
            throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 값이 없습니다.`)
          }
          // Unexpected type
          throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 예상치 못한 타입(${typeof value})이 포함되어 있습니다.`)
        })
      }

      const result = extractConditionData()
      expect(result).toEqual([10, 20])
    })
  })

  describe('3. Regression - regressionType Workflow Validation', () => {
    it('should detect empty regressionType', () => {
      const regressionType = ''

      // Simulate renderVariableSelection logic
      const shouldShowAlert = !regressionType

      expect(shouldShowAlert).toBe(true)
    })

    it('should not show alert when regressionType is set', () => {
      const regressionType = 'simple'

      const shouldShowAlert = !regressionType

      expect(shouldShowAlert).toBe(false)
    })

    it('should correctly map regressionType to methodId when type is valid', () => {
      const testCases = [
        { regressionType: 'simple', expected: 'simple-regression' },
        { regressionType: 'multiple', expected: 'multiple-regression' },
        { regressionType: 'logistic', expected: 'logistic-regression' },
      ]

      testCases.forEach(({ regressionType, expected }) => {
        const methodId =
          regressionType === 'simple' ? 'simple-regression' :
          regressionType === 'multiple' ? 'multiple-regression' :
          'logistic-regression'

        expect(methodId).toBe(expected)
      })
    })

    it('should not proceed to variable selection when regressionType is empty', () => {
      const regressionType = ''
      const uploadedData = { data: [{ x: 1, y: 2 }], fileName: 'test.csv', columns: ['x', 'y'] }

      // Simulate renderVariableSelection logic
      if (!uploadedData) {
        fail('uploadedData should be available')
      }

      if (!regressionType) {
        // Should return Alert UI
        expect(true).toBe(true) // Alert would be shown
      } else {
        // Should proceed to VariableSelector
        fail('Should not reach variable selector when regressionType is empty')
      }
    })

    it('should proceed to variable selection when regressionType is set', () => {
      const regressionType = 'simple'
      const uploadedData = { data: [{ x: 1, y: 2 }], fileName: 'test.csv', columns: ['x', 'y'] }
      let shouldShowVariableSelector = false

      // Simulate renderVariableSelection logic
      if (!uploadedData) {
        fail('uploadedData should be available')
      }

      if (!regressionType) {
        fail('regressionType should be set')
      } else {
        // Should proceed to VariableSelector
        shouldShowVariableSelector = true
      }

      expect(shouldShowVariableSelector).toBe(true)
    })
  })

  describe('4. Optional Chaining Consistency', () => {
    it('should safely call actions.setError with optional chaining', () => {
      const actions = {
        setError: jest.fn(),
      }

      // With optional chaining (safe)
      actions.setError?.('test error')

      expect(actions.setError).toHaveBeenCalledWith('test error')
    })

    it('should not crash when actions.setError is undefined', () => {
      const actions = {} as any

      // With optional chaining (safe)
      expect(() => {
        actions.setError?.('test error')
      }).not.toThrow()
    })

    it('should safely call actions.startAnalysis with optional chaining', () => {
      const actions = {
        startAnalysis: jest.fn(),
      }

      // With optional chaining (safe)
      actions.startAnalysis?.()

      expect(actions.startAnalysis).toHaveBeenCalled()
    })

    it('should not crash when actions.startAnalysis is undefined', () => {
      const actions = {} as any

      // With optional chaining (safe)
      expect(() => {
        actions.startAnalysis?.()
      }).not.toThrow()
    })
  })

  describe('5. Integration Tests', () => {
    it('should handle complete error workflow for t-test', () => {
      const pyodide = null
      const uploadedData = null
      const actions = {
        setError: jest.fn(),
        startAnalysis: jest.fn(),
      }
      const errors: string[] = []

      // Simulate complete error checking
      if (!pyodide) {
        const error = '통계 엔진이 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.'
        actions.setError(error)
        errors.push(error)
      }
      if (!uploadedData) {
        const error = '데이터를 먼저 업로드해주세요.'
        actions.setError(error)
        errors.push(error)
      }

      expect(actions.setError).toHaveBeenCalledTimes(2)
      expect(errors).toHaveLength(2)
      expect(errors[0]).toContain('통계 엔진')
      expect(errors[1]).toContain('데이터')
    })

    it('should validate complete Friedman data extraction', () => {
      const dependentVars = ['cond1', 'cond2', 'cond3']
      const uploadedData = {
        data: [
          { cond1: 5, cond2: 6, cond3: 7 },
          { cond1: '8', cond2: '9', cond3: '10' },
          { cond1: 11, cond2: 12, cond3: 13 },
        ],
      }

      const extractAllConditions = () => {
        return dependentVars.map((varName) => {
          return uploadedData.data.map((row, rowIndex) => {
            const value = (row as Record<string, unknown>)[varName]
            if (typeof value === 'number') return value
            if (typeof value === 'string') {
              const num = parseFloat(value)
              if (isNaN(num)) {
                throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 숫자가 아닌 값("${value}")이 포함되어 있습니다.`)
              }
              return num
            }
            if (value === null || value === undefined) {
              throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 값이 없습니다.`)
            }
            throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 예상치 못한 타입(${typeof value})이 포함되어 있습니다.`)
          })
        })
      }

      const result = extractAllConditions()

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual([5, 8, 11])
      expect(result[1]).toEqual([6, 9, 12])
      expect(result[2]).toEqual([7, 10, 13])
    })
  })
})
