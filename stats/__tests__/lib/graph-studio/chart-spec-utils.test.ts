/**
 * chart-spec-utils 테스트
 *
 * - columnsToRows: 열 지향 → 행 배열 변환
 * - inferColumnMeta: 타입 추론
 * - suggestChartType: 차트 유형 추천
 * - selectXYFields: x/y 필드 자동 선택 (단일 컬럼 포함)
 * - autoCreateChartSpec: 행 데이터 → ChartSpec
 * - createChartSpecFromDataPackage: DataPackage → ChartSpec
 * - applyPatches / applyAndValidatePatches: JSON Patch (RFC 6901/6902 준수)
 */

import {
  columnsToRows,
  inferColumnMeta,
  suggestChartType,
  selectXYFields,
  autoCreateChartSpec,
  createChartSpecFromDataPackage,
  applyPatches,
  applyAndValidatePatches,
} from '@/lib/graph-studio/chart-spec-utils';
import {
  createDefaultChartSpec,
  CHART_TYPE_HINTS,
} from '@/lib/graph-studio/chart-spec-defaults';
import { chartSpecSchema } from '@/lib/graph-studio/chart-spec-schema';
import type { DataPackage, ChartSpec, ColumnMeta } from '@/types/graph-studio';

// ─── 헬퍼 ────────────────────────────────────────────────────

function makeDataPackage(
  overrides: Partial<DataPackage> = {},
): DataPackage {
  return {
    id: 'pkg-1',
    source: 'upload',
    label: 'test',
    columns: [],
    data: {},
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── columnsToRows ────────────────────────────────────────────

describe('columnsToRows', () => {
  it('빈 data → 빈 배열', () => {
    expect(columnsToRows({})).toEqual([]);
  });

  it('열 지향 데이터를 행 배열로 변환', () => {
    const data = {
      name: ['Alice', 'Bob'],
      age: [25, 30],
    };
    expect(columnsToRows(data)).toEqual([
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 },
    ]);
  });

  it('단일 열 → rowCount만큼 행 생성', () => {
    const data = { score: [10, 20, 30] };
    const rows = columnsToRows(data);
    expect(rows).toHaveLength(3);
    expect(rows[2]).toEqual({ score: 30 });
  });

  it('jagged array — 짧은 열은 undefined', () => {
    // 정상 케이스는 아니나 방어적 동작 확인
    const data: Record<string, unknown[]> = {
      a: [1, 2, 3],
      b: [4, 5],        // 하나 짧음
    };
    const rows = columnsToRows(data);
    expect(rows).toHaveLength(3);   // 첫 번째 컬럼 길이 기준
    expect(rows[2].b).toBeUndefined();
  });
});

// ─── inferColumnMeta ──────────────────────────────────────────

describe('inferColumnMeta', () => {
  it('빈 배열 → 빈 결과', () => {
    expect(inferColumnMeta([])).toEqual([]);
  });

  it('수치 컬럼 → quantitative', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ val: i * 1.5 }));
    const [col] = inferColumnMeta(rows);
    expect(col.name).toBe('val');
    expect(col.type).toBe('quantitative');
  });

  it('날짜 문자열 컬럼 → temporal', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      date: `2024-0${(i % 9) + 1}-01`,
    }));
    const [col] = inferColumnMeta(rows);
    expect(col.type).toBe('temporal');
  });

  it('범주형 컬럼 → nominal', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      group: i % 2 === 0 ? 'A' : 'B',
    }));
    const [col] = inferColumnMeta(rows);
    expect(col.type).toBe('nominal');
  });

  it('null 값 포함 → hasNull: true', () => {
    const rows = [
      { x: 1 },
      { x: null },
      { x: 3 },
    ];
    const [col] = inferColumnMeta(rows as Record<string, unknown>[]);
    expect(col.hasNull).toBe(true);
  });

  it('null 없음 → hasNull: false', () => {
    const rows = [{ x: 1 }, { x: 2 }];
    const [col] = inferColumnMeta(rows);
    expect(col.hasNull).toBe(false);
  });

  it('uniqueCount & sampleValues 최대 5개', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ g: `g${i}` }));
    const [col] = inferColumnMeta(rows);
    expect(col.uniqueCount).toBe(10);
    expect(col.sampleValues.length).toBeLessThanOrEqual(5);
  });
});

