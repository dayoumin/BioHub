/**
 * G5.0 리뷰 수정사항 시뮬레이션 테스트
 *
 * 1. High: ?project= 자동 복원 루프 (store 레벨 시뮬레이션)
 * 2. Medium: 인코딩 호환성 검사 확장 (color, y2, facet, aggregate.groupBy)
 * 3. Medium: 패널 탭 상태 보존 (RightPropertyPanel 컴포넌트 테스트)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store'
import type { ChartSpec, DataPackage, GraphProject } from '@/types/graph-studio'

// ─── 픽스처 ──────────────────────────────────────────────

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

beforeEach(() => {
  act(() => { useGraphStudioStore.getState().resetAll() })
})

// ─── 1. ?project= 자동 복원 루프 시뮬레이션 ─────────────

describe('?project= 복원 루프 방지 (High)', () => {
  /**
   * 시나리오: QuickAccessBar → /graph-studio?project=proj-1
   * 1. setProject(proj-1) → currentProjectId = 'proj-1'
   * 2. 사용자가 비호환 데이터 업로드 → currentProject = null
   * 3. page.tsx useEffect 재실행 → currentProjectId(null) !== 'proj-1'
   *
   * 버그: setProject가 다시 호출되어 업로드한 데이터/새 spec 덮어씀
   * 수정: restoredProjectRef로 이미 시도한 projectId 추적
   *
   * 이 테스트는 store 레벨에서 시뮬레이션:
   * - setProject 후 비호환 업로드 → currentProject: null 확인
   * - 이 상태에서 다시 setProject 호출하면 업로드 결과가 덮어씌워지는 것을 확인
   */
  it('비호환 업로드 후 currentProject가 null이 됨 (루프 조건 성립)', () => {
    const spec = makeSpec('Project Chart')
    const project = makeProject({ chartSpec: spec })

    // 1. 프로젝트 복원
    act(() => { useGraphStudioStore.getState().setProject(project) })
    expect(useGraphStudioStore.getState().currentProject?.id).toBe('proj-1')
    expect(useGraphStudioStore.getState().chartSpec?.title).toBe('Project Chart')

    // 2. 비호환 데이터 업로드 (group/value 없음)
    const incompatiblePkg = makePkg({
      id: 'new-data',
      columns: [
        { name: 'temp', type: 'quantitative', uniqueCount: 50, sampleValues: [], hasNull: false },
        { name: 'humidity', type: 'quantitative', uniqueCount: 30, sampleValues: [], hasNull: false },
      ],
    })
    act(() => { useGraphStudioStore.getState().loadDataPackage(incompatiblePkg) })

    // currentProject = null → useEffect에서 currentProjectId !== 'proj-1' → 재실행 조건 성립
    expect(useGraphStudioStore.getState().currentProject).toBeNull()
    expect(useGraphStudioStore.getState().chartSpec?.title).not.toBe('Project Chart')
    // 새 spec이 생성되어야 함
    expect(useGraphStudioStore.getState().isDataLoaded).toBe(true)
    expect(useGraphStudioStore.getState().dataPackage?.id).toBe('new-data')
  })

  it('이 상태에서 setProject 재호출 시 업로드 결과가 덮어씌워짐 (수정 전 버그)', () => {
    const spec = makeSpec('Project Chart')
    const project = makeProject({ chartSpec: spec })

    // 1. 프로젝트 복원
    act(() => { useGraphStudioStore.getState().setProject(project) })

    // 2. 비호환 업로드
    const incompatiblePkg = makePkg({
      id: 'new-data',
      columns: [
        { name: 'temp', type: 'quantitative', uniqueCount: 50, sampleValues: [], hasNull: false },
        { name: 'humidity', type: 'quantitative', uniqueCount: 30, sampleValues: [], hasNull: false },
      ],
    })
    act(() => { useGraphStudioStore.getState().loadDataPackage(incompatiblePkg) })

    // 업로드 직후 상태 캡처
    const afterUpload = {
      title: useGraphStudioStore.getState().chartSpec?.title,
      dataId: useGraphStudioStore.getState().dataPackage?.id,
    }

    // 3. ★ 수정 전 버그: useEffect가 setProject를 다시 호출
    // (page.tsx의 restoredProjectRef가 이것을 차단함)
    act(() => { useGraphStudioStore.getState().setProject(project) })

    // setProject 재호출되면 업로드 결과가 덮어씌워짐!
    expect(useGraphStudioStore.getState().chartSpec?.title).toBe('Project Chart')
    expect(useGraphStudioStore.getState().dataPackage).toBeNull() // 프로젝트에 dataPackage 없었으므로
    // → 이것이 수정 전 버그의 증거: 사용자가 업로드한 데이터가 사라짐
    // → page.tsx의 restoredProjectRef가 이 setProject 호출 자체를 차단
    expect(afterUpload.dataId).toBe('new-data')
    expect(afterUpload.title).not.toBe('Project Chart')
  })
})

// ─── 2. 인코딩 호환성 검사 확장 시뮬레이션 ──────────────

