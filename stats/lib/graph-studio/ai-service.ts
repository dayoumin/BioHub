/**
 * Graph Studio AI 서비스
 *
 * ChartSpec + 사용자 명령 → RFC 6902 JSON Patch (OpenRouter)
 *
 * Zero-Data Retention: 실제 데이터 행은 전송하지 않음.
 * ChartSpec에는 열 메타데이터(이름·타입·유니크값 수·샘플 카테고리)만 포함.
 */

import { openRouterRecommender } from '@/lib/services/openrouter-recommender';
import { aiEditResponseSchema } from './chart-spec-schema';
import type { AiEditRequest, AiEditResponse } from '@/types/graph-studio';

// ─── 에러 타입 ─────────────────────────────────────────────

export type AiServiceErrorCode =
  | 'NO_RESPONSE'
  | 'PARSE_FAILED'
  | 'VALIDATION_FAILED'
  | 'READONLY_PATH';

export class AiServiceError extends Error {
  constructor(
    message: string,
    public readonly code: AiServiceErrorCode,
  ) {
    super(message);
    this.name = 'AiServiceError';
  }
}

// ─── 시스템 프롬프트 ───────────────────────────────────────

const CHART_EDIT_SYSTEM_PROMPT = `You are a chart specification editor for a scientific data visualization platform.

You receive a ChartSpec JSON and a user's modification request (Korean or English).
Generate a minimal RFC 6902 JSON Patch that transforms the ChartSpec to fulfill the request.

## ChartSpec Schema Overview
- version: "1.0"
- chartType: bar|grouped-bar|stacked-bar|line|scatter|boxplot|histogram|error-bar|heatmap|violin
- title: string (optional)
- data.sourceId: string
- data.columns: array of {name, type, uniqueCount, hasNull}  (sample values shown in 컬럼 목록)
- encoding.x / encoding.y: {field, type, title, labelAngle, labelFontSize, titleFontSize, format, grid, scale, sort}
- encoding.color: {field, type, scale, legend} (optional)
- encoding.shape: {field, type} (optional)
- errorBar: {type: ci|stderr|stdev|iqr, value} (optional)
- aggregate: {y: mean|median|sum|count|min|max, groupBy: string[]} (optional)
- style: {preset: default|science|ieee|grayscale, font, colors, background, padding, overrides}
- annotations: array of {type: text|line|rect, ...}
- exportConfig: {format: svg|png, dpi, physicalWidth?: mm, physicalHeight?: mm} (physicalWidth/Height=출력 물리 크기(mm), 미지정=DOM 크기)

## Response Format (STRICT JSON ONLY)
Return ONLY this JSON object — no markdown, no prose outside the object:
{
  "patches": [
    {"op": "replace", "path": "/encoding/x/labelAngle", "value": -45}
  ],
  "explanation": "한국어 설명 (1-2 문장)",
  "confidence": 0.95
}

## Rules
1. Return ONLY the raw JSON object — no \`\`\`json code blocks, no text before/after
2. paths must be valid JSON Pointers (RFC 6901) for ChartSpec fields listed above
3. NEVER modify data.sourceId or data.columns (read-only)
4. Keep patches minimal — only changed fields
5. confidence: 0.0–1.0 (how certain the patches are correct)
6. explanation: Korean preferred, concise (1-2 sentences)
7. For unknown requests, return confidence < 0.5 and explain why
8. Field references must use actual column names from data.columns`;

// ─── 사용자 프롬프트 빌더 ──────────────────────────────────

const MAX_SPEC_JSON_LENGTH = 3000;

function buildUserPrompt(request: AiEditRequest): string {
  // Strip sampleValues from columns in the spec JSON to reduce token count.
  // sampleValues can be large for many-column datasets and trigger truncation.
  // Category examples are communicated separately in the column list below.
  const specForPrompt = {
    ...request.chartSpec,
    data: {
      ...request.chartSpec.data,
      columns: request.chartSpec.data.columns.map(c => ({
        name: c.name,
        type: c.type,
        uniqueCount: c.uniqueCount,
        hasNull: c.hasNull,
      })),
    },
  };
  const specJson = JSON.stringify(specForPrompt, null, 2);
  const specStr =
    specJson.length > MAX_SPEC_JSON_LENGTH
      ? specJson.slice(0, MAX_SPEC_JSON_LENGTH) + '\n  ... (truncated)'
      : specJson;

  // Include sampleValues in column list so AI knows category labels
  const colLines = request.chartSpec.data.columns
    .map(col => {
      const samples = col.sampleValues.length
        ? ` (e.g., ${col.sampleValues.slice(0, 3).join(', ')})`
        : '';
      return `  ${col.name}: ${col.type}${samples}`;
    })
    .join('\n');

  return `## 현재 ChartSpec
${specStr}

## 컬럼 목록
${colLines}

## 사용자 요청
${request.userMessage}`;
}

