/**
 * Graph Studio AI 편집 시뮬레이션 테스트
 *
 * "다른 AI 리뷰" 목적: editChart + applyAndValidatePatches 연계 동작 검증.
 * OpenRouter만 모킹; 나머지(ai-service, chart-spec-utils, Zod 스키마)는 실제 코드 사용.
 *
 * 시나리오:
 *   S1. X축 라벨 45도 회전
 *   S2. IEEE 흑백 스타일 전환
 *   S3. 에러바 추가 (표준오차)
 *   S4. Y축 제목 변경
 *   S5. 차트 유형 변경 (bar → line)
 *   S6. 색상 인코딩 추가
 *   S7. 연속 2회 편집 — spec 상태 누적 검증
 *   S8. Readonly 경로 침범 → spec 불변 확인
 *   S9. 낮은 신뢰도(0.2) 응답 — patches는 정상 적용됨
 *   S10. patch 경로가 존재하지 않아 Zod 통과하지만 ChartSpec 무결성 검사 실패
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { editChart, buildAiEditRequest } from '@/lib/graph-studio/ai-service';
import { applyAndValidatePatches } from '@/lib/graph-studio/chart-spec-utils';
import type { ChartSpec } from '@/types/graph-studio';

// ─── OpenRouter 모킹 ──────────────────────────────────────

vi.mock('@/lib/services/openrouter-recommender', () => ({
  openRouterRecommender: {
    generateRawText: vi.fn(),
  },
}));

import { openRouterRecommender } from '@/lib/services/openrouter-recommender';

const mockRaw = vi.mocked(openRouterRecommender.generateRawText);

// ─── 픽스처 ───────────────────────────────────────────────

function baseSpec(): ChartSpec {
  return {
    version: '1.0',
    chartType: 'bar',
    title: '체중 분포',
    data: {
      sourceId: 'upload-001',
      columns: [
        { name: 'species', type: 'nominal', uniqueCount: 3, sampleValues: ['A', 'B', 'C'], hasNull: false },
        { name: 'weight', type: 'quantitative', uniqueCount: 50, sampleValues: ['10.2', '15.8'], hasNull: false },
        { name: 'date', type: 'temporal', uniqueCount: 12, sampleValues: ['2024-01'], hasNull: false },
      ],
    },
    encoding: {
      x: { field: 'species', type: 'nominal' },
      y: { field: 'weight', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'svg', dpi: 300 },
  };
}

/** 모킹 응답 JSON 생성 헬퍼 */
function mockResponse(
  patches: object[],
  explanation = '수정 완료',
  confidence = 0.9,
): string {
  return JSON.stringify({ patches, explanation, confidence });
}

// ─── 시뮬레이션 ──────────────────────────────────────────

