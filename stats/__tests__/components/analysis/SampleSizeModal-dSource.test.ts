/**
 * SampleSizeModal — dSource 추적 패턴 시뮬레이션
 *
 * SampleSizeModal의 d 수동 입력 overwrite 방지 로직을
 * React 없이 순수 상태 전이로 검증.
 *
 * 배경:
 *   기존 구현: CohenDInput 내부 useEffect가 helper 필드가 유효할 때마다
 *             onChange(computed_d)를 강제 호출 → 수동 입력값 overwrite 버그
 *   수정 후:  dSource('manual'|'helper') 추적으로 최종 편집 소스 기록.
 *             dSource==='manual'이면 effect 건너뜀 → overwrite 방지.
 */

import { describe, test, expect, beforeEach } from 'vitest'

// ─── 시뮬레이터 ─────────────────────────────────────────────────────────────

/**
 * SampleSizeModal의 d 관련 상태 + 핸들러를 React 없이 재현.
 *
 * React useEffect는 렌더 후 비동기 실행이지만,
 * 로직 검증 목적으로 각 핸들러 호출 직후 동기 실행으로 단순화.
 * (React 배치 업데이트 차이는 이 로직에 영향 없음)
 */
function createSim(initialD = '0.5') {
  let cohenD = initialD
  let dSource: 'manual' | 'helper' = 'manual'
  let mean1 = '', mean2 = '', pooledSd = ''

  /** useEffect 본체 — dSource==='helper'일 때만 d 덮어씀 */
  function applyEffect() {
    if (dSource !== 'helper') return
    const m1 = parseFloat(mean1)
    const m2 = parseFloat(mean2)
    const s  = parseFloat(pooledSd)
    if (isFinite(m1) && isFinite(m2) && isFinite(s) && s > 0) {
      cohenD = Math.abs((m1 - m2) / s).toFixed(3)
    }
  }

  return {
    // d 직접 입력 (Input onChange + PresetRow onSelect 경유)
    handleCohenDChange: (v: string)   => { cohenD = v; dSource = 'manual' },
    // helper 필드 변경 → dSource='helper' 전환 + effect 적용
    handleHelperMean1: (v: string)    => { mean1 = v;    dSource = 'helper'; applyEffect() },
    handleHelperMean2: (v: string)    => { mean2 = v;    dSource = 'helper'; applyEffect() },
    handleHelperSd:    (v: string)    => { pooledSd = v; dSource = 'helper'; applyEffect() },
    // 상태 읽기
    get cohenD()  { return cohenD },
    get dSource() { return dSource },
    get mean1()   { return mean1 },
  }
}

// ─── 정상 흐름 ───────────────────────────────────────────────────────────────

describe('dSource 시뮬레이션 — 정상 흐름', () => {
  test('초기 상태: cohenD=0.5, dSource=manual', () => {
    const sim = createSim()
    expect(sim.cohenD).toBe('0.5')
    expect(sim.dSource).toBe('manual')
  })

  test('helper 세 필드 모두 입력 → d 자동 계산', () => {
    const sim = createSim()
    sim.handleHelperMean1('10')
    sim.handleHelperMean2('15')
    sim.handleHelperSd('5')
    // d = |10 - 15| / 5 = 1.000
    expect(sim.cohenD).toBe('1.000')
    expect(sim.dSource).toBe('helper')
  })

  test('helper 값 변경 → d 실시간 갱신', () => {
    const sim = createSim()
    sim.handleHelperMean1('10')
    sim.handleHelperMean2('15')
    sim.handleHelperSd('5')
    expect(sim.cohenD).toBe('1.000')

    // mean2 변경 → d 재계산
    sim.handleHelperMean2('12')
    // d = |10 - 12| / 5 = 0.400
    expect(sim.cohenD).toBe('0.400')
  })

  test('helper 음수 평균도 절댓값 처리', () => {
    const sim = createSim()
    sim.handleHelperMean1('-5')
    sim.handleHelperMean2('5')
    sim.handleHelperSd('10')
    // d = |-5 - 5| / 10 = 1.000
    expect(sim.cohenD).toBe('1.000')
  })
})

// ─── 핵심 수정 — overwrite 방지 ─────────────────────────────────────────────

