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

// ─── JSON Patch 적용 (RFC 6902, JSON Pointer RFC 6901 준수) ─

/**
 * RFC 6901 토큰 언이스케이프: ~1 → '/', ~0 → '~' (이 순서 필수)
 */
function unescapeToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

/**
 * 경로 세그먼트로 중간 노드를 traverse.
 * 배열이면 숫자 인덱스로 접근, 객체면 key로 접근.
 */
function getNode(
  root: unknown,
  segments: string[],
): { parent: unknown; key: string | number } | null {
  let current: unknown = root;

  for (let i = 0; i < segments.length - 1; i++) {
    const token = unescapeToken(segments[i]);
    if (Array.isArray(current)) {
      const idx = Number(token);
      if (!isFinite(idx) || idx < 0 || idx >= current.length) return null;
      current = current[idx];
    } else if (current !== null && typeof current === 'object') {
      current = (current as Record<string, unknown>)[token];
    } else {
      return null;
    }
  }

  const lastToken = unescapeToken(segments[segments.length - 1]);
  const key: string | number = Array.isArray(current)
    ? (lastToken === '-' ? current.length : Number(lastToken))
    : lastToken;

  return { parent: current, key };
}

export function applyPatches(
  spec: ChartSpec,
  patches: ChartSpecPatch[],
): ChartSpec {
  const result: unknown = JSON.parse(JSON.stringify(spec));

  for (const patch of patches) {
    const segments = patch.path.split('/').filter(Boolean);
    if (segments.length === 0) continue;

    const node = getNode(result, segments);
    if (!node) continue;
    const { parent, key } = node;

    if (patch.op === 'remove') {
      if (Array.isArray(parent) && typeof key === 'number') {
        parent.splice(key, 1);
      } else if (parent !== null && typeof parent === 'object') {
        delete (parent as Record<string, unknown>)[key as string];
      }
    } else if (patch.op === 'add') {
      if (Array.isArray(parent) && typeof key === 'number') {
        parent.splice(key, 0, patch.value);
      } else if (parent !== null && typeof parent === 'object') {
        (parent as Record<string, unknown>)[key as string] = patch.value;
      }
    } else {
      // 'replace' — RFC 6902: 대상이 존재해야 함. 배열에서 범위 초과 인덱스는 무시.
      if (Array.isArray(parent) && typeof key === 'number') {
        if (key >= 0 && key < parent.length) {
          parent[key] = patch.value;
        }
      } else if (parent !== null && typeof parent === 'object') {
        (parent as Record<string, unknown>)[key as string] = patch.value;
      }
    }
  }

  return result as ChartSpec;
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

/**
 * 데이터 타입 자동 추론 임계값 (경험적 기준).
 * 여기서 조정하면 모든 inferDataType 판정에 일괄 반영됨.
 */
const INFER_TYPE_THRESHOLDS = {
  /** 수치형/시간형 판정: 샘플의 이 비율 이상이 해당 타입이면 채택 */
  NUMERIC_RATIO: 0.8,
  TEMPORAL_RATIO: 0.8,
  /** ordinal 판정: 유니크 비율이 이 값 미만이면 반복 범주형으로 간주 */
  ORDINAL_UNIQUE_RATIO: 0.05,
  /** ordinal 판정: 최소 샘플 크기 (너무 작으면 비율이 불안정) */
  ORDINAL_MIN_SAMPLE: 20,
} as const;

function inferDataType(values: unknown[]): DataType {
  if (values.length === 0) return 'nominal';

  const sample = values.slice(0, 100);

  // 숫자 판정
  const numericCount = sample.filter(v => {
    const num = Number(v);
    return !isNaN(num) && v !== '' && v !== null;
  }).length;

  if (numericCount / sample.length > INFER_TYPE_THRESHOLDS.NUMERIC_RATIO) {
    return 'quantitative';
  }

  // 날짜 판정
  const dateCount = sample.filter(v => {
    if (typeof v !== 'string') return false;
    const d = new Date(v);
    return !isNaN(d.getTime()) && v.length >= 8;
  }).length;

  if (dateCount / sample.length > INFER_TYPE_THRESHOLDS.TEMPORAL_RATIO) {
    return 'temporal';
  }

  // 유니크 비율로 nominal/ordinal 판정
  const uniqueRatio = new Set(sample.map(String)).size / sample.length;
  if (
    uniqueRatio < INFER_TYPE_THRESHOLDS.ORDINAL_UNIQUE_RATIO &&
    sample.length > INFER_TYPE_THRESHOLDS.ORDINAL_MIN_SAMPLE
  ) {
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

  // y 후보 우선순위: xField를 제외한 quantitative → xField를 제외한 임의 컬럼 → xField 자체
  // (histogram 등 y를 실제로 사용하지 않는 차트는 어떤 값이든 무방)
  const yField =
    yCandidates.find(c => c.name !== xField)?.name ??
    columns.find(c => c.name !== xField)?.name ??
    xField;

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
