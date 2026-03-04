/**
 * DataUploadPanel 핵심 로직 시뮬레이션 테스트
 *
 * 컴포넌트를 직접 마운트하지 않고, DataUploadPanel이 실제로 호출하는
 * 함수/스토어 로직만 추출해 검증한다.
 *
 * 검증 범위:
 * 1. SAMPLE_ROWS year 컬럼 → temporal 추론 (line 차트 X축 버그 수정 검증)
 * 2. 6개 차트 유형별 X/Y 필드 매핑
 * 3. loadDataPackageWithSpec 단일 액션 (중간 렌더 방지)
 * 4. 모듈 레벨 _SAMPLE_COLUMNS 미리 계산 검증
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { inferColumnMeta, selectXYFields } from '@/lib/graph-studio/chart-spec-utils';
import { createDefaultChartSpec, CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import type { ChartType, DataPackage } from '@/types/graph-studio';

// ─── SAMPLE_ROWS 복사 (DataUploadPanel과 동일한 데이터) ───

const SAMPLE_ROWS: Record<string, unknown>[] = [
  { species: 'Bass',  length_cm: 12.3, weight_g:  28.5, year: '2015-01-01' },
  { species: 'Bass',  length_cm: 18.7, weight_g:  82.1, year: '2016-01-01' },
  { species: 'Bass',  length_cm: 24.1, weight_g: 178.4, year: '2017-01-01' },
  { species: 'Bass',  length_cm: 29.5, weight_g: 321.7, year: '2018-01-01' },
  { species: 'Bass',  length_cm: 33.8, weight_g: 487.2, year: '2019-01-01' },
  { species: 'Bass',  length_cm: 37.2, weight_g: 641.0, year: '2020-01-01' },
  { species: 'Bass',  length_cm: 40.1, weight_g: 782.3, year: '2021-01-01' },
  { species: 'Bass',  length_cm: 42.6, weight_g: 901.5, year: '2022-01-01' },
  { species: 'Bass',  length_cm: 44.3, weight_g: 987.4, year: '2023-01-01' },
  { species: 'Bass',  length_cm: 45.7, weight_g: 1052.8, year: '2024-01-01' },
  { species: 'Bream', length_cm: 10.1, weight_g:  18.2, year: '2015-01-01' },
  { species: 'Bream', length_cm: 15.4, weight_g:  55.3, year: '2016-01-01' },
  { species: 'Bream', length_cm: 20.2, weight_g: 124.6, year: '2017-01-01' },
  { species: 'Bream', length_cm: 24.9, weight_g: 232.1, year: '2018-01-01' },
  { species: 'Bream', length_cm: 28.7, weight_g: 358.4, year: '2019-01-01' },
  { species: 'Bream', length_cm: 31.8, weight_g: 487.9, year: '2020-01-01' },
  { species: 'Bream', length_cm: 34.2, weight_g: 601.3, year: '2021-01-01' },
  { species: 'Bream', length_cm: 36.1, weight_g: 698.7, year: '2022-01-01' },
  { species: 'Bream', length_cm: 37.5, weight_g: 774.2, year: '2023-01-01' },
  { species: 'Bream', length_cm: 38.6, weight_g: 831.5, year: '2024-01-01' },
  { species: 'Carp',  length_cm: 14.8, weight_g:   42.1, year: '2015-01-01' },
  { species: 'Carp',  length_cm: 22.3, weight_g:  142.8, year: '2016-01-01' },
  { species: 'Carp',  length_cm: 29.7, weight_g:  338.5, year: '2017-01-01' },
  { species: 'Carp',  length_cm: 36.2, weight_g:  612.4, year: '2018-01-01' },
  { species: 'Carp',  length_cm: 41.8, weight_g:  924.7, year: '2019-01-01' },
  { species: 'Carp',  length_cm: 46.5, weight_g: 1287.3, year: '2020-01-01' },
  { species: 'Carp',  length_cm: 50.3, weight_g: 1624.8, year: '2021-01-01' },
  { species: 'Carp',  length_cm: 53.4, weight_g: 1934.2, year: '2022-01-01' },
  { species: 'Carp',  length_cm: 55.9, weight_g: 2198.6, year: '2023-01-01' },
  { species: 'Carp',  length_cm: 57.8, weight_g: 2421.3, year: '2024-01-01' },
];

// 컴포넌트와 동일한 buildSamplePackage 로직 (모듈 레벨 계산)
const SAMPLE_COLUMNS = inferColumnMeta(SAMPLE_ROWS);
const SAMPLE_DATA: Record<string, unknown[]> = Object.fromEntries(
  SAMPLE_COLUMNS.map(col => [col.name, SAMPLE_ROWS.map(row => row[col.name])]),
);

function buildSamplePackage(sourceId: string): DataPackage {
  return {
    id: sourceId,
    source: 'upload',
    label: '어류 성장 샘플 (Bass · Bream · Carp)',
    columns: SAMPLE_COLUMNS,
    data: SAMPLE_DATA,
    createdAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  act(() => { useGraphStudioStore.getState().resetAll(); });
});

// ─── 1. 컬럼 타입 추론 ────────────────────────────────────────

describe('샘플 데이터 컬럼 타입 추론', () => {
  it('30행 × 4컬럼 구조', () => {
    expect(SAMPLE_ROWS).toHaveLength(30);
    expect(SAMPLE_COLUMNS).toHaveLength(4);
  });

  it('species → nominal', () => {
    const col = SAMPLE_COLUMNS.find(c => c.name === 'species');
    expect(col?.type).toBe('nominal');
  });

  it('length_cm → quantitative', () => {
    const col = SAMPLE_COLUMNS.find(c => c.name === 'length_cm');
    expect(col?.type).toBe('quantitative');
  });

  it('weight_g → quantitative', () => {
    const col = SAMPLE_COLUMNS.find(c => c.name === 'weight_g');
    expect(col?.type).toBe('quantitative');
  });

  it('year (YYYY-MM-DD 날짜 문자열) → temporal', () => {
    // 버그 수정 핵심: 구버전 age(정수)는 quantitative였고 line 차트 X축이 species로 fallback됐음
    // 수정 후: year(날짜 문자열)은 temporal → line X=year 올바르게 매핑됨
    const col = SAMPLE_COLUMNS.find(c => c.name === 'year');
    expect(col?.type).toBe('temporal');
  });

  it('year uniqueCount = 10 (2015~2024)', () => {
    const col = SAMPLE_COLUMNS.find(c => c.name === 'year');
    expect(col?.uniqueCount).toBe(10);
  });
});

// ─── 2. 차트 유형별 X/Y 필드 매핑 ─────────────────────────────

describe('차트 유형별 selectXYFields 매핑', () => {
  const cases: Array<[ChartType, string, string]> = [
    // [chartType, 기대 xField, 기대 yField]
    ['bar',       'species',   'length_cm'],  // nominal X, quantitative Y
    ['scatter',   'length_cm', 'weight_g'],   // quantitative X, 다른 quantitative Y
    ['line',      'year',      'length_cm'],  // temporal X (버그 수정 핵심)
    ['boxplot',   'species',   'length_cm'],  // nominal X, quantitative Y
    ['histogram', 'length_cm', 'weight_g'],   // quantitative X, 다른 quantitative Y
    ['heatmap',   'species',   'length_cm'],  // nominal X, quantitative Y
  ];

  it.each(cases)(
    '%s → X=%s, Y=%s',
    (chartType, expectedX, expectedY) => {
      const { xField, yField } = selectXYFields(SAMPLE_COLUMNS, CHART_TYPE_HINTS[chartType]);
      expect(xField).toBe(expectedX);
      expect(yField).toBe(expectedY);
    },
  );

  it('line 차트는 X축이 species(nominal)가 아니다 (버그 수정 회귀 방지)', () => {
    // 구버전: age가 quantitative → temporal 컬럼 없음 → X=species(첫 컬럼) fallback
    // 수정 후: year가 temporal → X=year
    const { xField } = selectXYFields(SAMPLE_COLUMNS, CHART_TYPE_HINTS['line']);
    expect(xField).not.toBe('species');
    expect(xField).toBe('year');
  });
});

// ─── 3. createDefaultChartSpec 생성 결과 ──────────────────────

describe('차트 유형별 ChartSpec 생성', () => {
  it('line ChartSpec.encoding.x.type = temporal', () => {
    const { xField, yField } = selectXYFields(SAMPLE_COLUMNS, CHART_TYPE_HINTS['line']);
    const spec = createDefaultChartSpec('src-1', 'line', xField, yField, SAMPLE_COLUMNS);
    expect(spec.chartType).toBe('line');
    expect(spec.encoding.x.field).toBe('year');
    expect(spec.encoding.x.type).toBe('temporal');
  });

  it('scatter ChartSpec — X=quantitative, Y=quantitative (다른 컬럼)', () => {
    const { xField, yField } = selectXYFields(SAMPLE_COLUMNS, CHART_TYPE_HINTS['scatter']);
    const spec = createDefaultChartSpec('src-2', 'scatter', xField, yField, SAMPLE_COLUMNS);
    expect(spec.encoding.x.type).toBe('quantitative');
    expect(spec.encoding.y.type).toBe('quantitative');
    expect(spec.encoding.x.field).not.toBe(spec.encoding.y.field);
  });

  it('bar ChartSpec — X=nominal(species)', () => {
    const { xField, yField } = selectXYFields(SAMPLE_COLUMNS, CHART_TYPE_HINTS['bar']);
    const spec = createDefaultChartSpec('src-3', 'bar', xField, yField, SAMPLE_COLUMNS);
    expect(spec.encoding.x.field).toBe('species');
    expect(spec.encoding.x.type).toBe('nominal');
  });
});

// ─── 4. loadDataPackageWithSpec 단일 액션 ──────────────────────

describe('loadDataPackageWithSpec 스토어 액션', () => {
  it('단일 set()으로 dataPackage + chartSpec 동시 등록', () => {
    const pkg = buildSamplePackage('test-1');
    const { xField, yField } = selectXYFields(pkg.columns, CHART_TYPE_HINTS['bar']);
    const spec = createDefaultChartSpec('test-1', 'bar', xField, yField, pkg.columns);

    act(() => {
      useGraphStudioStore.getState().loadDataPackageWithSpec(pkg, spec);
    });

    const state = useGraphStudioStore.getState();
    expect(state.isDataLoaded).toBe(true);
    expect(state.dataPackage?.id).toBe('test-1');
    expect(state.chartSpec?.chartType).toBe('bar');
    expect(state.chartSpec?.encoding.x.field).toBe('species');
  });

  it('scatter 선택 시 spec의 chartType이 scatter', () => {
    const pkg = buildSamplePackage('test-2');
    const { xField, yField } = selectXYFields(pkg.columns, CHART_TYPE_HINTS['scatter']);
    const spec = createDefaultChartSpec('test-2', 'scatter', xField, yField, pkg.columns);

    act(() => {
      useGraphStudioStore.getState().loadDataPackageWithSpec(pkg, spec);
    });

    const { chartSpec } = useGraphStudioStore.getState();
    expect(chartSpec?.chartType).toBe('scatter');
    expect(chartSpec?.encoding.x.field).toBe('length_cm');
    expect(chartSpec?.encoding.y.field).toBe('weight_g');
  });

  it('line 선택 시 X=year(temporal)', () => {
    const pkg = buildSamplePackage('test-3');
    const { xField, yField } = selectXYFields(pkg.columns, CHART_TYPE_HINTS['line']);
    const spec = createDefaultChartSpec('test-3', 'line', xField, yField, pkg.columns);

    act(() => {
      useGraphStudioStore.getState().loadDataPackageWithSpec(pkg, spec);
    });

    const { chartSpec } = useGraphStudioStore.getState();
    expect(chartSpec?.chartType).toBe('line');
    expect(chartSpec?.encoding.x.field).toBe('year');
    expect(chartSpec?.encoding.x.type).toBe('temporal');
  });

  it('specHistory 초기화 확인 (historyIndex=0, 길이=1)', () => {
    const pkg = buildSamplePackage('test-4');
    const { xField, yField } = selectXYFields(pkg.columns, CHART_TYPE_HINTS['boxplot']);
    const spec = createDefaultChartSpec('test-4', 'boxplot', xField, yField, pkg.columns);

    act(() => {
      useGraphStudioStore.getState().loadDataPackageWithSpec(pkg, spec);
    });

    const { specHistory, historyIndex } = useGraphStudioStore.getState();
    expect(specHistory).toHaveLength(1);
    expect(historyIndex).toBe(0);
  });

  it('두 번 호출하면 두 번째 것으로 덮어쓰기 (isDataLoaded 유지)', () => {
    const pkg1 = buildSamplePackage('test-5a');
    const spec1 = createDefaultChartSpec(
      'test-5a', 'bar',
      ...Object.values(selectXYFields(pkg1.columns, CHART_TYPE_HINTS['bar'])) as [string, string],
      pkg1.columns,
    );
    const pkg2 = buildSamplePackage('test-5b');
    const spec2 = createDefaultChartSpec(
      'test-5b', 'scatter',
      ...Object.values(selectXYFields(pkg2.columns, CHART_TYPE_HINTS['scatter'])) as [string, string],
      pkg2.columns,
    );

    act(() => {
      useGraphStudioStore.getState().loadDataPackageWithSpec(pkg1, spec1);
      useGraphStudioStore.getState().loadDataPackageWithSpec(pkg2, spec2);
    });

    const state = useGraphStudioStore.getState();
    expect(state.chartSpec?.chartType).toBe('scatter');
    expect(state.dataPackage?.id).toBe('test-5b');
    expect(state.isDataLoaded).toBe(true);
  });
});

// ─── 5. 6개 썸네일 전체 end-to-end 시뮬레이션 ─────────────────

describe('6개 차트 유형 — handleChartTypeSelect 시뮬레이션', () => {
  const THUMBNAIL_TYPES: ChartType[] = ['bar', 'scatter', 'line', 'boxplot', 'histogram', 'heatmap'];

  it.each(THUMBNAIL_TYPES)('%s 선택 → isDataLoaded=true, chartType 일치', (chartType) => {
    const pkg = buildSamplePackage(`sample-${chartType}`);
    const { xField, yField } = selectXYFields(pkg.columns, CHART_TYPE_HINTS[chartType]);
    const spec = createDefaultChartSpec(`sample-${chartType}`, chartType, xField, yField, pkg.columns);

    act(() => {
      useGraphStudioStore.getState().loadDataPackageWithSpec(pkg, spec);
    });

    const state = useGraphStudioStore.getState();
    expect(state.isDataLoaded).toBe(true);
    expect(state.chartSpec?.chartType).toBe(chartType);
    // X축이 species(nominal)로 fallback되지 않았는지 확인 (line, scatter, histogram은 달라야 함)
    if (chartType === 'line') {
      expect(state.chartSpec?.encoding.x.field).toBe('year');
    }
    if (chartType === 'scatter' || chartType === 'histogram') {
      expect(state.chartSpec?.encoding.x.type).toBe('quantitative');
    }
  });
});
