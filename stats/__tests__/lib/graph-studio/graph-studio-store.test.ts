/**
 * Graph Studio Store 계약 테스트
 *
 * 검증 범위:
 * 1. previewMode / setPreviewMode 제거 확인 (dead state 정리)
 * 2. sidePanel / setSidePanel 제거 확인 (G5.0: 3패널 전환)
 * 3. chartSpec 히스토리 (setChartSpec / updateChartSpec / undo / redo)
 * 4. resetAll 후 상태 초기화
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store'
import * as researchProjectStorage from '@/lib/research/project-storage'
import * as projectStorage from '@/lib/graph-studio/project-storage'
import * as snapshotStorage from '@/lib/graph-studio/chart-snapshot-storage'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'
import type { ChartSpec, DataPackage, GraphProject } from '@/types/graph-studio'

// ─── 최소 ChartSpec 픽스처 ────────────────────────────────

function makeSpec(title = 'Test Chart'): ChartSpec {
  return {
    version: '1.0',
    chartType: 'bar',
    title,
    data: {
      sourceId: 'test',
      columns: [
        { name: 'group', type: 'nominal', uniqueCount: 2, sampleValues: ['control', 'treated'], hasNull: false },
        { name: 'value', type: 'quantitative', uniqueCount: 8, sampleValues: ['1.2', '1.8'], hasNull: false },
      ],
    },
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
  vi.restoreAllMocks()
  localStorage.clear()
  act(() => {
    useGraphStudioStore.getState().resetAll()
  })
})

describe('review regression fixes', () => {
  it('loadDataPackageWithSpec clears currentProject before a new save path is created', () => {
    const project = makeProject({ id: 'persisted-project' })
    const oldPkg = makePkg({ id: 'pkg-old' })
    const newPkg = makePkg({ id: 'pkg-new' })
    const newSpec = makeSpec('Fresh Graph')

    act(() => {
      useGraphStudioStore.getState().setProject(project, oldPkg)
      useGraphStudioStore.getState().loadDataPackageWithSpec(newPkg, newSpec)
    })

    const state = useGraphStudioStore.getState()
    expect(state.currentProject).toBeNull()
    expect(state.dataPackage?.id).toBe('pkg-new')
    expect(state.chartSpec?.title).toBe('Fresh Graph')
  })

  it('loadDataPackageWithSpec can preserve currentProject for in-place chart recreation', () => {
    const project = makeProject({ id: 'persisted-project', projectId: 'research-project-1' })
    const currentPkg = makePkg({ id: 'pkg-current' })
    const recreatedSpec = makeSpec('Recreated Graph')

    act(() => {
      useGraphStudioStore.getState().setProject(project, currentPkg)
      useGraphStudioStore.getState().loadDataPackageWithSpec(currentPkg, recreatedSpec, {
        preserveCurrentProject: true,
      })
    })

    const state = useGraphStudioStore.getState()
    expect(state.currentProject?.id).toBe('persisted-project')
    expect(state.linkedResearchProjectId).toBe('research-project-1')
    expect(state.chartSpec?.title).toBe('Recreated Graph')
    expect(state.dataPackage?.id).toBe('pkg-current')
  })

  it('setProject preserves transparentBackground in exportConfig', () => {
    const project = makeProject({
      chartSpec: {
        ...makeSpec(),
        exportConfig: {
          format: 'svg',
          dpi: 300,
          physicalWidth: 90,
          physicalHeight: 60,
          transparentBackground: true,
        },
      },
    })

    act(() => {
      useGraphStudioStore.getState().setProject(project)
    })

    expect(useGraphStudioStore.getState().chartSpec?.exportConfig).toEqual({
      format: 'svg',
      dpi: 300,
      physicalWidth: 90,
      physicalHeight: 60,
      transparentBackground: true,
    })
  })

  it('setProject strips unsupported renderer-only dead fields from restored specs', () => {
    const project = makeProject({
      chartSpec: {
        ...makeSpec(),
        encoding: {
          ...makeSpec().encoding,
          color: {
            field: 'group',
            type: 'nominal',
            scale: { scheme: 'Set2' },
            legend: {
              orient: 'right',
              title: 'Groups',
              titleFontSize: 16,
            },
          },
          shape: { field: 'group', type: 'nominal' },
          size: { field: 'value', type: 'quantitative' },
        },
      } as unknown as ChartSpec,
    })

    act(() => {
      useGraphStudioStore.getState().setProject(project)
    })

    const restoredSpec = useGraphStudioStore.getState().chartSpec
    const restoredLegend = restoredSpec?.encoding.color?.legend as Record<string, unknown> | undefined
    expect(restoredSpec?.encoding.color?.scale).toBeUndefined()
    expect(restoredLegend?.title).toBeUndefined()
    expect(restoredLegend?.titleFontSize).toBeUndefined()
    expect(restoredSpec?.encoding.shape).toBeUndefined()
    expect(restoredSpec?.encoding.size).toBeUndefined()
  })

  it('setProject preserves existing AI chat histories for scoped restoration', () => {
    const baseKey = STORAGE_KEYS.graphStudio.aiChat
    localStorage.setItem(baseKey, JSON.stringify([{ role: 'assistant', content: 'global' }]))
    localStorage.setItem(`${baseKey}:project:old-project`, JSON.stringify([{ role: 'assistant', content: 'project' }]))
    localStorage.setItem(`${baseKey}:draft:src-1`, JSON.stringify([{ role: 'assistant', content: 'draft' }]))

    act(() => {
      useGraphStudioStore.getState().setProject(makeProject())
    })

    expect(localStorage.getItem(baseKey)).not.toBeNull()
    expect(localStorage.getItem(`${baseKey}:project:old-project`)).not.toBeNull()
    expect(localStorage.getItem(`${baseKey}:draft:src-1`)).not.toBeNull()
  })

  it('clearData clears currentProject so a new session does not keep the old project id', () => {
    act(() => {
      useGraphStudioStore.getState().setProject(
        makeProject({ projectId: 'research-project-1' }),
        makePkg({ id: 'pkg-1', projectId: 'research-project-1' })
      )
      useGraphStudioStore.getState().clearData()
    })

    const state = useGraphStudioStore.getState()
    expect(state.currentProject).toBeNull()
    expect(state.linkedResearchProjectId).toBeNull()
    expect(state.chartSpec).toBeNull()
    expect(state.dataPackage).toBeNull()
  })

  it('disconnectProject preserves the linked research project binding for the next save', () => {
    const saveSpy = vi.spyOn(projectStorage, 'saveProject')

    act(() => {
      useGraphStudioStore.getState().setProject(
        makeProject({ id: 'persisted-project', projectId: 'research-project-1' }),
        makePkg({ id: 'pkg-1', projectId: 'research-project-1' })
      )
      useGraphStudioStore.getState().disconnectProject()
      useGraphStudioStore.getState().setChartSpec(makeSpec('Detached Session'))
      useGraphStudioStore.getState().saveCurrentProject('Detached Save')
    })

    expect(useGraphStudioStore.getState().currentProject?.projectId).toBe('research-project-1')
    expect(saveSpy).toHaveBeenLastCalledWith(expect.objectContaining({ projectId: 'research-project-1' }))
  })

  it('restorePreviousChartSpec returns from setup mode to the previous chart session', () => {
    const spec = makeSpec('Before Reset')

    act(() => {
      useGraphStudioStore.getState().setChartSpec(spec)
      useGraphStudioStore.getState().goToSetup()
      useGraphStudioStore.getState().restorePreviousChartSpec()
    })

    const state = useGraphStudioStore.getState()
    expect(state.chartSpec?.title).toBe('Before Reset')
    expect(state.previousChartSpec).toBeNull()
    expect(state.historyIndex).toBe(0)
    expect(state.specHistory).toHaveLength(1)
  })

  it('editor-exit transitions close the AI panel', () => {
    act(() => {
      useGraphStudioStore.getState().setChartSpec(makeSpec('AI Open'))
      useGraphStudioStore.getState().toggleAiPanel()
    })

    expect(useGraphStudioStore.getState().aiPanelOpen).toBe(true)

    act(() => {
      useGraphStudioStore.getState().goToSetup()
    })
    expect(useGraphStudioStore.getState().aiPanelOpen).toBe(false)

    act(() => {
      useGraphStudioStore.getState().loadDataPackageWithSpec(makePkg(), makeSpec('Restored'))
      useGraphStudioStore.getState().toggleAiPanel()
      useGraphStudioStore.getState().clearData()
    })
    expect(useGraphStudioStore.getState().aiPanelOpen).toBe(false)
  })

  it('goToSetup preserves AI chat history so cancelling reset can restore the same session context', () => {
    const baseKey = STORAGE_KEYS.graphStudio.aiChat
    localStorage.setItem(`${baseKey}:draft:src-1`, JSON.stringify([{ role: 'assistant', content: 'keep me' }]))

    act(() => {
      useGraphStudioStore.getState().setChartSpec({
        ...makeSpec('Reset Candidate'),
        data: { sourceId: 'src-1', columns: [] },
      })
      useGraphStudioStore.getState().goToSetup()
    })

    expect(localStorage.getItem(`${baseKey}:draft:src-1`)).not.toBeNull()
  })

  it('saveCurrentProject omits deprecated editHistory from newly persisted projects', () => {
    const saveSpy = vi.spyOn(projectStorage, 'saveProject')
    const legacyProject = {
      ...makeProject(),
      editHistory: [{ patches: [], explanation: 'old', confidence: 0.4 }],
    } as GraphProject & { editHistory: Array<{ patches: []; explanation: string; confidence: number }> }

    act(() => {
      useGraphStudioStore.getState().setProject(legacyProject)
      useGraphStudioStore.getState().saveCurrentProject('Saved Graph')
    })

    expect(saveSpy).toHaveBeenCalled()
    const persistedProject = saveSpy.mock.calls.at(-1)?.[0]
    expect(persistedProject).toBeDefined()
    expect(persistedProject).not.toHaveProperty('editHistory')
  })

  it('saveCurrentProject persists a sanitized chart spec without unsupported renderer fields', () => {
    const saveSpy = vi.spyOn(projectStorage, 'saveProject')
    const unsupportedSpec = {
      ...makeSpec(),
      encoding: {
        ...makeSpec().encoding,
        color: {
          field: 'group',
          type: 'nominal',
          scale: { scheme: 'Set2' },
          legend: {
            orient: 'right',
            title: 'Groups',
            titleFontSize: 16,
          },
        },
        shape: { field: 'group', type: 'nominal' },
        size: { field: 'value', type: 'quantitative' },
      },
    } as unknown as ChartSpec

    act(() => {
      useGraphStudioStore.getState().setChartSpec(unsupportedSpec)
      useGraphStudioStore.getState().saveCurrentProject('Saved Graph')
    })

    const persistedProject = saveSpy.mock.calls.at(-1)?.[0]
    expect(persistedProject?.chartSpec.encoding.color?.scale).toBeUndefined()
    const persistedLegend = persistedProject?.chartSpec.encoding.color?.legend as Record<string, unknown> | undefined
    expect(persistedLegend?.title).toBeUndefined()
    expect(persistedLegend?.titleFontSize).toBeUndefined()
    expect(persistedProject?.chartSpec.encoding.shape).toBeUndefined()
    expect(persistedProject?.chartSpec.encoding.size).toBeUndefined()
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

// ─── sidePanel 제거 확인 (G5.0) ─────────────────────────

describe('sidePanel 제거 (G5.0)', () => {
  it('sidePanel 필드가 state에 없다', () => {
    expect('sidePanel' in useGraphStudioStore.getState()).toBe(false)
  })

  it('setSidePanel 액션이 state에 없다', () => {
    expect('setSidePanel' in useGraphStudioStore.getState()).toBe(false)
  })
})

// ─── chartSpec 히스토리 ───────────────────────────────────

describe('chartSpec — setChartSpec', () => {
  it('setChartSpec은 historyIndex를 0으로 초기화한다', () => {
    // before: chartSpec은 null
    expect(useGraphStudioStore.getState().chartSpec).toBeNull()
    expect(useGraphStudioStore.getState().historyIndex).toBe(-1)

    const spec = makeSpec()
    act(() => { useGraphStudioStore.getState().setChartSpec(spec) })
    const state = useGraphStudioStore.getState()
    // setChartSpec가 renderer sanitizer를 거치므로 동일 참조 대신 값 동등성을 본다.
    expect(state.chartSpec).toStrictEqual(spec)
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
    // before: v1만 존재
    expect(useGraphStudioStore.getState().chartSpec?.title).toBe('v1')
    expect(useGraphStudioStore.getState().specHistory).toHaveLength(1)

    act(() => { useGraphStudioStore.getState().updateChartSpec(makeSpec('v2')) })
    act(() => { useGraphStudioStore.getState().updateChartSpec(makeSpec('v3')) })

    const state = useGraphStudioStore.getState()
    expect(state.specHistory).toHaveLength(3)
    expect(state.historyIndex).toBe(2)
    expect(state.chartSpec?.title).toBe('v3')
    // 이전 spec('v1')은 현재가 아님
    expect(state.chartSpec?.title).not.toBe('v1')
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
    // v3는 잘라내졌으므로 히스토리에 없어야 함
    const titles = state.specHistory.map(s => s.title)
    expect(titles).not.toContain('v3')
  })
})

// ─── resetAll ─────────────────────────────────────────────

describe('resetAll', () => {
  it('모든 상태를 초기값으로 되돌린다', () => {
    act(() => {
      useGraphStudioStore.getState().setChartSpec(makeSpec())
      useGraphStudioStore.getState().resetAll()
    })

    const state = useGraphStudioStore.getState()
    expect(state.chartSpec).toBeNull()
    expect(state.specHistory).toHaveLength(0)
    expect(state.historyIndex).toBe(-1)
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

// ─── loadDataPackage — 프로젝트 복원 모드 ─────────────────

describe('loadDataPackage — 프로젝트 복원 모드', () => {
  it('unsupported renderer fields on a restored project do not block same-schema data relinking', () => {
    const spec = {
      ...makeSpec('Legacy Encodings'),
      encoding: {
        ...makeSpec().encoding,
        color: {
          field: 'group',
          type: 'nominal',
          scale: { scheme: 'Set2' },
          legend: {
            orient: 'right',
            title: 'Groups',
            titleFontSize: 16,
          },
        },
        shape: { field: 'group', type: 'nominal' },
        size: { field: 'value', type: 'quantitative' },
      },
    } as unknown as ChartSpec
    const project = makeProject({ chartSpec: spec })

    act(() => { useGraphStudioStore.getState().setProject(project) })

    const pkg = makePkg({
      id: 'relinked-pkg',
      columns: [
        { name: 'group', type: 'nominal', uniqueCount: 3, sampleValues: [], hasNull: false },
        { name: 'value', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
      ],
    })
    act(() => { useGraphStudioStore.getState().loadDataPackage(pkg) })

    const state = useGraphStudioStore.getState()
    expect(state.currentProject?.id).toBe(project.id)
    expect(state.chartSpec?.title).toBe('Legacy Encodings')
    expect(state.chartSpec?.data.sourceId).toBe('relinked-pkg')
  })

  it('setProject 후 같은 컬럼의 데이터 업로드 → 기존 chartSpec 보존', () => {
    const spec = makeSpec('My Custom Chart')
    const project = makeProject({ chartSpec: spec })

    // 1. 프로젝트 복원 (데이터 없음)
    act(() => { useGraphStudioStore.getState().setProject(project) })
    expect(useGraphStudioStore.getState().isDataLoaded).toBe(false)
    expect(useGraphStudioStore.getState().currentProject?.id).toBe('proj-1')

    // 2. 같은 컬럼 구조의 데이터 재업로드
    const pkg = makePkg({
      id: 'new-upload',
      columns: [
        { name: 'group', type: 'nominal', uniqueCount: 2, sampleValues: ['control', 'treated'], hasNull: false },
        { name: 'value', type: 'quantitative', uniqueCount: 10, sampleValues: ['1.5', '2.2'], hasNull: false },
      ],
    })
    act(() => { useGraphStudioStore.getState().loadDataPackage(pkg) })

    const state = useGraphStudioStore.getState()
    // 기존 chartSpec 보존 (title 유지)
    expect(state.chartSpec?.title).toBe('My Custom Chart')
    // data.sourceId만 갱신
    expect(state.chartSpec?.data.sourceId).toBe('new-upload')
    // 프로젝트 연결 유지
    expect(state.currentProject?.id).toBe('proj-1')
    expect(state.isDataLoaded).toBe(true)
  })

  it('setProject 후 메타 컬럼이 추가된 데이터 업로드도 기존 chartSpec을 재연결한다', () => {
    const spec = makeSpec('My Custom Chart')
    const project = makeProject({ chartSpec: spec })

    act(() => { useGraphStudioStore.getState().setProject(project) })

    const pkg = makePkg({
      id: 'same-data-plus-meta',
      columns: [
        { name: 'group', type: 'nominal', uniqueCount: 2, sampleValues: ['control', 'treated'], hasNull: false },
        { name: 'value', type: 'quantitative', uniqueCount: 10, sampleValues: ['1.5', '2.2'], hasNull: false },
        { name: 'sample_id', type: 'nominal', uniqueCount: 10, sampleValues: ['S1', 'S2'], hasNull: false },
      ],
    })
    act(() => { useGraphStudioStore.getState().loadDataPackage(pkg) })

    const state = useGraphStudioStore.getState()
    expect(state.chartSpec?.title).toBe('My Custom Chart')
    expect(state.chartSpec?.data.sourceId).toBe('same-data-plus-meta')
    expect(state.currentProject?.id).toBe('proj-1')
  })

  it('setProject 후 다른 컬럼의 데이터 업로드 → 새 spec 생성 + currentProject 해제', () => {
    const spec = makeSpec('My Custom Chart')
    const project = makeProject({ chartSpec: spec })

    // 1. 프로젝트 복원
    act(() => { useGraphStudioStore.getState().setProject(project) })

    // 2. 다른 컬럼 구조의 데이터 업로드 (group, value 없음)
    const pkg = makePkg({
      id: 'different-data',
      columns: [
        { name: 'temperature', type: 'quantitative', uniqueCount: 50, sampleValues: [], hasNull: false },
        { name: 'humidity', type: 'quantitative', uniqueCount: 30, sampleValues: [], hasNull: false },
      ],
    })
    act(() => { useGraphStudioStore.getState().loadDataPackage(pkg) })

    const state = useGraphStudioStore.getState()
    // 새 spec 생성 (기존 title 아님)
    expect(state.chartSpec?.title).not.toBe('My Custom Chart')
    // currentProject 해제 → 기존 프로젝트 덮어쓰기 방지
    expect(state.currentProject).toBeNull()
    expect(state.isDataLoaded).toBe(true)
  })

  it('currentProject 없이 loadDataPackage → 기존 동작 유지 (새 spec 생성)', () => {
    // currentProject가 없는 일반 업로드 경우
    const pkg = makePkg({
      id: 'fresh-upload',
      columns: [
        { name: 'x', type: 'quantitative', uniqueCount: 5, sampleValues: [], hasNull: false },
        { name: 'y', type: 'quantitative', uniqueCount: 5, sampleValues: [], hasNull: false },
      ],
    })
    act(() => { useGraphStudioStore.getState().loadDataPackage(pkg) })

    const state = useGraphStudioStore.getState()
    expect(state.chartSpec).not.toBeNull()
    expect(state.currentProject).toBeNull()
    expect(state.isDataLoaded).toBe(true)
  })

  it('encoding.color 필드가 없는 데이터 → 새 spec + currentProject 해제', () => {
    const spec: ChartSpec = {
      ...makeSpec('Color Grouped'),
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        color: { field: 'treatment', type: 'nominal' },
      },
    }
    const project = makeProject({ chartSpec: spec })

    act(() => { useGraphStudioStore.getState().setProject(project) })

    // x, y 있지만 color('treatment')가 없음 → 비호환
    const pkg = makePkg({
      columns: [
        { name: 'group', type: 'nominal', uniqueCount: 3, sampleValues: [], hasNull: false },
        { name: 'value', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
      ],
    })
    act(() => { useGraphStudioStore.getState().loadDataPackage(pkg) })

    expect(useGraphStudioStore.getState().chartSpec?.title).not.toBe('Color Grouped')
    expect(useGraphStudioStore.getState().currentProject).toBeNull()
  })

  it('aggregate.groupBy 필드가 없는 데이터 → 새 spec + currentProject 해제', () => {
    const spec: ChartSpec = {
      ...makeSpec('Aggregated'),
      aggregate: { y: 'mean', groupBy: ['category', 'treatment'] },
    }
    const project = makeProject({ chartSpec: spec })

    act(() => { useGraphStudioStore.getState().setProject(project) })

    // x, y 있지만 groupBy 'treatment' 없음 → 비호환
    const pkg = makePkg({
      columns: [
        { name: 'group', type: 'nominal', uniqueCount: 3, sampleValues: [], hasNull: false },
        { name: 'value', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
        { name: 'category', type: 'nominal', uniqueCount: 2, sampleValues: [], hasNull: false },
      ],
    })
    act(() => { useGraphStudioStore.getState().loadDataPackage(pkg) })

    expect(useGraphStudioStore.getState().chartSpec?.title).not.toBe('Aggregated')
    expect(useGraphStudioStore.getState().currentProject).toBeNull()
  })

  it('encoding.x만 일치하고 y가 없으면 → 새 spec + currentProject 해제', () => {
    const spec = makeSpec('Partial Match')
    const project = makeProject({ chartSpec: spec })

    act(() => { useGraphStudioStore.getState().setProject(project) })

    // x('group')는 있지만 y('value')가 없음
    const pkg = makePkg({
      columns: [
        { name: 'group', type: 'nominal', uniqueCount: 3, sampleValues: [], hasNull: false },
        { name: 'temperature', type: 'quantitative', uniqueCount: 50, sampleValues: [], hasNull: false },
      ],
    })
    act(() => { useGraphStudioStore.getState().loadDataPackage(pkg) })

    expect(useGraphStudioStore.getState().chartSpec?.title).not.toBe('Partial Match')
    expect(useGraphStudioStore.getState().currentProject).toBeNull()
  })

  it('같은 헤더명이더라도 범주형 샘플값이 겹치지 않으면 → 새 spec + currentProject 해제', () => {
    const spec = makeSpec('Semantic Drift')
    const project = makeProject({ chartSpec: spec })

    act(() => { useGraphStudioStore.getState().setProject(project) })

    const pkg = makePkg({
      id: 'same-headers-different-meaning',
      columns: [
        { name: 'group', type: 'nominal', uniqueCount: 2, sampleValues: ['north', 'south'], hasNull: false },
        { name: 'value', type: 'quantitative', uniqueCount: 10, sampleValues: ['15', '22'], hasNull: false },
      ],
    })
    act(() => { useGraphStudioStore.getState().loadDataPackage(pkg) })

    expect(useGraphStudioStore.getState().chartSpec?.title).not.toBe('Semantic Drift')
    expect(useGraphStudioStore.getState().currentProject).toBeNull()
  })

  it('기존 스키마에 없던 추가 컬럼이 있어도 → 기존 spec 유지 + currentProject 유지', () => {
    const spec = makeSpec('Extra Columns')
    const project = makeProject({ chartSpec: spec })

    act(() => { useGraphStudioStore.getState().setProject(project) })

    const pkg = makePkg({
      id: 'extra-column-upload',
      columns: [
        { name: 'group', type: 'nominal', uniqueCount: 2, sampleValues: ['control', 'treated'], hasNull: false },
        { name: 'value', type: 'quantitative', uniqueCount: 10, sampleValues: ['1.5', '2.2'], hasNull: false },
        { name: 'visit', type: 'ordinal', uniqueCount: 3, sampleValues: ['1', '2', '3'], hasNull: false },
      ],
    })
    act(() => { useGraphStudioStore.getState().loadDataPackage(pkg) })

    const state = useGraphStudioStore.getState()
    expect(state.chartSpec?.title).toBe('Extra Columns')
    expect(state.chartSpec?.data.sourceId).toBe('extra-column-upload')
    expect(state.currentProject?.id).toBe('proj-1')
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

    expect(projectId).not.toBeNull()
    const state = useGraphStudioStore.getState()
    expect(state.currentProject?.id).toBe(projectId)
    expect(state.currentProject?.name).toBe('My Chart')
  })

  it('dataPackage의 projectId를 세션 바인딩으로 저장에 사용한다', () => {
    const saveSpy = vi.spyOn(projectStorage, 'saveProject')

    act(() => {
      useGraphStudioStore.getState().loadDataOnly(makePkg({
        id: 'pkg-linked',
        projectId: 'research-project-2',
      }))
      useGraphStudioStore.getState().setChartSpec(makeSpec('Linked Session'))
      useGraphStudioStore.getState().saveCurrentProject('My Linked Chart')
    })

    expect(useGraphStudioStore.getState().linkedResearchProjectId).toBe('research-project-2')
    expect(saveSpy).toHaveBeenLastCalledWith(expect.objectContaining({ projectId: 'research-project-2' }))
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

  it('eviction cleanup failures do not abort the new save path', async () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec('Eviction Safe Save')) })

    const saveSpy = vi.spyOn(projectStorage, 'saveProject').mockReturnValue(['evicted-project'])
    const deleteSnapshotsSpy = vi.spyOn(snapshotStorage, 'deleteSnapshots').mockRejectedValue(new Error('snapshot cleanup failed'))
    const removeRefSpy = vi.spyOn(researchProjectStorage, 'removeProjectEntityRefsByEntityIds').mockImplementation(() => {
      throw new Error('entity ref cleanup failed')
    })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    let projectId: string | null = null
    act(() => {
      projectId = useGraphStudioStore.getState().saveCurrentProject('Eviction Safe Save')
    })

    expect(projectId).not.toBeNull()
    expect(useGraphStudioStore.getState().currentProject?.name).toBe('Eviction Safe Save')
    expect(saveSpy).toHaveBeenCalled()
    expect(deleteSnapshotsSpy).toHaveBeenCalledWith(['evicted-project'])
    expect(removeRefSpy).toHaveBeenCalledWith('figure', ['evicted-project'])

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    saveSpy.mockRestore()
    deleteSnapshotsSpy.mockRestore()
    removeRefSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('linked project ref 저장이 실패하면 graph project 저장을 롤백하고 null을 반환한다', () => {
    act(() => {
      useGraphStudioStore.getState().setProject(
        makeProject({
          projectId: 'research-project-1',
          chartSpec: makeSpec('Linked Chart'),
        }),
        makePkg({
          columns: [
            { name: 'group', type: 'nominal', uniqueCount: 2, sampleValues: [], hasNull: false },
            { name: 'value', type: 'quantitative', uniqueCount: 5, sampleValues: [], hasNull: false },
          ],
        })
      )
    })

    const refSpy = vi.spyOn(researchProjectStorage, 'upsertProjectEntityRef').mockImplementation(() => {
      throw new Error('ref write failed')
    })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    let result: string | null = null
    act(() => {
      result = useGraphStudioStore.getState().saveCurrentProject('Linked Graph')
    })

    expect(result).toBeNull()
    expect(useGraphStudioStore.getState().currentProject?.id).toBe('proj-1')
    expect(localStorage.getItem('graph_studio_projects')).toContain('"id":"proj-1"')

    refSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('saveProject가 실패하면 미리 생성된 메타데이터(entity ref)를 구 버전으로 롤백한다', () => {
    // 초기 상태 세팅
    const initialProject = makeProject({
      id: 'proj-rollback',
      name: 'Old Name',
      projectId: 'res-proj-999',
      chartSpec: makeSpec('Chart Spec'),
    })
    act(() => {
      useGraphStudioStore.getState().setProject(initialProject)
    })

    // upsert는 원래 동작하도록 두거나 모의 처리. 호출 내역 확인을 위해 spyOn 사용.
    const refSpy = vi.spyOn(researchProjectStorage, 'upsertProjectEntityRef').mockReturnValue({} as any)
    
    // saveProject에서 새로운 label을 쓰려고 할 때 에러를 발생시킴
    const saveSpy = vi.spyOn(projectStorage, 'saveProject').mockImplementation((proj: any) => {
      if (proj.name === 'New Name') throw new Error('IDB full')
      return [] // 롤백 처리를 위한 기존 currentProject 백업 save 시에는 통과
    })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    let result: string | null = null
    act(() => {
      result = useGraphStudioStore.getState().saveCurrentProject('New Name')
    })

    expect(result).toBeNull()
    // 첫 호출은 New Name
    expect(refSpy).toHaveBeenCalledWith(expect.objectContaining({ label: 'New Name' }))
    // 에러 발생으로 롤백 시 Old Name 복구 호출
    expect(refSpy).toHaveBeenCalledWith(expect.objectContaining({ label: 'Old Name' }))

    refSpy.mockRestore()
    saveSpy.mockRestore()
    consoleErrorSpy.mockRestore()
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

  it('physicalWidth/Height가 있는 최신 exportConfig는 값이 보존된다', () => {
    const modernSpec = {
      ...makeSpec(),
      exportConfig: { format: 'png', dpi: 300, physicalWidth: 86, physicalHeight: 60 },
    } as unknown as ChartSpec

    const project = makeProject({ chartSpec: modernSpec })
    act(() => { useGraphStudioStore.getState().setProject(project) })

    const { chartSpec } = useGraphStudioStore.getState()
    expect(chartSpec?.exportConfig).toEqual({ format: 'png', dpi: 300, physicalWidth: 86, physicalHeight: 60 })
  })

  it('구버전 exportConfig에 physicalWidth/Height 없으면 마이그레이션 후 필드가 생기지 않는다', () => {
    const legacySpec = {
      ...makeSpec(),
      exportConfig: { format: 'png', dpi: 300, width: 800, height: 600 },
    } as unknown as ChartSpec

    const project = makeProject({ chartSpec: legacySpec })
    act(() => { useGraphStudioStore.getState().setProject(project) })

    const { chartSpec } = useGraphStudioStore.getState()
    expect('physicalWidth' in (chartSpec?.exportConfig ?? {})).toBe(false)
    expect('physicalHeight' in (chartSpec?.exportConfig ?? {})).toBe(false)
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

// ─── goToSetup / previousChartSpec 수명 관리 ─────────────

describe('goToSetup — 에디터→설정 네비게이션', () => {
  it('chartSpec을 null로, previousChartSpec에 이전 spec을 보관한다', () => {
    const spec = makeSpec('Before Setup')
    act(() => { useGraphStudioStore.getState().setChartSpec(spec) })

    act(() => { useGraphStudioStore.getState().goToSetup() })

    const state = useGraphStudioStore.getState()
    expect(state.chartSpec).toBeNull()
    expect(state.previousChartSpec?.title).toBe('Before Setup')
    expect(state.specHistory).toHaveLength(0)
    expect(state.historyIndex).toBe(-1)
  })

  it('chartSpec이 null일 때 goToSetup → previousChartSpec도 null', () => {
    // resetAll 후 chartSpec = null
    act(() => { useGraphStudioStore.getState().goToSetup() })

    const state = useGraphStudioStore.getState()
    expect(state.chartSpec).toBeNull()
    expect(state.previousChartSpec).toBeNull()
  })

  it('dataPackage는 goToSetup 후에도 유지된다', () => {
    const pkg = makePkg({
      id: 'keep-data',
      columns: [
        { name: 'a', type: 'quantitative', uniqueCount: 5, sampleValues: [], hasNull: false },
        { name: 'b', type: 'quantitative', uniqueCount: 5, sampleValues: [], hasNull: false },
      ],
    })
    act(() => { useGraphStudioStore.getState().loadDataPackage(pkg) })
    act(() => { useGraphStudioStore.getState().goToSetup() })

    const state = useGraphStudioStore.getState()
    expect(state.dataPackage?.id).toBe('keep-data')
    expect(state.isDataLoaded).toBe(true)
    expect(state.chartSpec).toBeNull()
  })
})

describe('previousChartSpec 수명 관리', () => {
  it('loadDataPackageWithSpec 후 previousChartSpec = null (소비 완료)', () => {
    const spec = makeSpec('Setup Spec')
    act(() => { useGraphStudioStore.getState().setChartSpec(spec) })
    act(() => { useGraphStudioStore.getState().goToSetup() })
    expect(useGraphStudioStore.getState().previousChartSpec).not.toBeNull()

    const pkg = makePkg({ id: 'new-pkg' })
    const newSpec = makeSpec('New Spec')
    act(() => { useGraphStudioStore.getState().loadDataPackageWithSpec(pkg, newSpec) })

    expect(useGraphStudioStore.getState().previousChartSpec).toBeNull()
  })

  it('clearData 후 previousChartSpec = null (세션 리셋)', () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec()) })
    act(() => { useGraphStudioStore.getState().goToSetup() })
    expect(useGraphStudioStore.getState().previousChartSpec).not.toBeNull()

    act(() => { useGraphStudioStore.getState().clearData() })

    expect(useGraphStudioStore.getState().previousChartSpec).toBeNull()
  })

  it('loadDataOnly 후 previousChartSpec = null (데이터 불일치 방지)', () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec()) })
    act(() => { useGraphStudioStore.getState().goToSetup() })
    expect(useGraphStudioStore.getState().previousChartSpec).not.toBeNull()

    const pkg = makePkg({ id: 'data-only' })
    act(() => { useGraphStudioStore.getState().loadDataOnly(pkg) })

    expect(useGraphStudioStore.getState().previousChartSpec).toBeNull()
  })

  it('setProject 후 previousChartSpec = null (외부 프로젝트)', () => {
    act(() => { useGraphStudioStore.getState().setChartSpec(makeSpec()) })
    act(() => { useGraphStudioStore.getState().goToSetup() })
    expect(useGraphStudioStore.getState().previousChartSpec).not.toBeNull()

    const project = makeProject()
    act(() => { useGraphStudioStore.getState().setProject(project) })

    expect(useGraphStudioStore.getState().previousChartSpec).toBeNull()
  })
})

// ─── disconnectProject (4-5) ─────────────────────────────

describe('disconnectProject — 프로젝트 연결 해제', () => {
  it('currentProject를 null로 설정한다', () => {
    const project = makeProject()
    act(() => { useGraphStudioStore.getState().setProject(project) })
    expect(useGraphStudioStore.getState().currentProject).not.toBeNull()

    act(() => { useGraphStudioStore.getState().disconnectProject() })

    expect(useGraphStudioStore.getState().currentProject).toBeNull()
  })

  it('chartSpec과 dataPackage는 disconnectProject 후에도 유지된다', () => {
    const spec = makeSpec('Keep This')
    const pkg = makePkg({ id: 'keep-pkg' })
    const project = makeProject({ chartSpec: spec })

    act(() => { useGraphStudioStore.getState().setProject(project, pkg) })
    act(() => { useGraphStudioStore.getState().disconnectProject() })

    const state = useGraphStudioStore.getState()
    expect(state.currentProject).toBeNull()
    expect(state.chartSpec).not.toBeNull()
    expect(state.dataPackage?.id).toBe('keep-pkg')
    expect(state.isDataLoaded).toBe(true)
  })

  it('currentProject가 null일 때 disconnectProject는 안전하게 동작한다', () => {
    expect(useGraphStudioStore.getState().currentProject).toBeNull()

    act(() => { useGraphStudioStore.getState().disconnectProject() })

    expect(useGraphStudioStore.getState().currentProject).toBeNull()
  })

  it('데이터 교체 시나리오: loadDataPackageWithSpec + disconnectProject → 기존 프로젝트 덮어쓰기 방지', () => {
    const project = makeProject({ id: 'original-project' })
    const pkg = makePkg({ id: 'original-data' })

    act(() => { useGraphStudioStore.getState().setProject(project, pkg) })
    expect(useGraphStudioStore.getState().currentProject?.id).toBe('original-project')

    // 데이터 교체: 새 데이터 + 새 spec
    const newPkg = makePkg({ id: 'new-data' })
    const newSpec = makeSpec('Replaced Chart')
    act(() => {
      useGraphStudioStore.getState().loadDataPackageWithSpec(newPkg, newSpec)
      useGraphStudioStore.getState().disconnectProject()
    })

    const state = useGraphStudioStore.getState()
    expect(state.currentProject).toBeNull()            // 프로젝트 연결 해제
    expect(state.dataPackage?.id).toBe('new-data')     // 새 데이터
    expect(state.chartSpec?.title).toBe('Replaced Chart') // 새 spec
  })
})
