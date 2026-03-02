/**
 * r-reference-results.ts KM/ROC 골든값 검증
 *
 * 목적: r-reference-results.ts에 추가된 KM/ROC 골든값이
 * 순수 TS 참조 구현(km-roc-cross-validation.test.ts)과 일치하는지 확인한다.
 *
 * 이 테스트가 보장하는 것:
 * 1. r-reference-results.ts의 데이터와 cross-validation 데이터가 동일
 * 2. 검증된 골든값(✅)이 TS 구현과 일치
 * 3. 미검증 추정값(⚠️)의 합리성 검증
 */
import { describe, it, expect } from 'vitest'
import { ReferenceResults, allTestCases } from '../../test-data/reference-results/r-reference-results'

// ─── KM 참조 구현 (cross-validation과 동일) ──────────────────────────

interface KmPoint {
  time: number
  survival: number
}

function kmEstimate(times: number[], events: number[]): KmPoint[] {
  const sorted = times
    .map((t, i) => ({ t, e: events[i] }))
    .sort((a, b) => a.t - b.t)

  const points: KmPoint[] = []
  let survival = 1.0
  let atRisk = sorted.length
  let i = 0

  while (i < sorted.length) {
    const currentTime = sorted[i].t
    let d = 0
    let c = 0
    while (i < sorted.length && sorted[i].t === currentTime) {
      if (sorted[i].e === 1) d++
      else c++
      i++
    }
    if (d > 0) {
      survival *= (1 - d / atRisk)
      points.push({ time: currentTime, survival })
    }
    atRisk -= (d + c)
  }
  return points
}

// ─── ROC 참조 구현 (cross-validation과 동일) ─────────────────────────

function rocAuc(actual: number[], predicted: number[]): number {
  const nPos = actual.filter(a => a === 1).length
  const nNeg = actual.filter(a => a === 0).length
  if (nPos === 0 || nNeg === 0) return 0

  let concordant = 0
  let tied = 0
  for (let i = 0; i < actual.length; i++) {
    for (let j = 0; j < actual.length; j++) {
      if (actual[i] === 1 && actual[j] === 0) {
        if (predicted[i] > predicted[j]) concordant++
        else if (predicted[i] === predicted[j]) tied++
      }
    }
  }
  return (concordant + 0.5 * tied) / (nPos * nNeg)
}

// ═══════════════════════════════════════════════════════════════════════
// 테스트
// ═══════════════════════════════════════════════════════════════════════

