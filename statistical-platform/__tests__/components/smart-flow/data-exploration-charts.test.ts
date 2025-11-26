/**
 * DataExplorationStep 차트 시각화 테스트
 *
 * 테스트 목적:
 * - 분포 시각화 탭 구조 (변수 선택 → 차트 타입)
 * - 상관계수 히트맵 행렬 생성 로직
 * - calculateCorrelation 함수 정확성
 */

describe('DataExplorationStep 차트 시각화', () => {
  /**
   * 상관계수 계산 함수 (DataExplorationStep에서 복사)
   */
  function calculateCorrelation(x: number[], y: number[]): { r: number; r2: number; n: number } {
    const n = x.length
    if (n < 2 || x.length !== y.length) return { r: 0, r2: 0, n: 0 }

    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    const sumYY = y.reduce((sum, val) => sum + val * val, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))

    const r = denominator === 0 ? 0 : numerator / denominator
    const r2 = r * r

    return { r, r2, n }
  }

  /**
   * 상관계수 행렬 생성 함수 (DataExplorationStep 로직 추출)
   */
  function buildCorrelationMatrix(
    numericVariables: string[],
    correlationMatrix: Array<{ var1: string; var2: string; r: number }>
  ): number[][] {
    const n = numericVariables.length
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0))

    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1 // 대각선은 1
      for (let j = i + 1; j < n; j++) {
        const corr = correlationMatrix.find(
          c => (c.var1 === numericVariables[i] && c.var2 === numericVariables[j]) ||
               (c.var1 === numericVariables[j] && c.var2 === numericVariables[i])
        )
        const r = corr?.r ?? 0
        matrix[i][j] = r
        matrix[j][i] = r
      }
    }
    return matrix
  }

  describe('calculateCorrelation 함수', () => {
    it('완벽한 양의 상관 (r = 1)', () => {
      const x = [1, 2, 3, 4, 5]
      const y = [2, 4, 6, 8, 10]
      const result = calculateCorrelation(x, y)

      expect(result.r).toBeCloseTo(1, 5)
      expect(result.r2).toBeCloseTo(1, 5)
      expect(result.n).toBe(5)
    })

    it('완벽한 음의 상관 (r = -1)', () => {
      const x = [1, 2, 3, 4, 5]
      const y = [10, 8, 6, 4, 2]
      const result = calculateCorrelation(x, y)

      expect(result.r).toBeCloseTo(-1, 5)
      expect(result.r2).toBeCloseTo(1, 5)
    })

    it('상관 없음 (r ≈ 0)', () => {
      const x = [1, 2, 3, 4, 5]
      const y = [5, 3, 1, 3, 5] // 패턴 없음
      const result = calculateCorrelation(x, y)

      expect(Math.abs(result.r)).toBeLessThan(0.5)
    })

    it('데이터 부족 시 0 반환', () => {
      const x = [1]
      const y = [2]
      const result = calculateCorrelation(x, y)

      expect(result.r).toBe(0)
      expect(result.n).toBe(0)
    })

    it('빈 배열 처리', () => {
      const result = calculateCorrelation([], [])

      expect(result.r).toBe(0)
      expect(result.n).toBe(0)
    })

    it('길이 불일치 시 0 반환', () => {
      const x = [1, 2, 3]
      const y = [1, 2]
      const result = calculateCorrelation(x, y)

      expect(result.r).toBe(0)
    })

    it('동일한 값만 있는 경우 (분모 0)', () => {
      const x = [5, 5, 5, 5, 5]
      const y = [1, 2, 3, 4, 5]
      const result = calculateCorrelation(x, y)

      expect(result.r).toBe(0) // 분모가 0이면 0 반환
    })
  })

  describe('상관계수 행렬 생성', () => {
    it('3x3 행렬 생성', () => {
      const variables = ['var1', 'var2', 'var3']
      const correlations = [
        { var1: 'var1', var2: 'var2', r: 0.8 },
        { var1: 'var1', var2: 'var3', r: 0.5 },
        { var1: 'var2', var2: 'var3', r: -0.3 }
      ]

      const matrix = buildCorrelationMatrix(variables, correlations)

      // 대각선은 1
      expect(matrix[0][0]).toBe(1)
      expect(matrix[1][1]).toBe(1)
      expect(matrix[2][2]).toBe(1)

      // 상관계수 값
      expect(matrix[0][1]).toBe(0.8) // var1-var2
      expect(matrix[1][0]).toBe(0.8) // 대칭
      expect(matrix[0][2]).toBe(0.5) // var1-var3
      expect(matrix[2][0]).toBe(0.5) // 대칭
      expect(matrix[1][2]).toBe(-0.3) // var2-var3
      expect(matrix[2][1]).toBe(-0.3) // 대칭
    })

    it('역순 변수명도 처리', () => {
      const variables = ['a', 'b']
      const correlations = [
        { var1: 'b', var2: 'a', r: 0.7 } // 역순
      ]

      const matrix = buildCorrelationMatrix(variables, correlations)

      expect(matrix[0][1]).toBe(0.7)
      expect(matrix[1][0]).toBe(0.7)
    })

    it('상관관계 없는 변수 쌍은 0', () => {
      const variables = ['x', 'y', 'z']
      const correlations = [
        { var1: 'x', var2: 'y', r: 0.5 }
        // x-z, y-z 상관계수 없음
      ]

      const matrix = buildCorrelationMatrix(variables, correlations)

      expect(matrix[0][2]).toBe(0) // x-z
      expect(matrix[1][2]).toBe(0) // y-z
    })

    it('빈 변수 목록 처리', () => {
      const matrix = buildCorrelationMatrix([], [])
      expect(matrix).toEqual([])
    })

    it('단일 변수 (1x1 행렬)', () => {
      const variables = ['only']
      const matrix = buildCorrelationMatrix(variables, [])

      expect(matrix.length).toBe(1)
      expect(matrix[0][0]).toBe(1)
    })
  })

  describe('차트 데이터 처리', () => {
    /**
     * 히스토그램/박스플롯용 데이터 필터링 로직
     */
    function filterChartData(rawData: unknown[]): number[] {
      return rawData
        .filter(v => v !== null && v !== undefined && v !== '')
        .map(Number)
        .filter(v => !isNaN(v))
    }

    it('유효한 숫자만 필터링', () => {
      const raw = [1, 2, null, undefined, '', 'abc', 3, NaN, 4]
      const result = filterChartData(raw)

      expect(result).toEqual([1, 2, 3, 4])
    })

    it('문자열 숫자 변환', () => {
      const raw = ['1', '2.5', '3']
      const result = filterChartData(raw)

      expect(result).toEqual([1, 2.5, 3])
    })

    it('빈 배열 처리', () => {
      const result = filterChartData([])
      expect(result).toEqual([])
    })

    it('모두 무효한 값인 경우', () => {
      const raw = [null, undefined, '', 'abc', NaN]
      const result = filterChartData(raw)

      expect(result).toEqual([])
    })
  })

  describe('이상치 계산', () => {
    function calculateOutliers(data: number[]): {
      q1: number
      q3: number
      iqr: number
      lowerBound: number
      upperBound: number
      outliers: number[]
    } {
      const sortedData = [...data].sort((a, b) => a - b)
      const q1Index = Math.floor(sortedData.length * 0.25)
      const q3Index = Math.floor(sortedData.length * 0.75)
      const q1 = sortedData[q1Index] || 0
      const q3 = sortedData[q3Index] || 0
      const iqr = q3 - q1
      const lowerBound = q1 - 1.5 * iqr
      const upperBound = q3 + 1.5 * iqr
      const outliers = data.filter(v => v < lowerBound || v > upperBound)

      return { q1, q3, iqr, lowerBound, upperBound, outliers }
    }

    it('이상치 감지', () => {
      // 정상 데이터 + 극단값
      const data = [10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 100]
      const result = calculateOutliers(data)

      expect(result.outliers).toContain(100)
      expect(result.outliers.length).toBeGreaterThan(0)
    })

    it('이상치 없는 경우', () => {
      const data = [10, 11, 12, 13, 14, 15]
      const result = calculateOutliers(data)

      expect(result.outliers).toEqual([])
    })

    it('음수 이상치도 감지', () => {
      const data = [-100, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20]
      const result = calculateOutliers(data)

      expect(result.outliers).toContain(-100)
    })
  })
})
