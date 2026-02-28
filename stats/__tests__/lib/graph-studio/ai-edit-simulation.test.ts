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
