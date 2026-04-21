/**
 * Graph Studio 프로젝트 저장소 (localStorage)
 *
 * 저장 정책:
 * - GraphProject (chartSpec + provenance 메타) → localStorage 영구 저장
 * - DataPackage 전체 원본 행 데이터는 저장 안 함 (세션 메모리 only)
 *   → 대신 GraphProject.sourceSnapshot/sourceSchema로 저장 시점 provenance를 감사 가능하게 남김
 *   → sourceSnapshot에는 schema/source fingerprint와 sample preview가 포함될 수 있음
 *   → 프로젝트 로드 후 차트 편집을 계속하려면 사용자가 데이터 재업로드 필요
 *
 * Quota 정책:
 * - 최대 MAX_GRAPH_PROJECTS개까지 저장
 * - 초과 시 updatedAt이 가장 오래된 프로젝트부터 자동 삭제
 * - QuotaExceededError 발생 시 가장 오래된 프로젝트 삭제 후 재시도
 *
 * 이 분리 덕분에 저장 공간 부담 없이 차트 설정을 영구 보관 가능.
 */

import type { GraphProject } from '@/types/graph-studio';
import { createLocalStorageIO } from '@/lib/utils/local-storage-factory';
import { deleteSnapshot } from './chart-snapshot-storage';
import { removeProjectEntityRefsByEntityIds } from '@/lib/research/project-storage';
import {
  emitCrossTabCustomEvent,
  registerCrossTabCustomEventBridge,
} from '@/lib/utils/cross-tab-custom-events';
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

const STORAGE_KEY = STORAGE_KEYS.graphStudio.projects;
const { readJson, writeJson } = createLocalStorageIO('[project-storage]');
export const GRAPH_PROJECTS_CHANGED_EVENT = 'graph-studio-projects-changed';
const GRAPH_PROJECTS_CHANGED_CHANNEL = 'graph-studio-projects';
export interface GraphProjectsChangedDetail {
  projectIds: string[];
}

/** 프로젝트 최대 저장 수. 초과 시 가장 오래된 프로젝트부터 자동 삭제. */
export const MAX_GRAPH_PROJECTS = 50;

/** QuotaExceededError 발생 시 자동 정리 재시도 최대 횟수 */
const MAX_EVICTION_RETRIES = 5;

function notifyGraphProjectsChanged(projectIds: string[]): void {
  emitCrossTabCustomEvent<GraphProjectsChangedDetail>(
    GRAPH_PROJECTS_CHANGED_CHANNEL,
    GRAPH_PROJECTS_CHANGED_EVENT,
    { projectIds: [...new Set(projectIds)] },
  );
}

registerCrossTabCustomEventBridge<GraphProjectsChangedDetail>(
  GRAPH_PROJECTS_CHANGED_CHANNEL,
  GRAPH_PROJECTS_CHANGED_EVENT,
);

// ─── 읽기 ───────────────────────────────────────────────────

export function listProjects(): GraphProject[] {
  return readJson<GraphProject[]>(STORAGE_KEY, []);
}

export function loadProject(projectId: string): GraphProject | null {
  return listProjects().find(p => p.id === projectId) ?? null;
}

// ─── Quota 관리 ──────────────────────────────────────────────

/**
 * updatedAt이 가장 오래된 프로젝트를 evict 대상으로 정렬.
 * 현재 저장 중인 프로젝트(excludeId)는 제외.
 */