describe('dSource 시뮬레이션 — overwrite 방지 (핵심 버그 수정)', () => {
  test('[수정 전 버그 재현] helper 후 d 수동 입력 → helper 재실행 없으면 d 유지', () => {
    const sim = createSim()
    // 1단계: helper로 d 자동 계산
    sim.handleHelperMean1('10')
    sim.handleHelperMean2('15')
    sim.handleHelperSd('5')
    expect(sim.cohenD).toBe('1.000')

    // 2단계: d 수동 입력 → dSource='manual'
    sim.handleCohenDChange('0.500')
    expect(sim.cohenD).toBe('0.500')
    expect(sim.dSource).toBe('manual')

    // 3단계: helper 필드 변경 없음 → effect 재실행 없음 → d 유지
    // (수정 전에는 다음 렌더에서 useEffect가 다시 d를 1.000으로 되돌렸음)
    expect(sim.cohenD).toBe('0.500')  // 유지 확인
  })

  test('d 수동 변경 후 helper 필드 수정 → d 재계산 (의도된 동작)', () => {
    const sim = createSim()
    sim.handleHelperMean1('10')
    sim.handleHelperMean2('15')
    sim.handleHelperSd('5')

    sim.handleCohenDChange('0.500')
    expect(sim.dSource).toBe('manual')

    // helper 필드를 명시적으로 바꾸면 dSource='helper' 재전환 → d 재계산
    sim.handleHelperMean1('12')
    expect(sim.dSource).toBe('helper')
    // d = |12 - 15| / 5 = 0.600
    expect(sim.cohenD).toBe('0.600')
  })

  test('프리셋 클릭 (handleCohenDChange 경유) → dSource=manual', () => {
    const sim = createSim()
    sim.handleHelperMean1('10')
    sim.handleHelperMean2('15')
    sim.handleHelperSd('5')
    expect(sim.dSource).toBe('helper')

    // PresetRow onSelect도 handleCohenDChange를 통해 호출됨
    sim.handleCohenDChange('0.800')  // 프리셋 "대 0.8" 클릭 시뮬레이션
    expect(sim.cohenD).toBe('0.800')
    expect(sim.dSource).toBe('manual')
  })

  test('초기 상태(dSource=manual)에서 helper 건드리지 않으면 d 불변', () => {
    const sim = createSim()
    expect(sim.dSource).toBe('manual')
    // effect가 있어도 dSource=manual이므로 effect 내부 로직 실행 안 됨
    expect(sim.cohenD).toBe('0.5')
  })
})

// ─── 경계값 / 에러 케이스 ────────────────────────────────────────────────────

describe('dSource 시뮬레이션 — 경계값', () => {
  test('SD = 0 → d 계산 안 됨 (0 나누기 방지)', () => {
    const sim = createSim()
    sim.handleHelperMean1('10')
    sim.handleHelperMean2('15')
    sim.handleHelperSd('0')   // s > 0 조건 불만족
    expect(sim.cohenD).toBe('0.5')  // 초기값 유지
  })

  test('SD 음수 → d 계산 안 됨', () => {
    const sim = createSim()
    sim.handleHelperMean1('10')
    sim.handleHelperMean2('15')
    sim.handleHelperSd('-2')  // s > 0 불만족
    expect(sim.cohenD).toBe('0.5')
  })

  test('helper 부분 입력 (mean2 미입력) → d 계산 안 됨', () => {
    const sim = createSim()
    sim.handleHelperMean1('10')
    // mean2, sd 미입력
    expect(sim.cohenD).toBe('0.5')  // 초기값 유지
  })

  test('mean1 = mean2 → d = 0.000 (계산은 되지만 calcXxx에서 에러 반환)', () => {
    const sim = createSim()
    sim.handleHelperMean1('10')
    sim.handleHelperMean2('10')  // same value
    sim.handleHelperSd('5')
    // d = |10 - 10| / 5 = 0
    expect(sim.cohenD).toBe('0.000')
    // calcTwoSample(0, ...) → error: "효과 크기 d는 0보다 커야 합니다"
    // (결과 영역에 에러 표시됨, d 계산 자체는 정상)
  })

  test('helper 빈 문자열 입력 (parseFloat → NaN) → d 계산 안 됨', () => {
    const sim = createSim()
    sim.handleHelperMean1('10')
    sim.handleHelperMean2('15')
    sim.handleHelperSd('5')
    expect(sim.cohenD).toBe('1.000')

    // sd 지우기 (빈 문자열)
    sim.handleHelperSd('')
    // parseFloat('') = NaN → isFinite 실패 → d 계산 안 됨 → 이전 값 유지
    expect(sim.cohenD).toBe('1.000')
  })

  test('SD가 매우 작은 양수 → d 계산됨 (0.001 이상)', () => {
    const sim = createSim()
    sim.handleHelperMean1('1')
    sim.handleHelperMean2('2')
    sim.handleHelperSd('0.001')
    // d = |1 - 2| / 0.001 = 1000
    expect(parseFloat(sim.cohenD)).toBeCloseTo(1000, 0)
  })
})
