/**
 * Assumption Utils
 *
 * 중첩된 StatisticalAssumptions 구조를 flat 배열로 변환.
 * paper-draft 와 export-data-builder 에서 공용으로 사용한다.
 */

import type { StatisticalAssumptions } from '@/types/analysis'
import type { FlatAssumption, GroupedAssumptions } from '@/lib/services/paper-draft/paper-types'

/** normality 객체에서 그룹 결과(group1, group2 등)가 아닌 검정 메서드 키 */
const NORMALITY_METHOD_KEYS = new Set(['shapiroWilk', 'kolmogorovSmirnov'])

/**
 * 중첩 StatisticalAssumptions → FlatAssumption[] 변환.
 *
 * 입력이 undefined/null 이면 빈 배열 반환 (graceful degradation).
 */
export function flattenAssumptions(
  assumptions: StatisticalAssumptions | null | undefined
): FlatAssumption[] {
  if (!assumptions) return []

  const result: FlatAssumption[] = []

  // ─── normality ──────────────────────────────────────────────────────────────
  if (assumptions.normality) {
    const n = assumptions.normality

    // 그룹별 정규성 (group1, group2 등)
    const groupKeys = Object.keys(n).filter(k => !NORMALITY_METHOD_KEYS.has(k))
    for (const key of groupKeys) {
      const g = n[key as keyof typeof n] as {
        statistic?: number; pValue?: number; isNormal: boolean
      } | undefined
      if (g && typeof g === 'object' && 'isNormal' in g) {
        result.push({
          category: 'normality',
          testName: 'Shapiro-Wilk',   // 그룹별 결과는 SW 기반
          statistic: g.statistic,
          pValue: g.pValue,
          passed: g.isNormal,
          group: key,
        })
      }
    }

    // Shapiro-Wilk (단일, 그룹 구분 없는 경우)
    if (n.shapiroWilk && !groupKeys.length) {
      result.push({
        category: 'normality',
        testName: 'Shapiro-Wilk',
        statistic: n.shapiroWilk.statistic,
        pValue: n.shapiroWilk.pValue,
        passed: n.shapiroWilk.isNormal,
      })
    }

    // Kolmogorov-Smirnov
    if (n.kolmogorovSmirnov) {
      result.push({
        category: 'normality',
        testName: 'Kolmogorov-Smirnov',
        statistic: n.kolmogorovSmirnov.statistic,
        pValue: n.kolmogorovSmirnov.pValue,
        passed: n.kolmogorovSmirnov.isNormal,
      })
    }
  }

  // ─── homogeneity ────────────────────────────────────────────────────────────
  if (assumptions.homogeneity) {
    const h = assumptions.homogeneity

    if (h.levene) {
      result.push({
        category: 'homogeneity',
        testName: 'Levene',
        statistic: h.levene.statistic,
        pValue: h.levene.pValue,
        passed: h.levene.equalVariance,
      })
    }

    if (h.bartlett) {
      result.push({
        category: 'homogeneity',
        testName: 'Bartlett',
        statistic: h.bartlett.statistic,
        pValue: h.bartlett.pValue,
        passed: h.bartlett.equalVariance,
      })
    }
  }

  // ─── independence ────────────────────────────────────────────────────────────
  if (assumptions.independence?.durbin) {
    const d = assumptions.independence.durbin
    result.push({
      category: 'independence',
      testName: 'Durbin-Watson',
      statistic: d.statistic,
      pValue: d.pValue,
      passed: d.isIndependent,
    })
  }

  // ─── linearity ───────────────────────────────────────────────────────────────
  if (assumptions.linearity) {
    const l = assumptions.linearity
    result.push({
      category: 'linearity',
      testName: 'Linearity',
      statistic: l.statistic,
      pValue: l.pValue,
      passed: l.passed,
    })
  }

  // ─── sphericity ──────────────────────────────────────────────────────────────
  if (assumptions.sphericity?.mauchly) {
    const m = assumptions.sphericity.mauchly
    result.push({
      category: 'sphericity',
      testName: "Mauchly's W",
      statistic: m.statistic,
      pValue: m.pValue,
      passed: m.passed,
    })
  }

  // ─── proportionalOdds ────────────────────────────────────────────────────────
  if (assumptions.proportionalOdds?.brant) {
    const b = assumptions.proportionalOdds.brant
    result.push({
      category: 'proportionalOdds',
      testName: 'Brant',
      statistic: b.statistic,
      pValue: b.pValue,
      passed: b.passed,
    })
  }

  // ─── overdispersion ──────────────────────────────────────────────────────────
  if (assumptions.overdispersion) {
    const o = assumptions.overdispersion
    result.push({
      category: 'overdispersion',
      testName: 'Overdispersion',
      statistic: o.dispersionRatio,
      passed: !o.detected,
    })
  }

  // ─── proportionalHazards ─────────────────────────────────────────────────────
  if (assumptions.proportionalHazards?.schoenfeld) {
    const s = assumptions.proportionalHazards.schoenfeld
    result.push({
      category: 'proportionalHazards',
      testName: 'Schoenfeld Residuals',
      statistic: s.statistic,
      pValue: s.pValue,
      passed: s.passed,
    })
  }

  // ─── stationarity ────────────────────────────────────────────────────────────
  if (assumptions.stationarity) {
    const st = assumptions.stationarity

    if (st.adf) {
      result.push({
        category: 'stationarity',
        testName: 'ADF',
        statistic: st.adf.statistic,
        pValue: st.adf.pValue,
        passed: st.adf.isStationary,
      })
    }

    if (st.kpss) {
      result.push({
        category: 'stationarity',
        testName: 'KPSS',
        statistic: st.kpss.statistic,
        pValue: st.kpss.pValue,
        passed: st.kpss.isStationary,
      })
    }
  }

  // ─── whiteNoise ──────────────────────────────────────────────────────────────
  if (assumptions.whiteNoise?.ljungBox) {
    const lb = assumptions.whiteNoise.ljungBox
    result.push({
      category: 'whiteNoise',
      testName: 'Ljung-Box',
      statistic: lb.statistic,
      pValue: lb.pValue,
      passed: lb.isWhiteNoise,
    })
  }

  return result
}

/** FlatAssumption[] → 카테고리별 그룹핑 (한 번 계산, 여러 템플릿에서 재사용) */
export function groupAssumptions(assumptions: FlatAssumption[]): GroupedAssumptions {
  const grouped: GroupedAssumptions = {}
  for (const a of assumptions) {
    (grouped[a.category] ??= []).push(a)
  }
  return grouped
}
