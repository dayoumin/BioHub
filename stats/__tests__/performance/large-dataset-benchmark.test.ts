/**
 * 대규모 데이터셋 벤치마크 테스트
 *
 * 목적: KM/ROC를 포함한 통계 분석의 10만 행 수준 처리 성능을 검증한다.
 * 이 테스트는 Pyodide 없이 순수 TS 참조 구현으로 알고리즘 성능만 측정한다.
 *
 * 실행: pnpm test:performance
 */
import { describe, it, expect } from 'vitest'

// ─── 합성 데이터 생성 유틸 ───────────────────────────────────────────

/** 시드 기반 pseudo-random (재현 가능) */
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

function generateSurvivalData(n: number, seed = 42): { times: number[]; events: number[] } {
  const rand = seededRandom(seed)
  const times: number[] = []
  const events: number[] = []
  for (let i = 0; i < n; i++) {
    times.push(Math.round(rand() * 1000) + 1)
    events.push(rand() > 0.3 ? 1 : 0)
  }
  return { times, events }
}

function generateRocData(n: number, seed = 42): { actual: number[]; predicted: number[] } {
  const rand = seededRandom(seed)
  const actual: number[] = []
  const predicted: number[] = []
  for (let i = 0; i < n; i++) {
    const label = rand() > 0.5 ? 1 : 0
    actual.push(label)
    // 분포 중첩: label=1 → [0.2, 0.9], label=0 → [0.1, 0.8]
    // 현실적 AUC ~0.7-0.85 범위 생성
    const noise = (rand() - 0.5) * 0.7
    predicted.push(Math.max(0, Math.min(1, label * 0.3 + 0.35 + noise)))
  }
  return { actual, predicted }
}

// ─── 참조 구현: KM (Greenwood 분산 + CI 포함) ───────────────────────

interface KmBenchResult {
  pointCount: number
  lastSurvival: number
  lastCILo: number
  lastCIHi: number
}

function kmEstimateBench(times: number[], events: number[]): KmBenchResult {
  const sorted = times
    .map((t, i) => ({ t, e: events[i] }))
    .sort((a, b) => a.t - b.t)

  let survival = 1.0
  let greenwoodSum = 0
  let atRisk = sorted.length
  let i = 0
  let pointCount = 0
  let lastCILo = 1
  let lastCIHi = 1

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
      // Greenwood 분산
      if (atRisk > d) {
        greenwoodSum += d / (atRisk * (atRisk - d))
      }
      // log-log CI (주의: R survival 기본은 conf.type="log". 여기는 "log-log" 변환)
      if (survival > 0 && survival < 1) {
        const logLogSE = Math.sqrt(greenwoodSum) / Math.abs(Math.log(survival))
        const logLogLower = Math.log(-Math.log(survival)) - 1.96 * logLogSE
        const logLogUpper = Math.log(-Math.log(survival)) + 1.96 * logLogSE
        lastCILo = Math.exp(-Math.exp(logLogUpper))
        lastCIHi = Math.exp(-Math.exp(logLogLower))
      }
      pointCount++
    }
    atRisk -= (d + c)
  }
  return { pointCount, lastSurvival: survival, lastCILo, lastCIHi }
}

// ─── 참조 구현: ROC AUC (정렬 기반 concordant pair count) ────────────
// 주의: tie를 0.5 가중하지 않음 (tied pairs는 무시됨).
// 벤치마크 목적이므로 정밀도보다 성능 측정에 집중.
// 정확한 Mann-Whitney는 tied pairs에 0.5 가중 필요.

function rocAucBench(actual: number[], predicted: number[]): number {
  const n = actual.length
  const nPos = actual.filter(a => a === 1).length
  const nNeg = n - nPos
  if (nPos === 0 || nNeg === 0) return 0

  const pairs = actual.map((a, i) => ({ a, p: predicted[i] }))
  pairs.sort((x, y) => x.p - y.p)

  let concordant = 0
  let negSoFar = 0

  for (const pair of pairs) {
    if (pair.a === 0) {
      negSoFar++
    } else {
      concordant += negSoFar
    }
  }

  return concordant / (nPos * nNeg)
}

// ─── 벤치마크 테스트 ─────────────────────────────────────────────────

describe('대규모 데이터셋 벤치마크', () => {
  // 한도: 실측값(~20-50ms @100K) 대비 5배 여유
  const SIZES = [1_000, 10_000, 100_000]
  const TIME_LIMITS_MS: Record<number, number> = {
    1_000: 50,
    10_000: 200,
    100_000: 500,
  }

  describe.each(SIZES)('KM (Greenwood CI 포함) n=%i', (n) => {
    it(`${n.toLocaleString()}행 KM+CI 추정이 ${TIME_LIMITS_MS[n]}ms 이내에 완료된다`, () => {
      const { times, events } = generateSurvivalData(n)

      const start = performance.now()
      const result = kmEstimateBench(times, events)
      const elapsed = performance.now() - start

      expect(result.pointCount).toBeGreaterThan(0)
      expect(result.lastSurvival).toBeGreaterThanOrEqual(0)
      expect(result.lastSurvival).toBeLessThanOrEqual(1)
      // CI 범위가 계산되었는지만 확인 (log-log 변환에서 극값 역전 가능)
      expect(result.lastCILo).toBeGreaterThanOrEqual(0)
      expect(result.lastCIHi).toBeLessThanOrEqual(1)
      expect(elapsed).toBeLessThan(TIME_LIMITS_MS[n])

      // eslint-disable-next-line no-console
      console.log(`  KM n=${n.toLocaleString()}: ${elapsed.toFixed(1)}ms, ${result.pointCount} points, S=${result.lastSurvival.toFixed(4)}, CI=[${result.lastCILo.toFixed(4)}, ${result.lastCIHi.toFixed(4)}]`)
    })
  })

  describe.each(SIZES)('ROC n=%i', (n) => {
    it(`${n.toLocaleString()}행 ROC AUC 계산이 ${TIME_LIMITS_MS[n]}ms 이내에 완료된다`, () => {
      const { actual, predicted } = generateRocData(n)

      const start = performance.now()
      const auc = rocAucBench(actual, predicted)
      const elapsed = performance.now() - start

      // 중첩 분포 → AUC는 0.6~0.95 범위여야 한다 (1.0이면 데이터 생성 버그)
      expect(auc).toBeGreaterThan(0.55)
      expect(auc).toBeLessThan(0.95)
      expect(elapsed).toBeLessThan(TIME_LIMITS_MS[n])

      // eslint-disable-next-line no-console
      console.log(`  ROC n=${n.toLocaleString()}: ${elapsed.toFixed(1)}ms, AUC=${auc.toFixed(4)}`)
    })
  })

  it('100K 행 합성 데이터 생성이 1초 이내에 완료된다', () => {
    const start = performance.now()
    const { times, events } = generateSurvivalData(100_000)
    const { actual, predicted } = generateRocData(100_000)
    const elapsed = performance.now() - start

    expect(times).toHaveLength(100_000)
    expect(events).toHaveLength(100_000)
    expect(actual).toHaveLength(100_000)
    expect(predicted).toHaveLength(100_000)
    expect(elapsed).toBeLessThan(1_000)
  })
})
