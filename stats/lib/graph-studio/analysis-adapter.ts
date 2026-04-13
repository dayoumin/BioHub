/**
 * AnalysisResult → AnalysisContext 변환 어댑터
 * Smart Flow 분석 결과를 Graph Studio DataPackage의 analysisContext로 변환
 */

import type { AnalysisResult as AnalysisResult } from '@/types/analysis'
import type {
  AnalysisContext,
  ChartType,
  Comparison,
  GroupStat,
  TestInfo,
  ComparisonMeta,
  ColumnMeta,
  ErrorBarSpec,
  TrendlineSpec,
} from '@/types/graph-studio'
import type {
  KaplanMeierAnalysisResult,
  RocCurveAnalysisResult,
} from '@/lib/generated/method-types.generated'
import type { KmCurve as KmCurveData } from '@/types/bio-tools-results'
import type {
  VbgfResult,
  LengthWeightResult,
  ConditionFactorResult,
  NmdsResult,
  RarefactionResult,
  MetaAnalysisResult,
} from '@/types/bio-tools-results'
import { inferColumnMeta } from './chart-spec-utils'

export interface AnalysisVisualizationColumnsResult {
  columns: ColumnMeta[]
  data: Record<string, unknown[]>
  chartType: ChartType
  xField: string
  yField: string
  colorField?: string
  errorBar?: ErrorBarSpec
  trendline?: TrendlineSpec
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number')
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function pushColumnarValue(target: Record<string, unknown[]>, key: string, value: unknown): void {
  if (!target[key]) {
    target[key] = []
  }
  target[key].push(value)
}

function buildColumnsFromRows(
  rows: Record<string, unknown>[],
  chartType: ChartType,
  xField: string,
  yField: string,
  colorField?: string,
): AnalysisVisualizationColumnsResult | null {
  if (rows.length === 0) return null

  const columns = inferColumnMeta(rows)
  const data: Record<string, unknown[]> = {}

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      pushColumnarValue(data, key, value)
    }
  }

  return { columns, data, chartType, xField, yField, colorField }
}

function buildHistogramVisualization(data: unknown): AnalysisVisualizationColumnsResult | null {
  const rows: Record<string, unknown>[] = []

  if (Array.isArray(data)) {
    for (const entry of data) {
      if (!isRecord(entry) || !isNumberArray(entry.values)) return null
      const label = typeof entry.label === 'string' ? entry.label : undefined
      for (const value of entry.values) {
        rows.push(label ? { value, series: label } : { value })
      }
    }
    return buildColumnsFromRows(rows, 'histogram', 'value', 'value', rows.some((row) => 'series' in row) ? 'series' : undefined)
  }

  if (isRecord(data) && isNumberArray(data.values)) {
    for (const value of data.values) {
      rows.push({ value })
    }
    return buildColumnsFromRows(rows, 'histogram', 'value', 'value')
  }

  return null
}

function buildBoxplotVisualization(data: unknown): AnalysisVisualizationColumnsResult | null {
  if (!isRecord(data)) return null

  const rows: Record<string, unknown>[] = []
  for (const [key, value] of Object.entries(data)) {
    if (!isRecord(value) || !isNumberArray(value.values)) continue
    const label = typeof value.label === 'string' ? value.label : key
    for (const item of value.values) {
      rows.push({ group: label, value: item })
    }
  }

  return buildColumnsFromRows(rows, 'boxplot', 'group', 'value', 'group')
}

function buildMultiBoxplotVisualization(data: unknown): AnalysisVisualizationColumnsResult | null {
  if (!Array.isArray(data)) return null

  const rows: Record<string, unknown>[] = []
  for (const entry of data) {
    if (!isRecord(entry) || !isNumberArray(entry.values)) return null
    const label = typeof entry.label === 'string' ? entry.label : 'Group'
    for (const value of entry.values) {
      rows.push({ group: label, value })
    }
  }

  return buildColumnsFromRows(rows, 'boxplot', 'group', 'value', 'group')
}

function buildScatterVisualization(data: unknown): AnalysisVisualizationColumnsResult | null {
  if (!isRecord(data) || !isNumberArray(data.x) || !isNumberArray(data.y)) return null

  const xValues = data.x
  const yValues = data.y
  const rowCount = Math.min(xValues.length, yValues.length)
  const rows: Record<string, unknown>[] = []
  for (let index = 0; index < rowCount; index += 1) {
    rows.push({ x: xValues[index], y: yValues[index] })
  }

  const built = buildColumnsFromRows(rows, 'scatter', 'x', 'y')
  if (!built) return null

  const fittedPoints = isNumberArray(data.regression)
    ? data.regression
      .slice(0, Math.min(data.regression.length, xValues.length))
      .map((value, index) => [xValues[index], value] as [number, number])
    : undefined

  return {
    ...built,
    trendline: fittedPoints && fittedPoints.length >= 2
      ? { type: 'linear', showEquation: true, fittedPoints }
      : undefined,
  }
}

