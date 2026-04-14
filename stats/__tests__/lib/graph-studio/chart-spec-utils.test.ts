import {
  ANALYSIS_VIZ_TYPE_MAP,
  analysisVizTypeToChartType,
  applyAndValidatePatches,
  applyPatches,
  autoCreateChartSpec,
  columnsToRows,
  createChartSpecFromDataPackage,
  inferColumnMeta,
  selectAutoColorField,
  sanitizeChartSpecForRenderer,
  selectXYFields,
  suggestChartType,
} from '@/lib/graph-studio/chart-spec-utils';
import { ANALYSIS_VIZ_TYPES, type AnalysisVizType } from '@/types/analysis';
import {
  CHART_TYPE_HINTS,
  createDefaultChartSpec,
} from '@/lib/graph-studio/chart-spec-defaults';
import { chartSpecSchema } from '@/lib/graph-studio/chart-spec-schema';
import type { ChartSpec, ColumnMeta, DataPackage } from '@/types/graph-studio';

function makeDataPackage(overrides: Partial<DataPackage> = {}): DataPackage {
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

function makeBaseSpec(): ChartSpec {
  return createDefaultChartSpec('src', 'bar', 'group', 'value', [
    { name: 'group', type: 'nominal', uniqueCount: 3, sampleValues: [], hasNull: false },
    { name: 'value', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
  ]);
}

describe('columnsToRows', () => {
  it('returns an empty array for empty column data', () => {
    expect(columnsToRows({})).toEqual([]);
  });

  it('converts column arrays into row objects', () => {
    expect(
      columnsToRows({
        name: ['Alice', 'Bob'],
        age: [25, 30],
      }),
    ).toEqual([
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 },
    ]);
  });

  it('fills jagged rows with undefined', () => {
    const rows = columnsToRows({
      a: [1, 2, 3],
      b: [4, 5],
    });

    expect(rows).toHaveLength(3);
    expect(rows[2]).toEqual({ a: 3, b: undefined });
  });
});

describe('inferColumnMeta', () => {
  it('returns empty metadata for empty rows', () => {
    expect(inferColumnMeta([])).toEqual([]);
  });

  it('infers quantitative columns', () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({ value: index * 1.5 }));
    expect(inferColumnMeta(rows)[0]?.type).toBe('quantitative');
  });

  it('infers temporal columns', () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({
      date: `2024-0${(index % 9) + 1}-01`,
    }));
    expect(inferColumnMeta(rows)[0]?.type).toBe('temporal');
  });

  it('tracks null presence', () => {
    const [column] = inferColumnMeta([{ x: 1 }, { x: null }, { x: 3 }] as Record<string, unknown>[]);
    expect(column?.hasNull).toBe(true);
  });
});