function getEvictionCandidates(
  list: GraphProject[],
  excludeId: string,
): GraphProject[] {
  return list
    .filter(p => p.id !== excludeId)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

/**
 * 프로젝트 수가 maxCount를 초과하면 가장 오래된 것부터 삭제하여 maxCount 이하로 맞춘다.
 * 현재 저장 중인 프로젝트(excludeId)는 삭제하지 않는다.
 *
 * @returns 정리된 프로젝트 목록과 삭제된 프로젝트 ID 목록
 */
function enforceMaxCount(
  list: GraphProject[],
  maxCount: number,
  excludeId: string,
): { list: GraphProject[]; evictedIds: string[] } {
  if (list.length <= maxCount) return { list, evictedIds: [] };

  const candidates = getEvictionCandidates(list, excludeId);
  const evictCount = list.length - maxCount;
  const evictedIds = candidates.slice(0, evictCount).map(p => p.id);
  const evictSet = new Set(evictedIds);

  return { list: list.filter(p => !evictSet.has(p.id)), evictedIds };
}

/**
 * writeJson 래퍼: QuotaExceededError 발생 시 가장 오래된 프로젝트를 삭제 후 재시도.
 * 최대 MAX_EVICTION_RETRIES회까지 시도한 뒤 여전히 실패하면 throw.
 *
 * @returns 재시도 중 evict된 프로젝트 ID 목록
 */
function writeWithQuotaRetry(list: GraphProject[], excludeId: string): string[] {
  const evictedIds: string[] = [];
  for (let attempt = 0; attempt <= MAX_EVICTION_RETRIES; attempt++) {
    try {
      writeJson(STORAGE_KEY, list);
      return evictedIds;
    } catch (error: unknown) {
      // QuotaExceededError인지 확인
      const isQuota =
        error instanceof Error &&
        (error.message.includes('quota') ||
          error.message.includes('QuotaExceededError') ||
          (error.cause instanceof DOMException &&
            error.cause.name === 'QuotaExceededError'));

      if (!isQuota || attempt === MAX_EVICTION_RETRIES) {
        throw error;
      }

      // 삭제할 후보가 없으면 throw
      const candidates = getEvictionCandidates(list, excludeId);
      if (candidates.length === 0) {
        throw error;
      }

      // 가장 오래된 프로젝트 1개 삭제 후 재시도
      const evictId = candidates[0].id;
      evictedIds.push(evictId);
      list = list.filter(p => p.id !== evictId);
      console.warn(
        `[project-storage] QuotaExceededError — 프로젝트 "${evictId}" 자동 삭제 후 재시도 (${attempt + 1}/${MAX_EVICTION_RETRIES})`,
      );
    }
  }
  return evictedIds;
}

// ─── 쓰기 ───────────────────────────────────────────────────

/**
 * 프로젝트 저장. eviction이 발생한 경우 삭제된 프로젝트 ID 목록을 반환한다.
 * 호출자는 반환값으로 스냅샷 등 연관 데이터를 정리할 수 있다.
 */
export function saveProject(project: GraphProject): string[] {
  const list = listProjects();
  const idx = list.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    list[idx] = project;
  } else {
    list.push(project);
  }

  // 프로젝트 수 상한 적용
  const { list: enforced, evictedIds } = enforceMaxCount(list, MAX_GRAPH_PROJECTS, project.id);
  const retryEvicted = writeWithQuotaRetry(enforced, project.id);
  notifyGraphProjectsChanged([project.id, ...evictedIds, ...retryEvicted]);
  return [...evictedIds, ...retryEvicted];
}

export function deleteProject(projectId: string): void {
  const list = listProjects().filter(p => p.id !== projectId);
  writeJson(STORAGE_KEY, list);
  notifyGraphProjectsChanged([projectId]);
}

/**
 * 프로젝트와 연관 스냅샷을 함께 삭제 (cascade).
 * 스냅샷 삭제는 best-effort — IndexedDB 오류가 발생해도 localStorage 삭제는 완료된다.
 */
export async function deleteProjectCascade(projectId: string): Promise<void> {
  try {
    deleteProject(projectId);
  } catch (error) {
    console.error('[project-storage] Failed to delete project before cascade cleanup:', error);
    throw error;
  }
  try {
    removeProjectEntityRefsByEntityIds('figure', [projectId]);
  } catch (err) {
    console.error('[project-storage] Failed to remove entity ref for deleted project:', err);
  }
  await deleteSnapshot(projectId).catch(() => {});
}

// ─── ID 생성 ─────────────────────────────────────────────────

import { generateId } from '@/lib/utils/generate-id'

export const generateProjectId = (): string => generateId('proj')