function buildSimpleLineVisualization(data: unknown): AnalysisVisualizationColumnsResult | null {
  if (!isRecord(data) || !Array.isArray(data.labels) || !isNumberArray(data.means)) return null

  const rowCount = Math.min(data.labels.length, data.means.length)
  const rows: Record<string, unknown>[] = []
  for (let index = 0; index < rowCount; index += 1) {
    rows.push({ x: data.labels[index], value: data.means[index] })
  }

  return buildColumnsFromRows(rows, 'line', 'x', 'value')
}

function buildInteractionPlotVisualization(data: unknown): AnalysisVisualizationColumnsResult | null {
  if (!Array.isArray(data)) return null

  const rows: Record<string, unknown>[] = []
  for (const entry of data) {
    if (!isRecord(entry)) return null
    const factor1 = entry.factor1
    const factor2 = entry.factor2
    const value = entry.value
    if ((typeof factor1 !== 'string' && typeof factor1 !== 'number')
      || (typeof factor2 !== 'string' && typeof factor2 !== 'number')
      || typeof value !== 'number') {
      return null
    }
    rows.push({ factor1, factor2, value })
  }

  return buildColumnsFromRows(rows, 'line', 'factor1', 'value', 'factor2')
}

function buildFrequencyBarVisualization(data: unknown): AnalysisVisualizationColumnsResult | null {
  if (!isRecord(data) || !isStringArray(data.categories) || !isNumberArray(data.observed)) return null

  const rowCount = Math.min(data.categories.length, data.observed.length)
  const rows: Record<string, unknown>[] = []
  for (let index = 0; index < rowCount; index += 1) {
    rows.push({
      category: data.categories[index],
      observed: data.observed[index],
      expected: isNumberArray(data.expected) ? data.expected[index] ?? null : null,
    })
  }

  return buildColumnsFromRows(rows, 'bar', 'category', 'observed')
}

function buildContingencyVisualization(data: unknown): AnalysisVisualizationColumnsResult | null {
  if (!isRecord(data) || !Array.isArray(data.matrix) || !isStringArray(data.rowLabels) || !isStringArray(data.colLabels)) {
    return null
  }

  const rows: Record<string, unknown>[] = []
  for (let rowIndex = 0; rowIndex < data.rowLabels.length; rowIndex += 1) {
    const counts = data.matrix[rowIndex]
    if (!Array.isArray(counts)) return null
    for (let columnIndex = 0; columnIndex < data.colLabels.length; columnIndex += 1) {
      const count = counts[columnIndex]
      if (typeof count !== 'number') return null
      rows.push({
        row: data.rowLabels[rowIndex],
        column: data.colLabels[columnIndex],
        count,
      })
    }
  }

  return buildColumnsFromRows(rows, 'grouped-bar', 'column', 'count', 'row')
}

function buildTimeSeriesVisualization(data: unknown): AnalysisVisualizationColumnsResult | null {
  if (!isRecord(data)) return null

  const seriesCandidates: Array<{ key: string; label: string }> = [
    { key: 'values', label: 'Observed' },
    { key: 'trend', label: 'Trend' },
    { key: 'seasonal', label: 'Seasonal' },
    { key: 'residual', label: 'Residual' },
    { key: 'forecast', label: 'Forecast' },
    { key: 'fitted', label: 'Fitted' },
    { key: 'predictions', label: 'Prediction' },
  ]

  const rows: Record<string, unknown>[] = []
  for (const candidate of seriesCandidates) {
    const values = data[candidate.key]
    if (!isNumberArray(values)) continue
    for (let index = 0; index < values.length; index += 1) {
      rows.push({
        index: index + 1,
        value: values[index],
        series: candidate.label,
      })
    }
  }

  if (rows.length === 0) return null
  return buildColumnsFromRows(rows, 'line', 'index', 'value', 'series')
}