// ─── JSON 추출 헬퍼 ────────────────────────────────────────

/**
 * 코드 블록 제거 후 첫 번째 완전한 JSON 객체 추출.
 * AI가 규칙을 어기고 \`\`\`json ... \`\`\` 으로 감싼 경우에도 처리.
 */
function extractJson(raw: string): string {
  const trimmed = raw.trim();

  // 코드 블록 우선
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock?.[1]) return codeBlock[1].trim();

  // 중괄호 밸런싱으로 첫 번째 완전한 JSON 추출
  const start = trimmed.indexOf('{');
  if (start === -1) return trimmed;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return trimmed.slice(start, i + 1);
    }
  }

  return trimmed;
}

// ─── Readonly 경로 방어 ────────────────────────────────────

/**
 * AI가 수정할 수 없는 읽기 전용 ChartSpec 경로 프리픽스.
 * 프롬프트에 이미 명시했지만 코드 레벨에서도 강제.
 */
const READONLY_PATH_PREFIXES = ['/data', '/version'] as const;

function assertNonReadonlyPaths(patches: AiEditResponse['patches']): void {
  for (const patch of patches) {
    const isReadonly = READONLY_PATH_PREFIXES.some(
      prefix => patch.path === prefix || patch.path.startsWith(`${prefix}/`),
    );
    if (isReadonly) {
      throw new AiServiceError(
        `읽기 전용 경로 수정이 감지되었습니다: ${patch.path}. 데이터 소스와 버전은 AI가 변경할 수 없습니다.`,
        'READONLY_PATH',
      );
    }
  }
}

// ─── 공개 API ─────────────────────────────────────────────

/**
 * AI로 ChartSpec 편집 요청.
 *
 * @param request AiEditRequest (chartSpec + userMessage + 열 메타)
 * @returns AiEditResponse (patches + explanation + confidence)
 * @throws 네트워크 오류 | 파싱 실패 | 검증 실패 | readonly 경로 침범
 */
export async function editChart(request: AiEditRequest): Promise<AiEditResponse> {
  const userPrompt = buildUserPrompt(request);

  const rawText = await openRouterRecommender.generateRawText(
    CHART_EDIT_SYSTEM_PROMPT,
    userPrompt,
    { temperature: 0.1, maxTokens: 1500 },
  );

  if (!rawText) {
    throw new AiServiceError(
      'AI 응답이 없습니다. OpenRouter API 키 및 모델 설정을 확인하세요.',
      'NO_RESPONSE',
    );
  }

  const jsonStr = extractJson(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new AiServiceError(
      `AI 응답 JSON 파싱 실패.\n응답 미리보기: ${rawText.slice(0, 200)}`,
      'PARSE_FAILED',
    );
  }

  const result = aiEditResponseSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new AiServiceError(`AI 응답 검증 실패: ${issues}`, 'VALIDATION_FAILED');
  }

  // Readonly 경로 방어 (프롬프트 준수 여부와 무관하게 코드 레벨 강제)
  assertNonReadonlyPaths(result.data.patches);

  return result.data;
}

/**
 * AiEditRequest 생성 헬퍼.
 * AiEditTab에서 ChartSpec → request 변환 시 사용.
 */
export function buildAiEditRequest(
  chartSpec: import('@/types/graph-studio').ChartSpec,
  userMessage: string,
): AiEditRequest {
  const columnNames = chartSpec.data.columns.map(c => c.name);
  const dataTypes: AiEditRequest['dataTypes'] = Object.fromEntries(
    chartSpec.data.columns.map(c => [c.name, c.type]),
  );

  return { chartSpec, userMessage, columnNames, dataTypes };
}
