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
    exportConfig: { format: 'png', dpi: 96, width: 800, height: 600 },
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
    expect(state.chartSpec).toBe(spec)
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