function buildBarVisualization(data: unknown): AnalysisVisualizationColumnsResult | null {
  if (!isRecord(data) || !Array.isArray(data.plotData)) return null

  const rows: Record<string, unknown>[] = []
  let explicitErrorType: ErrorBarSpec['type'] | null = null
  for (const entry of data.plotData) {
    if (!isRecord(entry)) return null

    const xValue = entry.group ?? entry.label ?? entry.category ?? entry.x
    const yValue = entry.mean ?? entry.value ?? entry.y

    if ((typeof xValue !== 'string' && typeof xValue !== 'number') || typeof yValue !== 'number') {
      return null
    }

    rows.push({
      category: xValue,
      value: yValue,
      lower: typeof entry.lower === 'number' ? entry.lower : null,
      upper: typeof entry.upper === 'number' ? entry.upper : null,
      ciLower: typeof entry.ciLower === 'number' ? entry.ciLower : null,
      ciUpper: typeof entry.ciUpper === 'number' ? entry.ciUpper : null,
      error: typeof entry.stderr === 'number'
        ? entry.stderr
        : typeof entry.std === 'number'
          ? entry.std
          : null,
    })

    if (typeof entry.ciLower === 'number' && typeof entry.ciUpper === 'number') {
      explicitErrorType = 'ci'
    } else if (typeof entry.stderr === 'number') {
      explicitErrorType = 'stderr'
    } else if (typeof entry.std === 'number' && explicitErrorType === null) {
      explicitErrorType = 'stdev'
    }
  }

  const built = buildColumnsFromRows(
    rows,
    explicitErrorType ? 'error-bar' : 'bar',
    'category',
    'value',
  )
  if (!built) return null

  return {
    ...built,
    errorBar: explicitErrorType ? { type: explicitErrorType } : undefined,
  }
}

function buildItemTotalVisualization(data: unknown): AnalysisVisualizationColumnsResult | null {
  if (!isNumberArray(data)) return null

  const rows = data.map((value, index) => ({
    item: `Item ${index + 1}`,
    correlation: value,
  }))

  return buildColumnsFromRows(rows, 'bar', 'item', 'correlation')
}

function buildScreeVisualization(data: unknown): AnalysisVisualizationColumnsResult | null {
  if (!isRecord(data)) return null

  const explainedVariance = isNumberArray(data.explainedVarianceRatio)
    ? data.explainedVarianceRatio
    : Array.isArray(data.screeData)
      ? data.screeData
        .map((entry) => {
          if (typeof entry === 'number') return entry
          if (isRecord(entry) && typeof entry.varianceExplained === 'number') {
            return entry.varianceExplained > 1 ? entry.varianceExplained / 100 : entry.varianceExplained
          }
          return null
        })
        .filter((value): value is number => value !== null)
      : null

  if (!explainedVariance || explainedVariance.length === 0) return null

  const rows = explainedVariance.map((value, index) => ({
    component: `PC${index + 1}`,
    variance: value,
  }))

  return buildColumnsFromRows(rows, 'line', 'component', 'variance')
}

function buildGroupStatsFallback(result: AnalysisResult): AnalysisVisualizationColumnsResult | null {
  if (!result.groupStats || result.groupStats.length === 0) return null

  const rows = result.groupStats.map((group, index) => ({
    group: group.name ?? `Group ${index + 1}`,
    mean: group.mean,
    std: group.std,
    n: group.n,
    median: group.median ?? null,
  }))

  return buildColumnsFromRows(rows, 'bar', 'group', 'mean', 'group')
}

export function buildAnalysisVisualizationColumns(
  result: AnalysisResult,
): AnalysisVisualizationColumnsResult | null {
  const visualization = result.visualizationData
  if (!visualization) {
    return buildGroupStatsFallback(result)
  }

  switch (visualization.type) {
    case 'histogram':
      return buildHistogramVisualization(visualization.data) ?? buildGroupStatsFallback(result)
    case 'boxplot':
      return buildBoxplotVisualization(visualization.data) ?? buildGroupStatsFallback(result)
    case 'boxplot-multiple':
      return buildMultiBoxplotVisualization(visualization.data) ?? buildGroupStatsFallback(result)
    case 'scatter':
    case 'scatter-regression':
      return buildScatterVisualization(visualization.data)
    case 'line':
      return buildSimpleLineVisualization(visualization.data)
    case 'interaction-plot':
      return buildInteractionPlotVisualization(visualization.data) ?? buildGroupStatsFallback(result)
    case 'frequency-bar':
      return buildFrequencyBarVisualization(visualization.data)
    case 'contingency-table':
      return buildContingencyVisualization(visualization.data)
    case 'time-series':
      return buildTimeSeriesVisualization(visualization.data)
    case 'bar':
      return buildBarVisualization(visualization.data) ?? buildGroupStatsFallback(result)
    case 'item-total':
      return buildItemTotalVisualization(visualization.data)
    case 'scree-plot':
      return buildScreeVisualization(visualization.data)
    case 'dendrogram':
      return null
    default:
      return null
  }
}

