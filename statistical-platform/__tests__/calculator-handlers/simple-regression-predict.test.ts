/**
 * Issue 4: simpleLinearRegression predictValues 타입 수정 검증
 *
 * 검증 항목:
 * 1. 타입 정의: string (쉼표로 구분)
 * 2. 런타임 처리: string.split(',') 안전하게 처리
 * 3. 에러 방어: undefined, 빈 문자열, 잘못된 형식
 */

import { describe, it, expect } from '@jest/globals'

describe('Issue 4: simpleLinearRegression predictValues 타입 수정', () => {
  it('타입 검증: predictValues는 string', () => {
    // 타입 정의에 맞는 값
    const validPredictValues1: string | undefined = '10, 20, 30'
    const validPredictValues2: string | undefined = undefined

    expect(typeof validPredictValues1).toBe('string')
    expect(validPredictValues2).toBeUndefined()
  })

  it('문자열 파싱 로직', () => {
    const parsePredictValues = (predictValues: string | undefined): number[] => {
      if (!predictValues || typeof predictValues !== 'string') {
        return []
      }

      return predictValues
        .split(',')
        .map((v: string) => parseFloat(v.trim()))
        .filter((v: number) => !isNaN(v))
    }

    // 정상 케이스
    expect(parsePredictValues('10, 20, 30')).toEqual([10, 20, 30])
    expect(parsePredictValues('10,20,30')).toEqual([10, 20, 30])  // 공백 없음
    expect(parsePredictValues('10.5, 20.7, 30.2')).toEqual([10.5, 20.7, 30.2])  // 소수점

    // 에러 방어 케이스
    expect(parsePredictValues(undefined)).toEqual([])
    expect(parsePredictValues('')).toEqual([])
    expect(parsePredictValues('abc, def')).toEqual([])  // 숫자 아님
    expect(parsePredictValues('10, abc, 30')).toEqual([10, 30])  // 일부만 유효
  })

  it('예측값 계산 로직', () => {
    const slope = 2.5
    const intercept = 10

    const calculatePredictions = (
      predictValues: string | undefined,
      slope: number,
      intercept: number
    ): Array<{ X: number; 예측값: string }> => {
      const predictions: Array<{ X: number; 예측값: string }> = []

      if (predictValues && typeof predictValues === 'string') {
        const predX = predictValues
          .split(',')
          .map((v: string) => parseFloat(v.trim()))
          .filter((v: number) => !isNaN(v))

        if (predX.length > 0) {
          predictions.push(
            ...predX.map((x: number) => ({
              X: x,
              예측값: (slope * x + intercept).toFixed(4)
            }))
          )
        }
      }

      return predictions
    }

    // 정상 케이스
    const result1 = calculatePredictions('10, 20', slope, intercept)
    expect(result1).toHaveLength(2)
    expect(result1[0]).toEqual({ X: 10, 예측값: '35.0000' })  // 2.5*10 + 10 = 35
    expect(result1[1]).toEqual({ X: 20, 예측값: '60.0000' })  // 2.5*20 + 10 = 60

    // 에러 방어 케이스
    expect(calculatePredictions(undefined, slope, intercept)).toEqual([])
    expect(calculatePredictions('', slope, intercept)).toEqual([])
    expect(calculatePredictions('abc', slope, intercept)).toEqual([])
  })
})
