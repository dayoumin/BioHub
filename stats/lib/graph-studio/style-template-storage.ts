/**
 * 스타일 템플릿 localStorage CRUD
 *
 * StyleTab에서 저장, ChartSetupPanel에서 불러오기.
 * style 전체 + exportConfig 전체를 보관.
 */

import type { ExportConfig, StyleSpec } from '@/types/graph-studio';

const STORAGE_KEY = 'graph_studio_style_templates';

export interface StyleTemplate {
  id: string;
  name: string;
  style: StyleSpec;
  exportConfig: ExportConfig;
  createdAt: string;
  updatedAt: string;
}

export function loadTemplates(): StyleTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StyleTemplate[];
  } catch {
    return [];
  }
}

export function saveTemplate(template: StyleTemplate): void {
  const templates = loadTemplates();
  const idx = templates.findIndex(t => t.id === template.id);
  if (idx >= 0) {
    templates[idx] = template;
  } else {
    templates.push(template);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.warn('[style-template-storage] 템플릿 저장 실패 (localStorage 용량 초과?):', err);
    throw new Error('[style-template-storage] 템플릿 저장 실패');
  }
}

export function deleteTemplate(id: string): void {
  const templates = loadTemplates().filter(t => t.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.warn('[style-template-storage] 템플릿 삭제 실패 (localStorage 오류):', err);
    throw new Error('[style-template-storage] 템플릿 삭제 실패');
  }
}
