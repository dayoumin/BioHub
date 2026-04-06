/**
 * Shared interpretation helper functions for statistical handlers.
 * Extracted from statistical-executor.ts (lines 3061-3125) — behavior-preserving, byte-for-byte copy.
 */

export interface NormalizedPostHocComparison {
  group1: string | number
  group2: string | number
  meanDiff?: number
  zStatistic?: number
  pvalue: number
  pvalueAdjusted?: number
  significant: boolean
}

export function normalizePostHocComparisons(
  comparisons: unknown
): NormalizedPostHocComparison[] {
  if (!Array.isArray(comparisons)) return []

  const results: NormalizedPostHocComparison[] = []
  for (const item of comparisons) {
    if (!item || typeof item !== 'object') continue
    const comp = item as Record<string, unknown>

    const pvalue =
      typeof comp.pvalue === 'number'
        ? comp.pvalue
        : typeof comp.pValue === 'number'
          ? comp.pValue
          : undefined

    if (typeof pvalue !== 'number') continue

    // group1/group2 직접 키 또는 comparison 문자열("A vs B") 파싱
    let group1 = comp.group1 as string | number | undefined
    let group2 = comp.group2 as string | number | undefined
    if (group1 === undefined || group2 === undefined) {
      const comparison = typeof comp.comparison === 'string' ? comp.comparison : undefined
      if (comparison && comparison.includes(' vs ')) {
        const parts = comparison.split(' vs ', 2)
        group1 = parts[0]?.trim() || undefined
        group2 = parts[1]?.trim() || undefined
      }
    }
    if (group1 === undefined || group2 === undefined) continue

    results.push({
      group1,
      group2,
      meanDiff:
        typeof comp.meanDiff === 'number'
          ? comp.meanDiff
          : typeof comp.mean_diff === 'number'
            ? comp.mean_diff
            : undefined,
      zStatistic:
        typeof comp.zStatistic === 'number'
          ? comp.zStatistic
          : typeof comp.z_score === 'number'
            ? comp.z_score
            : undefined,
      pvalue,
      pvalueAdjusted:
        typeof comp.adjustedPValue === 'number'
          ? comp.adjustedPValue
          : typeof comp.pvalueAdjusted === 'number'
            ? comp.pvalueAdjusted
            : typeof comp.pValueAdjusted === 'number'
              ? comp.pValueAdjusted
              : typeof comp.adjusted_p === 'number'
                ? comp.adjusted_p
                : undefined,
      significant:
        typeof comp.significant === 'boolean'
          ? comp.significant
          : pvalue < 0.05
    })
  }
  return results
}

export function calculateCohensD(group1: number[], group2: number[]): number {
  const mean1 = group1.reduce((a, b) => a + b, 0) / group1.length
  const mean2 = group2.reduce((a, b) => a + b, 0) / group2.length

  const var1 = group1.reduce((a, b) => a + Math.pow(b - mean1, 2), 0) / (group1.length - 1)
  const var2 = group2.reduce((a, b) => a + Math.pow(b - mean2, 2), 0) / (group2.length - 1)

  const pooledSD = Math.sqrt(((group1.length - 1) * var1 + (group2.length - 1) * var2) /
                             (group1.length + group2.length - 2))

  return Math.abs(mean1 - mean2) / pooledSD
}

/**
 * 효과크기 해석
 */
export function interpretCohensD(d: number): string {
  if (d < 0.2) return '매우 작음'
  if (d < 0.5) return '작음'
  if (d < 0.8) return '중간'
  return '큼'
}

export function interpretEtaSquared(eta: number): string {
  if (eta < 0.01) return '매우 작음'
  if (eta < 0.06) return '작음'
  if (eta < 0.14) return '중간'
  return '큼'
}

export function interpretRSquared(r2: number): string {
  if (r2 < 0.1) return '매우 약함'
  if (r2 < 0.3) return '약함'
  if (r2 < 0.5) return '중간'
  if (r2 < 0.7) return '강함'
  return '매우 강함'
}

export function interpretCorrelation(r: number): string {
  const absR = Math.abs(r)

  if (absR < 0.1) return '거의 없음'

  let strength = ''
  if (absR < 0.3) strength = '약한'
  else if (absR < 0.5) strength = '보통'
  else if (absR < 0.7) strength = '강한'
  else if (absR < 0.9) strength = '매우 강한'
  else strength = '완전'

  const direction = r > 0 ? '양의' : '음의'
  return `${direction} ${strength} 상관관계`
}

export function interpretCronbachAlpha(alpha: number): string {
  if (alpha < 0.6) return '수용 불가'
  if (alpha < 0.7) return '의문'
  if (alpha < 0.8) return '수용 가능'
  if (alpha < 0.9) return '양호'
  return '우수'
}

export function interpretCramersV(v: number): string {
  if (v < 0.1) return '매우 약함'
  if (v < 0.3) return '약함'
  if (v < 0.5) return '중간'
  return '강함'
}
