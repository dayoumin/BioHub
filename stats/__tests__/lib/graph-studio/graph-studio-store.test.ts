/**
 * Graph Studio Store 계약 테스트
 *
 * 검증 범위:
 * 1. previewMode / setPreviewMode 제거 확인 (dead state 정리)
 * 2. sidePanel 초기값 및 setSidePanel
 * 3. chartSpec 히스토리 (setChartSpec / updateChartSpec / undo / redo)
 * 4. resetAll 후 상태 초기화
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store'
import type { ChartSpec, DataPackage, GraphProject } from '@/types/graph-studio'

// ─── 최소 ChartSpec 픽스처 ────────────────────────────────

function makeSpec(title = 'Test Chart'): ChartSpec {
  return {
    version: '1.0',
    chartType: 'bar',
    title,
    data: { sourceId: 'test', columns: [] },
    encoding: {
      x: { field: 'group', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 96 },
  }
}

// ─── 공통 리셋 ────────────────────────────────────────────

beforeEach(() => {
  act(() => {
    useGraphStudioStore.getState().resetAll()
  })
})

// ─── 스토어 계약 ──────────────────────────────────────────

describe('Store 계약 — previewMode 제거', () => {
  it('previewMode 필드가 state에 없다', () => {
    const state = useGraphStudioStore.getState()
    expect('previewMode' in state).toBe(false)
  })

  it('setPreviewMode 액션이 state에 없다', () => {
    const state = useGraphStudioStore.getState()
    expect('setPreviewMode' in state).toBe(false)
  })
})

// ─── sidePanel ────────────────────────────────────────────

describe('sidePanel', () => {
  it("초기값은 'properties'이다", () => {
    expect(useGraphStudioStore.getState().sidePanel).toBe('properties')
  })

  it("setSidePanel('ai-chat')으로 변경된다", () => {
    act(() => {
      useGraphStudioStore.getState().setSidePanel('ai-chat')
    })
    expect(useGraphStudioStore.getState().sidePanel).toBe('ai-chat')
  })

  it("setSidePanel('export') → setSidePanel('presets') 순서 변경이 반영된다", () => {
    act(() => { useGraphStudioStore.getState().setSidePanel('export') })
    expect(useGraphStudioStore.getState().sidePanel).toBe('export')
    act(() => { useGraphStudioStore.getState().setSidePanel('presets') })
    expect(useGraphStudioStore.getState().sidePanel).toBe('presets')
  })
})

// ─── chartSpec 히스토리 ───────────────────────────────────

describe('chartSpec — setChartSpec', () => {
  it('setChartSpec은 historyIndex를 0으로 초기화한다', () => {
    const spec = makeSpec()
    act(() => { useGraphStudioStore.getState().setChartSpec(spec) })
    const state = useGraphStudioStore.getState()
    expect(state.chartSpec).toBe(spec)
    expect(state.historyIndex).toBe(0)
    expect(state.specHistory).toHaveLength(1)
  })

  it('setChartSpec을 두 번 호출하면 히스토리가 1개로 리셋된다', () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec('A')) })
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec('B')) })
    const state = useGraphStudioStore.getState()
    expect(state.specHistory).toHaveLength(1)
    expect(state.historyIndex).toBe(0)
    expect(state.chartSpec?.title).toBe('B')
  })
})

describe('chartSpec — updateChartSpec / undo / redo', () => {
  it('updateChartSpec은 히스토리에 append된다', () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec('v1')) })
    act(() => { useGraphStudioStore.getState().updateChartSpec(makeSpec('v2')) })
    act(() => { useGraphStudioStore.getState().updateChartSpec(makeSpec('v3')) })

    const state = useGraphStudioStore.getState()
    expect(state.specHistory).toHaveLength(3)
    expect(state.historyIndex).toBe(2)
    expect(state.chartSpec?.title).toBe('v3')
  })

  it('undo는 이전 spec으로 되돌린다', () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec('v1')) })
    act(() => { useGraphStudioStore.getState().updateChartSpec(makeSpec('v2')) })
    act(() => { useGraphStudioStore.getState().undo() })

    const state = useGraphStudioStore.getState()
    expect(state.chartSpec?.title).toBe('v1')
    expect(state.historyIndex).toBe(0)
  })

  it('redo는 undo된 spec을 복원한다', () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec('v1')) })
    act(() => { useGraphStudioStore.getState().updateChartSpec(makeSpec('v2')) })
    act(() => { useGraphStudioStore.getState().undo() })
    act(() => { useGraphStudioStore.getState().redo() })

    expect(useGraphStudioStore.getState().chartSpec?.title).toBe('v2')
    expect(useGraphStudioStore.getState().historyIndex).toBe(1)
  })

  it('historyIndex가 0일 때 undo는 아무것도 하지 않는다', () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec('v1')) })
    act(() => { useGraphStudioStore.getState().undo() })

    expect(useGraphStudioStore.getState().chartSpec?.title).toBe('v1')
    expect(useGraphStudioStore.getState().historyIndex).toBe(0)
  })

  it('히스토리 끝에서 redo는 아무것도 하지 않는다', () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec('v1')) })
    act(() => { useGraphStudioStore.getState().redo() })

    expect(useGraphStudioStore.getState().chartSpec?.title).toBe('v1')
    expect(useGraphStudioStore.getState().historyIndex).toBe(0)
  })

  it('undo 후 updateChartSpec은 이후 히스토리를 잘라낸다', () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec('v1')) })
    act(() => { useGraphStudioStore.getState().updateChartSpec(makeSpec('v2')) })
    act(() => { useGraphStudioStore.getState().updateChartSpec(makeSpec('v3')) })
    act(() => { useGraphStudioStore.getState().undo() }) // → v2
    act(() => { useGraphStudioStore.getState().updateChartSpec(makeSpec('v4')) }) // 새 분기

    const state = useGraphStudioStore.getState()
    expect(state.specHistory).toHaveLength(3) // v1, v2, v4
    expect(state.chartSpec?.title).toBe('v4')
    expect(state.historyIndex).toBe(2)
  })
})

// ─── resetAll ─────────────────────────────────────────────

describe('resetAll', () => {
  it('모든 상태를 초기값으로 되돌린다', () => {
    act(() => {
      useGraphStudioStore.getState().setChartSpec(makeSpec())
      useGraphStudioStore.getState().setSidePanel('ai-chat')
      useGraphStudioStore.getState().resetAll()
    })

    const state = useGraphStudioStore.getState()
    expect(state.chartSpec).toBeNull()
    expect(state.specHistory).toHaveLength(0)
    expect(state.historyIndex).toBe(-1)
    expect(state.sidePanel).toBe('properties')
    expect(state.isDataLoaded).toBe(false)
  })
})

// ─── loadDataPackage ──────────────────────────────────────

function makePkg(overrides: Partial<DataPackage> = {}): DataPackage {
  return {
    id: 'pkg-1',
    source: 'upload',
    label: 'test',
    columns: [],
    data: {},
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('loadDataPackage', () => {
  it('pkg + spec 원자적 설정 — isDataLoaded = true', () => {
    const pkg = makePkg({
      id: 'pkg-atomic',
      columns: [
        { name: 'group', type: 'nominal', uniqueCount: 3, sampleValues: [], hasNull: false },
        { name: 'score', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
      ],
    })

    act(() => { useGraphStudioStore.getState().loadDataPackage(pkg) })

    const state = useGraphStudioStore.getState()
    expect(state.dataPackage).toBe(pkg)
    expect(state.isDataLoaded).toBe(true)
    expect(state.chartSpec).not.toBeNull()
    expect(state.specHistory).toHaveLength(1)
    expect(state.historyIndex).toBe(0)
  })

  it('자동 생성된 ChartSpec의 sourceId = pkg.id', () => {
    const pkg = makePkg({
      id: 'my-pkg',
      columns: [
        { name: 'x', type: 'quantitative', uniqueCount: 5, sampleValues: [], hasNull: false },
        { name: 'y', type: 'quantitative', uniqueCount: 5, sampleValues: [], hasNull: false },
      ],
    })

    act(() => { useGraphStudioStore.getState().loadDataPackage(pkg) })

    expect(useGraphStudioStore.getState().chartSpec?.data.sourceId).toBe('my-pkg')
  })

  it('scatter: x/y 필드 중복 없음', () => {
    const pkg = makePkg({
      columns: [
        { name: 'weight', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
        { name: 'height', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
      ],
    })

    act(() => { useGraphStudioStore.getState().loadDataPackage(pkg) })

    const spec = useGraphStudioStore.getState().chartSpec
    expect(spec?.encoding.x.field).not.toBe(spec?.encoding.y.field)
  })
})

// ─── clearData ────────────────────────────────────────────

describe('clearData', () => {
  it('데이터 관련 상태를 초기화한다 (chartSpec 포함)', () => {
    const pkg = makePkg({
      columns: [
        { name: 'a', type: 'quantitative', uniqueCount: 5, sampleValues: [], hasNull: false },
      ],
    })

    act(() => { useGraphStudioStore.getState().loadDataPackage(pkg) })
    act(() => { useGraphStudioStore.getState().clearData() })

    const state = useGraphStudioStore.getState()
    expect(state.dataPackage).toBeNull()
    expect(state.isDataLoaded).toBe(false)
    expect(state.chartSpec).toBeNull()
    expect(state.specHistory).toHaveLength(0)
    expect(state.historyIndex).toBe(-1)
  })
})

// ─── setProject ───────────────────────────────────────────

function makeProject(overrides: Partial<GraphProject> = {}): GraphProject {
  const now = new Date().toISOString()
  return {
    id: 'proj-1',
    name: 'My Project',
    chartSpec: makeSpec(),
    dataPackageId: '',
    editHistory: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('setProject', () => {
  it('프로젝트 + DataPackage 동시 복원', () => {
    const spec = makeSpec('proj-spec')
    const pkg = makePkg({ id: 'pkg-for-proj' })
    const project = makeProject({ chartSpec: spec, dataPackageId: pkg.id })

    act(() => { useGraphStudioStore.getState().setProject(project, pkg) })

    const state = useGraphStudioStore.getState()
    expect(state.currentProject).toBe(project)
    // setProject가 exportConfig를 정규화하며 새 객체를 생성하므로 toStrictEqual 사용
    expect(state.chartSpec).toStrictEqual(spec)
    expect(state.dataPackage).toBe(pkg)
    expect(state.isDataLoaded).toBe(true)
    expect(state.specHistory).toHaveLength(1)
    expect(state.historyIndex).toBe(0)
  })

  it('DataPackage 없이 프로젝트만 복원 → isDataLoaded: false', () => {
    const project = makeProject({ dataPackageId: '' })

    act(() => { useGraphStudioStore.getState().setProject(project) })

    const state = useGraphStudioStore.getState()
    expect(state.currentProject).toBe(project)
    expect(state.dataPackage).toBeNull()
    expect(state.isDataLoaded).toBe(false)
  })
})

// ─── saveCurrentProject ───────────────────────────────────

describe('saveCurrentProject', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('chartSpec이 없으면 null 반환', () => {
    const result = useGraphStudioStore.getState().saveCurrentProject('No Spec')
    expect(result).toBeNull()
  })

  it('저장 후 projectId 반환 + currentProject 갱신', () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec()) })

    let projectId: string | null = null
    act(() => {
      projectId = useGraphStudioStore.getState().saveCurrentProject('My Chart')
    })

    expect(projectId).toBeTruthy()
    const state = useGraphStudioStore.getState()
    expect(state.currentProject?.id).toBe(projectId)
    expect(state.currentProject?.name).toBe('My Chart')
  })

  it('재저장 시 동일 ID 재사용 (새 ID 발급 안 함)', () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec()) })

    let firstId: string | null = null
    act(() => { firstId = useGraphStudioStore.getState().saveCurrentProject('First') })

    let secondId: string | null = null
    act(() => { secondId = useGraphStudioStore.getState().saveCurrentProject('Updated') })

    expect(secondId).toBe(firstId)
  })

  it('재저장 시 name이 갱신된다', () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec()) })
    act(() => { useGraphStudioStore.getState().saveCurrentProject('v1') })
    act(() => { useGraphStudioStore.getState().saveCurrentProject('v2') })

    expect(useGraphStudioStore.getState().currentProject?.name).toBe('v2')
  })

  it('createdAt은 첫 저장값을 유지한다', () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec()) })
    act(() => { useGraphStudioStore.getState().saveCurrentProject('First') })
    const createdAt = useGraphStudioStore.getState().currentProject?.createdAt

    act(() => { useGraphStudioStore.getState().saveCurrentProject('Second') })

    expect(useGraphStudioStore.getState().currentProject?.createdAt).toBe(createdAt)
  })
})

// ─── setExportConfig ──────────────────────────────────────

describe('setExportConfig', () => {
  it('exportConfig만 변경하고 specHistory는 유지된다', () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec('v1')) })
    act(() => { useGraphStudioStore.getState().updateChartSpec(makeSpec('v2')) })

    const historyBefore = useGraphStudioStore.getState().specHistory.length
    const indexBefore = useGraphStudioStore.getState().historyIndex

    act(() => {
      useGraphStudioStore.getState().setExportConfig({ format: 'svg', dpi: 150 })
    })

    const state = useGraphStudioStore.getState()
    expect(state.chartSpec?.exportConfig).toEqual({ format: 'svg', dpi: 150 })
    expect(state.specHistory).toHaveLength(historyBefore) // 히스토리 불변
    expect(state.historyIndex).toBe(indexBefore)         // 인덱스 불변
  })

  it('chartSpec이 null이면 아무것도 하지 않는다', () => {
    // resetAll 후 chartSpec = null
    const stateBefore = useGraphStudioStore.getState().chartSpec
    expect(stateBefore).toBeNull()

    act(() => {
      useGraphStudioStore.getState().setExportConfig({ format: 'png', dpi: 300 })
    })

    expect(useGraphStudioStore.getState().chartSpec).toBeNull()
  })
})

// ─── undo/redo — exportConfig 보존 ────────────────────────

describe('undo/redo — exportConfig 보존', () => {
  it('undo 시 setExportConfig로 변경된 exportConfig가 유지된다', () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec('v1')) })
    act(() => { useGraphStudioStore.getState().updateChartSpec(makeSpec('v2')) })
    act(() => { useGraphStudioStore.getState().setExportConfig({ format: 'svg', dpi: 150 }) })

    act(() => { useGraphStudioStore.getState().undo() }) // v2 → v1

    const state = useGraphStudioStore.getState()
    expect(state.chartSpec?.title).toBe('v1')                           // 내용 복원
    expect(state.chartSpec?.exportConfig).toEqual({ format: 'svg', dpi: 150 }) // exportConfig 유지
  })

  it('redo 시 setExportConfig로 변경된 exportConfig가 유지된다', () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec('v1')) })
    act(() => { useGraphStudioStore.getState().updateChartSpec(makeSpec('v2')) })
    act(() => { useGraphStudioStore.getState().undo() })
    act(() => { useGraphStudioStore.getState().setExportConfig({ format: 'svg', dpi: 600 }) })

    act(() => { useGraphStudioStore.getState().redo() }) // v1 → v2

    const state = useGraphStudioStore.getState()
    expect(state.chartSpec?.title).toBe('v2')                            // 내용 복원
    expect(state.chartSpec?.exportConfig).toEqual({ format: 'svg', dpi: 600 }) // exportConfig 유지
  })
})

// ─── setProject — 구버전 마이그레이션 ─────────────────────

describe('setProject — 구버전 exportConfig 마이그레이션', () => {
  it('width/height/transparent가 포함된 구버전 exportConfig를 정규화한다', () => {
    // 구버전 localStorage 데이터를 시뮬레이션 (타입 캐스팅으로 런타임 객체 생성)
    const legacySpec = {
      ...makeSpec(),
      exportConfig: { format: 'png', dpi: 300, width: 800, height: 600, transparent: false },
    } as unknown as ChartSpec

    const project = makeProject({ chartSpec: legacySpec })

    act(() => { useGraphStudioStore.getState().setProject(project) })

    const { chartSpec } = useGraphStudioStore.getState()
    expect(chartSpec?.exportConfig).toEqual({ format: 'png', dpi: 300 })
    expect('width' in (chartSpec?.exportConfig ?? {})).toBe(false)
    expect('height' in (chartSpec?.exportConfig ?? {})).toBe(false)
    expect('transparent' in (chartSpec?.exportConfig ?? {})).toBe(false)
  })

  it('정규화된 spec으로 AI 패치 검증이 통과된다', async () => {
    // 재현 케이스: 구버전 spec에 /title 패치 → applyAndValidatePatches success: true여야 함
    const { applyAndValidatePatches } = await import('@/lib/graph-studio/chart-spec-utils')

    // columns: [] 이면 chartSpecSchema.min(1) 실패 → columns 1개 이상 포함
    const legacySpec = {
      version: '1.0',
      chartType: 'bar',
      title: 'Old Title',
      data: {
        sourceId: 'test',
        columns: [
          { name: 'group', type: 'nominal', uniqueCount: 3, sampleValues: ['A'], hasNull: false },
          { name: 'value', type: 'quantitative', uniqueCount: 10, sampleValues: ['1'], hasNull: false },
        ],
      },
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
      },
      style: { preset: 'default' },
      annotations: [],
      exportConfig: { format: 'png', dpi: 300, width: 800, height: 600, transparent: false },
    } as unknown as ChartSpec

    const project = makeProject({ chartSpec: legacySpec })
    act(() => { useGraphStudioStore.getState().setProject(project) })

    const { chartSpec } = useGraphStudioStore.getState()
    const result = applyAndValidatePatches(chartSpec!, [
      { op: 'replace', path: '/title', value: 'New Title' },
    ])

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.spec.title).toBe('New Title')
    }
  })
})

// ─── dead state 제거 확인 ────────────────────────────────

describe('Dead state 제거 — lastAiResponse / setLastAiResponse', () => {
  it('lastAiResponse 필드가 state에 없다', () => {
    expect('lastAiResponse' in useGraphStudioStore.getState()).toBe(false)
  })

  it('setLastAiResponse 액션이 state에 없다', () => {
    expect('setLastAiResponse' in useGraphStudioStore.getState()).toBe(false)
  })
})
