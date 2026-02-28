/**
 * project-storage 테스트
 *
 * - listProjects / loadProject / saveProject / deleteProject
 * - SSR 가드 (isClient)
 * - 중복 ID 업데이트 vs 신규 추가
 */

import {
  listProjects,
  loadProject,
  saveProject,
  deleteProject,
  generateProjectId,
} from '@/lib/graph-studio/project-storage';
import type { GraphProject } from '@/types/graph-studio';
import { createDefaultChartSpec } from '@/lib/graph-studio/chart-spec-defaults';

// ─── 헬퍼 ────────────────────────────────────────────────────

function makeProject(id: string, name = 'Test'): GraphProject {
  const now = new Date().toISOString();
  return {
    id,
    name,
    chartSpec: createDefaultChartSpec(id, 'bar', 'x', 'y', [
      { name: 'x', type: 'nominal', uniqueCount: 2, sampleValues: [], hasNull: false },
      { name: 'y', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
    ]),
    dataPackageId: 'pkg-1',
    editHistory: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ─── localStorage 초기화 ──────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
});

// ─── listProjects ─────────────────────────────────────────────

describe('listProjects', () => {
  it('저장된 것 없으면 빈 배열 반환', () => {
    expect(listProjects()).toEqual([]);
  });

  it('저장된 프로젝트 목록 반환', () => {
    saveProject(makeProject('p1'));
    saveProject(makeProject('p2'));
    expect(listProjects()).toHaveLength(2);
  });

  it('localStorage 파싱 실패 시 빈 배열 반환 (방어적)', () => {
    localStorage.setItem('graph_studio_projects', 'not-valid-json{{{');
    expect(listProjects()).toEqual([]);
  });
});

// ─── saveProject ─────────────────────────────────────────────

describe('saveProject', () => {
  it('새 프로젝트 추가', () => {
    saveProject(makeProject('p1', 'First'));
    const list = listProjects();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('First');
  });

  it('같은 ID → 업데이트 (중복 추가 아님)', () => {
    const p1 = makeProject('p1', 'Original');
    saveProject(p1);
    saveProject({ ...p1, name: 'Updated' });

    const list = listProjects();
    expect(list).toHaveLength(1);             // 개수 그대로
    expect(list[0].name).toBe('Updated');     // 내용 변경
  });

  it('다른 ID → 각각 추가', () => {
    saveProject(makeProject('p1'));
    saveProject(makeProject('p2'));
    expect(listProjects()).toHaveLength(2);
  });
});

// ─── loadProject ─────────────────────────────────────────────

describe('loadProject', () => {
  it('존재하는 ID → GraphProject 반환', () => {
    saveProject(makeProject('p1', 'My Project'));
    const loaded = loadProject('p1');
    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe('My Project');
  });

  it('존재하지 않는 ID → null', () => {
    expect(loadProject('nonexistent')).toBeNull();
  });
});

// ─── deleteProject ────────────────────────────────────────────

describe('deleteProject', () => {
  it('삭제 후 listProjects에서 제거됨', () => {
    saveProject(makeProject('p1'));
    saveProject(makeProject('p2'));

    deleteProject('p1');

    const list = listProjects();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('p2');
  });

  it('존재하지 않는 ID 삭제 — 에러 없이 조용히 처리', () => {
    saveProject(makeProject('p1'));
    expect(() => deleteProject('ghost')).not.toThrow();
    expect(listProjects()).toHaveLength(1); // 원래 데이터 그대로
  });
});

// ─── generateProjectId ────────────────────────────────────────

describe('generateProjectId', () => {
  it('"proj_" 접두사 + 숫자 타임스탬프 + 랜덤 문자', () => {
    const id = generateProjectId();
    expect(id).toMatch(/^proj_\d+_[a-z0-9]+$/);
  });

  it('두 번 호출 시 다른 ID 생성 (충돌 가능성 낮음)', () => {
    // Date.now() 해상도가 같더라도 random 파트로 구분
    const ids = new Set(Array.from({ length: 100 }, generateProjectId));
    expect(ids.size).toBeGreaterThan(95); // 100번 중 95개 이상 유니크
  });
});

// ─── 데이터 직렬화 무결성 ─────────────────────────────────────

describe('저장/로드 왕복 (serialization round-trip)', () => {
  it('ChartSpec 포함 프로젝트 저장 후 동일하게 복원', () => {
    const original = makeProject('round-trip');
    original.chartSpec.title = 'Round-trip title';
    original.chartSpec.style.preset = 'science';

    saveProject(original);
    const loaded = loadProject('round-trip');

    expect(loaded?.chartSpec.title).toBe('Round-trip title');
    expect(loaded?.chartSpec.style.preset).toBe('science');
    expect(loaded?.chartSpec.data.sourceId).toBe('round-trip');
  });
});
