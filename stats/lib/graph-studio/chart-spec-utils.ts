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
  SignificanceMark,
  AnalysisContext,
} from '@/types/graph-studio';
import type { AnalysisVizType } from '@/types/analysis';
import { chartSpecSchema } from './chart-spec-schema';
import { createDefaultChartSpec, CHART_TYPE_HINTS } from './chart-spec-defaults';
import {
  CATEGORY_FRIENDLY_TOKENS,
  PREDICTOR_LIKE_TOKENS,
  RESPONSE_LIKE_TOKENS,
  TIME_LIKE_TOKENS,
  hasIdLikeName,
  hasToken,
  normalizeFieldName,
} from './chart-spec-heuristics';

function hasOwnKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0;
}

export function sanitizeChartSpecForRenderer(spec: ChartSpec): ChartSpec {
  const {
    color,
    shape: _shape,
    size: _size,
    ...encodingRest
  } = spec.encoding;

  const sanitizedColor = color
    ? (() => {
        const { scale: _scale, legend, ...colorRest } = color;
        const sanitizedLegend = legend
          ? (() => {
              const legacyLegend = legend as Record<string, unknown>;
              const { title: _title, titleFontSize: _titleFontSize, ...legendRest } = legacyLegend;
              return hasOwnKeys(legendRest) ? legendRest : undefined;
            })()
          : undefined;

        return {
          ...colorRest,
          ...(sanitizedLegend ? { legend: sanitizedLegend } : {}),
        };
      })()
    : undefined;

  return {
    ...spec,
    encoding: {
      ...encodingRest,
      ...(sanitizedColor ? { color: sanitizedColor } : {}),
    },
  };
}

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
      const record = current as Record<string, unknown>;
      if (!(token in record)) return null;
      current = record[token];
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

/**
 * JSON Patch 적용 (검증 없음).
 *
 * **주의**: 스키마 검증이 필요하면 `applyAndValidatePatches`를 사용할 것.
 * 이 함수는 내부 전용이며, 외부에서 직접 호출 시 결과가 유효한 ChartSpec이라는 보장 없음.
 */
