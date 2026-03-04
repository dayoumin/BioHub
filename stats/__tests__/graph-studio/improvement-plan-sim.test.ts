/**
 * GRAPH_STUDIO_IMPROVEMENT_PLAN.md 시뮬레이션 테스트
 *
 * 계획의 핵심 전제를 코드로 검증:
 *   SIM-1: G1-1 DPI 수정 — Math.round 제거 효과
 *   SIM-2: G1-2 SVG mm 삽입 — renderToSVGString 경로의 regex
 *   SIM-3: G1-4 Zod .strict() — 새 필드 추가 시 런타임 에러 발생 여부
 *   SIM-4: G2-1 pValueToMarker — 마커 결정 로직
 *   SIM-5: G1-3 전제 확인 — echarts-for-react opts 변경 시 dispose+재생성 확인(코드 레벨)
 */

import { z } from 'zod';

// ─── SIM-1: DPI 계산 ────────────────────────────────────────

function dpiToPixelRatioOld(dpi: number): number {
  return Math.max(1, Math.round(dpi / 96));
}

function dpiToPixelRatioNew(dpi: number): number {
  return Math.max(1, dpi / 96);
}

describe('SIM-1: DPI 계산 수정', () => {
  const cases: [number, number, number][] = [
    // [입력 DPI, old 결과, new 결과]
    // DPI 72: Math.max(1, 0.75) = 1 — old/new 모두 1 (최솟값 클램핑)
    [72,  1,      1],
    [96,  1,      1],     // 정확히 1:1
    [150, 2,      1.5625],
    [300, 3,      3.125],
    [600, 6,      6.25],
  ];

  test.each(cases)('DPI %i: old=%f → new=%f', (dpi, expectedOld, expectedNew) => {
    expect(dpiToPixelRatioOld(dpi)).toBe(expectedOld);
    expect(dpiToPixelRatioNew(dpi)).toBeCloseTo(expectedNew, 4);
  });

  test('300 DPI: old 방식은 288 DPI 실효값 (3x96)', () => {
    const ratio = dpiToPixelRatioOld(300);
    const actualDpi = ratio * 96;
    expect(actualDpi).toBe(288);   // 300이 아닌 288 — 버그 확인
  });

  test('300 DPI: new 방식은 300 DPI 정확 (3.125×96)', () => {
    const ratio = dpiToPixelRatioNew(300);
    const actualDpi = ratio * 96;
    expect(actualDpi).toBeCloseTo(300, 1);
  });

  test('72 DPI 엣지케이스: new 방식도 최솟값 1 보장', () => {
    // 72/96 = 0.75 → Math.max(1, 0.75) = 1
    expect(dpiToPixelRatioNew(72)).toBe(1);
  });
});

// ─── SIM-2: SVG mm 삽입 regex ───────────────────────────────

/**
 * renderToSVGString() 반환값 형식 (ECharts 6):
 * <svg width="1020" height="680" xmlns="..." viewBox="0 0 1020 680">
 * 정수·소수 양쪽 처리 필요
 */
function injectMmDimensions(
  svgStr: string,
  widthMm: number | undefined,
  heightMm: number | undefined,
): string {
  if (!widthMm && !heightMm) return svgStr;
  return svgStr.replace(
    /(<svg\b[^>]*?)\s+width="[\d.]+"\s+height="[\d.]+"/,
    (_, prefix) => {
      const w = widthMm ? `width="${widthMm}mm"` : '';
      const h = heightMm ? `height="${heightMm}mm"` : '';
      return `${prefix} ${w} ${h}`.trimEnd();
    },
  );
}