describe('인코딩 호환성 검사 확장 (Medium)', () => {
  // 기본 컬럼: group(N), value(Q) + 추가 필드
  const BASE_COLS = [
    { name: 'group', type: 'nominal' as const, uniqueCount: 3, sampleValues: [], hasNull: false },
    { name: 'value', type: 'quantitative' as const, uniqueCount: 10, sampleValues: [], hasNull: false },
  ]

  it('encoding.y2 필드가 없는 데이터 → 비호환', () => {
    const spec: ChartSpec = {
      ...makeSpec('Dual Axis'),
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        y2: { field: 'secondary', type: 'quantitative' },
      },
    }
    const project = makeProject({ chartSpec: spec })

    act(() => { useGraphStudioStore.getState().setProject(project) })
    act(() => {
      useGraphStudioStore.getState().loadDataPackage(makePkg({
        columns: BASE_COLS, // secondary 없음
      }))
    })

    expect(useGraphStudioStore.getState().currentProject).toBeNull()
    expect(useGraphStudioStore.getState().chartSpec?.title).not.toBe('Dual Axis')
  })

  it('unsupported shape/size encodings are sanitized and do not block relinking', () => {
    const spec: ChartSpec = {
      ...makeSpec('Legacy Bubble'),
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        color: { field: 'treatment', type: 'nominal' },
        shape: { field: 'species', type: 'nominal' },
        size: { field: 'weight', type: 'quantitative' },
      },
    }
    const project = makeProject({ chartSpec: spec })

    act(() => { useGraphStudioStore.getState().setProject(project) })
    act(() => {
      useGraphStudioStore.getState().loadDataPackage(makePkg({
        id: 'legacy-shape-size',
        columns: [
          ...BASE_COLS,
          { name: 'treatment', type: 'nominal', uniqueCount: 2, sampleValues: [], hasNull: false },
        ],
      }))
    })

    expect(useGraphStudioStore.getState().currentProject?.id).toBe('proj-1')
    expect(useGraphStudioStore.getState().chartSpec?.title).toBe('Legacy Bubble')
    expect(useGraphStudioStore.getState().chartSpec?.encoding.shape).toBeUndefined()
    expect(useGraphStudioStore.getState().chartSpec?.encoding.size).toBeUndefined()
  })

  it('facet.field가 없는 데이터 → 비호환', () => {
    const spec: ChartSpec = {
      ...makeSpec('Faceted'),
      facet: { field: 'region', ncol: 2 },
    }
    const project = makeProject({ chartSpec: spec })

    act(() => { useGraphStudioStore.getState().setProject(project) })
    act(() => {
      useGraphStudioStore.getState().loadDataPackage(makePkg({
        columns: BASE_COLS, // region 없음
      }))
    })

    expect(useGraphStudioStore.getState().currentProject).toBeNull()
    expect(useGraphStudioStore.getState().chartSpec?.title).not.toBe('Faceted')
  })

  it('모든 인코딩 필드가 있는 데이터 → 호환 (spec 보존)', () => {
    const spec: ChartSpec = {
      ...makeSpec('Full Encoding'),
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        color: { field: 'treatment', type: 'nominal' },
      },
      aggregate: { y: 'mean', groupBy: ['treatment'] },
      facet: { field: 'region' },
    }
    const project = makeProject({ chartSpec: spec })

    act(() => { useGraphStudioStore.getState().setProject(project) })
    act(() => {
      useGraphStudioStore.getState().loadDataPackage(makePkg({
        id: 'full-data',
        columns: [
          ...BASE_COLS,
          { name: 'treatment', type: 'nominal', uniqueCount: 2, sampleValues: [], hasNull: false },
          { name: 'region', type: 'nominal', uniqueCount: 4, sampleValues: [], hasNull: false },
        ],
      }))
    })

    // 모든 필드 있으므로 기존 spec 보존
    expect(useGraphStudioStore.getState().chartSpec?.title).toBe('Full Encoding')
    expect(useGraphStudioStore.getState().currentProject?.id).toBe('proj-1')
    expect(useGraphStudioStore.getState().chartSpec?.data.sourceId).toBe('full-data')
  })

  it('optional 필드가 없으면 검사 스킵 (color 미설정 → 호환)', () => {
    // encoding에 color/shape/size 없는 단순 spec
    const spec = makeSpec('Simple Bar')
    const project = makeProject({ chartSpec: spec })

    act(() => { useGraphStudioStore.getState().setProject(project) })
    act(() => {
      useGraphStudioStore.getState().loadDataPackage(makePkg({
        id: 'simple-data',
        columns: BASE_COLS,
      }))
    })

    // color/shape/size 없으므로 x/y만 검사 → 호환
    expect(useGraphStudioStore.getState().chartSpec?.title).toBe('Simple Bar')
    expect(useGraphStudioStore.getState().currentProject?.id).toBe('proj-1')
  })
})

// ─── 3. 패널 탭 상태 보존 시뮬레이션 ────────────────────

describe('패널 탭 상태 보존 (Medium)', () => {
  /**
   * 수정 전: 조건부 렌더링({flag && <RightPropertyPanel/>})
   *   → 패널 닫기 = 언마운트 → useState 초기화 → 다시 열면 data 탭
   *
   * 수정 후: CSS hidden (<div className={`... ${flag ? '' : 'hidden'}`}>)
   *   → 패널 닫기 = display:none → 마운트 유지 → 탭 상태 보존
   *
   * 이 테스트는 store에 의존하지 않는 UI 로직이라 직접 시뮬레이션 불가.
   * 대신 page.tsx의 렌더 구조를 검증하는 snapshot-style 확인:
   * hidden 클래스 기반인지, 조건부 렌더링인지.
   */
  it('page.tsx에서 패널이 hidden 클래스로 토글됨 (조건부 렌더링 아님)', async () => {
    // 파일 내용에서 패턴 검증
    const fs = await import('fs')
    const content = fs.readFileSync(
      'app/graph-studio/GraphStudioContent.tsx',
      'utf-8',
    )

    // 수정 후: hidden 클래스 사용
    expect(content).toContain("isLeftPanelOpen ? '' : 'hidden'")
    expect(content).toContain("isRightPanelOpen ? '' : 'hidden'")

    // 수정 전 패턴이 없어야 함: {flag && (<div>...</div>)}
    expect(content).not.toContain('{isLeftPanelOpen && (')
    expect(content).not.toContain('{isRightPanelOpen && (')
  })
})