export function applyPatches(
  spec: ChartSpec,
  patches: ChartSpecPatch[],
): ChartSpec {
  const result: unknown = JSON.parse(JSON.stringify(spec));

  for (const patch of patches) {
    const segments = patch.path.split('/').filter(Boolean);
    if (segments.length === 0) {
      throw new Error(`Invalid patch path: ${patch.path}`);
    }

    const node = getNode(result, segments);
    if (!node) {
      throw new Error(`Invalid patch path: ${patch.path}`);
    }
    const { parent, key } = node;

    if (patch.op === 'remove') {
      if (Array.isArray(parent) && typeof key === 'number') {
        if (key < 0 || key >= parent.length) {
          throw new Error(`Cannot remove missing path: ${patch.path}`);
        }
        parent.splice(key, 1);
      } else if (parent !== null && typeof parent === 'object') {
        const record = parent as Record<string, unknown>;
        if (!(key in record)) {
          throw new Error(`Cannot remove missing path: ${patch.path}`);
        }
        delete record[key as string];
      } else {
        throw new Error(`Invalid patch target: ${patch.path}`);
      }
    } else if (patch.op === 'add') {
      if (Array.isArray(parent) && typeof key === 'number') {
        if (key < 0 || key > parent.length) {
          throw new Error(`Cannot add outside array bounds: ${patch.path}`);
        }
        parent.splice(key, 0, patch.value);
      } else if (parent !== null && typeof parent === 'object') {
        (parent as Record<string, unknown>)[key as string] = patch.value;
      } else {
        throw new Error(`Invalid patch target: ${patch.path}`);
      }
    } else {
      // 'replace' — RFC 6902: 대상이 존재해야 함. 배열에서 범위 초과 인덱스는 무시.
      if (Array.isArray(parent) && typeof key === 'number') {
        if (key < 0 || key >= parent.length) {
          throw new Error(`Cannot replace missing path: ${patch.path}`);
        }
        parent[key] = patch.value;
      } else if (parent !== null && typeof parent === 'object') {
        const record = parent as Record<string, unknown>;
        if (!(key in record)) {
          throw new Error(`Cannot replace missing path: ${patch.path}`);
        }
        record[key as string] = patch.value;
      } else {
        throw new Error(`Invalid patch target: ${patch.path}`);
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
  let patched: ChartSpec;
  try {
    patched = applyPatches(spec, patches);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Patch application failed',
    };
  }
  const result = chartSpecSchema.safeParse(patched);

  if (result.success) {
    return { success: true, spec: patched };
  }

  const error = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
  console.warn('[chart-spec-utils] AI 패치 후 스키마 검증 실패:', error, { patchCount: patches.length });
  return { success: false, error };
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
  /** 타입 추론 샘플 크기: 전체 데이터 중 앞에서 이 개수만 검사 */
  SAMPLE_SIZE: 100,
} as const;

function inferDataType(values: unknown[]): DataType {
  if (values.length === 0) return 'nominal';

  const sample = values.slice(0, INFER_TYPE_THRESHOLDS.SAMPLE_SIZE);

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

// Handler가 `visualizationData.type`에 선언하는 메서드-레벨 레이블을 Graph Studio ChartType으로 매핑.
// 용도: analysis-adapter.ts의 `buildAnalysisVisualizationColumns()`가 null을 반환할 때의 LCD 폴백.
// adapter가 메서드-전용 파생 데이터/colorField를 내는 경우가 정상 경로이고, 이 map은 그 경로가 실패할 때만 사용된다.
//
// `satisfies Partial<Record<AnalysisVizType, ChartType>>`로 컴파일 타임 정합성 보장:
// - `AnalysisVizType`에 없는 키 사용 시 컴파일 에러 (유효 vizType만 허용)
// - 일부 vizType은 생략 가능 (LCD 매핑이 적절하지 않은 경우 Partial 허용)
export const ANALYSIS_VIZ_TYPE_MAP = {
  bar: 'bar',
  'frequency-bar': 'bar',
  boxplot: 'boxplot',
  'boxplot-multiple': 'boxplot',
  histogram: 'histogram',
  scatter: 'scatter',
  'scatter-regression': 'scatter',
  'stepwise-regression': 'scatter',
  'dose-response': 'scatter',
  'response-surface': 'scatter',
  'logistic-regression': 'scatter',
  'poisson-regression': 'scatter',
  'ordinal-regression': 'scatter',
  line: 'line',
  'time-series': 'line',
  'interaction-plot': 'line',
  'scree-plot': 'bar',
  'forest-plot': 'error-bar',
  'km-curve': 'km-curve',
  'roc-curve': 'roc-curve',
  // 의도적 제외 (전용 렌더러 없음, adapter가 null 반환):
  // - cluster-plot, contingency-table, discriminant-plot, dendrogram, item-total
  // 이들은 호출자가 suggestChartType(columns) 컬럼 기반 폴백을 사용하거나 버튼 비활성화 UX를 제공해야 한다.
} as const satisfies Partial<Record<AnalysisVizType, ChartType>>;

export function analysisVizTypeToChartType(vizType: string | undefined | null): ChartType | null {
  if (!vizType) return null;
  return (ANALYSIS_VIZ_TYPE_MAP as Record<string, ChartType>)[vizType] ?? null;
}

export function suggestChartType(columns: ColumnMeta[]): ChartType {
  const quantCols = columns.filter(c => c.type === 'quantitative');
  const catCols = columns.filter(c => c.type === 'nominal' || c.type === 'ordinal');
  const timeCols = columns.filter(c => c.type === 'temporal');

  // 범주형 그룹 + 수치 2개 이상 → scatter
  // (species/length/weight/year 같은 실데이터에서 관계형 플롯이 기본 기대치인 경우가 많다)
  if (quantCols.length >= 2 && catCols.length >= 1) {
    return 'scatter';
  }

  // 시간 + 단일 수치 → line
  if (timeCols.length >= 1 && quantCols.length === 1) {
    return 'line';
  }

  // 수치 2개 이상 → scatter
  if (quantCols.length >= 2) {
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
  const xCandidates = columns.filter((column) => {
    if (hints.suggestedXType === 'nominal' || hints.suggestedXType === 'ordinal') {
      return column.type === 'nominal' || column.type === 'ordinal';
    }
    return column.type === hints.suggestedXType;
  });
  const yCandidates = columns.filter(c => c.type === 'quantitative');
  const xField = pickPreferredColumnName(
    xCandidates,
    hints.suggestedXType,
    scoreXAxisCandidate,
  ) ?? columns[0]?.name ?? 'x';

  // y 후보 우선순위: 의미상 더 "결과값"에 가까운 quantitative → xField 제외 임의 컬럼 → xField 자체
  // (histogram 등 y를 실제로 사용하지 않는 차트는 어떤 값이든 무방)
  const yField = pickPreferredColumnName(
    yCandidates.filter(candidate => candidate.name !== xField),
    'quantitative',
    scoreYAxisCandidate,
  ) ??
    columns.find(c => c.name !== xField)?.name ??
    xField;

  return { xField, yField };
}

function scoreReadableCategoryCount(uniqueCount: number): number {
  if (uniqueCount <= 1) return -8;
  if (uniqueCount <= 6) return 8;
  if (uniqueCount <= 12) return 6;
  if (uniqueCount <= 20) return 3;
  if (uniqueCount <= 40) return 0;
  return -6;
}

function scoreXAxisCandidate(column: ColumnMeta, targetType: ColumnMeta['type']): number {
  const tokens = normalizeFieldName(column.name);
  const isIdLike = hasIdLikeName(tokens);
  const hasCategoryHint = hasToken(tokens, CATEGORY_FRIENDLY_TOKENS);
  const hasTimeHint = hasToken(tokens, TIME_LIKE_TOKENS);
  const hasPredictorHint = hasToken(tokens, PREDICTOR_LIKE_TOKENS);
  const hasResponseHint = hasToken(tokens, RESPONSE_LIKE_TOKENS);

  if (targetType === 'temporal') {
    return (hasTimeHint ? 12 : 4) +
      Math.min(column.uniqueCount, 24) * 0.2 -
      (isIdLike ? 6 : 0) -
      (column.hasNull ? 1 : 0);
  }

  if (targetType === 'nominal' || targetType === 'ordinal') {
    // CATEGORY 힌트가 있으면 일반 `_id` 접미사는 식별자가 아니라 그룹 키로 간주
    // (treatment_id, group_id 등이 sample_id와 동급으로 감점되지 않도록)
    const effectiveIdLike = isIdLike && !hasCategoryHint;
    return scoreReadableCategoryCount(column.uniqueCount) +
      (hasCategoryHint ? 8 : 0) -
      (hasTimeHint ? 2 : 0) -
      (effectiveIdLike ? 12 : 0) -
      (column.hasNull ? 1 : 0) +
      (column.type === 'ordinal' ? 0.5 : 0);
  }

  return (hasPredictorHint ? 6 : 0) -
    (hasResponseHint ? 2 : 0) -
    (isIdLike ? 12 : 0) -
    (column.hasNull ? 1 : 0) +
    Math.min(column.uniqueCount, 20) * 0.1;
}

function scoreYAxisCandidate(column: ColumnMeta): number {
  const tokens = normalizeFieldName(column.name);
  const isIdLike = hasIdLikeName(tokens);
  const hasPredictorHint = hasToken(tokens, PREDICTOR_LIKE_TOKENS);
  const hasResponseHint = hasToken(tokens, RESPONSE_LIKE_TOKENS);

  // Y축 quantitative 선택은 "측정값/반응값" 우선이 더 중요하다.
  // 따라서 X축 nominal/ordinal과 달리 category-hinted *_id라도 식별자 페널티를 유지해
  // treatment_id 같은 수치형 그룹 코드를 결과 변수로 고르는 일을 계속 강하게 방지한다.
  return (hasResponseHint ? 8 : 0) -
    (hasPredictorHint ? 2 : 0) -
    (isIdLike ? 12 : 0) -
    (column.hasNull ? 1 : 0) +
    Math.min(column.uniqueCount, 20) * 0.1;
}

function pickPreferredColumnName(
  candidates: ColumnMeta[],
  targetType: ColumnMeta['type'],
  scorer: (column: ColumnMeta, targetType: ColumnMeta['type']) => number,
): string | null {
  // 최고점 선택, 동점 시 원래 순서 우선. wide-format(수천 컬럼) 대비 index를 누적
  // 페널티로 쓰지 않음 — 스코어 차이를 덮어버리는 문제 방지.
  let bestName: string | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  candidates.forEach((candidate) => {
    const score = scorer(candidate, targetType);
    if (score > bestScore) {
      bestScore = score;
      bestName = candidate.name;
    }
  });

  return bestName;
}

const AUTO_COLOR_GROUP_MIN = 2;
const AUTO_COLOR_GROUP_MAX = 8;

export function selectAutoColorField(
  columns: ColumnMeta[],
  xField: string,
  yField: string,
): string | null {
  // 1차 필터: 범주형 + unique 2~8 + xField/yField 아님
  const candidates = columns.filter((column) => {
    const isCategorical = column.type === 'nominal' || column.type === 'ordinal';
    const withinReadableGroupCount =
      column.uniqueCount >= AUTO_COLOR_GROUP_MIN &&
      column.uniqueCount <= AUTO_COLOR_GROUP_MAX;
    return isCategorical &&
      withinReadableGroupCount &&
      column.name !== xField &&
      column.name !== yField;
  });

  // 2차 우선순위: ID-like가 아닌 후보 > ID-like지만 CATEGORY 힌트 있는 후보 > null.
  // `batch_id` 같은 low-cardinality identifier는 CATEGORY 토큰(batch)이 있어도
  // 개별 식별자라 color 범례에 부적합 → 비-ID 대안이 있으면 그 쪽을 선택.
  const nonIdLike = candidates.find((c) => !hasIdLikeName(normalizeFieldName(c.name)));
  if (nonIdLike) return nonIdLike.name;

  const categoryHintedId = candidates.find((c) => {
    const tokens = normalizeFieldName(c.name);
    return hasIdLikeName(tokens) && hasToken(tokens, CATEGORY_FRIENDLY_TOKENS);
  });
  if (categoryHintedId) return categoryHintedId.name;

  return null;
}

function shouldApplyDefaultAutoColor(chartType: ChartType): boolean {
  return chartType === 'line' || chartType === 'scatter';
}

export function createAutoConfiguredChartSpec(
  sourceId: string,
  chartType: ChartType,
  xField: string,
  yField: string,
  columns: ColumnMeta[],
): ChartSpec {
  const spec = createDefaultChartSpec(sourceId, chartType, xField, yField, columns);

  if (!shouldApplyDefaultAutoColor(chartType) || spec.encoding.color) {
    return spec;
  }

  const autoColorField = selectAutoColorField(columns, xField, yField);
  if (!autoColorField) {
    return spec;
  }

  const autoColorColumn = columns.find((column) => column.name === autoColorField);
  if (!autoColorColumn) {
    return spec;
  }

  return {
    ...spec,
    encoding: {
      ...spec.encoding,
      color: { field: autoColorColumn.name, type: autoColorColumn.type },
    },
  };
}

// ─── CSV 데이터 → ChartSpec 자동 생성 ──────────────────────

export function autoCreateChartSpec(
  sourceId: string,
  data: Record<string, unknown>[],
): ChartSpec {
  const columns = inferColumnMeta(data);
  const chartType = suggestChartType(columns);
  const { xField, yField } = selectXYFields(columns, CHART_TYPE_HINTS[chartType]);
  return createAutoConfiguredChartSpec(sourceId, chartType, xField, yField, columns);
}

// ─── 유의성 마커 유틸 ──────────────────────────────────────

/**
 * p-value 또는 커스텀 label → `*` / `**` / `***` / `ns` 변환.
 * mark.label이 있으면 우선 반환 (커스텀 텍스트 허용).
 *
 * @example
 *   getPValueLabel({ groupA: 'A', groupB: 'B', pValue: 0.03 }) // '*'
 *   getPValueLabel({ groupA: 'A', groupB: 'B', label: 'p=0.03' }) // 'p=0.03'
 */
export function getPValueLabel(mark: SignificanceMark): string {
  if (mark.label) return mark.label;
  if (mark.pValue === undefined) return '';
  if (mark.pValue <= 0.001) return '***';
  if (mark.pValue <= 0.01) return '**';
  if (mark.pValue <= 0.05) return '*';
  return 'ns';
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
  return createAutoConfiguredChartSpec(pkg.id, chartType, xField, yField, pkg.columns);
}

// ─── AnalysisContext 적용 ─────────────────────────────────────

/**
 * AnalysisContext를 ChartSpec에 적용.
 *
 * - ctx.comparisons → spec.significance (유의성 브래킷 마크)
 *
 * 반환값: 수정된 새 ChartSpec (원본 불변)
 */
export function applyAnalysisContext(spec: ChartSpec, ctx: AnalysisContext): ChartSpec {
  if (!ctx.comparisons || ctx.comparisons.length === 0) return spec;

  const significance: SignificanceMark[] = ctx.comparisons.map(cmp => ({
    groupA: cmp.group1,
    groupB: cmp.group2,
    pValue: cmp.pValue,
  }));

  return { ...spec, significance };
}