describe('AI 편집 시뮬레이션', () => {
  beforeEach(() => { mockRaw.mockReset(); });

  // ── S1: X축 라벨 회전 ──

  it('S1. X축 라벨 45도 회전 → encoding.x.labelAngle = -45', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'replace', path: '/encoding/x/labelAngle', value: -45 },
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, 'X축 라벨 45도 회전해줘'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.encoding.x.labelAngle).toBe(-45);
      // 다른 필드 불변 확인
      expect(result.spec.encoding.x.field).toBe('species');
      expect(result.spec.style.preset).toBe('default');
    }
  });

  // ── S2: IEEE 스타일 전환 ──

  it('S2. IEEE 흑백 스타일 → style.preset = "ieee"', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'replace', path: '/style/preset', value: 'ieee' },
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, 'IEEE 흑백 스타일로 바꿔줘'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.style.preset).toBe('ieee');
    }
  });

  // ── S3: 에러바 추가 ──

  it('S3. 표준오차 에러바 추가 → errorBar 필드 추가', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/errorBar', value: { type: 'stderr' } },
    ]));

    const spec = baseSpec();
    expect(spec.errorBar).toBeUndefined();

    const response = await editChart(buildAiEditRequest(spec, '에러바 추가해줘 (표준오차)'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.errorBar).toEqual({ type: 'stderr' });
    }
  });

  // ── S4: Y축 제목 변경 ──

  it('S4. Y축 제목 → encoding.y.title = "Weight (kg)"', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'replace', path: '/encoding/y/title', value: 'Weight (kg)' },
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, 'Y축 제목을 "Weight (kg)"으로'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.encoding.y.title).toBe('Weight (kg)');
    }
  });

  // ── S5: 차트 유형 변경 ──

  it('S5. 차트 유형 bar → line', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'replace', path: '/chartType', value: 'line' },
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, '꺾은선 그래프로 바꿔줘'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.chartType).toBe('line');
    }
  });

  // ── S6: 색상 인코딩 추가 ──

  it('S6. 색상 인코딩 추가 → encoding.color 필드 생성', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      {
        op: 'add',
        path: '/encoding/color',
        value: { field: 'species', type: 'nominal' },
      },
    ]));

    const spec = baseSpec();
    expect(spec.encoding.color).toBeUndefined();

    const response = await editChart(buildAiEditRequest(spec, '종별로 색상 구분해줘'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.encoding.color?.field).toBe('species');
      expect(result.spec.encoding.color?.type).toBe('nominal');
    }
  });

  // ── S7: 연속 2회 편집 ──

  it('S7. 연속 2회 편집 — 누적 적용 검증', async () => {
    // 1차: Y축 제목 변경
    mockRaw.mockResolvedValueOnce(mockResponse([
      { op: 'replace', path: '/encoding/y/title', value: 'Mass (g)' },
    ]));
    // 2차: 스타일 변경
    mockRaw.mockResolvedValueOnce(mockResponse([
      { op: 'replace', path: '/style/preset', value: 'science' },
    ]));

    const spec1 = baseSpec();
    const r1 = await editChart(buildAiEditRequest(spec1, 'Y축 제목 변경'));
    const applied1 = applyAndValidatePatches(spec1, r1.patches);
    expect(applied1.success).toBe(true);

    // 2차 편집은 1차 결과에 적용
    if (applied1.success) {
      const r2 = await editChart(buildAiEditRequest(applied1.spec, '스타일 변경'));
      const applied2 = applyAndValidatePatches(applied1.spec, r2.patches);
      expect(applied2.success).toBe(true);

      if (applied2.success) {
        // 두 변경 모두 누적됨
        expect(applied2.spec.encoding.y.title).toBe('Mass (g)');
        expect(applied2.spec.style.preset).toBe('science');
        // 원본 spec은 불변
        expect(spec1.encoding.y.title).toBeUndefined();
        expect(spec1.style.preset).toBe('default');
      }
    }
  });

  // ── S8: Readonly 경로 → spec 불변 ──

  it('S8. /data/columns 수정 시도 → Error, 원본 spec 불변', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'replace', path: '/data/columns/0/name', value: 'evil' },
    ]));

    const spec = baseSpec();
    const originalSpecStr = JSON.stringify(spec);

    await expect(
      editChart(buildAiEditRequest(spec, 'msg')),
    ).rejects.toThrow('읽기 전용 경로');

    // spec 원본 불변 (deep equal)
    expect(JSON.stringify(spec)).toBe(originalSpecStr);
  });

  // ── S9: 낮은 신뢰도 응답 ──

  it('S9. 신뢰도 0.2 — patches는 정상 적용, confidence 필드 보존', async () => {
    mockRaw.mockResolvedValue(mockResponse(
      [{ op: 'replace', path: '/title', value: '불확실한 제목' }],
      '확실하지 않지만 시도해봤습니다.',
      0.2,
    ));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, '알 수 없는 요청'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    expect(response.confidence).toBeCloseTo(0.2);
    if (result.success) {
      expect(result.spec.title).toBe('불확실한 제목');
    }
  });

  // ── S10: 무효한 Zod enum 값 → 스키마 검증 실패 ──

  it('S10. chartType 무효 값 ("pie") → Zod 검증 실패', async () => {
    // Zod chartType enum에 'pie' 없음
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'replace', path: '/chartType', value: 'pie' },
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, '파이 차트로 바꿔줘'));
    // patches 자체는 통과 (ChartSpecPatch schema는 value를 z.unknown()으로 받음)
    const result = applyAndValidatePatches(spec, response.patches);

    // 적용 후 chartSpecSchema 검증에서 실패
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('chartType');
    }
  });

  // ── S11: 존재하지 않는 부모 경로 → zero-patch 감지 ──

  it('S11. 부모 경로 없는 patch → applyAndValidatePatches 성공하지만 spec 불변 (zero-patch)', async () => {
    // /encoding/z 는 ChartSpec에 없음 → getNode 실패 → patch 무시 → Zod는 통과
    // AiEditTab에서 JSON.stringify 비교로 zero-patch 감지 후 경고 메시지를 표시해야 함
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/encoding/z/field', value: 'nonExistent' },
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, '없는 필드 추가'));
    const result = applyAndValidatePatches(spec, response.patches);

    // applyAndValidatePatches 자체는 성공 (Zod 통과)
    expect(result.success).toBe(true);
    if (result.success) {
      // spec이 원본과 동일 → zero-patch 트리거 조건
      expect(JSON.stringify(result.spec)).toBe(JSON.stringify(spec));
    }
  });
});

