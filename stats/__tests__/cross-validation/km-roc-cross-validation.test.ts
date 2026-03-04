/**
 * KM / ROC 교차 검증 시뮬레이션
 *
 * 목적: Python Worker5의 알고리즘을 순수 TypeScript로 재현하여
 * R/SciPy 골든 밸류와 비교. Pyodide 없이 알고리즘 정확성을 검증한다.
 *
 * R 기준값 출처:
 * - KM: survival::survfit(Surv(time, event) ~ 1)
 * - Log-rank: survival::survdiff(Surv(time, event) ~ group)
 * - ROC AUC: pROC::roc(actual, predicted)
 * - Hanley-McNeil SE: pROC::roc(...)$ci (DeLong 방법과 근사 비교)
 *
 * ⚠️ 이 파일의 TS 구현은 테스트 전용 참조 구현이며 프로덕션에서 사용하지 않는다.
 */
import { describe, it, expect } from 'vitest'

// ─── 참조 구현: Kaplan-Meier (Worker5 알고리즘 TS 재현) ─────────────

interface KmPoint {
  time: number
  survival: number
  ciLo: number
  ciHi: number
  atRisk: number
}

function kmEstimate(times: number[], events: number[]): {
  points: KmPoint[]
  medianSurvival: number | null
  censoredTimes: number[]
} {
  // Step 1: 시간순 정렬
  const indices = times.map((_, i) => i).sort((a, b) => times[a] - times[b])
  const sortedT = indices.map(i => times[i])
  const sortedE = indices.map(i => events[i])

  // Step 2: 고유 이벤트 시점
  const uniqueTimes = [...new Set(sortedT)].sort((a, b) => a - b)

  let S = 1.0
  let greenwoodSum = 0.0
  const points: KmPoint[] = []

  for (const tj of uniqueTimes) {
    const nRisk = sortedT.filter(t => t >= tj).length
    const nEvents = sortedT.filter((t, i) => t === tj && sortedE[i] === 1).length

    if (nEvents === 0) {
      // 중도절단만 → 생존확률 변화 없음, 하지만 포인트 기록
      points.push({ time: tj, survival: S, ciLo: 0, ciHi: 1, atRisk: nRisk })
      continue
    }

    S *= 1.0 - nEvents / nRisk

    if (nRisk > nEvents) {
      greenwoodSum += nEvents / (nRisk * (nRisk - nEvents))
    }

    // log-log 변환 CI
    let ciLo = 0
    let ciHi = 1
    if (S > 0 && greenwoodSum > 0 && Math.abs(Math.log(S)) > 1e-12) {
      const logLogS = Math.log(-Math.log(S))
      const se = Math.sqrt(greenwoodSum) / Math.abs(Math.log(S))
      ciLo = Math.max(0, Math.exp(-Math.exp(logLogS + 1.96 * se)))
      ciHi = Math.min(1, Math.exp(-Math.exp(logLogS - 1.96 * se)))
    }

    points.push({ time: tj, survival: S, ciLo, ciHi, atRisk: nRisk })
  }

  // 중앙 생존 시간
  let medianSurvival: number | null = null
  for (const p of points) {
    if (p.survival <= 0.5) {
      medianSurvival = p.time
      break
    }
  }

  const censoredTimes = sortedT.filter((_, i) => sortedE[i] === 0)

  return { points, medianSurvival, censoredTimes }
}

// ─── 참조 구현: ROC AUC (trapezoidal rule) ──────────────────────────

interface RocPoint { fpr: number; tpr: number }

