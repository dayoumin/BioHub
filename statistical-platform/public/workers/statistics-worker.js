/**
 * Universal Statistics Web Worker
 * 대용량 데이터의 통계 계산을 백그라운드에서 처리
 */

// 상관계수 계산 (Pearson)
function calculateCorrelation(x, y) {
  const n = Math.min(x.length, y.length)
  if (n < 2) return 0

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0

  for (let i = 0; i < n; i++) {
    sumX += x[i]
    sumY += y[i]
    sumXY += x[i] * y[i]
    sumX2 += x[i] * x[i]
    sumY2 += y[i] * y[i]
  }

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  return denominator === 0 ? 0 : numerator / denominator
}

/**
 * Get paired numeric data from two columns with pairwise deletion
 * Only returns rows where both columns have valid numeric values
 * This ensures x and y arrays have the same length and aligned indices
 */
function getPairedNumericData(data, columnNameX, columnNameY) {
  const xValues = []
  const yValues = []

  for (const row of data) {
    const xRaw = row[columnNameX]
    const yRaw = row[columnNameY]

    // Skip if either value is missing
    if (xRaw === null || xRaw === undefined || yRaw === null || yRaw === undefined) {
      continue
    }

    const xNum = typeof xRaw === 'number' ? xRaw : Number(xRaw)
    const yNum = typeof yRaw === 'number' ? yRaw : Number(yRaw)

    // Only include if both are valid numbers
    if (!isNaN(xNum) && isFinite(xNum) && !isNaN(yNum) && isFinite(yNum)) {
      xValues.push(xNum)
      yValues.push(yNum)
    }
  }

  return { x: xValues, y: yValues }
}

// 상관계수 행렬 계산 (pairwise deletion 적용)
function calculateCorrelationMatrix(data, columns) {
  const matrix = []

  // 진행 상황 추적
  const totalCalculations = columns.length * columns.length
  let completedCalculations = 0

  for (let i = 0; i < columns.length; i++) {
    const row = []

    for (let j = 0; j < columns.length; j++) {
      if (i === j) {
        row.push(1)
      } else if (j < i && matrix[j]) {
        // 대칭성 활용
        row.push(matrix[j][i])
      } else {
        // Pairwise deletion: 각 pair마다 동일한 인덱스만 사용
        const { x, y } = getPairedNumericData(data, columns[i].name, columns[j].name)
        if (x.length > 1 && y.length > 1) {
          row.push(calculateCorrelation(x, y))
        } else {
          row.push(0)
        }
      }

      completedCalculations++

      // 10% 단위로 진행상황 보고
      if (completedCalculations % Math.floor(totalCalculations / 10) === 0) {
        self.postMessage({
          type: 'progress',
          data: {
            current: completedCalculations,
            total: totalCalculations,
            percentage: Math.round((completedCalculations / totalCalculations) * 100)
          }
        })
      }
    }
    matrix.push(row)
  }

  return matrix
}

// 기초 통계 계산
function calculateBasicStatistics(data) {
  const n = data.length
  if (n === 0) return null

  // 정렬된 데이터 (중앙값, 사분위수 계산용)
  const sorted = [...data].sort((a, b) => a - b)

  // 평균
  const mean = data.reduce((sum, val) => sum + val, 0) / n

  // 중앙값
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)]

  // 분산 및 표준편차 (표본 분산 사용)
  const variance = n > 1
    ? data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1)
    : 0
  const std = Math.sqrt(variance)

  // 사분위수
  const q1Index = Math.floor(n * 0.25)
  const q3Index = Math.floor(n * 0.75)
  const q1 = sorted[q1Index]
  const q3 = sorted[q3Index]

  // IQR 및 이상치
  const iqr = q3 - q1
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr
  const outliers = data.filter(v => v < lowerBound || v > upperBound)

  return {
    n,
    mean,
    median,
    std,
    variance,
    min: sorted[0],
    max: sorted[n - 1],
    q1,
    q3,
    iqr,
    outliers,
    outlierCount: outliers.length
  }
}

// 다중 컬럼 통계 계산
function calculateMultipleStatistics(data, columns) {
  const results = {}
  const total = columns.length

  columns.forEach((col, index) => {
    const colData = data
      .map(row => {
        const val = row[col]
        return typeof val === 'number' ? val : Number(val)
      })
      .filter(v => !isNaN(v) && isFinite(v))

    results[col] = calculateBasicStatistics(colData)

    // 진행상황 보고
    self.postMessage({
      type: 'progress',
      data: {
        current: index + 1,
        total,
        percentage: Math.round(((index + 1) / total) * 100),
        message: `${col} 통계 계산 완료`
      }
    })
  })

  return results
}

// 히스토그램 데이터 계산
function calculateHistogram(data, bins = 20) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const binWidth = (max - min) / bins

  const histogram = Array(bins).fill(0)
  const binEdges = []

  for (let i = 0; i <= bins; i++) {
    binEdges.push(min + i * binWidth)
  }

  data.forEach(value => {
    const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1)
    histogram[binIndex]++
  })

  return {
    counts: histogram,
    edges: binEdges,
    binWidth
  }
}

// 메시지 처리
self.addEventListener('message', (event) => {
  const { type, payload } = event.data

  try {
    let result

    switch (type) {
      case 'CORRELATION_MATRIX':
        result = calculateCorrelationMatrix(payload.data, payload.columns)
        self.postMessage({
          type: 'result',
          data: {
            matrix: result,
            labels: payload.columns.map(c => c.name)
          }
        })
        break

      case 'BASIC_STATISTICS':
        result = calculateBasicStatistics(payload.data)
        self.postMessage({
          type: 'result',
          data: result
        })
        break

      case 'MULTIPLE_STATISTICS':
        result = calculateMultipleStatistics(payload.data, payload.columns)
        self.postMessage({
          type: 'result',
          data: result
        })
        break

      case 'HISTOGRAM':
        result = calculateHistogram(payload.data, payload.bins)
        self.postMessage({
          type: 'result',
          data: result
        })
        break

      default:
        throw new Error(`Unknown operation type: ${type}`)
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: {
        message: error.message,
        stack: error.stack
      }
    })
  }
})

// Worker 준비 완료 신호
self.postMessage({ type: 'ready' })