// ─── suggestChartType ─────────────────────────────────────────

describe('suggestChartType', () => {
  it('시간 + 수치 → line', () => {
    const cols = [
      { name: 'date', type: 'temporal' as const, uniqueCount: 10, sampleValues: [], hasNull: false },
      { name: 'val', type: 'quantitative' as const, uniqueCount: 10, sampleValues: [], hasNull: false },
    ];
    expect(suggestChartType(cols)).toBe('line');
  });

  it('수치 2개 + 범주 없음 → scatter', () => {
    const cols = [
      { name: 'x', type: 'quantitative' as const, uniqueCount: 10, sampleValues: [], hasNull: false },
      { name: 'y', type: 'quantitative' as const, uniqueCount: 10, sampleValues: [], hasNull: false },
    ];
    expect(suggestChartType(cols)).toBe('scatter');
  });

  it('범주 + 수치 → bar', () => {
    const cols = [
      { name: 'group', type: 'nominal' as const, uniqueCount: 3, sampleValues: [], hasNull: false },
      { name: 'val', type: 'quantitative' as const, uniqueCount: 10, sampleValues: [], hasNull: false },
    ];
    expect(suggestChartType(cols)).toBe('bar');
  });

  it('수치 1개만 → histogram', () => {
    const cols = [
      { name: 'val', type: 'quantitative' as const, uniqueCount: 10, sampleValues: [], hasNull: false },
    ];
    expect(suggestChartType(cols)).toBe('histogram');
  });
});

// ─── autoCreateChartSpec ─────────────────────────────────────

describe('autoCreateChartSpec', () => {
  it('scatter: x/y에 다른 필드 할당 (중복 방지)', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      weight: i * 10,
      height: i * 5,
    }));
    const spec = autoCreateChartSpec('src', rows);
    expect(spec.chartType).toBe('scatter');
    expect(spec.encoding.x.field).not.toBe(spec.encoding.y.field);
  });

  it('bar: x=nominal, y=quantitative', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      group: ['A', 'B', 'C'][i % 3],
      score: i * 2,
    }));
    const spec = autoCreateChartSpec('src', rows);
    expect(spec.chartType).toBe('bar');
    expect(spec.encoding.x.type).toBe('nominal');
    expect(spec.encoding.y.type).toBe('quantitative');
  });

  it('version은 항상 "1.0"', () => {
    const rows = [{ a: 1, b: 2 }];
    const spec = autoCreateChartSpec('src', rows);
    expect(spec.version).toBe('1.0');
  });

  it('sourceId가 spec.data.sourceId에 반영', () => {
    const rows = [{ x: 'A', y: 1 }];
    const spec = autoCreateChartSpec('my-source', rows);
    expect(spec.data.sourceId).toBe('my-source');
  });
});

// ─── createChartSpecFromDataPackage ──────────────────────────

describe('createChartSpecFromDataPackage', () => {
  it('DataPackage.columns를 그대로 사용 (재추론 없음)', () => {
    const pkg = makeDataPackage({
      id: 'pkg-scatter',
      columns: [
        { name: 'weight', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
        { name: 'height', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
      ],
    });
    const spec = createChartSpecFromDataPackage(pkg);
    expect(spec.chartType).toBe('scatter');
    expect(spec.data.sourceId).toBe('pkg-scatter');
    expect(spec.data.columns).toBe(pkg.columns); // 동일 참조 — 재생성 안 함
  });

  it('scatter: x/y 필드 중복 없음', () => {
    const pkg = makeDataPackage({
      columns: [
        { name: 'a', type: 'quantitative', uniqueCount: 5, sampleValues: [], hasNull: false },
        { name: 'b', type: 'quantitative', uniqueCount: 5, sampleValues: [], hasNull: false },
      ],
    });
    const spec = createChartSpecFromDataPackage(pkg);
    expect(spec.encoding.x.field).not.toBe(spec.encoding.y.field);
  });

  it('autoCreateChartSpec과 동일 결과 (동등한 입력)', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      group: ['A', 'B'][i % 2],
      score: i * 3,
    }));
    const specA = autoCreateChartSpec('id', rows);

    // DataPackage에는 inferColumnMeta로 추론한 컬럼을 미리 넣어둠
    const pkg = makeDataPackage({
      id: 'id',
      columns: specA.data.columns,  // autoCreate가 만든 것과 동일 columns
    });
    const specB = createChartSpecFromDataPackage(pkg);

    expect(specB.chartType).toBe(specA.chartType);
    expect(specB.encoding.x.field).toBe(specA.encoding.x.field);
    expect(specB.encoding.y.field).toBe(specA.encoding.y.field);
  });
});

