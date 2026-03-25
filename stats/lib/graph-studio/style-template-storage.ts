/**
 * 스타일 템플릿 localStorage CRUD
 *
 * StyleTab에서 저장, ChartSetupPanel에서 불러오기.
 * style 전체 + exportConfig 전체를 보관.
 */

import type { ExportConfig, StyleSpec } from '@/types/graph-studio';
import { createLocalStorageIO } from '@/lib/utils/local-storage-factory';

const STORAGE_KEY = 'graph_studio_style_templates';
const { readJson, writeJson } = createLocalStorageIO('[style-template-storage]');

export interface StyleTemplate {
  id: string;
  name: string;
  style: StyleSpec;
  exportConfig: ExportConfig;
  createdAt: string;
  updatedAt: string;
}

export function loadTemplates(): StyleTemplate[] {
  return readJson<StyleTemplate[]>(STORAGE_KEY, []);
}

export function saveTemplate(template: StyleTemplate): void {
  const templates = loadTemplates();
  const idx = templates.findIndex(t => t.id === template.id);
  if (idx >= 0) {
    templates[idx] = template;
  } else {
    templates.push(template);
  }
  writeJson(STORAGE_KEY, templates);
}

export function deleteTemplate(id: string): void {
  const templates = loadTemplates().filter(t => t.id !== id);
  writeJson(STORAGE_KEY, templates);
}
