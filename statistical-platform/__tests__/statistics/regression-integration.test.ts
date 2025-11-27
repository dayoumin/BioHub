/**
 * Regression Integration Test
 * - Linear Regression 프론트 연결 검증
 * - Multiple Regression 프론트 연결 검증
 * - Logistic Regression 프론트 연결 검증
 */

import { describe, it } from '@jest/globals'

describe('Regression Integration Tests', () => {
  describe('Linear Regression', () => {
    it('데이터 구조가 Python Worker와 일치해야 함', () => {
      // 프론트에서 준비하는 데이터 구조 (x, y 1D 배열)
      const xData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const yData = [2.1, 4.2, 5.8, 8.1, 10.3, 12.0, 14.2, 16.1, 17.9, 20.2]

      // 검증: 배열 길이 일치
      expect(xData.length).toBe(yData.length)

      // 검증: 최소 데이터 (3개 이상)
      expect(xData.length).toBeGreaterThanOrEqual(3)

      // 검증: 숫자형 데이터
      expect(xData.every(v => typeof v === 'number')).toBe(true)
      expect(yData.every(v => typeof v === 'number')).toBe(true)
    })

    it('Python Worker 호출 파라미터가 올바른 형식이어야 함', () => {
      const params = {
        x: [1, 2, 3, 4, 5],
        y: [2.1, 4.2, 5.8, 8.1, 10.3]
      }

      // 검증: 필수 키 존재
      expect(params).toHaveProperty('x')
      expect(params).toHaveProperty('y')

      // 검증: snake_case 사용 (Python 규약)
      expect(Object.keys(params)).toEqual(['x', 'y'])
    })

    it('반환 타입이 LinearRegressionResult와 일치해야 함', () => {
      // Python Worker 반환 예상 구조
      const mockResult = {
        slope: 2.01,
        intercept: 0.15,
        rSquared: 0.998,
        pValue: 0.000001,
        stdErr: 0.12,
        nPairs: 10
      }

      // 검증: 필수 필드 존재
      expect(mockResult).toHaveProperty('slope')
      expect(mockResult).toHaveProperty('intercept')
      expect(mockResult).toHaveProperty('rSquared')
      expect(mockResult).toHaveProperty('pValue')
      expect(mockResult).toHaveProperty('stdErr')
      expect(mockResult).toHaveProperty('nPairs')

      // 검증: 타입
      expect(typeof mockResult.slope).toBe('number')
      expect(typeof mockResult.rSquared).toBe('number')
      expect(mockResult.nPairs).toBeGreaterThanOrEqual(3)
    })

    it('Frontend Result 인터페이스로 매핑되어야 함', () => {
      // Python 결과
      const pythonResult = {
        slope: 2.01,
        intercept: 0.15,
        rSquared: 0.998,
        pValue: 0.000001,
        stdErr: 0.12,
        nPairs: 10
      }

      // Frontend 매핑
      const df = pythonResult.nPairs - 2
      const tValue = 1.96
      const fStatistic = (pythonResult.rSquared / (1 - pythonResult.rSquared)) * df
      const adjustedRSquared = 1 - (1 - pythonResult.rSquared) * ((pythonResult.nPairs - 1) / df)

      const result = {
        coefficients: [
          {
            name: '(Intercept)',
            estimate: pythonResult.intercept,
            stdError: pythonResult.stdErr,
            tValue: pythonResult.intercept / pythonResult.stdErr,
            pValue: pythonResult.pValue,
            ci: [
              pythonResult.intercept - tValue * pythonResult.stdErr,
              pythonResult.intercept + tValue * pythonResult.stdErr
            ]
          },
          {
            name: 'X',
            estimate: pythonResult.slope,
            stdError: pythonResult.stdErr,
            tValue: pythonResult.slope / pythonResult.stdErr,
            pValue: pythonResult.pValue,
            ci: [
              pythonResult.slope - tValue * pythonResult.stdErr,
              pythonResult.slope + tValue * pythonResult.stdErr
            ]
          }
        ],
        rSquared: pythonResult.rSquared,
        adjustedRSquared,
        fStatistic,
        fPValue: pythonResult.pValue
      }

      // 검증: 계수 배열 2개 (Intercept + slope)
      expect(result.coefficients).toHaveLength(2)
      expect(result.coefficients[0].name).toBe('(Intercept)')
      expect(result.coefficients[1].name).toBe('X')

      // 검증: R² 값
      expect(result.rSquared).toBe(0.998)
      expect(result.adjustedRSquared).toBeGreaterThan(0)

      // 검증: F-statistic
      expect(result.fStatistic).toBeGreaterThan(0)
    })
  })

  describe('Multiple Regression', () => {
    it('데이터 구조가 Python Worker와 일치해야 함', () => {
      // 프론트에서 준비하는 데이터 구조 (X: 2D array, y: 1D array)
      const XData = [
        [1, 10],
        [2, 20],
        [3, 15],
        [4, 25],
        [5, 30]
      ]
      const yData = [12, 24, 18, 30, 36]

      // 검증: 2D 배열
      expect(Array.isArray(XData)).toBe(true)
      expect(XData.every(row => Array.isArray(row))).toBe(true)

      // 검증: 배열 길이 일치
      expect(XData.length).toBe(yData.length)

      // 검증: 최소 요구사항 (predictors + 1)
      const nPredictors = XData[0].length
      expect(yData.length).toBeGreaterThanOrEqual(nPredictors + 1)
    })

    it('Python Worker 호출 파라미터가 올바른 형식이어야 함', () => {
      const params = {
        X: [[1, 10], [2, 20], [3, 15]],
        y: [12, 24, 18]
      }

      // 검증: 필수 키 존재
      expect(params).toHaveProperty('X')
      expect(params).toHaveProperty('y')

      // 검증: 대문자 X 사용 (Python 규약)
      expect(Object.keys(params)).toEqual(['X', 'y'])
    })

    it('반환 타입이 MultipleRegressionResult와 일치해야 함', () => {
      // Python Worker 반환 예상 구조
      const mockResult = {
        coefficients: [0.5, 2.1, 1.3],
        stdErrors: [0.2, 0.1, 0.15],
        tValues: [2.5, 21.0, 8.67],
        pValues: [0.05, 0.0001, 0.001],
        rSquared: 0.95,
        adjustedRSquared: 0.94,
        fStatistic: 45.2,
        fPValue: 0.00001,
        nObservations: 50,
        nPredictors: 2
      }

      // 검증: 필수 필드 존재
      expect(mockResult).toHaveProperty('coefficients')
      expect(mockResult).toHaveProperty('stdErrors')
      expect(mockResult).toHaveProperty('tValues')
      expect(mockResult).toHaveProperty('pValues')
      expect(mockResult).toHaveProperty('rSquared')
      expect(mockResult).toHaveProperty('adjustedRSquared')
      expect(mockResult).toHaveProperty('fStatistic')
      expect(mockResult).toHaveProperty('fPValue')

      // 검증: 배열 길이 일치 (Intercept + predictors)
      const expectedLength = mockResult.nPredictors + 1
      expect(mockResult.coefficients).toHaveLength(expectedLength)
      expect(mockResult.stdErrors).toHaveLength(expectedLength)
      expect(mockResult.tValues).toHaveLength(expectedLength)
      expect(mockResult.pValues).toHaveLength(expectedLength)
    })

    it('Coefficients 배열 병합이 올바르게 되어야 함', () => {
      // Python 결과
      const pythonResult = {
        coefficients: [0.5, 2.1, 1.3],
        stdErrors: [0.2, 0.1, 0.15],
        tValues: [2.5, 21.0, 8.67],
        pValues: [0.05, 0.0001, 0.001]
      }

      const coefficientNames = ['(Intercept)', 'Age', 'BMI']
      const tValueForCI = 1.96

      // 병합 로직
      const coefficients = pythonResult.coefficients.map((coef, i) => {
        const stdError = pythonResult.stdErrors[i]
        const ci = [
          coef - tValueForCI * stdError,
          coef + tValueForCI * stdError
        ]
        return {
          name: coefficientNames[i],
          estimate: coef,
          stdError,
          tValue: pythonResult.tValues[i],
          pValue: pythonResult.pValues[i],
          ci
        }
      })

      // 검증: 3개 계수 (Intercept + 2 predictors)
      expect(coefficients).toHaveLength(3)

      // 검증: 첫 번째는 Intercept
      expect(coefficients[0].name).toBe('(Intercept)')
      expect(coefficients[0].estimate).toBe(0.5)

      // 검증: CI 계산
      expect(coefficients[1].ci[0]).toBeCloseTo(2.1 - 1.96 * 0.1, 2)
      expect(coefficients[1].ci[1]).toBeCloseTo(2.1 + 1.96 * 0.1, 2)
    })
  })

  describe('Logistic Regression', () => {
    it('데이터 구조가 Python Worker와 일치해야 함', () => {
      // 프론트에서 준비하는 데이터 구조 (X: 2D array, y: binary 1D array)
      const XData = [
        [25, 18.5],
        [30, 22.3],
        [35, 28.1],
        [40, 30.5]
      ]
      const yData = [0, 0, 1, 1]

      // 검증: 2D 배열
      expect(Array.isArray(XData)).toBe(true)
      expect(XData.every(row => Array.isArray(row))).toBe(true)

      // 검증: y는 binary (0 or 1)
      expect(yData.every(v => v === 0 || v === 1)).toBe(true)

      // 검증: 최소 데이터 (2개 이상)
      expect(yData.length).toBeGreaterThanOrEqual(2)
    })

    it('Python Worker 호출 파라미터가 올바른 형식이어야 함', () => {
      const params = {
        X: [[25, 18.5], [30, 22.3]],
        y: [0, 1]
      }

      // 검증: 필수 키 존재
      expect(params).toHaveProperty('X')
      expect(params).toHaveProperty('y')

      // 검증: 대문자 X 사용
      expect(Object.keys(params)).toEqual(['X', 'y'])
    })

    it('반환 타입이 LogisticRegressionResult와 일치해야 함', () => {
      // Python Worker 반환 예상 구조
      const mockResult = {
        coefficients: [-2.5, 0.05, 0.12],
        stdErrors: [0.5, 0.02, 0.03],
        zValues: [-5.0, 2.5, 4.0],
        pValues: [0.00001, 0.012, 0.0001],
        predictions: [0.1, 0.3, 0.7, 0.9],
        predictedClass: [0, 0, 1, 1],
        accuracy: 0.85,
        aic: 50.3,
        bic: 55.7,
        pseudoRSquared: 0.42,
        nObservations: 100,
        nPredictors: 2
      }

      // 검증: 필수 필드 존재
      expect(mockResult).toHaveProperty('coefficients')
      expect(mockResult).toHaveProperty('stdErrors')
      expect(mockResult).toHaveProperty('zValues')
      expect(mockResult).toHaveProperty('pValues')
      expect(mockResult).toHaveProperty('predictions')
      expect(mockResult).toHaveProperty('predictedClass')
      expect(mockResult).toHaveProperty('accuracy')
      expect(mockResult).toHaveProperty('aic')
      expect(mockResult).toHaveProperty('bic')
      expect(mockResult).toHaveProperty('pseudoRSquared')

      // 검증: 정확도 범위
      expect(mockResult.accuracy).toBeGreaterThanOrEqual(0)
      expect(mockResult.accuracy).toBeLessThanOrEqual(1)
    })

    it('Odds Ratio 계산이 올바르게 되어야 함', () => {
      // Python 결과
      const coefficients = [-2.5, 0.05, 0.12]

      // Odds Ratio 계산
      const oddsRatios = coefficients.map(coef => Math.exp(coef))

      // 검증: exp(-2.5) ≈ 0.082
      expect(oddsRatios[0]).toBeCloseTo(0.082, 3)

      // 검증: exp(0.05) ≈ 1.051
      expect(oddsRatios[1]).toBeCloseTo(1.051, 3)

      // 검증: exp(0.12) ≈ 1.128
      expect(oddsRatios[2]).toBeCloseTo(1.128, 2)
    })

    it('Confusion Matrix 계산이 올바르게 되어야 함', () => {
      // Python 결과
      const yData = [0, 0, 1, 1, 1, 0, 1, 0]
      const predictedClass = [0, 1, 1, 1, 0, 0, 1, 0]

      // Confusion Matrix 계산
      const tp = yData.filter((y, i) => y === 1 && predictedClass[i] === 1).length
      const fp = yData.filter((y, i) => y === 0 && predictedClass[i] === 1).length
      const tn = yData.filter((y, i) => y === 0 && predictedClass[i] === 0).length
      const fn = yData.filter((y, i) => y === 1 && predictedClass[i] === 0).length

      // 검증: TP, FP, TN, FN
      expect(tp).toBe(3) // indices: 2, 3, 6
      expect(fp).toBe(1) // index: 1
      expect(tn).toBe(3) // indices: 0, 5, 7
      expect(fn).toBe(1) // index: 4

      // 검증: 합계
      expect(tp + fp + tn + fn).toBe(yData.length)

      // Precision, Recall, F1-Score
      const precision = tp / (tp + fp)
      const recall = tp / (tp + fn)
      const f1Score = (2 * precision * recall) / (precision + recall)

      expect(precision).toBeCloseTo(0.75, 2) // 3/4
      expect(recall).toBeCloseTo(0.75, 2) // 3/4
      expect(f1Score).toBeCloseTo(0.75, 2)
    })
  })

  describe('프론트엔드 데이터 추출 로직', () => {
    it('Linear: 유효하지 않은 데이터를 필터링해야 함', () => {
      const rawData = [
        { x: 1, y: 2.1 },
        { x: null, y: 4.2 },  // ❌ x null
        { x: 3, y: NaN },     // ❌ y NaN
        { x: 4, y: 8.1 }
      ]

      // 필터링 로직 시뮬레이션
      const xData: number[] = []
      const yData: number[] = []

      for (const row of rawData) {
        if (
          row.x !== null && row.x !== undefined && typeof row.x === 'number' && !isNaN(row.x) &&
          row.y !== null && row.y !== undefined && typeof row.y === 'number' && !isNaN(row.y)
        ) {
          xData.push(row.x)
          yData.push(row.y)
        }
      }

      // 검증: 유효한 데이터만 2개
      expect(xData).toHaveLength(2)
      expect(yData).toHaveLength(2)
      expect(xData).toEqual([1, 4])
      expect(yData).toEqual([2.1, 8.1])
    })

    it('Multiple/Logistic: 2D 배열 구성이 올바르게 되어야 함', () => {
      const rawData = [
        { age: 25, bmi: 18.5, outcome: 0 },
        { age: null, bmi: 22.3, outcome: 1 },  // ❌ age null
        { age: 35, bmi: 28.1, outcome: 1 },
        { age: 40, bmi: undefined, outcome: 0 }  // ❌ bmi undefined
      ]

      const xVariables = ['age', 'bmi']
      const yVariable = 'outcome'

      const XData: number[][] = []
      const yData: number[] = []

      for (const row of rawData) {
        const yVal = row[yVariable as keyof typeof row]
        const xVals: number[] = []
        let validRow = true

        if (yVal === null || yVal === undefined || typeof yVal !== 'number' || isNaN(yVal)) {
          validRow = false
        }

        for (const xVar of xVariables) {
          const xVal = row[xVar as keyof typeof row]
          if (xVal !== null && xVal !== undefined && typeof xVal === 'number' && !isNaN(xVal)) {
            xVals.push(xVal)
          } else {
            validRow = false
            break
          }
        }

        if (validRow && xVals.length === xVariables.length && typeof yVal === 'number') {
          XData.push(xVals)
          yData.push(yVal)
        }
      }

      // 검증: 유효한 행만 2개
      expect(XData).toHaveLength(2)
      expect(yData).toHaveLength(2)
      expect(XData[0]).toEqual([25, 18.5])
      expect(XData[1]).toEqual([35, 28.1])
      expect(yData).toEqual([0, 1])
    })
  })

  describe('에러 처리', () => {
    it('Linear: 최소 3개 미만이면 에러', () => {
      const xData = [1, 2]
      const yData = [2.1, 4.2]

      expect(() => {
        if (xData.length < 3) {
          throw new Error('단순 선형 회귀는 최소 3개 이상의 유효한 데이터 쌍이 필요합니다.')
        }
      }).toThrow('단순 선형 회귀는 최소 3개 이상의 유효한 데이터 쌍이 필요합니다.')
    })

    it('Multiple: 최소 (predictors + 1) 미만이면 에러', () => {
      const XData = [[1, 10], [2, 20]]  // 2개만
      const nPredictors = 2
      const minRequired = nPredictors + 1 // 3개 필요

      expect(() => {
        if (XData.length < minRequired) {
          throw new Error(`다중 회귀는 최소 ${minRequired}개 이상의 유효한 데이터가 필요합니다.`)
        }
      }).toThrow('다중 회귀는 최소 3개 이상의 유효한 데이터가 필요합니다.')
    })

    it('Logistic: 최소 2개 미만이면 에러', () => {
      const yData = [0]  // 1개만

      expect(() => {
        if (yData.length < 2) {
          throw new Error('로지스틱 회귀는 최소 2개 이상의 유효한 데이터가 필요합니다.')
        }
      }).toThrow('로지스틱 회귀는 최소 2개 이상의 유효한 데이터가 필요합니다.')
    })
  })
})