describe('r-reference-results.ts KM/ROC 골든값 검증', () => {

  // ─── 데이터 일관성 ──────────────────────────────────────────────────

  describe('데이터 일관성 (cross-validation 데이터와 동일)', () => {
    it('KM singleGroup 데이터가 cross-validation Dataset 1과 동일하다', () => {
      const ref = ReferenceResults.kaplanMeier.singleGroup.data
      expect(ref.time).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      expect(ref.event).toEqual([1, 0, 1, 1, 0, 1, 0, 1, 1, 0])
    })

    it('KM twoGroup 데이터가 cross-validation Dataset 2와 동일하다', () => {
      const ref = ReferenceResults.kaplanMeier.twoGroup.data
      expect(ref.groupA.time).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20])
      expect(ref.groupA.event).toEqual([1, 1, 1, 0, 1, 0, 1, 1, 0, 1])
      expect(ref.groupB.time).toEqual([3, 6, 9, 12, 15, 18, 21, 24, 27, 30])
      expect(ref.groupB.event).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0, 0])
    })

    it('ROC diagnostic 데이터가 cross-validation Dataset 3과 동일하다', () => {
      const ref = ReferenceResults.rocCurve.diagnostic.data
      expect(ref.actual).toHaveLength(20)
      expect(ref.predicted).toHaveLength(20)
      expect(ref.actual.filter(a => a === 1)).toHaveLength(10)
      expect(ref.actual.filter(a => a === 0)).toHaveLength(10)
    })
  })

  // ─── 검증된 골든값 (✅) ─────────────────────────────────────────────

  describe('KM singleGroup: 검증된 생존확률 vs TS 구현', () => {
    const ref = ReferenceResults.kaplanMeier.singleGroup
    const tsResult = kmEstimate(ref.data.time, ref.data.event)

    it.each([
      [1, 0.9000],
      [3, 0.7875],
      [4, 0.6750],
      [6, 0.5400],
      [8, 0.3600],
      [9, 0.1800],
    ])('시점 t=%i: 골든값 S=%f와 TS 구현이 ±0.005 이내', (time, rSurvival) => {
      const point = tsResult.find(p => p.time === time)
      expect(point).toBeDefined()
      expect(point!.survival).toBeCloseTo(rSurvival, 2)
    })

    it('이벤트 시점 목록이 일치한다', () => {
      const tsTimes = tsResult.map(p => p.time)
      expect(tsTimes).toEqual(ref.expected.eventTimes)
    })

    it('중앙 생존 시간이 일치한다', () => {
      // S(t) ≤ 0.5인 최초 시점
      const medianPoint = tsResult.find(p => p.survival <= 0.5)
      expect(medianPoint?.time).toBe(ref.expected.medianSurvival)
    })
  })

  describe('ROC diagnostic: AUC 검증', () => {
    const ref = ReferenceResults.rocCurve.diagnostic

    it('Mann-Whitney AUC = 0.93 (92 concordant + 2 tied / 100 pairs)', () => {
      const tsAuc = rocAuc(ref.data.actual, ref.data.predicted)
      expect(tsAuc).toBeCloseTo(0.93, 2)
    })

    it('골든값과 TS 구현이 ±0.005 이내 일치한다', () => {
      // Mann-Whitney와 trapezoidal 모두 0.93 (수동 검증 완료)
      const tsAuc = rocAuc(ref.data.actual, ref.data.predicted)
      expect(tsAuc).toBeCloseTo(ref.expected.auc, 2)
    })
  })

  describe('ROC perfect: AUC = 1.0', () => {
    const ref = ReferenceResults.rocCurve.perfect

    it('완벽 분류기 AUC = 1.0', () => {
      const tsAuc = rocAuc(ref.data.actual, ref.data.predicted)
      expect(tsAuc).toBeCloseTo(ref.expected.auc, 2)
    })
  })

  describe('ROC random: AUC ≈ 0.39 (약한 역분류기)', () => {
    const ref = ReferenceResults.rocCurve.random

    it('MW AUC = 0.385 (골든값과 일치)', () => {
      const tsAuc = rocAuc(ref.data.actual, ref.data.predicted)
      expect(tsAuc).toBeCloseTo(ref.expected.auc, 2)
    })

    it('AUC가 허용 범위 [0.3, 0.7] 내', () => {
      const tsAuc = rocAuc(ref.data.actual, ref.data.predicted)
      expect(tsAuc).toBeGreaterThanOrEqual(ref.expected.aucRange[0])
      expect(tsAuc).toBeLessThanOrEqual(ref.expected.aucRange[1])
    })
  })

  // ─── 미검증 추정값 (⚠️) 합리성 검증 ───────────────────────────────

  describe('미검증 추정값 합리성 체크', () => {
    it('KM twoGroup logRankChiSq가 TS 독립계산(3.7115)과 ±0.005 이내', () => {
      const ref = ReferenceResults.kaplanMeier.twoGroup
      // TS 독립 log-rank 계산
      const combined: Array<{time: number; event: number; group: string}> = []
      ref.data.groupA.time.forEach((t, i) => combined.push({ time: t, event: ref.data.groupA.event[i], group: 'A' }))
      ref.data.groupB.time.forEach((t, i) => combined.push({ time: t, event: ref.data.groupB.event[i], group: 'B' }))
      combined.sort((a, b) => a.time - b.time)

      const eventTimes = [...new Set(combined.filter(c => c.event === 1).map(c => c.time))].sort((a, b) => a - b)
      let sumOA = 0, sumEA = 0, variance = 0
      for (const t of eventTimes) {
        const rA = combined.filter(c => c.time >= t && c.group === 'A').length
        const rB = combined.filter(c => c.time >= t && c.group === 'B').length
        const r = rA + rB
        const dA = combined.filter(c => c.time === t && c.event === 1 && c.group === 'A').length
        const d = combined.filter(c => c.time === t && c.event === 1).length
        sumOA += dA
        sumEA += d * rA / r
        if (r > 1) variance += d * (r - d) * rA * rB / (r * r * (r - 1))
      }
      const tsChiSq = (sumOA - sumEA) ** 2 / variance

      expect(ref.expected.logRankChiSq).toBeCloseTo(tsChiSq, 2)
    })

    it('KM twoGroup logRankPValue가 TS 독립계산과 ±0.005 이내', () => {
      const ref = ReferenceResults.kaplanMeier.twoGroup.expected
      // chi-sq(1) survival function: P = 2 * (1 - Phi(sqrt(x)))
      const z = Math.sqrt(ref.logRankChiSq)
      // Abramowitz & Stegun normal CDF
      const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741
      const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
      const t = 1.0 / (1.0 + p * z / Math.sqrt(2))
      const phi = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t * Math.exp(-z*z / 2)
      const cdfZ = 0.5 * (1.0 + phi)
      const expectedP = 2 * (1 - cdfZ)

      expect(ref.logRankPValue).toBeCloseTo(expectedP, 2)
    })

    it('ROC optimalThreshold = 0.55 (Youden J 최적)', () => {
      const ref = ReferenceResults.rocCurve.diagnostic
      // Youden's J 직접 계산으로 검증
      const nPos = ref.data.actual.filter(a => a === 1).length
      const nNeg = ref.data.actual.filter(a => a === 0).length
      const thresholds = [...new Set(ref.data.predicted)].sort((a, b) => b - a)
      let bestJ = -1, bestTh = 0
      for (const th of thresholds) {
        let tp = 0, tn = 0
        for (let i = 0; i < ref.data.actual.length; i++) {
          if (ref.data.predicted[i] >= th && ref.data.actual[i] === 1) tp++
          if (ref.data.predicted[i] < th && ref.data.actual[i] === 0) tn++
        }
        const j = tp / nPos + tn / nNeg - 1
        if (j > bestJ) { bestJ = j; bestTh = th }
      }
      expect(ref.expected.optimalThreshold).toBe(bestTh)
    })

    it('ROC sensitivity/specificity가 Youden 최적과 일치', () => {
      const ref = ReferenceResults.rocCurve.diagnostic
      // threshold=0.55에서의 sensitivity/specificity 직접 계산
      const nPos = ref.data.actual.filter(a => a === 1).length
      const nNeg = ref.data.actual.filter(a => a === 0).length
      let tp = 0, tn = 0
      for (let i = 0; i < ref.data.actual.length; i++) {
        if (ref.data.predicted[i] >= ref.expected.optimalThreshold && ref.data.actual[i] === 1) tp++
        if (ref.data.predicted[i] < ref.expected.optimalThreshold && ref.data.actual[i] === 0) tn++
      }
      expect(ref.expected.sensitivity).toBeCloseTo(tp / nPos, 2)
      expect(ref.expected.specificity).toBeCloseTo(tn / nNeg, 2)
    })
  })

  // ─── ROC AUC 다중 방법 교차 검증 ─────────────────────────────────────

  describe('ROC diagnostic: AUC 4방법 교차 검증', () => {
    const ref = ReferenceResults.rocCurve.diagnostic
    const { actual, predicted } = ref.data
    const nPos = actual.filter(a => a === 1).length
    const nNeg = actual.filter(a => a === 0).length

    it('Mann-Whitney brute-force AUC = 0.93', () => {
      const mwAuc = rocAuc(actual, predicted)
      expect(mwAuc).toBeCloseTo(0.93, 2)
    })

    it('Sort-based concordant AUC = 0.92 (tie 미처리로 0.01 낮음)', () => {
      const pairs = actual.map((a, i) => ({ a, p: predicted[i] }))
      pairs.sort((x, y) => x.p - y.p)
      let concordant = 0, negSoFar = 0
      for (const pair of pairs) {
        if (pair.a === 0) negSoFar++
        else concordant += negSoFar
      }
      const sortAuc = concordant / (nPos * nNeg)
      expect(sortAuc).toBeCloseTo(0.92, 2)
    })

    it('Trapezoidal AUC = 0.93', () => {
      const thresholds = [...new Set(predicted)].sort((a, b) => b - a)
      const allTh = [Infinity, ...thresholds]
      const points: Array<{fpr: number; tpr: number}> = []
      for (const th of allTh) {
        let tp = 0, fp = 0
        for (let i = 0; i < actual.length; i++) {
          if (predicted[i] >= th) {
            if (actual[i] === 1) tp++
            else fp++
          }
        }
        points.push({ fpr: fp / nNeg, tpr: tp / nPos })
      }
      const unique = new Map<string, {fpr: number; tpr: number}>()
      for (const p of points) {
        const key = `${p.fpr.toFixed(10)}_${p.tpr.toFixed(10)}`
        if (!unique.has(key)) unique.set(key, p)
      }
      const sorted = [...unique.values()].sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr)
      let trapAuc = 0
      for (let i = 1; i < sorted.length; i++) {
        trapAuc += (sorted[i].fpr - sorted[i - 1].fpr) * (sorted[i].tpr + sorted[i - 1].tpr) / 2
      }
      expect(trapAuc).toBeCloseTo(0.93, 2)
    })

    it('Wilcoxon rank-sum AUC = 0.93', () => {
      const ranked = predicted.map((p, i) => ({ p, a: actual[i] }))
      ranked.sort((a, b) => a.p - b.p)
      const ranks: Array<{a: number; rank: number}> = []
      let idx = 0, rank = 1
      while (idx < ranked.length) {
        let end = idx
        while (end < ranked.length - 1 && ranked[end + 1].p === ranked[idx].p) end++
        const avgRank = (rank + rank + (end - idx)) / 2
        for (let k = idx; k <= end; k++) ranks.push({ a: ranked[k].a, rank: avgRank })
        rank += (end - idx + 1)
        idx = end + 1
      }
      const sumRankPos = ranks.filter(r => r.a === 1).reduce((s, r) => s + r.rank, 0)
      const U = sumRankPos - nPos * (nPos + 1) / 2
      const wilcoxonAuc = U / (nPos * nNeg)
      expect(wilcoxonAuc).toBeCloseTo(0.93, 2)
    })

    it('4방법 간 최대 편차가 0.01 이내 (sort 제외 시 0)', () => {
      const mw = rocAuc(actual, predicted)
      // trapezoidal (간략)
      const thresholds = [...new Set(predicted)].sort((a, b) => b - a)
      const allTh = [Infinity, ...thresholds]
      const points: Array<{fpr: number; tpr: number}> = []
      for (const th of allTh) {
        let tp = 0, fp = 0
        for (let i = 0; i < actual.length; i++) {
          if (predicted[i] >= th) { if (actual[i] === 1) tp++; else fp++ }
        }
        points.push({ fpr: fp / nNeg, tpr: tp / nPos })
      }
      const uq = new Map<string, {fpr: number; tpr: number}>()
      for (const p of points) { const k = `${p.fpr}_${p.tpr}`; if (!uq.has(k)) uq.set(k, p) }
      const sr = [...uq.values()].sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr)
      let trap = 0
      for (let i = 1; i < sr.length; i++) trap += (sr[i].fpr - sr[i - 1].fpr) * (sr[i].tpr + sr[i - 1].tpr) / 2

      expect(Math.abs(mw - trap)).toBeLessThan(0.001)
      expect(Math.abs(mw - 0.93)).toBeLessThan(0.005)
    })
  })

  // ─── allTestCases 무결성 ────────────────────────────────────────────

  describe('allTestCases에 KM/ROC 포함 확인', () => {
    it('kaplanMeier 카테고리가 allTestCases에 있다', () => {
      const kmCases = allTestCases.filter(c => c.category === 'kaplanMeier')
      expect(kmCases).toHaveLength(2)
    })

    it('rocCurve 카테고리가 allTestCases에 있다', () => {
      const rocCases = allTestCases.filter(c => c.category === 'rocCurve')
      expect(rocCases).toHaveLength(3)
    })
  })
})