// ─── 공통 유틸 ──────────────────────────────────────────────

/** 배열의 고유 값 수를 반환 (ColumnMeta.uniqueCount 용) */
function uniqCount(arr: readonly (string | number)[]): number {
  return new Set(arr).size;
}

/**
 * 스칼라 메타데이터를 컬럼 형식으로 변환.
 * row 0에만 값, 나머지 null — DataPackage 컬럼 규약.
 */
function metaColumn<T>(n: number, value: T): (T | null)[] {
  const arr: (T | null)[] = new Array(n).fill(null);
  if (n > 0) arr[0] = value;
  return arr;
}

// ─── DataPackage 컬럼 빌더 (KM/ROC 전용) ────────────────────

/** buildKmCurveColumns 반환 형태 */
export interface KmColumnsResult {
  columns: ColumnMeta[];
  data: Record<string, unknown[]>;
  xField: 'time';
  yField: 'survival';
  colorField: 'group' | undefined;
}

/**
 * KaplanMeierAnalysisResult → DataPackage 컬럼 변환.
 * echarts-converter 의 km-curve 컬럼 규약에 맞춰 빌드.
 */
export function buildKmCurveColumns(kmData: KaplanMeierAnalysisResult): KmColumnsResult {
  const groups = Object.keys(kmData.curves);
  // 단일 그룹이 'all'이거나 unnamed이면 colorField 생략
  const isGrouped = groups.length > 1;

  const timeArr: number[] = [];
  const survArr: number[] = [];
  const ciLoArr: number[] = [];
  const ciHiArr: number[] = [];
  const groupArr: string[] = [];
  const isCensoredArr: number[] = [];

  // step function에서 주어진 시간의 생존율 조회 (마지막 ≤ t 스텝 값)
  function survivalAtTime(curve: KmCurveData, t: number): { s: number; lo: number; hi: number } {
    let idx = 0;
    for (let i = 0; i < curve.time.length; i++) {
      if (curve.time[i] <= t) idx = i;
      else break;
    }
    return { s: curve.survival[idx], lo: curve.ciLo[idx], hi: curve.ciHi[idx] };
  }

  for (const [groupName, curve] of Object.entries(kmData.curves)) {
    // 주 KM 스텝 포인트 (event times) — isCensored=0
    for (let i = 0; i < curve.time.length; i++) {
      timeArr.push(curve.time[i]);
      survArr.push(curve.survival[i]);
      ciLoArr.push(curve.ciLo[i]);
      ciHiArr.push(curve.ciHi[i]);
      groupArr.push(groupName);
      isCensoredArr.push(0);
    }
    // 중도절단 시점 — isCensored=1 (KM plot의 tick 마커)
    for (const ct of curve.censored ?? []) {
      const sv = survivalAtTime(curve, ct);
      timeArr.push(ct);
      survArr.push(sv.s);
      ciLoArr.push(sv.lo);
      ciHiArr.push(sv.hi);
      groupArr.push(groupName);
      isCensoredArr.push(1);
    }
  }

  const n = timeArr.length;

  const logRankPArr = kmData.logRankP !== null ? metaColumn(n, kmData.logRankP) : new Array<number | null>(n).fill(null);

  const data: Record<string, unknown[]> = {
    time: timeArr,
    survival: survArr,
    ciLo: ciLoArr,
    ciHi: ciHiArr,
    isCensored: isCensoredArr,
    ...(isGrouped ? { group: groupArr } : {}),
    __logRankP: logRankPArr,
  };



  const columns: ColumnMeta[] = [
    { name: 'time', type: 'quantitative', uniqueCount: uniqCount(timeArr), sampleValues: timeArr.slice(0, 5).map(String), hasNull: false },
    { name: 'survival', type: 'quantitative', uniqueCount: uniqCount(survArr), sampleValues: survArr.slice(0, 5).map(String), hasNull: false },
    { name: 'ciLo', type: 'quantitative', uniqueCount: uniqCount(ciLoArr), sampleValues: ciLoArr.slice(0, 5).map(String), hasNull: false },
    { name: 'ciHi', type: 'quantitative', uniqueCount: uniqCount(ciHiArr), sampleValues: ciHiArr.slice(0, 5).map(String), hasNull: false },
    { name: 'isCensored', type: 'quantitative', uniqueCount: 2, sampleValues: ['0', '1'], hasNull: false },
    ...(isGrouped ? [{ name: 'group', type: 'nominal' as const, uniqueCount: groups.length, sampleValues: groups.slice(0, 5), hasNull: false }] : []),
    { name: '__logRankP', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
  ];

  return { columns, data, xField: 'time', yField: 'survival', colorField: isGrouped ? 'group' : undefined };
}

/** buildRocCurveColumns 반환 형태 */
export interface RocColumnsResult {
  columns: ColumnMeta[];
  data: Record<string, unknown[]>;
  xField: 'fpr';
  yField: 'tpr';
  colorField: undefined;
}

/**
 * RocCurveAnalysisResult → DataPackage 컬럼 변환.
 * echarts-converter 의 roc-curve 컬럼 규약에 맞춰 빌드.
 */
export function buildRocCurveColumns(rocData: RocCurveAnalysisResult): RocColumnsResult {
  const n = rocData.rocPoints.length;
  const fprArr = rocData.rocPoints.map(p => p.fpr);
  const tprArr = rocData.rocPoints.map(p => p.tpr);

  const aucArr = metaColumn(n, rocData.auc);
  const aucLoArr = metaColumn(n, rocData.aucCI?.lower ?? null);
  const aucHiArr = metaColumn(n, rocData.aucCI?.upper ?? null);

  const data: Record<string, unknown[]> = {
    fpr: fprArr,
    tpr: tprArr,
    __auc: aucArr,
    __aucLo: aucLoArr,
    __aucHi: aucHiArr,
  };


  const columns: ColumnMeta[] = [
    { name: 'fpr', type: 'quantitative', uniqueCount: uniqCount(fprArr), sampleValues: fprArr.slice(0, 5).map(String), hasNull: false },
    { name: 'tpr', type: 'quantitative', uniqueCount: uniqCount(tprArr), sampleValues: tprArr.slice(0, 5).map(String), hasNull: false },
    { name: '__auc', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
    { name: '__aucLo', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
    { name: '__aucHi', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
  ];

  return { columns, data, xField: 'fpr', yField: 'tpr', colorField: undefined };
}

// ─── DataPackage 컬럼 빌더 (Fisheries) ─────────────────────

/** buildVbgfColumns 반환 형태 */
export interface VbgfColumnsResult {
  columns: ColumnMeta[];
  data: Record<string, unknown[]>;
  xField: 'age';
  yField: 'length';
  colorField: 'series';
}

/** 관측 데이터 포인트 (VBGF 어댑터용) */
interface VbgfObservedPoint {
  age: number;
  length: number;
}

/**
 * VbgfResult + 원본 관측 데이터 → DataPackage 컬럼 변환.
 * scatter(observed) + line(fitted) 2-series 구성.
 */
export function buildVbgfColumns(
  result: VbgfResult,
  observedData: VbgfObservedPoint[],
): VbgfColumnsResult {
  const ageArr: number[] = [];
  const lengthArr: number[] = [];
  const seriesArr: string[] = [];

  // 관측값
  for (const p of observedData) {
    ageArr.push(p.age);
    lengthArr.push(p.length);
    seriesArr.push('observed');
  }

  // 적합곡선: 관측 연령 범위에서 50포인트
  if (observedData.length > 0) {
    let ageMin = observedData[0].age;
    let ageMax = observedData[0].age;
    for (const p of observedData) {
      if (p.age < ageMin) ageMin = p.age;
      if (p.age > ageMax) ageMax = p.age;
    }
    const N_CURVE = 50;
    const range = ageMax - ageMin || 1;
    for (let i = 0; i <= N_CURVE; i++) {
      const t = ageMin + range * (i / N_CURVE);
      const l = result.lInf * (1 - Math.exp(-result.k * (t - result.t0)));
      ageArr.push(t);
      lengthArr.push(l);
      seriesArr.push('fitted');
    }
  }

  const n = ageArr.length;

  const rSquaredArr = metaColumn(n, result.rSquared);
  const equationArr = metaColumn(n, `L(t) = ${result.lInf.toFixed(2)} × (1 - e^(-${result.k.toFixed(4)} × (t - ${result.t0.toFixed(4)})))`);

  const data: Record<string, unknown[]> = {
    age: ageArr,
    length: lengthArr,
    series: seriesArr,
    __rSquared: rSquaredArr,
    __equation: equationArr,
  };


  const columns: ColumnMeta[] = [
    { name: 'age', type: 'quantitative', uniqueCount: uniqCount(ageArr), sampleValues: ageArr.slice(0, 5).map(String), hasNull: false },
    { name: 'length', type: 'quantitative', uniqueCount: uniqCount(lengthArr), sampleValues: lengthArr.slice(0, 5).map(String), hasNull: false },
    { name: 'series', type: 'nominal', uniqueCount: 2, sampleValues: ['observed', 'fitted'], hasNull: false },
    { name: '__rSquared', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
    { name: '__equation', type: 'nominal', uniqueCount: 2, sampleValues: [], hasNull: true },
  ];

  return { columns, data, xField: 'age', yField: 'length', colorField: 'series' };
}

/** buildLengthWeightColumns 반환 형태 */
export interface LwColumnsResult {
  columns: ColumnMeta[];
  data: Record<string, unknown[]>;
  xField: 'logLength';
  yField: 'logWeight';
  colorField: undefined;
}

/**
 * LengthWeightResult → DataPackage 컬럼 변환.
 * scatter + linear trendline 구성 (log-log 변환).
 */
export function buildLengthWeightColumns(result: LengthWeightResult): LwColumnsResult {
  // NaN 포인트 제거 (Python Worker가 유효 데이터만 반환하지만 방어적 필터링)
  const validPoints = result.logLogPoints.filter(p => !isNaN(p.logL) && !isNaN(p.logW));
  const n = validPoints.length;
  const logLengthArr = validPoints.map(p => p.logL);
  const logWeightArr = validPoints.map(p => p.logW);

  const logAArr = metaColumn(n, result.logA);
  const bArr = metaColumn(n, result.b);
  const rSquaredArr = metaColumn(n, result.rSquared);

  const data: Record<string, unknown[]> = {
    logLength: logLengthArr,
    logWeight: logWeightArr,
    __logA: logAArr,
    __b: bArr,
    __rSquared: rSquaredArr,
  };


  const columns: ColumnMeta[] = [
    { name: 'logLength', type: 'quantitative', uniqueCount: uniqCount(logLengthArr), sampleValues: logLengthArr.slice(0, 5).map(String), hasNull: false },
    { name: 'logWeight', type: 'quantitative', uniqueCount: uniqCount(logWeightArr), sampleValues: logWeightArr.slice(0, 5).map(String), hasNull: false },
    { name: '__logA', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
    { name: '__b', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
    { name: '__rSquared', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
  ];

  return { columns, data, xField: 'logLength', yField: 'logWeight', colorField: undefined };
}

/** buildConditionFactorColumns 반환 형태 */
export interface CfColumnsResult {
  columns: ColumnMeta[];
  data: Record<string, unknown[]>;
  xField: 'k';
  yField: undefined;
}

/**
 * ConditionFactorResult → DataPackage 컬럼 변환.
 * histogram 구성 (mean/median markLine 참조선용 메타 포함).
 */
export function buildConditionFactorColumns(result: ConditionFactorResult): CfColumnsResult {
  // NaN 값 제거 (방어적 필터링)
  const kArr = result.individualK.filter(v => !isNaN(v));
  const n = kArr.length;

  const meanArr = metaColumn(n, result.mean);
  const medianArr = metaColumn(n, result.median);

  const data: Record<string, unknown[]> = {
    k: kArr,
    __mean: meanArr,
    __median: medianArr,
  };


  const columns: ColumnMeta[] = [
    { name: 'k', type: 'quantitative', uniqueCount: uniqCount(kArr), sampleValues: kArr.slice(0, 5).map(String), hasNull: false },
    { name: '__mean', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
    { name: '__median', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
  ];

  return { columns, data, xField: 'k', yField: undefined };
}

// ─── DataPackage 컬럼 빌더 (Ecology / Methods) ──────────────

/** buildNmdsColumns 반환 형태 */
export interface NmdsColumnsResult {
  columns: ColumnMeta[];
  data: Record<string, unknown[]>;
  xField: 'nmds1';
  yField: 'nmds2';
  colorField: 'group' | undefined;
}

/**
 * NmdsResult → DataPackage 컬럼 변환.
 * scatter (NMDS1 vs NMDS2) + 선택적 그룹 색상.
 */
export function buildNmdsColumns(result: NmdsResult): NmdsColumnsResult {
  const n = result.coordinates.length;
  const nmds1Arr = result.coordinates.map(c => c[0]);
  const nmds2Arr = result.coordinates.map(c => c[1]);
  const siteArr = result.siteLabels;
  const groupArr = result.groups !== null && result.groups.length > 0 ? result.groups : undefined;
  const hasGroups = groupArr !== undefined;

  const stressArr = metaColumn(n, result.stress);
  const stressInterpArr = metaColumn(n, result.stressInterpretation);

  const data: Record<string, unknown[]> = {
    nmds1: nmds1Arr,
    nmds2: nmds2Arr,
    site: siteArr,
    ...(groupArr ? { group: groupArr } : {}),
    __stress: stressArr,
    __stressInterpretation: stressInterpArr,
  };


  const columns: ColumnMeta[] = [
    { name: 'nmds1', type: 'quantitative', uniqueCount: uniqCount(nmds1Arr), sampleValues: nmds1Arr.slice(0, 5).map(String), hasNull: false },
    { name: 'nmds2', type: 'quantitative', uniqueCount: uniqCount(nmds2Arr), sampleValues: nmds2Arr.slice(0, 5).map(String), hasNull: false },
    { name: 'site', type: 'nominal', uniqueCount: uniqCount(siteArr), sampleValues: siteArr.slice(0, 5), hasNull: false },
    ...(groupArr ? [(() => { const unique = [...new Set(groupArr)]; return { name: 'group', type: 'nominal' as const, uniqueCount: unique.length, sampleValues: unique.slice(0, 5), hasNull: false }; })()] : []),
    { name: '__stress', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
    { name: '__stressInterpretation', type: 'nominal', uniqueCount: 2, sampleValues: [], hasNull: true },
  ];

  return { columns, data, xField: 'nmds1', yField: 'nmds2', colorField: hasGroups ? 'group' : undefined };
}

/** buildRarefactionColumns 반환 형태 */
export interface RarefactionColumnsResult {
  columns: ColumnMeta[];
  data: Record<string, unknown[]>;
  xField: 'individuals';
  yField: 'expectedSpecies';
  colorField: 'site';
}

/**
 * RarefactionResult → DataPackage 컬럼 변환.
 * line (다중 시리즈: 사이트별 희박화 곡선).
 */
export function buildRarefactionColumns(result: RarefactionResult): RarefactionColumnsResult {
  const individualsArr: number[] = [];
  const speciesArr: number[] = [];
  const siteArr: string[] = [];

  for (const curve of result.curves) {
    for (let i = 0; i < curve.steps.length; i++) {
      individualsArr.push(curve.steps[i]);
      speciesArr.push(curve.expectedSpecies[i]);
      siteArr.push(curve.siteName);
    }
  }

  const n = individualsArr.length;
  const data: Record<string, unknown[]> = {
    individuals: individualsArr,
    expectedSpecies: speciesArr,
    site: siteArr,
  };


  const columns: ColumnMeta[] = [
    { name: 'individuals', type: 'quantitative', uniqueCount: uniqCount(individualsArr), sampleValues: individualsArr.slice(0, 5).map(String), hasNull: false },
    { name: 'expectedSpecies', type: 'quantitative', uniqueCount: uniqCount(speciesArr), sampleValues: speciesArr.slice(0, 5).map(String), hasNull: false },
    { name: 'site', type: 'nominal', uniqueCount: result.curves.length, sampleValues: result.curves.slice(0, 5).map(c => c.siteName), hasNull: false },
  ];

  return { columns, data, xField: 'individuals', yField: 'expectedSpecies', colorField: 'site' };
}

/** buildMetaAnalysisColumns 반환 형태 */
export interface MetaAnalysisColumnsResult {
  columns: ColumnMeta[];
  data: Record<string, unknown[]>;
  xField: 'effectSize';
  yField: 'study';
}

/**
 * MetaAnalysisResult → DataPackage 컬럼 변환.
 * error-bar (Forest Plot: 연구별 효과크기 + CI).
 */
export function buildMetaAnalysisColumns(result: MetaAnalysisResult): MetaAnalysisColumnsResult {
  // 개별 연구 + 통합 효과
  const studyArr = [...result.studyNames, 'Pooled'];
  const effectArr = [...result.effectSizes, result.pooledEffect];
  const ciLowerArr = [...result.studyCiLower, result.ci[0]];
  const ciUpperArr = [...result.studyCiUpper, result.ci[1]];
  const weightArr = [...result.weights, 100];

  const n = studyArr.length;

  const modelArr = metaColumn(n, result.model);
  const qArr = metaColumn(n, result.Q);
  const iSquaredArr = metaColumn(n, result.iSquared);
  const tauSquaredArr = metaColumn(n, result.tauSquared);

  const data: Record<string, unknown[]> = {
    study: studyArr,
    effectSize: effectArr,
    ciLower: ciLowerArr,
    ciUpper: ciUpperArr,
    weight: weightArr,
    __model: modelArr,
    __Q: qArr,
    __iSquared: iSquaredArr,
    __tauSquared: tauSquaredArr,
  };


  const columns: ColumnMeta[] = [
    { name: 'study', type: 'nominal', uniqueCount: uniqCount(studyArr), sampleValues: studyArr.slice(0, 5), hasNull: false },
    { name: 'effectSize', type: 'quantitative', uniqueCount: uniqCount(effectArr), sampleValues: effectArr.slice(0, 5).map(String), hasNull: false },
    { name: 'ciLower', type: 'quantitative', uniqueCount: uniqCount(ciLowerArr), sampleValues: ciLowerArr.slice(0, 5).map(String), hasNull: false },
    { name: 'ciUpper', type: 'quantitative', uniqueCount: uniqCount(ciUpperArr), sampleValues: ciUpperArr.slice(0, 5).map(String), hasNull: false },
    { name: 'weight', type: 'quantitative', uniqueCount: uniqCount(weightArr), sampleValues: weightArr.slice(0, 5).map(String), hasNull: false },
    { name: '__model', type: 'nominal', uniqueCount: 2, sampleValues: [], hasNull: true },
    { name: '__Q', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
    { name: '__iSquared', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
    { name: '__tauSquared', type: 'quantitative', uniqueCount: 2, sampleValues: [], hasNull: true },
  ];

  return { columns, data, xField: 'effectSize', yField: 'study' };
}

/**
 * AnalysisResult를 AnalysisContext로 변환
 * @param result Smart Flow 분석 결과 (result-transformer.ts 출력)
 * @param groupNames 정수 인덱스 → 그룹명 매핑 (C-2: group ID resolution)
 */
export function toAnalysisContext(
  result: AnalysisResult,
  groupNames?: string[],
): AnalysisContext {
  // C-2: group ID resolution — 정수 인덱스를 라벨로 변환
  const resolveGroupName = (raw: string | number): string => {
    if (typeof raw === 'string') return raw;
    if (groupNames?.[raw] !== undefined) return groupNames[raw];
    const gs = result.groupStats?.[raw];
    if (gs?.name) return gs.name;
    return String(raw);
  };

  // comparisons 변환 (PostHocResult[] → Comparison[])
  const comparisons: Comparison[] | undefined = result.postHoc?.map(ph => ({
    group1: resolveGroupName(ph.group1),
    group2: resolveGroupName(ph.group2),
    pValue: ph.pvalueAdjusted ?? ph.pvalue,
    significant: ph.significant,
    meanDiff: ph.meanDiff,
  }));

  // groupStats 변환 (GroupStats[] → GroupStat[])
  const groupStats: GroupStat[] | undefined = result.groupStats?.map(gs => ({
    name: gs.name ?? '',
    mean: gs.mean,
    std: gs.std,
    n: gs.n,
    se: gs.n > 0 ? gs.std / Math.sqrt(gs.n) : undefined,
    median: gs.median,
  }));

  // effectSize 추출 (number | EffectSizeInfo | undefined → number | undefined)
  const effectSize =
    typeof result.effectSize === 'number'
      ? result.effectSize
      : result.effectSize?.value;
  const effectSizeType =
    typeof result.effectSize === 'number' ? undefined : result.effectSize?.type;

  const testInfo: TestInfo = {
    statistic: result.statistic,
    df: result.df,
    effectSize,
    effectSizeType,
  };

  // H-4: allPairsIncluded 판별 — 전쌍 포함 시만 CLD 생성 가능
  const k = result.groupStats?.length;
  const nComparisons = comparisons?.length;
  const allPairsIncluded =
    k !== undefined &&
    nComparisons !== undefined &&
    nComparisons === (k * (k - 1)) / 2;

  // comparisonMeta — postHoc가 있을 때만 생성
  const comparisonMeta: ComparisonMeta | undefined =
    comparisons && comparisons.length > 0
      ? {
          alpha: 0.05,
          adjustmentMethod: result.postHocMethod ?? 'unknown',
          allPairsIncluded,
        }
      : undefined;

  return {
    method: result.method,
    pValue: result.pValue,
    comparisons,
    groupStats,
    testInfo,
    comparisonMeta,
  };
}