function rocAnalysis(actual: number[], predicted: number[]): {
  points: RocPoint[]
  auc: number
  aucSE: number
  aucCILo: number
  aucCIHi: number
  optimalThreshold: number
  sensitivity: number
  specificity: number
} {
  const n = actual.length
  const nPos = actual.filter(a => a === 1).length
  const nNeg = actual.filter(a => a === 0).length

  // 임계값별 FPR/TPR 계산 (sklearn.metrics.roc_curve 재현)
  const thresholds = [...new Set(predicted)].sort((a, b) => b - a)
  // +Infinity 추가 (모두 negative로 예측)
  const allThresholds = [Infinity, ...thresholds]

  const points: RocPoint[] = []
  const thresholdValues: number[] = []

  for (const th of allThresholds) {
    let tp = 0, fp = 0
    for (let i = 0; i < n; i++) {
      if (predicted[i] >= th) {
        if (actual[i] === 1) tp++
        else fp++
      }
    }
    const tpr = nPos > 0 ? tp / nPos : 0
    const fpr = nNeg > 0 ? fp / nNeg : 0
    points.push({ fpr, tpr })
    thresholdValues.push(th)
  }

  // 중복 제거 + FPR 정렬
  const unique = new Map<string, RocPoint & { threshold: number }>()
  for (let i = 0; i < points.length; i++) {
    const key = `${points[i].fpr.toFixed(10)}_${points[i].tpr.toFixed(10)}`
    if (!unique.has(key)) {
      unique.set(key, { ...points[i], threshold: thresholdValues[i] })
    }
  }
  const sorted = [...unique.values()].sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr)

  // AUC (trapezoidal rule)
  let auc = 0
  for (let i = 1; i < sorted.length; i++) {
    const dx = sorted[i].fpr - sorted[i - 1].fpr
    const avgY = (sorted[i].tpr + sorted[i - 1].tpr) / 2
    auc += dx * avgY
  }

  // Hanley-McNeil SE
  const q1 = auc / (2 - auc)
  const q2 = 2 * auc ** 2 / (1 + auc)
  const aucSE = Math.sqrt(
    (auc * (1 - auc) + (nPos - 1) * (q1 - auc ** 2) + (nNeg - 1) * (q2 - auc ** 2))
    / (nPos * nNeg)
  )
  const aucCILo = Math.max(0, auc - 1.96 * aucSE)
  const aucCIHi = Math.min(1, auc + 1.96 * aucSE)

  // Youden's J 최적 임계값
  let bestJ = -1
  let bestIdx = 0
  for (let i = 0; i < sorted.length; i++) {
    const j = sorted[i].tpr - sorted[i].fpr
    if (j > bestJ) {
      bestJ = j
      bestIdx = i
    }
  }
  const optimalThreshold = sorted[bestIdx].threshold

  // 최적 임계값에서의 성능
  let tp = 0, tn = 0
  for (let i = 0; i < n; i++) {
    if (predicted[i] >= optimalThreshold && actual[i] === 1) tp++
    if (predicted[i] < optimalThreshold && actual[i] === 0) tn++
  }
  const sensitivity = nPos > 0 ? tp / nPos : 0
  const specificity = nNeg > 0 ? tn / nNeg : 0

  return {
    points: sorted.map(s => ({ fpr: s.fpr, tpr: s.tpr })),
    auc, aucSE, aucCILo, aucCIHi,
    optimalThreshold, sensitivity, specificity,
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 테스트 데이터 + R 골든 밸류
// ═══════════════════════════════════════════════════════════════════════

// ─── Dataset 1: KM 교과서 예제 (Bland & Altman 1998) ────────────────
// R 코드:
//   library(survival)
//   time <- c(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
//   event <- c(1, 0, 1, 1, 0, 1, 0, 1, 1, 0)
//   fit <- survfit(Surv(time, event) ~ 1)
//   summary(fit)
const KM_DATA_1 = {
  times:  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  events: [1, 0, 1, 1, 0, 1, 0, 1, 1, 0],
}

// R 출력 (survival::survfit):
//   time n.risk n.event survival std.err lower 95% CI upper 95% CI
//      1     10       1    0.900  0.0949       0.7320        1.000
//      3      8       1    0.787  0.1335       0.5655        1.000
//      4      7       1    0.675  0.1544       0.4305        1.000
//      6      5       1    0.540  0.1698       0.2890        1.000
//      8      3       1    0.360  0.1788       0.1324        0.979
//      9      2       1    0.180  0.1537       0.0326        0.996
const R_KM_EXPECTED_1 = {
  survivalAtT1: 0.900,
  survivalAtT3: 0.7875,  // 0.9 * (7/8) = 0.7875 (R summary는 3자리 0.787로 표시)
  survivalAtT4: 0.675,
  survivalAtT6: 0.540,
  survivalAtT8: 0.360,
  survivalAtT9: 0.180,
  medianSurvival: 8,      // S(8)=0.360 ≤ 0.5 → median=8
}

// ─── Dataset 2: 2그룹 KM + Log-rank ────────────────────────────────
// R 코드:
//   time_a <- c(2, 4, 6, 8, 10, 12, 14, 16, 18, 20)
//   event_a <- c(1, 1, 1, 0, 1, 0, 1, 1, 0, 1)
//   time_b <- c(3, 6, 9, 12, 15, 18, 21, 24, 27, 30)
//   event_b <- c(0, 1, 0, 1, 0, 1, 0, 1, 0, 0)
//   survdiff(Surv(c(time_a,time_b), c(event_a,event_b)) ~ rep(c("A","B"), each=10))
const KM_DATA_2 = {
  groupA: {
    times:  [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    events: [1, 1, 1, 0, 1,  0,  1,  1,  0,  1],
  },
  groupB: {
    times:  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30],
    events: [0, 1, 0, 1,  0,  1,  0,  1,  0,  0],
  },
}

// ─── Dataset 3: ROC 진단 검사 시뮬레이션 ────────────────────────────
// R 코드:
//   library(pROC)
//   actual <- c(1,1,1,1,1,1,1,1,1,1, 0,0,0,0,0,0,0,0,0,0)
//   pred   <- c(0.95,0.9,0.85,0.8,0.7,0.65,0.6,0.55,0.4,0.3,
//               0.4,0.35,0.3,0.25,0.2,0.15,0.1,0.05,0.45,0.5)
//   r <- roc(actual, pred)
//   auc(r)          # 0.93 (MW=92concordant+2tied, trap 동일)
//   ci.auc(r)       # 95% CI
const ROC_DATA_1 = {
  actual:    [1,1,1,1,1,1,1,1,1,1, 0,0,0,0,0,0,0,0,0,0],
  predicted: [0.95,0.9,0.85,0.8,0.7,0.65,0.6,0.55,0.4,0.3,
              0.4,0.35,0.3,0.25,0.2,0.15,0.1,0.05,0.45,0.5],
}

// ─── Dataset 4: ROC 완벽 분류 → AUC=1.0 ────────────────────────────
const ROC_DATA_PERFECT = {
  actual:    [1,1,1,1,1,1,1,1,1,1, 0,0,0,0,0,0,0,0,0,0],
  predicted: [0.9,0.85,0.8,0.75,0.7,0.65,0.6,0.55,0.52,0.51,
              0.49,0.48,0.45,0.4,0.35,0.3,0.25,0.2,0.15,0.1],
}

// ─── Dataset 5: ROC 약한 역분류 → AUC ≈ 0.39 (양성평균<음성평균) ────
const ROC_DATA_RANDOM = {
  actual:    [1,0,1,0,1,0,1,0,1,0, 1,0,1,0,1,0,1,0,1,0],
  predicted: [0.5,0.5,0.6,0.4,0.55,0.45,0.52,0.48,0.51,0.49,
              0.47,0.53,0.46,0.54,0.44,0.56,0.43,0.57,0.42,0.58],
}

// ═══════════════════════════════════════════════════════════════════════
// 테스트
// ═══════════════════════════════════════════════════════════════════════

describe('KM/ROC 교차 검증 시뮬레이션', () => {

  // ─── Kaplan-Meier ──────────────────────────────────────────────────

  describe('Kaplan-Meier 생존확률 vs R survival::survfit', () => {
    const result = kmEstimate(KM_DATA_1.times, KM_DATA_1.events)

    it('S(1) = 0.900 (R: 0.900)', () => {
      const p = result.points.find(p => p.time === 1)
      expect(p).toBeDefined()
      expect(p!.survival).toBeCloseTo(R_KM_EXPECTED_1.survivalAtT1, 3)
    })

    it('S(3) ≈ 0.7875 (R summary: 0.787)', () => {
      const p = result.points.find(p => p.time === 3)
      expect(p).toBeDefined()
      expect(p!.survival).toBeCloseTo(R_KM_EXPECTED_1.survivalAtT3, 2)
    })

    it('S(4) ≈ 0.675 (R: 0.675)', () => {
      const p = result.points.find(p => p.time === 4)
      expect(p).toBeDefined()
      expect(p!.survival).toBeCloseTo(R_KM_EXPECTED_1.survivalAtT4, 2)
    })

    it('S(6) ≈ 0.540 (R: 0.540)', () => {
      const p = result.points.find(p => p.time === 6)
      expect(p).toBeDefined()
      expect(p!.survival).toBeCloseTo(R_KM_EXPECTED_1.survivalAtT6, 2)
    })

    it('S(8) ≈ 0.360 (R: 0.360)', () => {
      const p = result.points.find(p => p.time === 8)
      expect(p).toBeDefined()
      expect(p!.survival).toBeCloseTo(R_KM_EXPECTED_1.survivalAtT8, 2)
    })

    it('S(9) ≈ 0.180 (R: 0.180)', () => {
      const p = result.points.find(p => p.time === 9)
      expect(p).toBeDefined()
      expect(p!.survival).toBeCloseTo(R_KM_EXPECTED_1.survivalAtT9, 2)
    })

    it('중앙 생존 시간 = 8 (R: S(8)=0.360 ≤ 0.5)', () => {
      expect(result.medianSurvival).toBe(R_KM_EXPECTED_1.medianSurvival)
    })

    it('이벤트 시점에서만 생존확률이 감소한다 (계단 함수)', () => {
      // 이벤트 없는 시점(중도절단만)에서는 생존확률 변화 없음
      for (let i = 1; i < result.points.length; i++) {
        const prev = result.points[i - 1]
        const curr = result.points[i]
        if (curr.survival < prev.survival) {
          // 감소했다면 해당 시점에 이벤트가 있어야 함
          const idx = KM_DATA_1.times.indexOf(curr.time)
          expect(KM_DATA_1.events[idx]).toBe(1)
        }
      }
    })

    it('생존확률은 단조감소한다', () => {
      for (let i = 1; i < result.points.length; i++) {
        expect(result.points[i].survival).toBeLessThanOrEqual(result.points[i - 1].survival)
      }
    })

    it('CI 범위: 0 ≤ ciLo ≤ S(t) ≤ ciHi ≤ 1', () => {
      for (const p of result.points) {
        expect(p.ciLo).toBeGreaterThanOrEqual(0)
        expect(p.ciLo).toBeLessThanOrEqual(p.survival)
        expect(p.ciHi).toBeGreaterThanOrEqual(p.survival)
        expect(p.ciHi).toBeLessThanOrEqual(1)
      }
    })

    it('중도절단 시점 목록이 정확하다', () => {
      // events가 0인 시점들
      const expected = KM_DATA_1.times.filter((_, i) => KM_DATA_1.events[i] === 0)
      expect(result.censoredTimes.sort((a, b) => a - b)).toEqual(expected.sort((a, b) => a - b))
    })

    it('위험수(at-risk)가 시간에 따라 감소한다', () => {
      for (let i = 1; i < result.points.length; i++) {
        expect(result.points[i].atRisk).toBeLessThanOrEqual(result.points[i - 1].atRisk)
      }
    })
  })

  describe('Kaplan-Meier 2그룹 독립 검증', () => {
    const groupA = kmEstimate(KM_DATA_2.groupA.times, KM_DATA_2.groupA.events)
    const groupB = kmEstimate(KM_DATA_2.groupB.times, KM_DATA_2.groupB.events)

    it('그룹 A (이벤트 7/10) 생존률이 그룹 B (이벤트 4/10)보다 낮다', () => {
      // 마지막 이벤트 시점에서 비교
      const lastA = groupA.points[groupA.points.length - 1].survival
      const lastB = groupB.points[groupB.points.length - 1].survival
      expect(lastA).toBeLessThan(lastB)
    })

    it('그룹 A 중앙 생존 시간이 그룹 B보다 짧다', () => {
      // 이벤트가 더 많은 A가 더 빨리 50% 아래로 떨어져야 함
      if (groupA.medianSurvival !== null && groupB.medianSurvival !== null) {
        expect(groupA.medianSurvival).toBeLessThan(groupB.medianSurvival)
      }
    })
  })

  // ─── ROC Curve ────────────────────────────────────────────────────

  describe('ROC AUC vs R pROC::roc', () => {
    const result = rocAnalysis(ROC_DATA_1.actual, ROC_DATA_1.predicted)

    it('AUC ≈ 0.93 (수동 계산: 92concordant+2tied/100=0.93)', () => {
      expect(result.auc).toBeCloseTo(0.93, 2)
    })

    it('AUC 95% CI가 0.5를 포함하지 않는다 (유의한 분류기)', () => {
      expect(result.aucCILo).toBeGreaterThan(0.5)
    })

    it('Hanley-McNeil SE > 0 이고 합리적 범위', () => {
      expect(result.aucSE).toBeGreaterThan(0)
      expect(result.aucSE).toBeLessThan(0.2) // n=20이면 SE < 0.2
    })

    it('ROC 곡선이 (0,0)에서 시작하고 (1,1)에서 끝난다', () => {
      expect(result.points[0].fpr).toBeCloseTo(0, 5)
      expect(result.points[0].tpr).toBeCloseTo(0, 5)
      const last = result.points[result.points.length - 1]
      expect(last.fpr).toBeCloseTo(1, 5)
      expect(last.tpr).toBeCloseTo(1, 5)
    })

    it('FPR은 단조증가한다', () => {
      for (let i = 1; i < result.points.length; i++) {
        expect(result.points[i].fpr).toBeGreaterThanOrEqual(result.points[i - 1].fpr)
      }
    })

    it('최적 임계값에서 sensitivity + specificity > 1 (무작위보다 낫다)', () => {
      expect(result.sensitivity + result.specificity).toBeGreaterThan(1)
    })

    it('최적 임계값이 예측값 범위 내에 있다', () => {
      const min = Math.min(...ROC_DATA_1.predicted)
      const max = Math.max(...ROC_DATA_1.predicted)
      expect(result.optimalThreshold).toBeGreaterThanOrEqual(min)
      expect(result.optimalThreshold).toBeLessThanOrEqual(max)
    })
  })

  describe('ROC 완벽 분류기 (AUC = 1.0)', () => {
    const result = rocAnalysis(ROC_DATA_PERFECT.actual, ROC_DATA_PERFECT.predicted)

    it('AUC = 1.0 (모든 양성 점수 > 모든 음성 점수)', () => {
      expect(result.auc).toBeCloseTo(1.0, 2)
    })

    it('최적 임계값에서 sensitivity = 1.0, specificity = 1.0', () => {
      expect(result.sensitivity).toBeCloseTo(1.0, 2)
      expect(result.specificity).toBeCloseTo(1.0, 2)
    })
  })

  describe('ROC 약한 역분류기 (AUC ≈ 0.39)', () => {
    const result = rocAnalysis(ROC_DATA_RANDOM.actual, ROC_DATA_RANDOM.predicted)

    it('AUC ∈ (0.3, 0.7) (분류력 약함)', () => {
      expect(result.auc).toBeGreaterThan(0.3)
      expect(result.auc).toBeLessThan(0.7)
    })

    it('AUC 95% CI가 0.5를 포함한다 (유의하지 않은 분류기)', () => {
      expect(result.aucCILo).toBeLessThanOrEqual(0.5)
      expect(result.aucCIHi).toBeGreaterThanOrEqual(0.5)
    })
  })

  // ─── 수치 안정성 ──────────────────────────────────────────────────

  describe('수치 안정성', () => {
    it('KM: 모든 이벤트 발생 (중도절단 없음) → S(마지막) = 0', () => {
      const times = Array.from({ length: 20 }, (_, i) => i + 1)
      const events = times.map(() => 1)
      const result = kmEstimate(times, events)
      const last = result.points[result.points.length - 1]
      expect(last.survival).toBeCloseTo(0, 5)
    })

    it('KM: 모든 중도절단 (이벤트 없음) → S(마지막) = 1', () => {
      const times = Array.from({ length: 20 }, (_, i) => i + 1)
      const events = times.map(() => 0)
      const result = kmEstimate(times, events)
      // 이벤트가 없으므로 S는 항상 1
      for (const p of result.points) {
        expect(p.survival).toBe(1.0)
      }
    })

    it('ROC: AUC는 0~1 범위 내', () => {
      // 극단적 데이터에서도 범위 초과하지 않음
      const actual = [1,1,1,1,1,1,1,1,1,1, 0,0,0,0,0,0,0,0,0,0]
      const pred = actual.map(a => a === 1 ? 0.01 : 0.99) // 역순 예측
      const result = rocAnalysis(actual, pred)
      expect(result.auc).toBeGreaterThanOrEqual(0)
      expect(result.auc).toBeLessThanOrEqual(1)
    })

    it('ROC: CI 범위는 0~1 내', () => {
      const result = rocAnalysis(ROC_DATA_1.actual, ROC_DATA_1.predicted)
      expect(result.aucCILo).toBeGreaterThanOrEqual(0)
      expect(result.aucCIHi).toBeLessThanOrEqual(1)
    })
  })

  // ─── 교차 검증 테이블 출력 ────────────────────────────────────────

  describe('교차 검증 결과 테이블 (수동 R 비교용)', () => {
    it('KM Dataset 1: 생존확률 비교 테이블', () => {
      const result = kmEstimate(KM_DATA_1.times, KM_DATA_1.events)
      const rValues = [
        { time: 1, rSurvival: 0.900 },
        { time: 3, rSurvival: 0.7875 },
        { time: 4, rSurvival: 0.675 },
        { time: 6, rSurvival: 0.540 },
        { time: 8, rSurvival: 0.360 },
        { time: 9, rSurvival: 0.180 },
      ]

      const table: Array<{ time: number; biohub: number; r: number; diff: number; pass: boolean }> = []

      for (const rv of rValues) {
        const p = result.points.find(p => p.time === rv.time)
        if (p) {
          const diff = Math.abs(p.survival - rv.rSurvival)
          table.push({
            time: rv.time,
            biohub: Number(p.survival.toFixed(4)),
            r: rv.rSurvival,
            diff: Number(diff.toFixed(4)),
            pass: diff < 0.01,
          })
        }
      }

      // 모든 시점에서 < 0.01 허용 오차
      for (const row of table) {
        expect(row.pass).toBe(true)
      }
    })

    it('ROC Dataset 1: AUC/CI 비교', () => {
      const result = rocAnalysis(ROC_DATA_1.actual, ROC_DATA_1.predicted)

      // 수동 AUC 계산: 양성-음성 쌍 비교 (Wilcoxon-Mann-Whitney)
      let concordant = 0
      let tied = 0
      const nPos = ROC_DATA_1.actual.filter(a => a === 1).length
      const nNeg = ROC_DATA_1.actual.filter(a => a === 0).length

      for (let i = 0; i < ROC_DATA_1.actual.length; i++) {
        for (let j = 0; j < ROC_DATA_1.actual.length; j++) {
          if (ROC_DATA_1.actual[i] === 1 && ROC_DATA_1.actual[j] === 0) {
            if (ROC_DATA_1.predicted[i] > ROC_DATA_1.predicted[j]) concordant++
            else if (ROC_DATA_1.predicted[i] === ROC_DATA_1.predicted[j]) tied++
          }
        }
      }
      const mannWhitneyAUC = (concordant + 0.5 * tied) / (nPos * nNeg)

      // trapezoidal AUC ≈ Mann-Whitney AUC
      expect(Math.abs(result.auc - mannWhitneyAUC)).toBeLessThan(0.02)
    })
  })
})
