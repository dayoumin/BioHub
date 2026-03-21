/**
 * 정렬된 숫자 배열에서 분위수를 선형 보간으로 계산한다.
 * numpy default (inclusive) 방식과 동일.
 * @param sorted - 오름차순 정렬된 숫자 배열
 * @param p - 분위수 (0~1, 예: 0.25 = Q1)
 * @returns 분위수 값. 빈 배열이면 undefined
 */
/**
 * 수치형 컬럼의 정규성 검정 결과 요약 (참고용 힌트)
 * ID 컬럼 제외, normality 결과가 있는 수치형 변수만 집계
 */
export interface NormalityHint {
  available: boolean
  testedCount: number
  normalCount: number
  /** 과반수 정규 (tie는 nonparametric 쪽으로 — 보수적 접근) */
  mostlyNormal: boolean
}

export function summarizeNormality(
  columnStats: Array<{ type: string; idDetection?: { isId: boolean }; normality?: { isNormal: boolean } }>
): NormalityHint {
  const tested = columnStats.filter(c =>
    c.type === 'numeric' && !c.idDetection?.isId && c.normality !== undefined
  )
  if (tested.length === 0) {
    return { available: false, testedCount: 0, normalCount: 0, mostlyNormal: false }
  }
  const normalCount = tested.filter(c => c.normality?.isNormal === true).length
  return {
    available: true,
    testedCount: tested.length,
    normalCount,
    mostlyNormal: normalCount > tested.length / 2
  }
}

export function getPercentile(sorted: number[], p: number): number | undefined {
  if (sorted.length === 0) return undefined
  const idx = p * (sorted.length - 1)
  const low = Math.floor(idx)
  const high = Math.ceil(idx)
  if (low === high) return sorted[low]
  const weight = idx - low
  return sorted[low] * (1 - weight) + sorted[high] * weight
}
