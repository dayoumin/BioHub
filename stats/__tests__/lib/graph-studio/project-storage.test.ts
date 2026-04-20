/**
 * project-storage 테스트
 *
 * - listProjects / loadProject / saveProject / deleteProject
 * - SSR 가드 (isClient)
 * - 중복 ID 업데이트 vs 신규 추가
 * - Quota 정책: MAX_GRAPH_PROJECTS 초과 시 자동 정리
 * - QuotaExceededError 시 자동 eviction + 재시도
 */

import {
  GRAPH_PROJECTS_CHANGED_EVENT,
  listProjects,
  loadProject,
  saveProject,
  deleteProject,
  deleteProjectCascade,
  generateProjectId,
  MAX_GRAPH_PROJECTS,
} from '@/lib/graph-studio/project-storage';
import type { GraphProject } from '@/types/graph-studio';
import { createDefaultChartSpec } from '@/lib/graph-studio/chart-spec-defaults';
import * as snapshotStorage from '@/lib/graph-studio/chart-snapshot-storage';
import * as researchProjectStorage from '@/lib/research/project-storage';

// ─── 헬퍼 ────────────────────────────────────────────────────

function makeProject(id: string, name = 'Test', updatedAt?: string): GraphProject {
  const now = updatedAt ?? new Date().toISOString();
  return {
    id,
    name,
    chartSpec: createDefaultChartSpec(id, 'bar', 'x', 'y', [
      { name: 'x', type: 'nominal', uniqueCount: 2, sampleValues: [], hasNull: false },
      { name: 'y', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
    ]),
    dataPackageId: 'pkg-1',
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

describe('deleteProjectCascade', () => {
  it('entity ref cleanup failure does not prevent local project deletion', async () => {
    saveProject(makeProject('p1'));
    const removeSpy = vi.spyOn(researchProjectStorage, 'removeProjectEntityRefsByEntityIds').mockImplementation(() => {
      throw new Error('ref cleanup failed');
    });
    const deleteSnapshotSpy = vi.spyOn(snapshotStorage, 'deleteSnapshot').mockResolvedValue(undefined);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await deleteProjectCascade('p1');

    expect(loadProject('p1')).toBeNull();
    expect(removeSpy).toHaveBeenCalledWith('figure', ['p1']);
    expect(deleteSnapshotSpy).toHaveBeenCalledWith('p1');

    removeSpy.mockRestore();
    deleteSnapshotSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('snapshot cleanup failure does not prevent local project deletion', async () => {
    saveProject(makeProject('p2'));
    const deleteSnapshotSpy = vi.spyOn(snapshotStorage, 'deleteSnapshot').mockRejectedValue(new Error('snapshot cleanup failed'));

    await expect(deleteProjectCascade('p2')).resolves.toBeUndefined();
    expect(loadProject('p2')).toBeNull();
    expect(deleteSnapshotSpy).toHaveBeenCalledWith('p2');

    deleteSnapshotSpy.mockRestore();
  });

  it('aborts cascade cleanup when local project deletion fails', async () => {
    saveProject(makeProject('p3'));
    const removeSpy = vi.spyOn(researchProjectStorage, 'removeProjectEntityRefsByEntityIds').mockImplementation(() => {});
    const deleteSnapshotSpy = vi.spyOn(snapshotStorage, 'deleteSnapshot').mockResolvedValue(undefined);
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(deleteProjectCascade('p3')).rejects.toThrow('[project-storage]');
    expect(loadProject('p3')).not.toBeNull();
    expect(removeSpy).not.toHaveBeenCalled();
    expect(deleteSnapshotSpy).not.toHaveBeenCalled();

    removeSpy.mockRestore();
    deleteSnapshotSpy.mockRestore();
    setItemSpy.mockRestore();
    consoleErrorSpy.mockRestore();
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

// ─── Quota 정책: MAX_GRAPH_PROJECTS ──────────────────────────

describe('Quota 정책 (MAX_GRAPH_PROJECTS)', () => {
  it('MAX_GRAPH_PROJECTS 상수가 50', () => {
    expect(MAX_GRAPH_PROJECTS).toBe(50);
  });

  it('MAX 이하면 모든 프로젝트 유지', () => {
    for (let i = 0; i < 5; i++) {
      saveProject(makeProject(`p${i}`, `Project ${i}`, `2025-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`));
    }
    expect(listProjects()).toHaveLength(5);
  });

  it('MAX 초과 시 updatedAt이 가장 오래된 프로젝트부터 자동 삭제', () => {
    // MAX_GRAPH_PROJECTS개를 직접 localStorage에 넣어 한도를 채운다
    const projects: GraphProject[] = [];
    for (let i = 0; i < MAX_GRAPH_PROJECTS; i++) {
      projects.push(makeProject(
        `old-${i}`,
        `Old ${i}`,
        `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      ));
    }
    localStorage.setItem('graph_studio_projects', JSON.stringify(projects));
    expect(listProjects()).toHaveLength(MAX_GRAPH_PROJECTS);

    // 새 프로젝트 추가 (51번째)
    const newProject = makeProject('new-one', 'New', '2025-06-01T00:00:00Z');
    saveProject(newProject);

    const list = listProjects();
    expect(list).toHaveLength(MAX_GRAPH_PROJECTS); // 초과 안 함
    expect(list.find(p => p.id === 'new-one')).toBeDefined(); // 새 프로젝트 존재
    expect(list.find(p => p.id === 'old-0')).toBeUndefined(); // 가장 오래된 것 삭제됨
    expect(list.find(p => p.id === 'old-1')).toBeDefined(); // 그 다음은 유지
  });

  it('기존 프로젝트 업데이트 시에는 삭제 발생 안 함', () => {
    const projects: GraphProject[] = [];
    for (let i = 0; i < MAX_GRAPH_PROJECTS; i++) {
      projects.push(makeProject(
        `proj-${i}`,
        `Project ${i}`,
        `2024-06-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      ));
    }
    localStorage.setItem('graph_studio_projects', JSON.stringify(projects));

    // 기존 프로젝트 업데이트
    const updated = { ...projects[0], name: 'Updated', updatedAt: '2025-01-01T00:00:00Z' };
    saveProject(updated);

    const list = listProjects();
    expect(list).toHaveLength(MAX_GRAPH_PROJECTS); // 수 그대로
    expect(list.find(p => p.id === 'proj-0')?.name).toBe('Updated');
  });

  it('새 프로젝트 저장 시 자신은 eviction 대상에서 제외', () => {
    // MAX개를 미래 날짜로, 새 프로젝트를 과거 날짜로 저장
    const projects: GraphProject[] = [];
    for (let i = 0; i < MAX_GRAPH_PROJECTS; i++) {
      projects.push(makeProject(
        `future-${i}`,
        `Future ${i}`,
        `2026-12-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      ));
    }
    localStorage.setItem('graph_studio_projects', JSON.stringify(projects));

    // 새 프로젝트의 updatedAt이 기존보다 오래됨 — 하지만 자신이므로 삭제 안 됨
    const oldNew = makeProject('ancient-new', 'Ancient New', '2020-01-01T00:00:00Z');
    saveProject(oldNew);

    const list = listProjects();
    expect(list).toHaveLength(MAX_GRAPH_PROJECTS);
    expect(list.find(p => p.id === 'ancient-new')).toBeDefined();
    // 기존 중 가장 오래된 것(future-0 = 12/01)이 삭제됨
    expect(list.find(p => p.id === 'future-0')).toBeUndefined();
  });
});

// ─── QuotaExceededError 자동 eviction ────────────────────────

describe('QuotaExceededError 자동 eviction + 재시도', () => {
  /**
   * setItem spy 헬퍼: 원본 참조를 보존하여 재귀 방지.
   * failCount만큼 QuotaExceededError를 발생시킨 뒤 이후는 원본 호출.
   */
  function spySetItemQuota(failCount: number): ReturnType<typeof vi.spyOn> {
    const original = localStorage.setItem.bind(localStorage);
    let calls = 0;
    return vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      calls++;
      if (calls <= failCount) {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      }
      // spy를 우회하여 원본 직접 호출
      Storage.prototype.setItem = original as Storage['setItem'];
      try {
        localStorage.setItem(key, value);
      } finally {
        // spy 재설치는 불필요 — 이미 성공 경로
      }
    });
  }

  it('QuotaExceededError 시 가장 오래된 프로젝트 삭제 후 성공', () => {
    // 사전에 2개 프로젝트 저장
    saveProject(makeProject('oldest', 'Oldest', '2024-01-01T00:00:00Z'));
    saveProject(makeProject('newer', 'Newer', '2025-01-01T00:00:00Z'));
    expect(listProjects()).toHaveLength(2);

    // 첫 번째 setItem만 실패
    const spy = spySetItemQuota(1);
    saveProject(makeProject('new-save', 'New', '2025-06-01T00:00:00Z'));
    spy.mockRestore();

    const list = listProjects();
    expect(list.find(p => p.id === 'new-save')).toBeDefined(); // 새 프로젝트 저장됨
    expect(list.find(p => p.id === 'oldest')).toBeUndefined(); // 가장 오래된 것 삭제됨
    expect(list.find(p => p.id === 'newer')).toBeDefined();    // 더 새로운 것은 유지
  });

  it('eviction 후에도 계속 QuotaExceededError → 최종 throw', () => {
    saveProject(makeProject('p1', 'P1', '2024-01-01T00:00:00Z'));

    // 모든 호출 실패
    const spy = spySetItemQuota(Infinity);
    expect(() => saveProject(makeProject('fail', 'Fail', '2025-01-01T00:00:00Z'))).toThrow();
    spy.mockRestore();
  });

  it('QuotaExceededError가 아닌 에러는 eviction 없이 즉시 throw', () => {
    saveProject(makeProject('p1', 'P1'));

    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new TypeError('Disk full');
    });

    expect(() => saveProject(makeProject('fail', 'Fail'))).toThrow();
    spy.mockRestore();

    // 기존 데이터 무결성
    expect(listProjects()).toHaveLength(1);
    expect(listProjects()[0].id).toBe('p1');
  });
});

// ─── localStorage 실패 전파 (기존 테스트 유지) ──────────────

describe('localStorage 실패 시 throw', () => {
  it('deleteProject: localStorage.setItem 실패 → throw', () => {
    // 먼저 정상 저장
    saveProject(makeProject('p1'));
    saveProject(makeProject('p2'));

    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });

    expect(() => deleteProject('p1')).toThrow('[project-storage]');
    spy.mockRestore();

    // 원래 데이터는 삭제 전 상태 유지 (throw 전에 setItem이 실패했으므로)
    expect(listProjects()).toHaveLength(2);
  });

  it('saveProject: 모든 시도 실패 시 기존 데이터 손상 없음', () => {
    saveProject(makeProject('existing', 'Existing'));

    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });

    // eviction 대상(existing)을 삭제해도 여전히 실패 → 최종 throw
    expect(() => saveProject(makeProject('new-fail'))).toThrow();
    spy.mockRestore();

    // 기존 데이터 무결성 확인 (setItem이 전부 실패했으므로 localStorage 변경 없음)
    const list = listProjects();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('existing');
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

describe('graph project change events', () => {
  it('saveProject dispatches affected project ids', () => {
    const handler = vi.fn();
    window.addEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handler);

    saveProject(makeProject('p-event'));

    expect(handler).toHaveBeenCalledTimes(1);
    const [event] = handler.mock.calls[0] as [CustomEvent<{ projectIds: string[] }>];
    expect(event.detail.projectIds).toEqual(['p-event']);
    window.removeEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handler);
  });

  it('deleteProject dispatches deleted project id', () => {
    const handler = vi.fn();
    saveProject(makeProject('p-delete-event'));
    window.addEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handler);

    deleteProject('p-delete-event');

    expect(handler).toHaveBeenCalledTimes(1);
    const [event] = handler.mock.calls[0] as [CustomEvent<{ projectIds: string[] }>];
    expect(event.detail.projectIds).toEqual(['p-delete-event']);
    window.removeEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handler);
  });
});
