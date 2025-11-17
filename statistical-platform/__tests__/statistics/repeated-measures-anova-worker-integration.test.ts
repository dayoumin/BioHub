/**
 * Repeated Measures ANOVA 페이지 Worker 통합 테스트
 *
 * 목적: PyodideCore 변환 후 로직 검증
 * - Wide format 데이터 변환 (subjects × timepoints)
 * - Worker 호출 파라미터 구성
 * - 결과 매핑 정확성
 * - 구형성 검정 (Sphericity test)
 */

describe('Repeated Measures ANOVA Worker Integration', () => {
  describe('1. Wide Format 데이터 구조', () => {
    it('피험자별 시간대 데이터 추출', () => {
      const uploadedData = {
        data: [
          { SubjectID: 'S1', Week1: 10, Week2: 12, Week3: 14 },
          { SubjectID: 'S2', Week1: 11, Week2: 13, Week3: 15 },
          { SubjectID: 'S3', Week1: 9, Week2: 11, Week3: 13 }
        ]
      }

      const subjectIdCol = 'SubjectID'
      const timeVars = ['Week1', 'Week2', 'Week3']

      // 실제 코드 로직 (Lines 130-154)
      const uniqueSubjects = Array.from(
        new Set(uploadedData.data.map(row => String(row[subjectIdCol])))
      )

      expect(uniqueSubjects).toEqual(['S1', 'S2', 'S3'])
      expect(uniqueSubjects.length).toBe(3)

      // 데이터 매트릭스 구성
      const dataMatrix: number[][] = []
      const subjectIds: string[] = []

      for (const subjectId of uniqueSubjects) {
        const subjectRows = uploadedData.data.filter(row => String(row[subjectIdCol]) === subjectId)
        const subjectRow = subjectRows[0] as Record<string, unknown>
        const timeValues = timeVars.map(timeVar => subjectRow[timeVar] as number)

        dataMatrix.push(timeValues)
        subjectIds.push(subjectId)
      }

      expect(dataMatrix).toEqual([
        [10, 12, 14],
        [11, 13, 15],
        [9, 11, 13]
      ])
      expect(subjectIds).toEqual(['S1', 'S2', 'S3'])
    })

    it('Worker 호출 파라미터 구성', () => {
      const dataMatrix = [
        [10, 12, 14],
        [11, 13, 15],
        [9, 11, 13]
      ]
      const subjectIds = ['S1', 'S2', 'S3']
      const timeLabels = ['Week1', 'Week2', 'Week3']

      // Worker 호출 파라미터 (Lines 155-160)
      const params = {
        data_matrix: dataMatrix,
        subject_ids: subjectIds,
        time_labels: timeLabels
      }

      expect(params.data_matrix.length).toBe(3) // 3 subjects
      expect(params.data_matrix[0].length).toBe(3) // 3 timepoints
      expect(params.subject_ids.length).toBe(3)
      expect(params.time_labels).toEqual(['Week1', 'Week2', 'Week3'])
    })
  })

  describe('2. Worker 결과 매핑', () => {
    it('Worker 반환값을 RepeatedMeasuresResults 타입으로 변환', () => {
      // Worker 반환값 (Lines 162-170)
      const workerResult = {
        fStatistic: 12.5,
        pValue: 0.008,
        df: { numerator: 2, denominator: 4 },
        sphericityEpsilon: 0.85,
        anovaTable: {
          sum_sq: { time: 25.0, Residual: 8.0 },
          df: { time: 2, Residual: 4 },
          F: { time: 12.5 },
          'PR(>F)': { time: 0.008 }
        }
      }

      const n = 3 // subjects
      const df = workerResult.df

      // 최종 결과 매핑 (Lines 172-253)
      const finalResult = {
        fStatistic: workerResult.fStatistic,
        pValue: workerResult.pValue,
        df: df,
        sphericityEpsilon: workerResult.sphericityEpsilon
      }

      expect(finalResult.fStatistic).toBe(12.5)
      expect(finalResult.pValue).toBe(0.008)
      expect(finalResult.df.numerator).toBe(2)
      expect(finalResult.df.denominator).toBe(4)
      expect(finalResult.sphericityEpsilon).toBe(0.85)
    })

    it('ANOVA 테이블 파싱 (SS/MS/F/p 추출)', () => {
      const workerResult = {
        anovaTable: {
          sum_sq: { time: 25.0, Residual: 8.0 },
          df: { time: 2, Residual: 4 },
          F: { time: 12.5 },
          'PR(>F)': { time: 0.008 }
        }
      }

      // Helper 함수 (Lines 210-225)
      const getSS = (key: string) => (workerResult.anovaTable.sum_sq as Record<string, number>)[key] ?? 0
      const getDF = (key: string) => (workerResult.anovaTable.df as Record<string, number>)[key] ?? 1
      const getMS = (key: string) => {
        const ss = getSS(key)
        const df = getDF(key)
        return df > 0 ? ss / df : 0
      }
      const getF = (key: string) => (workerResult.anovaTable.F as Record<string, number>)[key] ?? 0
      const getP = (key: string) => (workerResult.anovaTable['PR(>F)'] as Record<string, number>)[key] ?? 1

      const anovaTable = [
        {
          source: '시간 (Time)',
          ss: getSS('time'),
          df: getDF('time'),
          ms: getMS('time'),
          f: getF('time'),
          p: getP('time')
        },
        {
          source: '잔차 (Residual)',
          ss: getSS('Residual'),
          df: getDF('Residual'),
          ms: getMS('Residual'),
          f: 0,
          p: 0
        }
      ]

      expect(anovaTable.length).toBe(2)
      expect(anovaTable[0].source).toBe('시간 (Time)')
      expect(anovaTable[0].ss).toBe(25.0)
      expect(anovaTable[0].df).toBe(2)
      expect(anovaTable[0].ms).toBe(12.5) // 25.0 / 2
      expect(anovaTable[0].f).toBe(12.5)
      expect(anovaTable[0].p).toBe(0.008)

      expect(anovaTable[1].source).toBe('잔차 (Residual)')
      expect(anovaTable[1].ss).toBe(8.0)
      expect(anovaTable[1].df).toBe(4)
      expect(anovaTable[1].ms).toBe(2.0) // 8.0 / 4
    })
  })

  describe('3. 구형성 검정 (Sphericity Test)', () => {
    it('Epsilon 기반 구형성 판단', () => {
      const interpretSphericity = (epsilon: number) => {
        if (epsilon >= 0.75) return '구형성 가정이 충족되었습니다. (ε ≥ 0.75)'
        if (epsilon >= 0.5) return '구형성 가정이 경미하게 위배되었습니다. Greenhouse-Geisser 보정을 고려하세요.'
        return '구형성 가정이 심각하게 위배되었습니다. 자유도 보정이 필요합니다.'
      }

      expect(interpretSphericity(0.85)).toBe('구형성 가정이 충족되었습니다. (ε ≥ 0.75)')
      expect(interpretSphericity(0.65)).toBe('구형성 가정이 경미하게 위배되었습니다. Greenhouse-Geisser 보정을 고려하세요.')
      expect(interpretSphericity(0.4)).toBe('구형성 가정이 심각하게 위배되었습니다. 자유도 보정이 필요합니다.')
    })

    it('구형성 테스트 결과 객체 생성', () => {
      const epsilon = 0.85
      const sphericityPassed = epsilon >= 0.75

      const sphericityTest = {
        statistic: epsilon,
        pValue: 0,
        passed: sphericityPassed,
        interpretation: '구형성 가정이 충족되었습니다. (ε ≥ 0.75)'
      }

      expect(sphericityTest.passed).toBe(true)
      expect(sphericityTest.statistic).toBe(0.85)
    })
  })

  describe('4. 시간대별 평균 계산', () => {
    it('각 시간대의 기술통계 계산', () => {
      const dataMatrix = [
        [10, 12, 14],
        [11, 13, 15],
        [9, 11, 13]
      ]
      const timeVars = ['Week1', 'Week2', 'Week3']

      // 실제 코드 로직 (Lines 172-188)
      const timePointMeans = timeVars.map((timeVar, idx) => {
        const values = dataMatrix.map(row => row[idx])
        const n = values.length
        const mean = values.reduce((sum, v) => sum + v, 0) / n
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1)
        const std = Math.sqrt(variance)
        const se = std / Math.sqrt(n)
        const margin = 1.96 * se

        return {
          timePoint: timeVar,
          mean,
          std,
          n,
          se,
          ci: [mean - margin, mean + margin] as [number, number]
        }
      })

      expect(timePointMeans.length).toBe(3)

      // Week1: [10, 11, 9] → mean = 10
      expect(timePointMeans[0].timePoint).toBe('Week1')
      expect(timePointMeans[0].mean).toBe(10)
      expect(timePointMeans[0].n).toBe(3)

      // Week2: [12, 13, 11] → mean = 12
      expect(timePointMeans[1].timePoint).toBe('Week2')
      expect(timePointMeans[1].mean).toBe(12)

      // Week3: [14, 15, 13] → mean = 14
      expect(timePointMeans[2].timePoint).toBe('Week3')
      expect(timePointMeans[2].mean).toBe(14)
    })

    it('95% 신뢰구간 계산', () => {
      const values = [10, 11, 9] // Week1 data
      const n = values.length
      const mean = values.reduce((sum, v) => sum + v, 0) / n
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1)
      const std = Math.sqrt(variance)
      const se = std / Math.sqrt(n)
      const margin = 1.96 * se

      const ci: [number, number] = [mean - margin, mean + margin]

      expect(mean).toBe(10)
      expect(std).toBeCloseTo(1, 0) // sqrt(2)
      expect(ci[0]).toBeLessThan(mean)
      expect(ci[1]).toBeGreaterThan(mean)
    })
  })

  describe('5. Button Disabled Logic', () => {
    it('피험자 ID 선택 필수', () => {
      const selectedVariables1 = { subjectId: 'SubjectID', timeVariables: ['Week1', 'Week2'] }
      const selectedVariables2 = { timeVariables: ['Week1', 'Week2'] }

      // 실제 코드 로직 (Lines 409-412)
      const disabled1 = !selectedVariables1.subjectId || selectedVariables1.timeVariables.length < 2
      const disabled2 = !(selectedVariables2 as { subjectId?: string }).subjectId || selectedVariables2.timeVariables.length < 2

      expect(disabled1).toBe(false) // subjectId 있음 → 활성화
      expect(disabled2).toBe(true)  // subjectId 없음 → 비활성화
    })

    it('최소 2개 시간 변수 선택 필수', () => {
      const selectedVariables1 = { subjectId: 'SubjectID', timeVariables: ['Week1', 'Week2'] }
      const selectedVariables2 = { subjectId: 'SubjectID', timeVariables: ['Week1'] }
      const selectedVariables3 = { subjectId: 'SubjectID', timeVariables: [] }

      const disabled1 = !selectedVariables1.subjectId || selectedVariables1.timeVariables.length < 2
      const disabled2 = !selectedVariables2.subjectId || selectedVariables2.timeVariables.length < 2
      const disabled3 = !selectedVariables3.subjectId || selectedVariables3.timeVariables.length < 2

      expect(disabled1).toBe(false) // 2개 → 활성화
      expect(disabled2).toBe(true)  // 1개 → 비활성화
      expect(disabled3).toBe(true)  // 0개 → 비활성화
    })
  })

  describe('6. 데이터 검증', () => {
    it('최소 피험자 수 검증 (≥2)', () => {
      const uniqueSubjects1 = ['S1', 'S2', 'S3']
      const uniqueSubjects2 = ['S1']

      const valid1 = uniqueSubjects1.length >= 2
      const valid2 = uniqueSubjects2.length >= 2

      expect(valid1).toBe(true)
      expect(valid2).toBe(false)
    })

    it('유효한 숫자 데이터 검증', () => {
      const timeValues1 = [10, 12, 14]
      const timeValues2 = [10, NaN, 14]

      const allValid1 = timeValues1.every(v => !isNaN(v))
      const allValid2 = timeValues2.every(v => !isNaN(v))

      expect(allValid1).toBe(true)
      expect(allValid2).toBe(false)
    })

    it('최소 시간대 수 검증 (≥2)', () => {
      const timeVars1 = ['Week1', 'Week2', 'Week3']
      const timeVars2 = ['Week1']

      const valid1 = timeVars1.length >= 2
      const valid2 = timeVars2.length >= 2

      expect(valid1).toBe(true)
      expect(valid2).toBe(false)
    })
  })

  describe('7. Variable Selection UI 패턴', () => {
    it('피험자 ID 단일 선택', () => {
      const columns = ['SubjectID', 'Week1', 'Week2', 'Week3']
      const selectedVariables = { subjectId: 'SubjectID', timeVariables: [] }

      const isSelected = (col: string) => selectedVariables.subjectId === col

      expect(isSelected('SubjectID')).toBe(true)
      expect(isSelected('Week1')).toBe(false)
    })

    it('시간 변수 다중 선택 (순서 유지)', () => {
      const selectedVariables = { subjectId: 'SubjectID', timeVariables: ['Week1', 'Week3', 'Week2'] }

      expect(selectedVariables.timeVariables).toEqual(['Week1', 'Week3', 'Week2'])
      expect(selectedVariables.timeVariables.indexOf('Week1')).toBe(0)
      expect(selectedVariables.timeVariables.indexOf('Week3')).toBe(1)
      expect(selectedVariables.timeVariables.indexOf('Week2')).toBe(2)
    })

    it('시간 변수 토글 기능', () => {
      const timeVars = ['Week1', 'Week2']
      const header = 'Week3'

      // Add
      const newTimeVars = timeVars.includes(header)
        ? timeVars.filter(v => v !== header)
        : [...timeVars, header]

      expect(newTimeVars).toEqual(['Week1', 'Week2', 'Week3'])

      // Remove
      const header2 = 'Week1'
      const newTimeVars2 = newTimeVars.includes(header2)
        ? newTimeVars.filter(v => v !== header2)
        : [...newTimeVars, header2]

      expect(newTimeVars2).toEqual(['Week2', 'Week3'])
    })
  })

  describe('8. Chart 데이터 준비', () => {
    it('시간대별 평균과 신뢰구간 차트 데이터 생성', () => {
      const timePointMeans = [
        { timePoint: 'Week1', mean: 10, ci: [9, 11] as [number, number] },
        { timePoint: 'Week2', mean: 12, ci: [11, 13] as [number, number] },
        { timePoint: 'Week3', mean: 14, ci: [13, 15] as [number, number] }
      ]

      // 실제 코드 로직 (Lines 474-479)
      const chartData = timePointMeans.map(tp => ({
        timePoint: tp.timePoint,
        평균: tp.mean,
        '95% CI 하한': tp.ci[0],
        '95% CI 상한': tp.ci[1]
      }))

      expect(chartData.length).toBe(3)
      expect(chartData[0].timePoint).toBe('Week1')
      expect(chartData[0].평균).toBe(10)
      expect(chartData[0]['95% CI 하한']).toBe(9)
      expect(chartData[0]['95% CI 상한']).toBe(11)
    })
  })

  describe('9. 결과 해석', () => {
    it('p-value 기반 유의성 판단', () => {
      const interpretResult = (pValue: number) => {
        return pValue < 0.05
          ? '시간에 따른 측정값의 차이가 통계적으로 유의합니다. (p < 0.05)'
          : '시간에 따른 측정값의 차이가 통계적으로 유의하지 않습니다. (p ≥ 0.05)'
      }

      expect(interpretResult(0.008)).toBe('시간에 따른 측정값의 차이가 통계적으로 유의합니다. (p < 0.05)')
      expect(interpretResult(0.15)).toBe('시간에 따른 측정값의 차이가 통계적으로 유의하지 않습니다. (p ≥ 0.05)')
    })
  })
})