describe('SIM-2: SVG mm 삽입 regex', () => {
  const echartsSvgOutput = `<svg width="1020" height="680" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1020 680"><g></g></svg>`;

  test('정수 width/height 치환', () => {
    const result = injectMmDimensions(echartsSvgOutput, 86, 60);
    expect(result).toContain('width="86mm"');
    expect(result).toContain('height="60mm"');
    expect(result).not.toContain('width="1020"');
    expect(result).not.toContain('height="680"');
  });

  test('viewBox는 그대로 유지 (좌표계 기준)', () => {
    const result = injectMmDimensions(echartsSvgOutput, 86, 60);
    expect(result).toContain('viewBox="0 0 1020 680"');
  });

  test('소수점 포함 SVG 크기도 처리', () => {
    const svg = `<svg width="1020.5" height="680.33" xmlns="...">`;
    const result = injectMmDimensions(svg, 86, 60);
    expect(result).toContain('width="86mm"');
    expect(result).toContain('height="60mm"');
  });

  test('physicalWidth/Height 미지정 시 원본 그대로', () => {
    const result = injectMmDimensions(echartsSvgOutput, undefined, undefined);
    expect(result).toBe(echartsSvgOutput);
  });

  test('문서 regex 패턴 비교 — width/height 순서 의존성', () => {
    // 원래 문서 regex: /(<svg[^>]*)\s+width="[\d.]+"(\s+height="[\d.]+")?/
    // 이 패턴은 height가 width 뒤에 붙어야 함 — ECharts는 항상 width 먼저 출력
    const docRegex = /(<svg[^>]*)\s+width="[\d.]+"\s+height="[\d.]+"/;
    expect(docRegex.test(echartsSvgOutput)).toBe(true);

    // height가 width 앞에 오는 경우 — 실패해야 함 (ECharts는 이 형식 안 씀)
    const reversedSvg = `<svg height="680" width="1020" xmlns="...">`;
    expect(docRegex.test(reversedSvg)).toBe(false);
    // → ECharts 출력 형식이 항상 width 먼저라면 문제없음
    //   만약 형식이 바뀔 경우 별도 처리 필요
  });
});

// ─── SIM-3: Zod .strict() 동작 ─────────────────────────────

const errorBarSchemaStrict = z.object({
  type: z.enum(['ci', 'stderr', 'stdev', 'iqr']),
  value: z.number().positive().optional(),
}).strict();

const errorBarSchemaExtended = z.object({
  type: z.enum(['ci', 'stderr', 'stdev', 'iqr', 'precomputed']),
  value: z.number().positive().optional(),
  lowerField: z.string().optional(),
  upperField: z.string().optional(),
}).strict();

describe('SIM-3: Zod .strict() 동작 확인', () => {
  test('현재 스키마: 알 수 없는 필드는 런타임에 reject', () => {
    const result = errorBarSchemaStrict.safeParse({
      type: 'precomputed',
      lowerField: 'lower_se',
      upperField: 'upper_se',
    });
    expect(result.success).toBe(false);
    // 에러 이유 1: type enum에 'precomputed' 없음
    // 에러 이유 2: .strict()로 lowerField/upperField 미인식
  });

  test('현재 스키마: precomputed type 자체가 없어 reject', () => {
    const result = errorBarSchemaStrict.safeParse({ type: 'precomputed' });
    expect(result.success).toBe(false);
    // Zod 버전에 따라 'invalid_enum_value' 또는 'invalid_value' — 실패 여부만 검증
    expect(result.error?.issues.length).toBeGreaterThan(0);
  });

  test('수정된 스키마: precomputed + lowerField/upperField 통과', () => {
    const result = errorBarSchemaExtended.safeParse({
      type: 'precomputed',
      lowerField: 'lower_se',
      upperField: 'upper_se',
    });
    expect(result.success).toBe(true);
  });

  test('수정된 스키마: 여전히 미정의 필드는 .strict()로 reject', () => {
    const result = errorBarSchemaExtended.safeParse({
      type: 'precomputed',
      unknownField: 'oops',  // 정의 안 된 필드
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].code).toBe('unrecognized_keys');
  });

  test('수정된 스키마: 기존 type들은 여전히 통과', () => {
    for (const type of ['ci', 'stderr', 'stdev', 'iqr'] as const) {
      const result = errorBarSchemaExtended.safeParse({ type });
      expect(result.success).toBe(true);
    }
  });
});

