/**
 * ChartSpec 유틸리티
 *
 * - JSON Patch 적용 (AI 편집 결과)
 * - Undo/Redo
 * - 데이터 자동 추론 (CSV → ColumnMeta)
 * - DataPackage ↔ row 변환
 */

import type {
  ChartSpec,
  ChartSpecPatch,
  ColumnMeta,
  DataType,
  ChartType,
  DataPackage,
} from '@/types/graph-studio';
import { chartSpecSchema } from './chart-spec-schema';
import { createDefaultChartSpec, CHART_TYPE_HINTS } from './chart-spec-defaults';

// ─── JSON Patch 적용 (RFC 6902 간이 구현) ──────────────────

export function applyPatches(
  spec: ChartSpec,
  patches: ChartSpecPatch[],
): ChartSpec {
  // deep clone
  const result = JSON.parse(JSON.stringify(spec)) as Record<string, unknown>;

  for (const patch of patches) {
    const segments = patch.path.split('/').filter(Boolean);
    if (segments.length === 0) continue;

    if (patch.op === 'remove') {
      removeAtPath(result, segments);
    } else {
      // 'add' | 'replace'
      setAtPath(result, segments, patch.value);
    }
  }

  return result as unknown as ChartSpec;
}

function setAtPath(
  obj: Record<string, unknown>,
  segments: string[],
  value: unknown,
): void {
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    if (current[key] === undefined || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = segments[segments.length - 1];
  current[lastKey] = value;
}

function removeAtPath(
  obj: Record<string, unknown>,
  segments: string[],
): void {
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    if (current[key] === undefined) return;
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = segments[segments.length - 1];
  delete current[lastKey];
}

// ─── Patch 적용 + 검증 ─────────────────────────────────────

export function applyAndValidatePatches(
  spec: ChartSpec,
  patches: ChartSpecPatch[],
): { success: true; spec: ChartSpec } | { success: false; error: string } {
  const patched = applyPatches(spec, patches);
  const result = chartSpecSchema.safeParse(patched);

  if (result.success) {
    return { success: true, spec: patched };
  }

  return {
    success: false,
    error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
  };
}

// ─── 데이터 컬럼 자동 추론 ─────────────────────────────────

export function inferColumnMeta(
  data: Record<string, unknown>[],
): ColumnMeta[] {
  if (data.length === 0) return [];

  const keys = Object.keys(data[0]);
  return keys.map(name => {
    const values = data.map(row => row[name]);
    const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
    const uniqueValues = new Set(nonNull.map(String));

    return {
      name,
      type: inferDataType(nonNull),
      uniqueCount: uniqueValues.size,
      sampleValues: Array.from(uniqueValues).slice(0, 5).map(String),
      hasNull: nonNull.length < values.length,
    };
  });
}

function inferDataType(values: unknown[]): DataType {
  if (values.length === 0) return 'nominal';

  const sample = values.slice(0, 100);

  // 숫자 판정
  const numericCount = sample.filter(v => {
    const num = Number(v);
    return !isNaN(num) && v !== '' && v !== null;
  }).length;

  if (numericCount / sample.length > 0.8) {
    return 'quantitative';
  }

  // 날짜 판정
  const dateCount = sample.filter(v => {
    if (typeof v !== 'string') return false;
    const d = new Date(v);
    return !isNaN(d.getTime()) && v.length >= 8;
  }).length;

  if (dateCount / sample.length > 0.8) {
    return 'temporal';
  }

  // 유니크 비율로 nominal/ordinal 판정
  const uniqueRatio = new Set(sample.map(String)).size / sample.length;
  if (uniqueRatio < 0.05 && sample.length > 20) {
    return 'ordinal';
  }

  return 'nominal';
}

// ─── 차트 유형 자동 추천 ───────────────────────────────────

export function suggestChartType(columns: ColumnMeta[]): ChartType {
  const quantCols = columns.filter(c => c.type === 'quantitative');
  const catCols = columns.filter(c => c.type === 'nominal' || c.type === 'ordinal');
  const timeCols = columns.filter(c => c.type === 'temporal');

  // 시간 + 수치 → line
  if (timeCols.length >= 1 && quantCols.length >= 1) {
    return 'line';
  }

  // 수치 2개 → scatter
  if (quantCols.length >= 2 && catCols.length === 0) {
    return 'scatter';
  }

  // 범주 + 수치 → bar
  if (catCols.length >= 1 && quantCols.length >= 1) {
    return 'bar';
  }

  // 수치 1개만 → histogram
  if (quantCols.length === 1 && catCols.length === 0) {
    return 'histogram';
  }

  return 'bar';
}

// ─── x/y 필드 자동 선택 ────────────────────────────────────

/**
 * 주어진 컬럼 목록과 차트 힌트에서 x, y 필드명을 선택.
 * x로 선택된 컬럼은 y 후보에서 제외 (scatter 등 동일 필드 중복 방지).
 *
 * autoCreateChartSpec / createChartSpecFromDataPackage 내부 + PropertiesTab 차트 유형 변경 시 재사용.
 */
export function selectXYFields(
  columns: ColumnMeta[],
  hints: { suggestedXType: ColumnMeta['type'] },
): { xField: string; yField: string } {
  const xCandidates = columns.filter(c => c.type === hints.suggestedXType);
  const yCandidates = columns.filter(c => c.type === 'quantitative');
  const xField = xCandidates[0]?.name ?? columns[0]?.name ?? 'x';
  const yField = yCandidates.find(c => c.name !== xField)?.name ?? columns[1]?.name ?? 'y';
  return { xField, yField };
}

// ─── CSV 데이터 → ChartSpec 자동 생성 ──────────────────────

export function autoCreateChartSpec(
  sourceId: string,
  data: Record<string, unknown>[],
): ChartSpec {
  const columns = inferColumnMeta(data);
  const chartType = suggestChartType(columns);
  const { xField, yField } = selectXYFields(columns, CHART_TYPE_HINTS[chartType]);
  return createDefaultChartSpec(sourceId, chartType, xField, yField, columns);
}

// ─── DataPackage ↔ 행 배열 변환 ────────────────────────────

/**
 * DataPackage.data (열 지향) → 행 배열 변환.
 *
 * ChartPreview 렌더링, loadDataPackage 등 공통으로 사용.
 */
export function columnsToRows(
  data: Record<string, unknown[]>,
): Record<string, unknown>[] {
  const keys = Object.keys(data);
  if (!keys.length) return [];
  const rowCount = (data[keys[0]] ?? []).length;
  return Array.from({ length: rowCount }, (_, i) => {
    const row: Record<string, unknown> = {};
    for (const key of keys) row[key] = data[key][i];
    return row;
  });
}

/**
 * DataPackage → 초기 ChartSpec 생성.
 *
 * DataPackage의 pre-computed columns를 재활용해 inferColumnMeta 중복 호출 방지.
 */
export function createChartSpecFromDataPackage(pkg: DataPackage): ChartSpec {
  const chartType = suggestChartType(pkg.columns);
  const { xField, yField } = selectXYFields(pkg.columns, CHART_TYPE_HINTS[chartType]);
  return createDefaultChartSpec(pkg.id, chartType, xField, yField, pkg.columns);
}
