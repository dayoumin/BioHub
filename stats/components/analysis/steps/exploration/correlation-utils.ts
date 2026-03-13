/**
 * 탐색 단계 공유 유틸리티
 * - calculateCorrelation: 부모(correlationMatrix)와 자식(ScatterHeatmapSection) 모두 사용
 * - 타입: ScatterplotConfig, CorrelationPair
 */

export interface ScatterplotConfig {
  id: string
  xVariable: string
  yVariable: string
}

export interface CorrelationPair {
  var1: string
  var2: string
  r: number
  r2: number
  strength: string
  color: string
}

/**
 * Pearson correlation coefficient 계산
 * x, y는 row-wise paired (길이 동일 보장)
 */
export function calculateCorrelation(x: number[], y: number[]): { r: number; r2: number; n: number } {
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