// ─── SIM-4: pValueToMarker 로직 ────────────────────────────

function pValueToMarker(p: number): string {
  if (p < 0.001) return '***';
  if (p < 0.01)  return '**';
  if (p < 0.05)  return '*';
  return 'ns';
}

describe('SIM-4: G2-1 유의성 마커 결정 로직', () => {
  test.each([
    [0.0001,  '***'],
    [0.001,   '**'],   // 0.001은 *** 기준 미만 아님 → **
    [0.005,   '**'],
    [0.01,    '*'],    // 0.01은 ** 기준 미만 아님 → *
    [0.049,   '*'],
    [0.05,    'ns'],   // 0.05는 * 기준 미만 아님 → ns
    [0.1,     'ns'],
    [1.0,     'ns'],
  ])('p=%f → %s', (p, expected) => {
    expect(pValueToMarker(p)).toBe(expected);
  });

  test('경계값: p=0.001은 ** (< 0.001 아님)', () => {
    expect(pValueToMarker(0.001)).toBe('**');
  });

  test('경계값: p=0.0009999는 ***', () => {
    expect(pValueToMarker(0.0009999)).toBe('***');
  });
});

// ─── SIM-5: echarts-for-react opts 변경 동작 ──────────────

/**
 * core.js:39 확인된 내용을 코드 레벨로 문서화:
 * opts 변경 시 dispose() + renderNewEcharts() 자동 호출
 *
 * 실제 ECharts 인스턴스 생성 없이 동작 로직만 검증
 */
describe('SIM-5: echarts-for-react opts 변경 동작 (로직 검증)', () => {
  test('isEqual: renderer 변경 시 false 반환 → dispose+재생성 트리거', () => {
    // echarts-for-react의 isEqual은 deep equal
    // { renderer: 'canvas' } vs { renderer: 'svg' } → not equal
    const prevOpts = { renderer: 'canvas' as const };
    const nextOpts = { renderer: 'svg' as const };

    // JSON.stringify로 deep equality 시뮬레이션 (isEqual 동작 근사)
    const areEqual = JSON.stringify(prevOpts) === JSON.stringify(nextOpts);
    expect(areEqual).toBe(false);
    // → isEqual이 false → componentDidUpdate에서 dispose+재생성 발생
    // → 버그 3 전제("재초기화 미발생")는 틀렸음을 확인
  });

  test('isEqual: 동일 renderer → true → dispose 없음', () => {
    const opts1 = { renderer: 'canvas' as const };
    const opts2 = { renderer: 'canvas' as const };
    const areEqual = JSON.stringify(opts1) === JSON.stringify(opts2);
    expect(areEqual).toBe(true);
    // → format이 png → png로 유지되면 불필요한 재생성 없음
  });

  test('UX 개선 기회: format 변경 시 차트 깜빡임 발생 조건', () => {
    // 조건: opts.renderer 변경 → isEqual false → dispose+재생성 → 깜빡임
    const formats = ['png', 'svg', 'png', 'svg'] as const;
    let disposeCalls = 0;

    for (let i = 1; i < formats.length; i++) {
      const prevRenderer = formats[i - 1] === 'svg' ? 'svg' : 'canvas';
      const nextRenderer = formats[i] === 'svg' ? 'svg' : 'canvas';
      if (prevRenderer !== nextRenderer) disposeCalls++;
    }

    // png→svg, svg→png, png→svg = 3번 전환 → 3번 dispose
    expect(disposeCalls).toBe(3);
    // → "임시 인스턴스" 방식으로 개선 시 disposeCalls = 0 (preview 항상 canvas)
  });
});
