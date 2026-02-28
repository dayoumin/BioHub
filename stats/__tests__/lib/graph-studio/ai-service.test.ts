/**
 * ai-service 테스트
 *
 * - buildAiEditRequest: ChartSpec → AiEditRequest 변환
 * - editChart: OpenRouter 모킹 → 응답 파싱 + 검증 + 에러 처리
 *   - 정상 응답 (raw JSON)
 *   - 코드 블록 래핑 응답
 *   - null 응답 → Error
 *   - JSON 파싱 실패 → Error
 *   - Zod 검증 실패 → Error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildAiEditRequest, editChart } from '@/lib/graph-studio/ai-service';
import type { ChartSpec } from '@/types/graph-studio';

// ─── openRouterRecommender 모킹 ───────────────────────────────

vi.mock('@/lib/services/openrouter-recommender', () => ({
  openRouterRecommender: {
    generateRawText: vi.fn(),
  },
}));

import { openRouterRecommender } from '@/lib/services/openrouter-recommender';

const mockGenerateRawText = vi.mocked(openRouterRecommender.generateRawText);

// ─── 테스트 픽스처 ─────────────────────────────────────────────

function makeChartSpec(overrides: Partial<ChartSpec> = {}): ChartSpec {
  return {
    version: '1.0',
    chartType: 'bar',
    data: {
      sourceId: 'src-1',
      columns: [
        { name: 'species', type: 'nominal', uniqueCount: 3, sampleValues: ['A', 'B', 'C'], hasNull: false },
        { name: 'weight', type: 'quantitative', uniqueCount: 50, sampleValues: ['10', '20'], hasNull: false },
      ],
    },
    encoding: {
      x: { field: 'species', type: 'nominal' },
      y: { field: 'weight', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'svg', dpi: 300 },
    ...overrides,
  };
}

const VALID_AI_RESPONSE = JSON.stringify({
  patches: [
    { op: 'replace', path: '/encoding/x/labelAngle', value: -45 },
  ],
  explanation: 'X축 라벨을 45도 회전했습니다.',
  confidence: 0.95,
});

// ─── buildAiEditRequest ───────────────────────────────────────

describe('buildAiEditRequest', () => {
  it('columnNames를 ChartSpec 컬럼에서 추출', () => {
    const spec = makeChartSpec();
    const req = buildAiEditRequest(spec, '테스트 메시지');
    expect(req.columnNames).toEqual(['species', 'weight']);
  });

  it('dataTypes를 name→type 맵으로 변환', () => {
    const spec = makeChartSpec();
    const req = buildAiEditRequest(spec, '테스트 메시지');
    expect(req.dataTypes).toEqual({
      species: 'nominal',
      weight: 'quantitative',
    });
  });

  it('userMessage를 그대로 전달', () => {
    const spec = makeChartSpec();
    const msg = 'Y축 로그 스케일로 바꿔줘';
    const req = buildAiEditRequest(spec, msg);
    expect(req.userMessage).toBe(msg);
  });

  it('chartSpec을 그대로 전달', () => {
    const spec = makeChartSpec();
    const req = buildAiEditRequest(spec, 'msg');
    expect(req.chartSpec).toBe(spec);
  });
});

// ─── editChart ────────────────────────────────────────────────

describe('editChart', () => {
  beforeEach(() => {
    mockGenerateRawText.mockReset();
  });

  it('정상 응답(raw JSON) → AiEditResponse 반환', async () => {
    mockGenerateRawText.mockResolvedValue(VALID_AI_RESPONSE);

    const spec = makeChartSpec();
    const req = buildAiEditRequest(spec, 'X축 라벨 45도');
    const result = await editChart(req);

    expect(result.patches).toHaveLength(1);
    expect(result.patches[0]).toMatchObject({
      op: 'replace',
      path: '/encoding/x/labelAngle',
      value: -45,
    });
    expect(result.explanation).toBe('X축 라벨을 45도 회전했습니다.');
    expect(result.confidence).toBeCloseTo(0.95);
  });

  it('코드 블록으로 감싼 응답도 파싱 성공', async () => {
    const wrapped = `\`\`\`json\n${VALID_AI_RESPONSE}\n\`\`\``;
    mockGenerateRawText.mockResolvedValue(wrapped);

    const req = buildAiEditRequest(makeChartSpec(), 'msg');
    const result = await editChart(req);

    expect(result.patches).toHaveLength(1);
  });

  it('generateRawText가 null 반환 → Error throw', async () => {
    mockGenerateRawText.mockResolvedValue(null);

    const req = buildAiEditRequest(makeChartSpec(), 'msg');
    await expect(editChart(req)).rejects.toThrow('AI 응답이 없습니다');
  });

  it('JSON 파싱 불가 텍스트(중괄호 없음) → Error throw', async () => {
    mockGenerateRawText.mockResolvedValue('죄송합니다, 요청을 처리할 수 없습니다.');

    const req = buildAiEditRequest(makeChartSpec(), 'msg');
    await expect(editChart(req)).rejects.toThrow('JSON 파싱 실패');
  });

  it('patches 필드 누락(스키마 불통과) → Error throw', async () => {
    const invalid = JSON.stringify({ explanation: '설명만 있음', confidence: 0.5 });
    mockGenerateRawText.mockResolvedValue(invalid);

    const req = buildAiEditRequest(makeChartSpec(), 'msg');
    await expect(editChart(req)).rejects.toThrow('검증 실패');
  });

  it('confidence 범위 초과(>1) → Error throw', async () => {
    const invalid = JSON.stringify({
      patches: [{ op: 'replace', path: '/title', value: 'test' }],
      explanation: '설명',
      confidence: 1.5,
    });
    mockGenerateRawText.mockResolvedValue(invalid);

    const req = buildAiEditRequest(makeChartSpec(), 'msg');
    await expect(editChart(req)).rejects.toThrow('검증 실패');
  });

  it('patches 빈 배열(min(1) 위반) → Error throw', async () => {
    const invalid = JSON.stringify({
      patches: [],
      explanation: '아무것도 안 함',
      confidence: 0.5,
    });
    mockGenerateRawText.mockResolvedValue(invalid);

    const req = buildAiEditRequest(makeChartSpec(), 'msg');
    await expect(editChart(req)).rejects.toThrow('검증 실패');
  });

  it('generateRawText에 올바른 옵션 전달 (temperature=0.1, maxTokens=1500)', async () => {
    mockGenerateRawText.mockResolvedValue(VALID_AI_RESPONSE);

    const req = buildAiEditRequest(makeChartSpec(), 'msg');
    await editChart(req);

    expect(mockGenerateRawText).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      { temperature: 0.1, maxTokens: 1500 },
    );
  });

  it('/data 경로 수정 시도 → Error throw (readonly 방어)', async () => {
    const readonlyPatch = JSON.stringify({
      patches: [
        { op: 'replace', path: '/data/sourceId', value: 'hacked' },
      ],
      explanation: '데이터 소스 변경',
      confidence: 0.9,
    });
    mockGenerateRawText.mockResolvedValue(readonlyPatch);

    const req = buildAiEditRequest(makeChartSpec(), 'msg');
    await expect(editChart(req)).rejects.toThrow('읽기 전용 경로');
  });

  it('/data/columns 하위 경로 수정 시도 → Error throw', async () => {
    const readonlyPatch = JSON.stringify({
      patches: [
        { op: 'replace', path: '/data/columns/0/name', value: 'evil' },
      ],
      explanation: '컬럼명 변경',
      confidence: 0.9,
    });
    mockGenerateRawText.mockResolvedValue(readonlyPatch);

    const req = buildAiEditRequest(makeChartSpec(), 'msg');
    await expect(editChart(req)).rejects.toThrow('읽기 전용 경로');
  });

  it('/version 수정 시도 → Error throw', async () => {
    const readonlyPatch = JSON.stringify({
      patches: [
        { op: 'replace', path: '/version', value: '2.0' },
      ],
      explanation: '버전 변경',
      confidence: 0.9,
    });
    mockGenerateRawText.mockResolvedValue(readonlyPatch);

    const req = buildAiEditRequest(makeChartSpec(), 'msg');
    await expect(editChart(req)).rejects.toThrow('읽기 전용 경로');
  });

  it('/encoding 경로 수정은 정상 허용 (readonly 아님)', async () => {
    const validPatch = JSON.stringify({
      patches: [
        { op: 'replace', path: '/encoding/x/labelAngle', value: -90 },
      ],
      explanation: '축 수정',
      confidence: 0.9,
    });
    mockGenerateRawText.mockResolvedValue(validPatch);

    const req = buildAiEditRequest(makeChartSpec(), 'msg');
    const result = await editChart(req);
    expect(result.patches[0].path).toBe('/encoding/x/labelAngle');
  });

  it('여러 patches 정상 처리', async () => {
    const multiPatch = JSON.stringify({
      patches: [
        { op: 'replace', path: '/style/preset', value: 'ieee' },
        { op: 'replace', path: '/encoding/x/labelAngle', value: -90 },
        { op: 'add', path: '/title', value: 'Updated Chart' },
      ],
      explanation: '스타일과 축을 수정했습니다.',
      confidence: 0.88,
    });
    mockGenerateRawText.mockResolvedValue(multiPatch);

    const req = buildAiEditRequest(makeChartSpec(), 'IEEE 스타일, X축 90도, 제목 추가');
    const result = await editChart(req);

    expect(result.patches).toHaveLength(3);
    expect(result.confidence).toBeCloseTo(0.88);
  });
});