// ─── 프롬프트 정확성 시뮬레이션 (S12–S22) ────────────────
// 이번 리뷰에서 발견된 누락·불일치 항목이 올바르게 동작하는지 검증

describe('프롬프트 정확성 시뮬레이션', () => {
  beforeEach(() => { mockRaw.mockReset(); });

  // ── S12: Y축 로그 스케일 (scale 하위 구조 검증) ──

  it('S12. Y축 로그 스케일 → /encoding/y/scale/type = "log"', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/encoding/y/scale', value: { type: 'log' } },
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, 'Y축 로그 스케일로 바꿔줘'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.encoding.y.scale?.type).toBe('log');
    }
  });

  // ── S13: 범례 위치 변경 (legend 하위 구조 검증) ──

  it('S13. 범례 오른쪽 상단 → /encoding/color/legend/orient = "top-right"', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/encoding/color', value: {
        field: 'species', type: 'nominal',
        legend: { orient: 'top-right' },
      }},
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, '범례를 오른쪽 상단으로'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.encoding.color?.legend?.orient).toBe('top-right');
    }
  });

  // ── S14: 범례 폰트 크기 (legend.fontSize 렌더링 검증) ──

  it('S14. 범례 폰트 크기 변경 → legend.fontSize', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/encoding/color', value: {
        field: 'species', type: 'nominal',
        legend: { orient: 'right', fontSize: 14 },
      }},
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, '범례 폰트 키워줘'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.encoding.color?.legend?.fontSize).toBe(14);
    }
  });

  it('S14b. 범례 titleFontSize 변경 → UNRENDERED_PATH 에러', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/encoding/color', value: {
        field: 'species', type: 'nominal',
        legend: { titleFontSize: 16 },
      }},
    ]));

    const spec = baseSpec();
    await expect(
      editChart(buildAiEditRequest(spec, '범례 제목 폰트 키워줘')),
    ).rejects.toMatchObject({ code: 'UNRENDERED_PATH' });
  });

  // ── S15: 수평 막대 (orientation 검증) ──

  it('S15. 수평 막대 → orientation = "horizontal"', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/orientation', value: 'horizontal' },
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, '수평 막대 그래프로 바꿔줘'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.orientation).toBe('horizontal');
    }
  });

  // ── S16: 트렌드라인 추가 (trendline 검증) ──

  it('S16. 회귀선 추가 → trendline = {type: "linear", showEquation: true}', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'replace', path: '/chartType', value: 'scatter' },
      { op: 'add', path: '/trendline', value: { type: 'linear', showEquation: true } },
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, '산점도에 회귀선 추가'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.trendline?.type).toBe('linear');
      expect(result.spec.trendline?.showEquation).toBe(true);
    }
  });

  // ── S17: 패싯 추가 (facet 검증) ──

  it('S17. 패싯 분할 → facet = {field: "species", ncol: 3}', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/facet', value: { field: 'species', ncol: 3, shareAxis: true } },
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, '종별로 패싯 분할해줘'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.facet?.field).toBe('species');
      expect(result.spec.facet?.ncol).toBe(3);
      expect(result.spec.facet?.shareAxis).toBe(true);
    }
  });

  // ── S18: Y2 보조축 (y2 축소 필드만 허용 검증) ──

  it('S18. 보조 Y축 추가 → encoding.y2 = {field, type: "quantitative", title}', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/encoding/y2', value: {
        field: 'weight', type: 'quantitative', title: '보조축',
      }},
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, '보조 Y축 추가'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.encoding.y2?.field).toBe('weight');
      expect(result.spec.encoding.y2?.type).toBe('quantitative');
      expect(result.spec.encoding.y2?.title).toBe('보조축');
    }
  });

  // ── S19: Y2에 labelAngle 넣으면 Zod strict()에서 거부 ──

  it('S19. y2에 labelAngle 포함 → Zod strict 검증 실패', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/encoding/y2', value: {
        field: 'weight', type: 'quantitative', labelAngle: -45,
      }},
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, '보조축 라벨 회전'));
    const result = applyAndValidatePatches(spec, response.patches);

    // Zod strict()가 labelAngle 거부
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('y2');
    }
  });

  // ── S20: style.scheme 색상 팔레트 ──

  it('S20. 색상 팔레트 viridis 적용 → style.scheme = "viridis"', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/style/scheme', value: 'viridis' },
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, 'viridis 색상 팔레트로'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.style.scheme).toBe('viridis');
    }
  });

  // ── S21: font 하위 구조 (family + size) ──

  it('S21. 폰트 변경 → style.font = {family: "Times New Roman", size: 14}', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/style/font', value: {
        family: 'Times New Roman', size: 14, titleSize: 18, labelSize: 12,
      }},
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, '폰트를 Times New Roman 14pt로'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.style.font?.family).toBe('Times New Roman');
      expect(result.spec.style.font?.size).toBe(14);
      expect(result.spec.style.font?.titleSize).toBe(18);
      expect(result.spec.style.font?.labelSize).toBe(12);
    }
  });

  // ── S22: annotation 전체 필드 ──

  it('S22. 텍스트 주석 추가 → annotations 배열에 추가', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'replace', path: '/annotations', value: [
        { type: 'text', text: 'p < 0.05', x: 1, y: 50, color: '#ff0000', fontSize: 14 },
      ]},
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, 'p값 주석 추가'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.annotations).toHaveLength(1);
      expect(result.spec.annotations[0]).toMatchObject({
        type: 'text',
        text: 'p < 0.05',
        x: 1,
        y: 50,
        color: '#ff0000',
        fontSize: 14,
      });
    }
  });

  // ── S23: km-curve 차트 유형 (새로 추가된 enum 검증) ──

  it('S23. km-curve 차트 유형 → Zod 통과', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'replace', path: '/chartType', value: 'km-curve' },
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, 'KM 곡선으로'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.chartType).toBe('km-curve');
    }
  });

  // ── S24: significance patch → 정상 통과 (ChartPreview에서 렌더링 구현됨) ──

  it('S24. significance 패치 → 정상 적용 (ChartPreview 오버레이 렌더)', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/significance', value: [
        { groupA: 'A', groupB: 'B', pValue: 0.03 },
      ]},
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, '유의성 브래킷 추가'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.significance).toHaveLength(1);
      expect(result.spec.significance?.[0]).toMatchObject({
        groupA: 'A', groupB: 'B', pValue: 0.03,
      });
    }
  });

  it('S24b. significance 복수 브래킷 추가', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/significance', value: [
        { groupA: 'A', groupB: 'B', pValue: 0.03 },
        { groupA: 'B', groupB: 'C', label: 'ns' },
      ]},
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, 'A-B, B-C 유의성 표시'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.significance).toHaveLength(2);
      expect(result.spec.significance?.[1].label).toBe('ns');
    }
  });

  // ── S25: encoding.size patch → UNRENDERED_PATH 코드 방어로 거부 ──

  it('S25. encoding.size 패치 → UNRENDERED_PATH 에러 (렌더러 미구현 방어)', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/encoding/size', value: { field: 'weight', type: 'quantitative' } },
    ]));

    const spec = baseSpec();
    await expect(
      editChart(buildAiEditRequest(spec, '버블 크기 인코딩 추가')),
    ).rejects.toThrow('렌더링이 구현되지 않은');
  });

  it('S25b. encoding.size 하위 경로도 거부', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'replace', path: '/encoding/size/field', value: 'newField' },
    ]));

    const spec = baseSpec();
    await expect(
      editChart(buildAiEditRequest(spec, '크기 필드 변경')),
    ).rejects.toMatchObject({ code: 'UNRENDERED_PATH' });
  });

  // ── S25c: encoding.shape patch → UNRENDERED_PATH 방어 ──

  it('S25c. encoding.shape 패치 → UNRENDERED_PATH 에러 (렌더러 미구현 방어)', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/encoding/shape', value: { field: 'species', type: 'nominal' } },
    ]));

    const spec = baseSpec();
    await expect(
      editChart(buildAiEditRequest(spec, '모양 인코딩 추가')),
    ).rejects.toThrow('렌더링이 구현되지 않은');
  });

  it('S25d. encoding.shape 하위 경로도 거부', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'replace', path: '/encoding/shape/field', value: 'group' },
    ]));

    const spec = baseSpec();
    await expect(
      editChart(buildAiEditRequest(spec, '모양 필드 변경')),
    ).rejects.toMatchObject({ code: 'UNRENDERED_PATH' });
  });

  // ── S26: color.scale.scheme 변경 → UNRENDERED_PATH 방어 ──

  it('S26. color.scale.scheme 변경 → UNRENDERED_PATH 에러', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/encoding/color', value: {
        field: 'species', type: 'nominal',
        scale: { scheme: 'Set2' },
      }},
    ]));

    const spec = baseSpec();
    await expect(
      editChart(buildAiEditRequest(spec, 'Set2 색상 팔레트로')),
    ).rejects.toMatchObject({ code: 'UNRENDERED_PATH' });
  });

  it('S26b. 범례 title 변경 → UNRENDERED_PATH 에러', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/encoding/color', value: {
        field: 'species', type: 'nominal',
        legend: { title: '종 구분' },
      }},
    ]));

    const spec = baseSpec();
    await expect(
      editChart(buildAiEditRequest(spec, '범례 제목 추가')),
    ).rejects.toMatchObject({ code: 'UNRENDERED_PATH' });
  });

  // ── S27: customLabels 범례 라벨 직접 편집 ──

  it('S27. 범례 라벨 커스텀 → legend.customLabels', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/encoding/color', value: {
        field: 'species', type: 'nominal',
        legend: { customLabels: { 'A': '종 A', 'B': '종 B', 'C': '종 C' } },
      }},
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, '범례 라벨을 한글로'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.encoding.color?.legend?.customLabels).toEqual({
        'A': '종 A', 'B': '종 B', 'C': '종 C',
      });
    }
  });

  // ── S28: 잘못된 orientation 값 → Zod 거부 ──

  it('S28. orientation = "vertical" (무효) → Zod 검증 실패', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/orientation', value: 'vertical' },
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, '세로 막대로'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('orientation');
    }
  });

  // ── S29: exportConfig 투명 배경 ──

  it('S29. 투명 배경 PNG → exportConfig.transparentBackground = true', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'replace', path: '/exportConfig/format', value: 'png' },
      { op: 'add', path: '/exportConfig/transparentBackground', value: true },
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, '투명 배경 PNG로 내보내기'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.exportConfig.format).toBe('png');
      expect(result.spec.exportConfig.transparentBackground).toBe(true);
    }
  });

  // ── S30: showDataLabels + showSampleCounts ──

  it('S30. 데이터 라벨 + 표본 수 표시 → style.showDataLabels + showSampleCounts', async () => {
    mockRaw.mockResolvedValue(mockResponse([
      { op: 'add', path: '/style/showDataLabels', value: true },
      { op: 'add', path: '/style/showSampleCounts', value: true },
    ]));

    const spec = baseSpec();
    const response = await editChart(buildAiEditRequest(spec, '막대 위에 값 표시하고 표본 수도 보여줘'));
    const result = applyAndValidatePatches(spec, response.patches);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.style.showDataLabels).toBe(true);
      expect(result.spec.style.showSampleCounts).toBe(true);
    }
  });
});

// ─── buildAiEditRequest 엣지 케이스 ──────────────────────

describe('buildAiEditRequest 엣지 케이스', () => {
  it('컬럼 없는 ChartSpec — columnNames 빈 배열, dataTypes 빈 객체', () => {
    const spec = baseSpec();
    spec.data.columns = [];
    const req = buildAiEditRequest(spec, 'msg');
    expect(req.columnNames).toEqual([]);
    expect(req.dataTypes).toEqual({});
  });

  it('다양한 DataType 혼합 — 모든 타입 올바르게 변환', () => {
    const spec = baseSpec(); // nominal, quantitative, temporal 포함
    const req = buildAiEditRequest(spec, 'msg');
    expect(req.dataTypes['species']).toBe('nominal');
    expect(req.dataTypes['weight']).toBe('quantitative');
    expect(req.dataTypes['date']).toBe('temporal');
  });
});
