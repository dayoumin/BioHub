/**
 * AnnotationTab 시뮬레이션 테스트 (C-4)
 *
 * UI 렌더링 없이 핵심 로직을 스토어 수준에서 검증한다.
 *
 * 구성:
 *   SIM-1: hline 추가 — 입력 파싱 + AnnotationSpec 생성
 *   SIM-2: vline 추가 — 숫자/카테고리 X값 구분
 *   SIM-3: 유효성 검사 — NaN/빈값 거부
 *   SIM-4: 삭제 — 올바른 인덱스 제거
 *   SIM-5: 옵션 — 색상·점선 적용
 *   SIM-6: 스토어 통합 — updateChartSpec 히스토리 보존
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store'
import type { ChartSpec, HLineAnnotation, VLineAnnotation, AnnotationSpec } from '@/types/graph-studio'

// ─── 픽스처 ──────────────────────────────────────────────

function makeSpec(annotations: AnnotationSpec[] = []): ChartSpec {
  return {
    version: '1.0',
    chartType: 'bar',
    title: 'Test',
    data: { sourceId: 's', columns: [] },
    encoding: {
      x: { field: 'group', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations,
    exportConfig: { format: 'png', dpi: 96 },
  }
}

// AnnotationTab의 addHline 로직을 순수 함수로 추출
function buildHline(
  value: string,
  text: string,
  color: string,
  dashed: boolean,
): HLineAnnotation | null {
  const val = parseFloat(value)
  if (isNaN(val)) return null
  return {
    type: 'hline',
    value: val,
    ...(text && { text }),
    color,
    ...(dashed && { strokeDash: [4, 4] }),
  }
}

// AnnotationTab의 addVline 로직을 순수 함수로 추출
function buildVline(
  raw: string,
  text: string,
  color: string,
  dashed: boolean,
): VLineAnnotation | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const numVal = Number(trimmed)
  const val: number | string = isNaN(numVal) ? trimmed : numVal
  return {
    type: 'vline',
    value: val,
    ...(text && { text }),
    color,
    ...(dashed && { strokeDash: [4, 4] }),
  }
}

// AnnotationTab의 deleteAnnotation 로직
function deleteAnnotation(annotations: AnnotationSpec[], index: number): AnnotationSpec[] {
  return annotations.filter((_, i) => i !== index)
}

// ─── 스토어 리셋 ──────────────────────────────────────────

beforeEach(() => {
  act(() => { useGraphStudioStore.getState().resetAll() })
})

// ─── SIM-1: hline 추가 ───────────────────────────────────

describe('SIM-1: hline 추가', () => {
  it('정수 Y값 → value가 number로 저장된다', () => {
    const ann = buildHline('5', '', '#999999', false)
    expect(ann).not.toBeNull()
    expect(ann!.type).toBe('hline')
    expect(ann!.value).toBe(5)
    expect(typeof ann!.value).toBe('number')
  })

  it('소수 Y값 → value가 number로 저장된다', () => {
    const ann = buildHline('0.05', '', '#999999', false)
    expect(ann!.value).toBeCloseTo(0.05)
  })

  it('레이블 없으면 text 필드가 없다', () => {
    const ann = buildHline('1', '', '#999999', false)
    expect('text' in ann!).toBe(false)
  })

  it('레이블 있으면 text 필드가 생성된다', () => {
    const ann = buildHline('1', 'p=0.05', '#999999', false)
    expect(ann!.text).toBe('p=0.05')
  })

  it('색상이 annotation에 포함된다', () => {
    const ann = buildHline('1', '', '#ff0000', false)
    expect(ann!.color).toBe('#ff0000')
  })
})

// ─── SIM-2: vline 추가 — 숫자/카테고리 구분 ─────────────

describe('SIM-2: vline 추가', () => {
  it('숫자 X값 → value가 number로 저장된다', () => {
    const ann = buildVline('2024', '', '#999999', false)
    expect(ann!.value).toBe(2024)
    expect(typeof ann!.value).toBe('number')
  })

  it('카테고리 X값 → value가 string으로 저장된다', () => {
    const ann = buildVline('Group A', '', '#999999', false)
    expect(ann!.value).toBe('Group A')
    expect(typeof ann!.value).toBe('string')
  })

  it('앞뒤 공백은 trim된다', () => {
    const ann = buildVline('  3.14  ', '', '#999999', false)
    expect(ann!.value).toBeCloseTo(3.14)
  })

  it('음수도 숫자로 파싱된다', () => {
    const ann = buildVline('-10', '', '#999999', false)
    expect(ann!.value).toBe(-10)
  })

  it('날짜 형식("2024-01") → string으로 저장된다 (parseFloat 버그 방지)', () => {
    const ann = buildVline('2024-01', '', '#999999', false)
    expect(ann!.value).toBe('2024-01')
    expect(typeof ann!.value).toBe('string')
  })

  it('숫자+한글 혼합("1차") → string으로 저장된다', () => {
    const ann = buildVline('1차', '', '#999999', false)
    expect(ann!.value).toBe('1차')
    expect(typeof ann!.value).toBe('string')
  })

  it('숫자+영문 혼합("3A") → string으로 저장된다', () => {
    const ann = buildVline('3A', '', '#999999', false)
    expect(ann!.value).toBe('3A')
    expect(typeof ann!.value).toBe('string')
  })
})

// ─── SIM-3: 유효성 검사 ──────────────────────────────────

describe('SIM-3: 유효성 검사', () => {
  it('hline — 빈 값 → null 반환 (NaN)', () => {
    expect(buildHline('', '', '#999999', false)).toBeNull()
  })

  it('hline — 문자열 값 → null 반환 (NaN)', () => {
    expect(buildHline('abc', '', '#999999', false)).toBeNull()
  })

  it('hline — "0" → 유효 (falsy지만 허용)', () => {
    const ann = buildHline('0', '', '#999999', false)
    expect(ann).not.toBeNull()
    expect(ann!.value).toBe(0)
  })

  it('vline — 빈 값 → null 반환', () => {
    expect(buildVline('', '', '#999999', false)).toBeNull()
  })

  it('vline — 공백만 → null 반환', () => {
    expect(buildVline('   ', '', '#999999', false)).toBeNull()
  })

  it('vline — "0" → 유효 (숫자 0)', () => {
    const ann = buildVline('0', '', '#999999', false)
    expect(ann).not.toBeNull()
    expect(ann!.value).toBe(0)
  })
})

// ─── SIM-4: 삭제 ─────────────────────────────────────────

describe('SIM-4: 삭제', () => {
  const base: AnnotationSpec[] = [
    { type: 'hline', value: 1, color: '#999' },
    { type: 'vline', value: 'A', color: '#999' },
    { type: 'hline', value: 2, color: '#999' },
  ]

  it('인덱스 0 삭제 → 나머지 2개 남는다', () => {
    const result = deleteAnnotation(base, 0)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(base[1])
    expect(result[1]).toEqual(base[2])
  })

  it('인덱스 1 삭제 → hline 두 개만 남는다', () => {
    const result = deleteAnnotation(base, 1)
    expect(result).toHaveLength(2)
    expect(result.every((a) => a.type === 'hline')).toBe(true)
  })

  it('마지막 인덱스 삭제', () => {
    const result = deleteAnnotation(base, 2)
    expect(result).toHaveLength(2)
    expect(result[result.length - 1]).toEqual(base[1])
  })

  it('삭제 후 원본 배열은 변경되지 않는다 (불변성)', () => {
    deleteAnnotation(base, 0)
    expect(base).toHaveLength(3)
  })
})

// ─── SIM-5: 옵션 — 점선 ──────────────────────────────────

describe('SIM-5: 옵션', () => {
  it('dashed=false → strokeDash 필드가 없다', () => {
    const ann = buildHline('1', '', '#999', false)
    expect('strokeDash' in ann!).toBe(false)
  })

  it('dashed=true → strokeDash: [4, 4] 추가', () => {
    const ann = buildHline('1', '', '#999', true)
    expect(ann!.strokeDash).toEqual([4, 4])
  })

  it('vline dashed=true → strokeDash: [4, 4] 추가', () => {
    const ann = buildVline('5', '', '#999', true)
    expect(ann!.strokeDash).toEqual([4, 4])
  })

  it('모든 옵션 동시 적용', () => {
    const ann = buildHline('0.05', 'p값', '#e74c3c', true)
    expect(ann).toMatchObject({
      type: 'hline',
      value: 0.05,
      text: 'p값',
      color: '#e74c3c',
      strokeDash: [4, 4],
    })
  })
})

// ─── SIM-6: 스토어 통합 ──────────────────────────────────

describe('SIM-6: 스토어 통합 — updateChartSpec 히스토리 보존', () => {
  it('annotation 추가 시 historyIndex가 증가한다', () => {
    const spec = makeSpec()
    act(() => { useGraphStudioStore.getState().setChartSpec(spec) })

    const beforeIdx = useGraphStudioStore.getState().historyIndex

    const ann = buildHline('0.05', 'p값', '#999', false)!
    act(() => {
      const { chartSpec, updateChartSpec } = useGraphStudioStore.getState()
      updateChartSpec({ ...chartSpec!, annotations: [...chartSpec!.annotations, ann] })
    })

    expect(useGraphStudioStore.getState().historyIndex).toBe(beforeIdx + 1)
  })

  it('annotation 추가 후 chartSpec.annotations에 반영된다', () => {
    const spec = makeSpec()
    act(() => { useGraphStudioStore.getState().setChartSpec(spec) })

    const ann = buildHline('1', '', '#999', false)!
    act(() => {
      const { chartSpec, updateChartSpec } = useGraphStudioStore.getState()
      updateChartSpec({ ...chartSpec!, annotations: [ann] })
    })

    const { chartSpec } = useGraphStudioStore.getState()
    expect(chartSpec!.annotations).toHaveLength(1)
    expect(chartSpec!.annotations[0]).toMatchObject({ type: 'hline', value: 1 })
  })

  it('annotation 추가 후 undo하면 빈 배열로 돌아간다', () => {
    const spec = makeSpec()
    act(() => { useGraphStudioStore.getState().setChartSpec(spec) })

    const ann = buildHline('1', '', '#999', false)!
    act(() => {
      const { chartSpec, updateChartSpec } = useGraphStudioStore.getState()
      updateChartSpec({ ...chartSpec!, annotations: [ann] })
    })
    expect(useGraphStudioStore.getState().chartSpec!.annotations).toHaveLength(1)

    act(() => { useGraphStudioStore.getState().undo() })
    expect(useGraphStudioStore.getState().chartSpec!.annotations).toHaveLength(0)
  })

  it('hline + vline 순서로 추가 → 타입 순서 보존', () => {
    const spec = makeSpec()
    act(() => { useGraphStudioStore.getState().setChartSpec(spec) })

    const hline = buildHline('0.05', '', '#999', false)!
    const vline = buildVline('Control', '', '#999', false)!

    act(() => {
      const { chartSpec, updateChartSpec } = useGraphStudioStore.getState()
      updateChartSpec({ ...chartSpec!, annotations: [hline] })
    })
    act(() => {
      const { chartSpec, updateChartSpec } = useGraphStudioStore.getState()
      updateChartSpec({ ...chartSpec!, annotations: [...chartSpec!.annotations, vline] })
    })

    const anns = useGraphStudioStore.getState().chartSpec!.annotations
    expect(anns).toHaveLength(2)
    expect(anns[0].type).toBe('hline')
    expect(anns[1].type).toBe('vline')
  })
})
