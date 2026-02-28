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

const STORAGE_KEY = 'graph_studio_projects';

/** SSR(Node.js) 환경에서는 localStorage가 없으므로 안전하게 가드 */
function isClient(): boolean {
  return typeof window !== 'undefined';
}

// ─── 읽기 ───────────────────────────────────────────────────

export function listProjects(): GraphProject[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GraphProject[];
  } catch {
    return [];
  }
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('[project-storage] 프로젝트 저장 실패 (localStorage 용량 초과?):', err);
  }
}

export function deleteProject(projectId: string): void {
  const list = listProjects().filter(p => p.id !== projectId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('[project-storage] 프로젝트 삭제 실패 (localStorage 오류):', err);
  }
}

// ─── ID 생성 ─────────────────────────────────────────────────

export function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
