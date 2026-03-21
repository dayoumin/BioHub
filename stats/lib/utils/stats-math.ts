/**
 * 정렬된 숫자 배열에서 분위수를 선형 보간으로 계산한다.
 * numpy default (inclusive) 방식과 동일.
 * @param sorted - 오름차순 정렬된 숫자 배열
 * @param p - 분위수 (0~1, 예: 0.25 = Q1)
 * @returns 분위수 값. 빈 배열이면 undefined
 */
export function getPercentile(sorted: number[], p: number): number | undefined {
  if (sorted.length === 0) return undefined
  const idx = p * (sorted.length - 1)
  const low = Math.floor(idx)
  const high = Math.ceil(idx)
  if (low === high) return sorted[low]
  const weight = idx - low
  return sorted[low] * (1 - weight) + sorted[high] * weight
}
