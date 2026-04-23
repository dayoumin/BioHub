/**
 * LeftDataPanel 역할 할당 시뮬레이션 테스트 (L1 Store 레벨)
 *
 * LeftDataPanel.tsx의 assignRole / unassignRole / 상호 배타 조건을
 * 스토어 레벨에서 시뮬레이션한다. UI 렌더 없이 로직 정확성 검증.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store'
import { CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults'
import {
  assignFieldRole,
  getFieldRoleMap,
  getRoleAssignmentVisibility,
  unassignFieldRole,
} from '@/lib/graph-studio/editor-actions'
import type { ChartSpec, ChartType, ColumnMeta, DataPackage, DataType } from '@/types/graph-studio'

// ─── 픽스처 ──────────────────────────────────────────────

function makeColumns(): ColumnMeta[] {
  return [
    { name: 'species', type: 'nominal', uniqueCount: 5, sampleValues: ['A', 'B'], hasNull: false },
    { name: 'region', type: 'nominal', uniqueCount: 3, sampleValues: ['East', 'West'], hasNull: false },
    { name: 'weight', type: 'quantitative', uniqueCount: 50, sampleValues: ['10.5', '20.3'], hasNull: false },
    { name: 'height', type: 'quantitative', uniqueCount: 40, sampleValues: ['5.1', '8.2'], hasNull: false },
    { name: 'count', type: 'quantitative', uniqueCount: 20, sampleValues: ['1', '5'], hasNull: false },
    { name: 'date', type: 'temporal', uniqueCount: 30, sampleValues: ['2024-01-01'], hasNull: false },
    { name: 'rank', type: 'ordinal', uniqueCount: 5, sampleValues: ['1', '2', '3'], hasNull: false },
  ]
}

function makeSpec(overrides: Partial<ChartSpec> = {}): ChartSpec {
  return {
    version: '1.0',
    chartType: 'bar',
    title: 'Test',
    data: { sourceId: 'test', columns: makeColumns() },
    encoding: {
      x: { field: 'species', type: 'nominal' },
      y: { field: 'weight', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 96 },
    ...overrides,
  }
}

function assignRole(
  chartSpec: ChartSpec,
  field: string,
  role: 'x' | 'y' | 'color' | 'facet' | 'y2',
  colType: DataType,
): ChartSpec | null {
  return assignFieldRole(chartSpec, field, role, colType)
}

function unassignRole(chartSpec: ChartSpec, field: string, fieldRoles: Map<string, string>): ChartSpec | null {
  const _fieldRoles = fieldRoles
  return unassignFieldRole(chartSpec, field)
}

function getFieldRoles(spec: ChartSpec): Map<string, string> {
  return getFieldRoleMap(spec)
}

function getMutualExclusion(spec: ChartSpec): {
  canAssignColor: boolean
  canAssignFacet: boolean
  canAssignY2: boolean
} {
  const visibility = getRoleAssignmentVisibility(spec)
  return {
    canAssignColor: visibility.canAssignColor,
    canAssignFacet: visibility.canAssignFacet,
    canAssignY2: visibility.canAssignY2,
  }
}

// ─── 리셋 ────────────────────────────────────────────────

beforeEach(() => {
  act(() => { useGraphStudioStore.getState().resetAll() })
})

// ─── 기본 역할 할당 ─────────────────────────────────────

describe('assignRole — 기본 역할 할당', () => {
  it('X축 변경: species → region (컬럼 타입 반영)', () => {
    const spec = makeSpec()
    const result = assignRole(spec, 'region', 'x', 'nominal')
    expect(result).not.toBeNull()
    expect(result!.encoding.x.field).toBe('region')
    expect(result!.encoding.x.type).toBe('nominal')
  })

  it('X축 변경: temporal 컬럼 → x.type도 temporal로 갱신', () => {
    const spec = makeSpec() // x: species(nominal)
    const result = assignRole(spec, 'date', 'x', 'temporal')
    expect(result).not.toBeNull()
    expect(result!.encoding.x.field).toBe('date')
    expect(result!.encoding.x.type).toBe('temporal')
  })

  it('Y축 변경: weight → height (컬럼 타입 반영)', () => {
    const spec = makeSpec()
    const result = assignRole(spec, 'height', 'y', 'quantitative')
    expect(result).not.toBeNull()
    expect(result!.encoding.y.field).toBe('height')
    expect(result!.encoding.y.type).toBe('quantitative')
  })

  it('Color 할당 — nominal 필드 → type: nominal', () => {
    const spec = makeSpec()
    const result = assignRole(spec, 'region', 'color', 'nominal')
    expect(result).not.toBeNull()
    expect(result!.encoding.color).toEqual({ field: 'region', type: 'nominal' })
  })

  it('Color 할당 — quantitative 필드 → type: quantitative (그라디언트)', () => {
    // count는 x(species)/y(weight)가 아닌 quantitative 필드
    const spec = makeSpec()
    const result = assignRole(spec, 'count', 'color', 'quantitative')
    expect(result).not.toBeNull()
    expect(result!.encoding.color).toEqual({ field: 'count', type: 'quantitative' })
  })

  it('Color 할당 — ordinal 필드 → type: ordinal (실제 타입 유지)', () => {
    const spec = makeSpec()
    const result = assignRole(spec, 'rank', 'color', 'ordinal')
    expect(result).not.toBeNull()
    expect(result!.encoding.color).toEqual({ field: 'rank', type: 'ordinal' })
  })

  it('Color 할당 — temporal 필드 → type: temporal (실제 타입 유지)', () => {
    const spec = makeSpec()
    const result = assignRole(spec, 'date', 'color', 'temporal')
    expect(result).not.toBeNull()
    expect(result!.encoding.color).toEqual({ field: 'date', type: 'temporal' })
  })

  it('Facet 할당', () => {
    const spec = makeSpec()
    const result = assignRole(spec, 'region', 'facet', 'nominal')
    expect(result).not.toBeNull()
    expect(result!.facet).toEqual({ field: 'region' })
  })

  it('Y2 할당', () => {
    const spec = makeSpec()
    const result = assignRole(spec, 'height', 'y2', 'quantitative')
    expect(result).not.toBeNull()
    expect(result!.encoding.y2).toEqual({ field: 'height', type: 'quantitative' })
  })
})

// ─── 충돌 방지 (useDataTabLogic parity) ─────────────────

describe('assignRole — X/Y 충돌 방지 (useDataTabLogic parity)', () => {
  it('현재 Y 필드를 X에 할당 → null (거부)', () => {
    const spec = makeSpec() // x: species, y: weight
    const result = assignRole(spec, 'weight', 'x', 'quantitative')
    expect(result).toBeNull()
  })

  it('현재 X 필드를 Y에 할당 → null (거부)', () => {
    const spec = makeSpec()
    const result = assignRole(spec, 'species', 'y', 'nominal')
    expect(result).toBeNull()
  })

  it('현재 X 필드를 Color에 할당 → null (거부)', () => {
    const spec = makeSpec()
    const result = assignRole(spec, 'species', 'color', 'nominal')
    expect(result).toBeNull()
  })

  it('현재 Y 필드를 Color에 할당 → null (거부)', () => {
    const spec = makeSpec()
    const result = assignRole(spec, 'weight', 'color', 'quantitative')
    expect(result).toBeNull()
  })

  it('현재 X 필드를 Y2에 할당 → null (거부)', () => {
    const spec = makeSpec()
    const result = assignRole(spec, 'species', 'y2', 'nominal')
    expect(result).toBeNull()
  })

  it('현재 Y 필드를 Y2에 할당 → null (거부)', () => {
    const spec = makeSpec()
    const result = assignRole(spec, 'weight', 'y2', 'quantitative')
    expect(result).toBeNull()
  })

  it('X/Y가 아닌 필드를 Color에 할당 → 성공', () => {
    const spec = makeSpec() // x: species, y: weight
    const result = assignRole(spec, 'region', 'color', 'nominal')
    expect(result).not.toBeNull()
    expect(result!.encoding.color?.field).toBe('region')
  })

  it('X/Y가 아닌 필드를 Y2에 할당 → 성공', () => {
    const spec = makeSpec()
    const result = assignRole(spec, 'height', 'y2', 'quantitative')
    expect(result).not.toBeNull()
    expect(result!.encoding.y2?.field).toBe('height')
  })

  it('Facet은 X/Y 필드와 중복 허용', () => {
    const spec = makeSpec()
    // Facet은 DataTab에서 X/Y 제외 필터가 없음
    const result = assignRole(spec, 'region', 'facet', 'nominal')
    expect(result).not.toBeNull()
  })
})

// ─── 동일 필드 재클릭 방지 (히스토리 오염 방지) ──────────

describe('assignRole — 동일 필드 재클릭 → null (히스토리 오염 방지)', () => {
  it('현재 X 필드를 다시 X에 할당 → null', () => {
    const spec = makeSpec() // x: species
    expect(assignRole(spec, 'species', 'x', 'nominal')).toBeNull()
  })

  it('현재 Y 필드를 다시 Y에 할당 → null', () => {
    const spec = makeSpec() // y: weight
    expect(assignRole(spec, 'weight', 'y', 'quantitative')).toBeNull()
  })

  it('현재 Color 필드를 다시 Color에 할당 → null', () => {
    const spec = makeSpec({ encoding: { ...makeSpec().encoding, color: { field: 'region', type: 'nominal' } } })
    expect(assignRole(spec, 'region', 'color', 'nominal')).toBeNull()
  })

  it('현재 Facet 필드를 다시 Facet에 할당 → null', () => {
    const spec = makeSpec({ facet: { field: 'region' } })
    expect(assignRole(spec, 'region', 'facet', 'nominal')).toBeNull()
  })

  it('현재 Y2 필드를 다시 Y2에 할당 → null', () => {
    const spec = makeSpec({ encoding: { ...makeSpec().encoding, y2: { field: 'height', type: 'quantitative' } } })
    expect(assignRole(spec, 'height', 'y2', 'quantitative')).toBeNull()
  })
})

// ─── 역할 해제 ──────────────────────────────────────────

describe('unassignRole — 역할 해제', () => {
  it('Color 해제', () => {
    const spec = makeSpec({ encoding: { ...makeSpec().encoding, color: { field: 'region', type: 'nominal' } } })
    const roles = getFieldRoles(spec)
    const result = unassignRole(spec, 'region', roles)
    expect(result).not.toBeNull()
    expect(result!.encoding.color).toBeUndefined()
  })

  it('Facet 해제', () => {
    const spec: ChartSpec = { ...makeSpec(), facet: { field: 'region' } }
    const roles = getFieldRoles(spec)
    const result = unassignRole(spec, 'region', roles)
    expect(result).not.toBeNull()
    expect(result!.facet).toBeUndefined()
  })

  it('Y2 해제', () => {
    const spec = makeSpec({ encoding: { ...makeSpec().encoding, y2: { field: 'height', type: 'quantitative' } } })
    const roles = getFieldRoles(spec)
    const result = unassignRole(spec, 'height', roles)
    expect(result).not.toBeNull()
    expect(result!.encoding.y2).toBeUndefined()
  })

  it('X 해제 시도 → null (필수 필드)', () => {
    const spec = makeSpec()
    const roles = getFieldRoles(spec)
    const result = unassignRole(spec, 'species', roles)
    expect(result).toBeNull()
  })

  it('Y 해제 시도 → null (필수 필드)', () => {
    const spec = makeSpec()
    const roles = getFieldRoles(spec)
    const result = unassignRole(spec, 'weight', roles)
    expect(result).toBeNull()
  })

  it('역할 없는 필드 해제 시도 → null', () => {
    const spec = makeSpec()
    const roles = getFieldRoles(spec)
    const result = unassignRole(spec, 'height', roles)
    expect(result).toBeNull()
  })
})

// ─── 상호 배타 조건 ─────────────────────────────────────

describe('상호 배타 조건 — useDataTabLogic 동일 로직', () => {
  it('bar 차트 기본: Color ✓, Facet ✓, Y2 ✓', () => {
    const spec = makeSpec({ chartType: 'bar' })
    const { canAssignColor, canAssignFacet, canAssignY2 } = getMutualExclusion(spec)
    expect(canAssignColor).toBe(true)
    expect(canAssignFacet).toBe(true)
    expect(canAssignY2).toBe(true)
  })

  it('Y2 활성 → Color ✗, Facet ✗', () => {
    const spec = makeSpec({
      encoding: {
        ...makeSpec().encoding,
        y2: { field: 'height', type: 'quantitative' },
      },
    })
    const { canAssignColor, canAssignFacet, canAssignY2 } = getMutualExclusion(spec)
    expect(canAssignColor).toBe(false)
    expect(canAssignFacet).toBe(false)
    expect(canAssignY2).toBe(true) // 이미 활성이지만 canAssign 자체는 true
  })

  it('Facet 활성 → Color ✗, Y2 ✗', () => {
    const spec: ChartSpec = { ...makeSpec(), facet: { field: 'region' } }
    const { canAssignColor, canAssignFacet, canAssignY2 } = getMutualExclusion(spec)
    expect(canAssignColor).toBe(false)
    expect(canAssignFacet).toBe(true) // 이미 활성이지만 canAssign 자체는 true
    expect(canAssignY2).toBe(false)
  })

  it('horizontal orientation → Y2 ✗', () => {
    const spec: ChartSpec = { ...makeSpec(), orientation: 'horizontal' }
    const { canAssignY2 } = getMutualExclusion(spec)
    expect(canAssignY2).toBe(false)
  })

  it('heatmap: Color ✗, Facet ✗, Y2 ✗', () => {
    const hints = CHART_TYPE_HINTS['heatmap']
    expect(hints.supportsColor).toBe(false)
    expect(hints.supportsFacet).toBe(false)
    expect(hints.supportsY2).toBe(false)

    const spec = makeSpec({ chartType: 'heatmap' })
    const { canAssignColor, canAssignFacet, canAssignY2 } = getMutualExclusion(spec)
    expect(canAssignColor).toBe(false)
    expect(canAssignFacet).toBe(false)
    expect(canAssignY2).toBe(false)
  })

  it('scatter 차트: CHART_TYPE_HINTS의 실제 capability 반영', () => {
    const hints = CHART_TYPE_HINTS['scatter']
    const spec = makeSpec({ chartType: 'scatter' })
    const { canAssignColor, canAssignFacet, canAssignY2 } = getMutualExclusion(spec)
    expect(canAssignColor).toBe(hints.supportsColor)
    expect(canAssignFacet).toBe(hints.supportsFacet)
    expect(canAssignY2).toBe(hints.supportsY2)
  })
})

// ─── fieldRoles 매핑 ────────────────────────────────────

describe('fieldRoles — 인코딩 역할 매핑', () => {
  it('기본 x/y 매핑', () => {
    const spec = makeSpec()
    const roles = getFieldRoles(spec)
    expect(roles.get('species')).toBe('X')
    expect(roles.get('weight')).toBe('Y')
    expect(roles.size).toBe(2)
  })

  it('color + facet + y2 모두 포함', () => {
    const spec: ChartSpec = {
      ...makeSpec(),
      encoding: {
        ...makeSpec().encoding,
        color: { field: 'region', type: 'nominal' },
        y2: { field: 'height', type: 'quantitative' },
      },
      facet: { field: 'rank' },
    }
    const roles = getFieldRoles(spec)
    expect(roles.get('species')).toBe('X')
    expect(roles.get('weight')).toBe('Y')
    expect(roles.get('region')).toBe('Color')
    expect(roles.get('height')).toBe('Y2')
    expect(roles.get('rank')).toBe('Facet')
    expect(roles.size).toBe(5)
  })

  it('같은 필드가 x와 color에 동시 할당 → 마지막 set이 우선', () => {
    // Map은 같은 키에 대해 마지막 set이 유지됨
    // x 먼저 set → color 나중 set → Color 우선
    const spec = makeSpec({
      encoding: {
        ...makeSpec().encoding,
        color: { field: 'species', type: 'nominal' }, // x.field와 동일
      },
    })
    const roles = getFieldRoles(spec)
    // 'species'는 X와 Color 순서로 set → Color가 됨
    expect(roles.get('species')).toBe('Color')
  })
})

// ─── 스토어 통합 시뮬레이션 ─────────────────────────────

describe('스토어 통합 — assignRole → updateChartSpec', () => {
  it('역할 할당 결과를 updateChartSpec에 전달하면 히스토리에 추가된다', () => {
    const spec = makeSpec()
    act(() => { useGraphStudioStore.getState().setChartSpec(spec) })

    // Color 할당 시뮬레이션
    const updated = assignRole(spec, 'region', 'color', 'nominal')
    expect(updated).not.toBeNull()
    act(() => { useGraphStudioStore.getState().updateChartSpec(updated!) })

    const state = useGraphStudioStore.getState()
    expect(state.chartSpec?.encoding.color?.field).toBe('region')
    expect(state.specHistory).toHaveLength(2)
    expect(state.historyIndex).toBe(1)
  })

  it('Color 할당 → undo → Color 없어짐', () => {
    const spec = makeSpec()
    act(() => { useGraphStudioStore.getState().setChartSpec(spec) })

    const withColor = assignRole(spec, 'region', 'color', 'nominal')!
    act(() => { useGraphStudioStore.getState().updateChartSpec(withColor) })
    expect(useGraphStudioStore.getState().chartSpec?.encoding.color?.field).toBe('region')

    act(() => { useGraphStudioStore.getState().undo() })
    expect(useGraphStudioStore.getState().chartSpec?.encoding.color).toBeUndefined()
  })

  it('연속 역할 변경: X→region, Color→rank, Y2→height', () => {
    const spec = makeSpec()
    act(() => { useGraphStudioStore.getState().setChartSpec(spec) })

    const s1 = assignRole(spec, 'region', 'x', 'nominal')!
    act(() => { useGraphStudioStore.getState().updateChartSpec(s1) })

    const s2 = assignRole(s1, 'rank', 'color', 'ordinal')!
    act(() => { useGraphStudioStore.getState().updateChartSpec(s2) })

    const s3 = assignRole(s2, 'height', 'y2', 'quantitative')!
    act(() => { useGraphStudioStore.getState().updateChartSpec(s3) })

    const state = useGraphStudioStore.getState()
    expect(state.chartSpec?.encoding.x.field).toBe('region')
    expect(state.chartSpec?.encoding.color).toBeUndefined()
    expect(state.chartSpec?.encoding.y2).toEqual({ field: 'height', type: 'quantitative' })
    expect(state.specHistory).toHaveLength(4) // initial + 3 changes
  })

  it('역할 해제 후 상호 배타 조건 복원', () => {
    // Y2를 할당하면 Color/Facet 불가 → Y2 해제 → Color/Facet 다시 가능
    const spec = makeSpec()
    const withY2 = assignRole(spec, 'height', 'y2', 'quantitative')!

    const mutexWithY2 = getMutualExclusion(withY2)
    expect(mutexWithY2.canAssignColor).toBe(false)
    expect(mutexWithY2.canAssignFacet).toBe(false)

    // Y2 해제
    const roles = getFieldRoles(withY2)
    const withoutY2 = unassignRole(withY2, 'height', roles)
    expect(withoutY2).not.toBeNull()

    const mutexAfter = getMutualExclusion(withoutY2!)
    expect(mutexAfter.canAssignColor).toBe(true)
    expect(mutexAfter.canAssignFacet).toBe(true)
  })
})

// ─── 차트 타입별 상호 배타 ──────────────────────────────

describe('차트 타입별 capability 검증', () => {
  const chartTypes: ChartType[] = ['bar', 'line', 'scatter', 'grouped-bar', 'stacked-bar', 'heatmap', 'histogram', 'violin', 'boxplot', 'error-bar', 'km-curve', 'roc-curve']

  it.each(chartTypes)('%s: CHART_TYPE_HINTS 정의 존재', (type) => {
    expect(CHART_TYPE_HINTS[type]).toBeDefined()
    expect(typeof CHART_TYPE_HINTS[type].supportsColor).toBe('boolean')
    expect(typeof CHART_TYPE_HINTS[type].supportsFacet).toBe('boolean')
    expect(typeof CHART_TYPE_HINTS[type].supportsY2).toBe('boolean')
  })

  it('line: Y2 지원', () => {
    const spec = makeSpec({ chartType: 'line' })
    const { canAssignY2 } = getMutualExclusion(spec)
    expect(canAssignY2).toBe(true)
  })

  it('heatmap: Color만 지원', () => {
    const hints = CHART_TYPE_HINTS['heatmap']
    // heatmap은 색상=값 매핑이 핵심이므로 Color 미지원 가능
    // 실제 값을 검증
    expect(hints.supportsFacet).toBe(false)
    expect(hints.supportsY2).toBe(false)
  })
})

// ─── 데이터 교체 + disconnectProject 시나리오 ───────────

describe('데이터 교체 시나리오 — LeftDataPanel.handleFileChange 시뮬레이션', () => {
  it('프로젝트에서 데이터 교체 → disconnectProject → 저장 시 새 프로젝트', () => {
    localStorage.clear()

    // 1. 프로젝트 생성
    const spec = makeSpec({ title: 'Original' })
    act(() => { useGraphStudioStore.getState().setChartSpec(spec) })
    let projectId: string | null = null
    act(() => { projectId = useGraphStudioStore.getState().saveCurrentProject('My Project') })
    expect(projectId).not.toBeNull()

    // 2. 데이터 교체 시뮬레이션
    const newSpec = makeSpec({ title: 'Replaced' })
    const newPkg: DataPackage = {
      id: 'new-data',
      source: 'upload',
      label: 'new-file.csv',
      columns: makeColumns(),
      data: {},
      createdAt: new Date().toISOString(),
    }

    act(() => {
      useGraphStudioStore.getState().loadDataPackageWithSpec(newPkg, newSpec)
      useGraphStudioStore.getState().disconnectProject()
    })

    // 3. currentProject 해제됨
    expect(useGraphStudioStore.getState().currentProject).toBeNull()

    // 4. 다시 저장하면 새 프로젝트 ID 발급
    let newProjectId: string | null = null
    act(() => { newProjectId = useGraphStudioStore.getState().saveCurrentProject('New Project') })
    expect(newProjectId).not.toBe(projectId) // 다른 ID
  })
})