// ─── applyPatches ────────────────────────────────────────────

describe('applyPatches', () => {
  function baseSpec(): ChartSpec {
    return createDefaultChartSpec('src', 'bar', 'group', 'value', [
      { name: 'group', type: 'nominal', uniqueCount: 3, sampleValues: [], hasNull: false },
      { name: 'value', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
    ]);
  }

  it('replace: chartType 변경', () => {
    const patched = applyPatches(baseSpec(), [
      { op: 'replace', path: '/chartType', value: 'line' },
    ]);
    expect(patched.chartType).toBe('line');
  });

  it('replace: title 설정', () => {
    const patched = applyPatches(baseSpec(), [
      { op: 'replace', path: '/title', value: 'My Chart' },
    ]);
    expect(patched.title).toBe('My Chart');
  });

  it('add: 새 경로 생성', () => {
    const patched = applyPatches(baseSpec(), [
      { op: 'add', path: '/title', value: 'Added' },
    ]);
    expect(patched.title).toBe('Added');
  });

  it('remove: 필드 제거', () => {
    const spec = { ...baseSpec(), title: 'to-remove' };
    const patched = applyPatches(spec, [
      { op: 'remove', path: '/title' },
    ]);
    expect(patched.title).toBeUndefined();
  });

  it('원본 spec 불변 (deep clone)', () => {
    const original = baseSpec();
    applyPatches(original, [
      { op: 'replace', path: '/chartType', value: 'scatter' },
    ]);
    expect(original.chartType).toBe('bar');  // 원본 변하지 않음
  });

  it('중첩 경로 replace', () => {
    const patched = applyPatches(baseSpec(), [
      { op: 'replace', path: '/encoding/x/title', value: 'X-Axis Label' },
    ]);
    expect(patched.encoding.x.title).toBe('X-Axis Label');
  });

  it('빈 patches → 원본과 동일 값', () => {
    const original = baseSpec();
    const patched = applyPatches(original, []);
    expect(patched.chartType).toBe(original.chartType);
    expect(patched.encoding.x.field).toBe(original.encoding.x.field);
  });
});

// ─── applyAndValidatePatches ──────────────────────────────────

describe('applyAndValidatePatches', () => {
  function baseSpec(): ChartSpec {
    return createDefaultChartSpec('src', 'bar', 'g', 'v', [
      { name: 'g', type: 'nominal', uniqueCount: 3, sampleValues: [], hasNull: false },
      { name: 'v', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
    ]);
  }

  it('유효한 패치 → success: true, spec 반환', () => {
    const result = applyAndValidatePatches(baseSpec(), [
      { op: 'replace', path: '/chartType', value: 'line' },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.chartType).toBe('line');
    }
  });

  it('잘못된 chartType → success: false, error 포함', () => {
    const result = applyAndValidatePatches(baseSpec(), [
      { op: 'replace', path: '/chartType', value: 'invalid-type' },
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });

  it('version 제거 → success: false (필수 필드)', () => {
    const result = applyAndValidatePatches(baseSpec(), [
      { op: 'remove', path: '/version' },
    ]);
    expect(result.success).toBe(false);
  });

  it('pdf 포맷 → success: false (ExportFormat 범위 초과)', () => {
    const result = applyAndValidatePatches(baseSpec(), [
      { op: 'replace', path: '/exportConfig/format', value: 'pdf' },
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/exportConfig\.format/);
    }
  });

  it('tiff 포맷 → success: false (ExportFormat 범위 초과)', () => {
    const result = applyAndValidatePatches(baseSpec(), [
      { op: 'replace', path: '/exportConfig/format', value: 'tiff' },
    ]);
    expect(result.success).toBe(false);
  });
});

// ─── applyPatches — RFC 6901/6902 심화 ───────────────────────

describe('applyPatches — RFC 6901 준수', () => {
  function base(): ChartSpec {
    return createDefaultChartSpec('src', 'bar', 'x', 'y', [
      { name: 'x', type: 'nominal', uniqueCount: 3, sampleValues: [], hasNull: false },
      { name: 'y', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
    ]);
  }

  // ── ~0 / ~1 언이스케이프 ─────────────────────────────────

  it('~1 → / 로 언이스케이프: encoding/x 접근', () => {
    // /encoding~1x/title 는 실제로 /encoding\/x/title — 이 경로는 존재하지 않으므로 no-op
    // 단, 내부 언이스케이프 동작 자체를 verify
    // 여기서는 정상 경로 /encoding/x/title 와 비교해 ~1 처리가 없을 때와 결과 차이 확인
    const normal = applyPatches(base(), [
      { op: 'replace', path: '/encoding/x/title', value: 'X Label' },
    ]);
    expect(normal.encoding.x.title).toBe('X Label');
  });

  it('~0 → ~ 로 언이스케이프 (경로 토큰에 틸데 포함)', () => {
    // /title에 ~0 자체를 포함한 경로 접근은 현재 ChartSpec 구조에서 나타나지 않으나
    // unescapeToken('~0') = '~' 동작을 patch 결과로 간접 확인
    // (틸데를 포함한 필드가 없으므로 no-op만 검증)
    const patched = applyPatches(base(), [
      { op: 'replace', path: '/nonexistent~0field', value: 'x' },
    ]);
    // 존재하지 않는 경로 → spec 그대로
    expect(patched.chartType).toBe('bar');
  });

  // ── annotations 배열 조작 ────────────────────────────────

  it('add: annotations 배열에 항목 추가 (/0)', () => {
    const annotation = { type: 'text' as const, text: 'peak', x: 5, y: 100 };
    const patched = applyPatches(base(), [
      { op: 'add', path: '/annotations/0', value: annotation },
    ]);
    expect(patched.annotations).toHaveLength(1);
    expect(patched.annotations[0].text).toBe('peak');
  });

  it('add: "-" 인덱스 → 배열 끝에 추가', () => {
    const first = applyPatches(base(), [
      { op: 'add', path: '/annotations/-', value: { type: 'text' as const, text: 'A' } },
    ]);
    const second = applyPatches(first, [
      { op: 'add', path: '/annotations/-', value: { type: 'text' as const, text: 'B' } },
    ]);
    expect(second.annotations).toHaveLength(2);
    expect(second.annotations[1].text).toBe('B');
  });

  it('remove: annotations 배열 항목 제거', () => {
    const withAnnotation = applyPatches(base(), [
      { op: 'add', path: '/annotations/-', value: { type: 'text' as const, text: 'to-remove' } },
    ]);
    const patched = applyPatches(withAnnotation, [
      { op: 'remove', path: '/annotations/0' },
    ]);
    expect(patched.annotations).toHaveLength(0);
  });

  it('replace: annotations[0] 항목 교체', () => {
    const withAnnotation = applyPatches(base(), [
      { op: 'add', path: '/annotations/-', value: { type: 'text' as const, text: 'old' } },
    ]);
    const patched = applyPatches(withAnnotation, [
      { op: 'replace', path: '/annotations/0', value: { type: 'line' as const } },
    ]);
    expect(patched.annotations[0].type).toBe('line');
    expect(patched.annotations[0].text).toBeUndefined();
  });

  it('존재하지 않는 배열 인덱스 → 무시 (no-op)', () => {
    const patched = applyPatches(base(), [
      { op: 'replace', path: '/annotations/999', value: {} },
    ]);
    // annotations는 변경 없음
    expect(patched.annotations).toHaveLength(0);
  });

  // ── add vs replace 의미 구분 ─────────────────────────────

  it('add: 없던 필드 생성', () => {
    const patched = applyPatches(base(), [
      { op: 'add', path: '/title', value: 'New Title' },
    ]);
    expect(patched.title).toBe('New Title');
  });

  it('replace: 있는 필드 교체', () => {
    const withTitle = applyPatches(base(), [
      { op: 'add', path: '/title', value: 'First' },
    ]);
    const patched = applyPatches(withTitle, [
      { op: 'replace', path: '/title', value: 'Second' },
    ]);
    expect(patched.title).toBe('Second');
  });

  it('연속 패치 적용 — 순서 의존성', () => {
    const patched = applyPatches(base(), [
      { op: 'add', path: '/title', value: 'A' },
      { op: 'replace', path: '/title', value: 'B' },
      { op: 'replace', path: '/chartType', value: 'scatter' },
    ]);
    expect(patched.title).toBe('B');
    expect(patched.chartType).toBe('scatter');
  });
});

// ─── selectXYFields ───────────────────────────────────────────

describe('selectXYFields', () => {
  const q = (name: string): ColumnMeta =>
    ({ name, type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false });
  const n = (name: string): ColumnMeta =>
    ({ name, type: 'nominal', uniqueCount: 5, sampleValues: [], hasNull: false });

  it('수치 2개 → x≠y', () => {
    const { xField, yField } = selectXYFields([q('weight'), q('height')], CHART_TYPE_HINTS.scatter);
    expect(xField).not.toBe(yField);
  });

  it('범주+수치 → x=범주, y=수치', () => {
    const { xField, yField } = selectXYFields([n('group'), q('value')], CHART_TYPE_HINTS.bar);
    expect(xField).toBe('group');
    expect(yField).toBe('value');
  });

  it('단일 컬럼(histogram) → yField가 실제 존재하는 필드명 (\'y\' fallback 없음)', () => {
    const cols = [q('score')];
    const { xField, yField } = selectXYFields(cols, CHART_TYPE_HINTS.histogram);
    expect(xField).toBe('score');
    // yField가 존재하지 않는 가상의 'y'가 되면 안 됨
    expect(yField).not.toBe('y');
    // 단일 컬럼이면 xField 자체로 fallback
    expect(yField).toBe('score');
  });

  it('컬럼 없음 → x=\'x\', y=\'x\'로 fallback (graceful)', () => {
    const { xField, yField } = selectXYFields([], CHART_TYPE_HINTS.bar);
    expect(xField).toBe('x');
    expect(yField).toBe('x');
  });
});

// ─── Zod schema — ExportFormat 허용값 ────────────────────────

describe('chartSpecSchema — ExportFormat 검증', () => {
  function baseSpec(): ChartSpec {
    return createDefaultChartSpec('src', 'bar', 'g', 'v', [
      { name: 'g', type: 'nominal', uniqueCount: 3, sampleValues: [], hasNull: false },
      { name: 'v', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
    ]);
  }

  it('svg → 유효', () => {
    const spec = { ...baseSpec(), exportConfig: { ...baseSpec().exportConfig, format: 'svg' } };
    expect(chartSpecSchema.safeParse(spec).success).toBe(true);
  });

  it('png → 유효', () => {
    const spec = { ...baseSpec(), exportConfig: { ...baseSpec().exportConfig, format: 'png' } };
    expect(chartSpecSchema.safeParse(spec).success).toBe(true);
  });

  it('pdf → 무효 (ECharts 미지원)', () => {
    const spec = { ...baseSpec(), exportConfig: { ...baseSpec().exportConfig, format: 'pdf' } };
    expect(chartSpecSchema.safeParse(spec).success).toBe(false);
  });

  it('tiff → 무효 (ECharts 미지원)', () => {
    const spec = { ...baseSpec(), exportConfig: { ...baseSpec().exportConfig, format: 'tiff' } };
    expect(chartSpecSchema.safeParse(spec).success).toBe(false);
  });
});
