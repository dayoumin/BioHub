/**
 * Graph Studio 프로젝트 저장소 (localStorage)
 *
 * 저장 정책:
 * - GraphProject (chartSpec + 메타) → localStorage 영구 저장
 * - DataPackage (원본 데이터) → 저장 안 함 (세션 메모리 only)
 *   → 프로젝트 로드 후 사용자가 데이터 재업로드 필요
 *
 * 이 분리 덕분에 저장 공간 부담 없이 차트 설정을 영구 보관 가능.
 */

import type { GraphProject } from '@/types/graph-studio';
import { createLocalStorageIO } from '@/lib/utils/local-storage-factory';

const STORAGE_KEY = 'graph_studio_projects';
const { readJson, writeJson } = createLocalStorageIO('[project-storage]');

// ─── 읽기 ───────────────────────────────────────────────────

export function listProjects(): GraphProject[] {
  return readJson<GraphProject[]>(STORAGE_KEY, []);
}

export function loadProject(projectId: string): GraphProject | null {
  return listProjects().find(p => p.id === projectId) ?? null;
}

// ─── 쓰기 ───────────────────────────────────────────────────

export function saveProject(project: GraphProject): void {
  const list = listProjects();
  const idx = list.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    list[idx] = project;
  } else {
    list.push(project);
  }
  writeJson(STORAGE_KEY, list);
}

export function deleteProject(projectId: string): void {
  const list = listProjects().filter(p => p.id !== projectId);
  writeJson(STORAGE_KEY, list);
}

// ─── ID 생성 ─────────────────────────────────────────────────

export function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
