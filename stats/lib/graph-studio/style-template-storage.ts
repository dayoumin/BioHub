/**
 * 스타일 템플릿 localStorage CRUD
 *
 * StyleTab에서 저장, ChartSetupPanel/DataUploadPanel에서 불러오기.
 * style 전체 + exportConfig 전체를 보관.
 */

import type { ChartSpec, ExportConfig, StyleSpec } from '@/types/graph-studio';
import { createLocalStorageIO } from '@/lib/utils/local-storage-factory';
import { STORAGE_KEYS } from '@/lib/constants/storage-keys';

const STORAGE_KEY = STORAGE_KEYS.graphStudio.styleTemplates;
const { readJson, writeJson } = createLocalStorageIO('[style-template-storage]');

export const GRAPH_STYLE_TEMPLATES_CHANGED_EVENT = 'graph-studio-style-templates-changed';
export type StyleTemplateCategory = 'journal' | 'institution';
type LegacyStyleTemplateCategory = StyleTemplateCategory | 'custom';
export type StyleTemplateExportConfig = Pick<ExportConfig, 'dpi' | 'physicalWidth' | 'physicalHeight'>;

export interface StyleTemplate {
  id: string;
  name: string;
  category: StyleTemplateCategory;
  style: StyleSpec;
  exportConfig: StyleTemplateExportConfig;
  createdAt: string;
  updatedAt: string;
}

interface StoredStyleTemplate extends Omit<StyleTemplate, 'category'> {
  category?: LegacyStyleTemplateCategory;
}

export const STYLE_TEMPLATE_CATEGORY_LABELS: Record<StyleTemplateCategory, string> = {
  journal: '학술지용',
  institution: '기관용',
};

export const STYLE_TEMPLATE_CATEGORIES: readonly StyleTemplateCategory[] = [
  'journal',
  'institution',
];

function normalizeTemplateCategory(
  category?: LegacyStyleTemplateCategory,
): StyleTemplateCategory {
  if (category === 'journal') {
    return 'journal';
  }
  return 'institution';
}

function notifyStyleTemplatesChanged(templateIds: string[]): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<string[]>(
    GRAPH_STYLE_TEMPLATES_CHANGED_EVENT,
    { detail: [...new Set(templateIds)] },
  ));
}

function normalizeTemplateExportConfig(
  exportConfig: StyleTemplate['exportConfig'] | ExportConfig,
): StyleTemplateExportConfig {
  return {
    dpi: exportConfig.dpi,
    ...(exportConfig.physicalWidth !== undefined && { physicalWidth: exportConfig.physicalWidth }),
    ...(exportConfig.physicalHeight !== undefined && { physicalHeight: exportConfig.physicalHeight }),
  };
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function loadTemplates(): StyleTemplate[] {
  const templates = readJson<StoredStyleTemplate[]>(STORAGE_KEY, []);
  return templates.map((template) => ({
    ...template,
    category: normalizeTemplateCategory(template.category),
    exportConfig: normalizeTemplateExportConfig(template.exportConfig),
  }));
}

export function saveTemplate(template: StyleTemplate): void {
  const templates = loadTemplates();
  const normalizedTemplate: StyleTemplate = {
    ...template,
    exportConfig: normalizeTemplateExportConfig(template.exportConfig),
  };
  const idx = templates.findIndex(t => t.id === template.id);
  if (idx >= 0) {
    templates[idx] = normalizedTemplate;
  } else {
    templates.push(normalizedTemplate);
  }
  writeJson(STORAGE_KEY, templates);
  notifyStyleTemplatesChanged([template.id]);
}

export function deleteTemplate(id: string): void {
  const templates = loadTemplates().filter(t => t.id !== id);
  writeJson(STORAGE_KEY, templates);
  notifyStyleTemplatesChanged([id]);
}

export function templateMatchesChartSpec(
  template: StyleTemplate,
  chartSpec: ChartSpec,
): boolean {
  return (
    stableSerialize(template.style) === stableSerialize(chartSpec.style) &&
    stableSerialize(template.exportConfig) === stableSerialize(normalizeTemplateExportConfig(chartSpec.exportConfig))
  );
}