describe('suggestChartType', () => {
  it('prefers line for temporal plus quantitative data', () => {
    const columns: ColumnMeta[] = [
      { name: 'date', type: 'temporal', uniqueCount: 10, sampleValues: [], hasNull: false },
      { name: 'value', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
    ];

    expect(suggestChartType(columns)).toBe('line');
  });

  it('uses scatter for two quantitative columns', () => {
    const columns: ColumnMeta[] = [
      { name: 'x', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
      { name: 'y', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
    ];

    expect(suggestChartType(columns)).toBe('scatter');
  });
});

describe('analysisVizTypeToChartType', () => {
  // Map에서 파생된 항목은 반드시 매핑을 지킨다.
  // 수동 복제 대신 `ANALYSIS_VIZ_TYPE_MAP` 자체를 SSOT로 사용 — drift 불가능.
  const mappedEntries = Object.entries(ANALYSIS_VIZ_TYPE_MAP);

  it.each(mappedEntries)('maps handler vizType "%s" → ChartType "%s"', (vizType, expected) => {
    expect(analysisVizTypeToChartType(vizType)).toBe(expected);
  });

  it('returns null for undefined/null/empty input so caller can fall back to column-based inference', () => {
    expect(analysisVizTypeToChartType(undefined)).toBeNull();
    expect(analysisVizTypeToChartType(null)).toBeNull();
    expect(analysisVizTypeToChartType('')).toBeNull();
  });

  // AnalysisVizType 중 map에 의도적으로 생략된 것들: adapter 또는 버튼 비활성화로 처리.
  const unmappedVizTypes = ANALYSIS_VIZ_TYPES.filter(
    (t): t is AnalysisVizType => !(t in ANALYSIS_VIZ_TYPE_MAP),
  );

  it('leaves specific vizTypes unmapped (adapter path or disabled UI expected)', () => {
    // 의도된 생략 목록 고정 — 이 집합이 바뀌면 테스트가 실패해 검토가 강제된다.
    expect(unmappedVizTypes.sort()).toEqual([
      'cluster-plot',
      'contingency-table',
      'dendrogram',
      'discriminant-plot',
      'item-total',
    ].sort());
  });

  it.each(unmappedVizTypes)('returns null for intentionally unmapped vizType "%s"', (vizType) => {
    expect(analysisVizTypeToChartType(vizType)).toBeNull();
  });

  it('returns null for arbitrary unknown strings (non-AnalysisVizType)', () => {
    expect(analysisVizTypeToChartType('unknown-chart')).toBeNull();
    expect(analysisVizTypeToChartType('random')).toBeNull();
  });
});

describe('selectXYFields', () => {
  const quantitative = (name: string): ColumnMeta => ({
    name,
    type: 'quantitative',
    uniqueCount: 10,
    sampleValues: [],
    hasNull: false,
  });

  const nominal = (name: string): ColumnMeta => ({
    name,
    type: 'nominal',
    uniqueCount: 5,
    sampleValues: [],
    hasNull: false,
  });

  it('avoids selecting the same field for scatter x and y', () => {
    const { xField, yField } = selectXYFields(
      [quantitative('weight'), quantitative('height')],
      CHART_TYPE_HINTS.scatter,
    );

    expect(xField).not.toBe(yField);
  });

  it('falls back to x when only one column exists', () => {
    const { xField, yField } = selectXYFields([quantitative('score')], CHART_TYPE_HINTS.histogram);
    expect(xField).toBe('score');
    expect(yField).toBe('score');
  });

  it('uses categorical x and quantitative y for bar charts', () => {
    const { xField, yField } = selectXYFields(
      [nominal('group'), quantitative('value')],
      CHART_TYPE_HINTS.bar,
    );

    expect(xField).toBe('group');
    expect(yField).toBe('value');
  });

  it('prefers readable grouping columns over id-like categorical fields', () => {
    const { xField, yField } = selectXYFields(
      [
        nominal('sample_id'),
        nominal('treatment'),
        quantitative('score'),
      ],
      CHART_TYPE_HINTS.bar,
    );

    expect(xField).toBe('treatment');
    expect(yField).toBe('score');
  });

  it('prefers response-like quantitative fields as y when multiple metrics exist', () => {
    const { xField, yField } = selectXYFields(
      [
        { ...nominal('group'), uniqueCount: 3 },
        quantitative('length_cm'),
        quantitative('weight_g'),
      ],
      CHART_TYPE_HINTS.bar,
    );

    expect(xField).toBe('group');
    expect(yField).toBe('weight_g');
  });

  it('understands camelCase headers when scoring grouping and response fields', () => {
    const { xField, yField } = selectXYFields(
      [
        nominal('sampleId'),
        nominal('treatmentGroup'),
        quantitative('bodyWeight'),
        quantitative('bodyLength'),
      ],
      CHART_TYPE_HINTS.bar,
    );

    expect(xField).toBe('treatmentGroup');
    expect(yField).toBe('bodyWeight');
  });

  it('does not treat code-like grouping columns as opaque ids', () => {
    const { xField, yField } = selectXYFields(
      [
        nominal('sample_id'),
        nominal('treatment_code'),
        quantitative('score'),
      ],
      CHART_TYPE_HINTS.bar,
    );

    expect(xField).toBe('treatment_code');
    expect(yField).toBe('score');
  });

  it('allows index-like suffixes on real grouping columns', () => {
    const { xField, yField } = selectXYFields(
      [
        nominal('sample_id'),
        nominal('group_index'),
        quantitative('value'),
      ],
      CHART_TYPE_HINTS.bar,
    );

    expect(xField).toBe('group_index');
    expect(yField).toBe('value');
  });

  it('picks category-named *_id columns over sample_id (CATEGORY suppresses generic id penalty)', () => {
    const { xField, yField } = selectXYFields(
      [
        nominal('sample_id'),
        nominal('treatment_id'),
        quantitative('score'),
      ],
      CHART_TYPE_HINTS.bar,
    );

    expect(xField).toBe('treatment_id');
    expect(yField).toBe('score');
  });
});

describe('selectAutoColorField', () => {
  const quantitative = (name: string): ColumnMeta => ({
    name,
    type: 'quantitative',
    uniqueCount: 10,
    sampleValues: [],
    hasNull: false,
  });

  it('picks a small categorical grouping field for auto color', () => {
    const autoColorField = selectAutoColorField([
      quantitative('time'),
      quantitative('value'),
      { name: 'species', type: 'nominal', uniqueCount: 3, sampleValues: [], hasNull: false },
    ], 'time', 'value');

    expect(autoColorField).toBe('species');
  });

  it('skips high-cardinality categorical fields to avoid legend overload', () => {
    const autoColorField = selectAutoColorField([
      quantitative('x'),
      quantitative('y'),
      { name: 'sampleId', type: 'nominal', uniqueCount: 24, sampleValues: [], hasNull: false },
    ], 'x', 'y');

    expect(autoColorField).toBeNull();
  });

  it('skips low-cardinality ID-like categorical columns even when count fits the range', () => {
    // batch_id(unique=3)는 AUTO_COLOR 범위(2~8)에 들어가지만 ID-like라 color로 부적합.
    // treatment(unique=3)를 선택해야 함.
    const autoColorField = selectAutoColorField([
      quantitative('time'),
      quantitative('value'),
      { name: 'batch_id', type: 'nominal', uniqueCount: 3, sampleValues: [], hasNull: false },
      { name: 'treatment', type: 'nominal', uniqueCount: 3, sampleValues: [], hasNull: false },
    ], 'time', 'value');

    expect(autoColorField).toBe('treatment');
    expect(autoColorField).not.toBe('batch_id');
  });

  it('keeps category-named *_id columns (CATEGORY hint suppresses ID rejection)', () => {
    // treatment_id는 ID 접미사지만 CATEGORY 힌트가 있어 color로 허용됨.
    const autoColorField = selectAutoColorField([
      quantitative('time'),
      quantitative('value'),
      { name: 'treatment_id', type: 'nominal', uniqueCount: 3, sampleValues: [], hasNull: false },
    ], 'time', 'value');

    expect(autoColorField).toBe('treatment_id');
  });
});

describe('chart spec creation', () => {
  it('autoCreateChartSpec keeps sourceId', () => {
    const spec = autoCreateChartSpec('my-source', [{ group: 'A', value: 1 }]);
    expect(spec.data.sourceId).toBe('my-source');
  });

  it('createChartSpecFromDataPackage reuses package columns', () => {
    const pkg = makeDataPackage({
      id: 'pkg-scatter',
      columns: [
        { name: 'weight', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
        { name: 'height', type: 'quantitative', uniqueCount: 10, sampleValues: [], hasNull: false },
      ],
    });

    const spec = createChartSpecFromDataPackage(pkg);
    expect(spec.chartType).toBe('scatter');
    expect(spec.data.columns).toBe(pkg.columns);
  });
});

describe('sanitizeChartSpecForRenderer', () => {
  it('removes unsupported encoding fields before rendering', () => {
    const spec = {
      ...makeBaseSpec(),
      encoding: {
        ...makeBaseSpec().encoding,
        color: {
          field: 'group',
          type: 'nominal' as const,
          scale: { scheme: 'Set2' },
          legend: {
            orient: 'right' as const,
            title: 'Groups',
            titleFontSize: 16,
            customLabels: { A: 'Alpha' },
          },
        },
        shape: { field: 'group', type: 'nominal' as const },
        size: { field: 'value', type: 'quantitative' as const },
      },
    } as unknown as ChartSpec;

    const sanitized = sanitizeChartSpecForRenderer(spec);
    const legend = sanitized.encoding.color?.legend as Record<string, unknown> | undefined;

    expect(sanitized.encoding.color?.scale).toBeUndefined();
    expect(legend?.title).toBeUndefined();
    expect(legend?.titleFontSize).toBeUndefined();
    expect(sanitized.encoding.color?.legend?.orient).toBe('right');
    expect(sanitized.encoding.color?.legend?.customLabels).toEqual({ A: 'Alpha' });
    expect(sanitized.encoding.shape).toBeUndefined();
    expect(sanitized.encoding.size).toBeUndefined();
  });
});

describe('applyPatches', () => {
  it('replaces an existing top-level field', () => {
    const spec = { ...makeBaseSpec(), title: 'Old Title' };
    const patched = applyPatches(spec, [
      { op: 'replace', path: '/title', value: 'New Title' },
    ]);

    expect(patched.title).toBe('New Title');
  });

  it('adds an optional field when absent', () => {
    const patched = applyPatches(makeBaseSpec(), [
      { op: 'add', path: '/title', value: 'Added Title' },
    ]);

    expect(patched.title).toBe('Added Title');
  });

  it('removes an existing field', () => {
    const spec = { ...makeBaseSpec(), title: 'Delete Me' };
    const patched = applyPatches(spec, [
      { op: 'remove', path: '/title' },
    ]);

    expect(patched.title).toBeUndefined();
  });

  it('does not mutate the original spec', () => {
    const original = makeBaseSpec();
    applyPatches(original, [{ op: 'replace', path: '/chartType', value: 'line' }]);
    expect(original.chartType).toBe('bar');
  });

  it('replaces nested fields', () => {
    const spec = makeBaseSpec();
    spec.encoding.x.title = 'Old X';

    const patched = applyPatches(spec, [
      { op: 'replace', path: '/encoding/x/title', value: 'New X' },
    ]);

    expect(patched.encoding.x.title).toBe('New X');
  });

  it('throws for invalid object paths', () => {
    expect(() =>
      applyPatches(makeBaseSpec(), [
        { op: 'replace', path: '/encoding/z/title', value: 'Broken' },
      ]),
    ).toThrow('Invalid patch path');
  });

  it('throws when replacing an absent field', () => {
    expect(() =>
      applyPatches(makeBaseSpec(), [
        { op: 'replace', path: '/title', value: 'Missing Target' },
      ]),
    ).toThrow('Cannot replace missing path');
  });

  it('adds to an array at a concrete index', () => {
    const patched = applyPatches(makeBaseSpec(), [
      { op: 'add', path: '/annotations/0', value: { type: 'text', text: 'peak' } },
    ]);

    expect(patched.annotations).toHaveLength(1);
    expect(patched.annotations[0]?.text).toBe('peak');
  });

  it('appends to an array with the dash token', () => {
    const first = applyPatches(makeBaseSpec(), [
      { op: 'add', path: '/annotations/-', value: { type: 'text', text: 'A' } },
    ]);
    const second = applyPatches(first, [
      { op: 'add', path: '/annotations/-', value: { type: 'text', text: 'B' } },
    ]);

    expect(second.annotations).toHaveLength(2);
    expect(second.annotations[1]?.text).toBe('B');
  });

  it('removes array items', () => {
    const withAnnotation = applyPatches(makeBaseSpec(), [
      { op: 'add', path: '/annotations/-', value: { type: 'text', text: 'to-remove' } },
    ]);
    const patched = applyPatches(withAnnotation, [
      { op: 'remove', path: '/annotations/0' },
    ]);

    expect(patched.annotations).toHaveLength(0);
  });

  it('replaces array items', () => {
    const withAnnotation = applyPatches(makeBaseSpec(), [
      { op: 'add', path: '/annotations/-', value: { type: 'text', text: 'old' } },
    ]);
    const patched = applyPatches(withAnnotation, [
      { op: 'replace', path: '/annotations/0', value: { type: 'line' } },
    ]);

    expect(patched.annotations[0]?.type).toBe('line');
  });

  it('throws when replacing a missing array index', () => {
    expect(() =>
      applyPatches(makeBaseSpec(), [
        { op: 'replace', path: '/annotations/999', value: { type: 'text', text: 'x' } },
      ]),
    ).toThrow('Cannot replace missing path');
  });

  it('throws when replacing an escaped missing field', () => {
    expect(() =>
      applyPatches(makeBaseSpec(), [
        { op: 'replace', path: '/nonexistent~0field', value: 'x' },
      ]),
    ).toThrow('Cannot replace missing path');
  });
});

describe('applyAndValidatePatches', () => {
  it('returns the patched spec for valid patches', () => {
    const result = applyAndValidatePatches(
      { ...makeBaseSpec(), title: 'Old Title' },
      [{ op: 'replace', path: '/title', value: 'New Title' }],
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.title).toBe('New Title');
    }
  });

  it('fails schema validation for invalid chart types', () => {
    const result = applyAndValidatePatches(makeBaseSpec(), [
      { op: 'replace', path: '/chartType', value: 'invalid-type' },
    ]);

    expect(result.success).toBe(false);
  });

  it('fails when a patch path is invalid', () => {
    const result = applyAndValidatePatches(makeBaseSpec(), [
      { op: 'replace', path: '/encoding/z/title', value: 'Broken' },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid patch path');
    }
  });
});

describe('chartSpecSchema export format validation', () => {
  it('accepts svg exports', () => {
    const spec = {
      ...makeBaseSpec(),
      exportConfig: { ...makeBaseSpec().exportConfig, format: 'svg' },
    };

    expect(chartSpecSchema.safeParse(spec).success).toBe(true);
  });

  it('rejects pdf exports', () => {
    const spec = {
      ...makeBaseSpec(),
      exportConfig: { ...makeBaseSpec().exportConfig, format: 'pdf' },
    };

    expect(chartSpecSchema.safeParse(spec).success).toBe(false);
  });
});
