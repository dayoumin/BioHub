/**
 * Graph Studio AI 서비스
 *
 * ChartSpec + 사용자 명령 → RFC 6902 JSON Patch (OpenRouter)
 *
 * Zero-Data Retention: 실제 데이터 행은 전송하지 않음.
 * ChartSpec에는 열 메타데이터(이름·타입·유니크값 수·샘플 카테고리)만 포함.
 */

import { openRouterRecommender } from '@/lib/services/recommenders/openrouter-recommender';
import { extractJsonFromLlmResponse } from '@/lib/utils/json-extraction';
import { aiEditResponseSchema } from './chart-spec-schema';
import type { AiEditRequest, AiEditResponse } from '@/types/graph-studio';

// ─── 에러 타입 ─────────────────────────────────────────────

export type AiServiceErrorCode =
  | 'NO_RESPONSE'
  | 'PARSE_FAILED'
  | 'VALIDATION_FAILED'
  | 'READONLY_PATH'
  | 'UNRENDERED_PATH';

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
- chartType: bar|grouped-bar|stacked-bar|line|scatter|boxplot|histogram|error-bar|heatmap|violin|km-curve|roc-curve
- title: string (optional)
- data.sourceId: string
- data.columns: array of {name, type, uniqueCount, hasNull}  (sample values shown in 컬럼 목록)
- encoding.x / encoding.y: {field, type, title?, labelAngle?, labelFontSize?, titleFontSize?, grid?, scale?: {domain?, range?, zero?, type?: linear|log|sqrt|symlog}, sort?: ascending|descending|null} — NOTE: format field exists in schema but is NOT yet rendered.
- encoding.y2: {field, type: "quantitative", title?, scale?} (optional) — secondary Y-axis (right side), renders as line. Uses colors[1]. Only field/type/title/scale are allowed (no labelAngle etc.). Only works with bar and line charts.
- encoding.color: {field, type, legend?: {orient?, fontSize?, customLabels?: {rawName: displayLabel}}} (optional)
- encoding.color.scale: NOT YET RENDERED — schema exists but renderer ignores it. Do NOT generate patches for this field.
- encoding.color.legend.title / encoding.color.legend.titleFontSize: NOT YET RENDERED — schema exists but renderer does not use these fields. Do NOT generate patches for them.
- encoding.shape: NOT YET RENDERED — schema exists but renderer ignores it. Do NOT generate patches for this field.
- errorBar: {type: ci|stderr|stdev|iqr, value?} (optional)
- aggregate: {y: mean|median|sum|count|min|max, groupBy: string[]} (optional)
- orientation: "horizontal" (optional) — horizontal bars (bar/grouped-bar/stacked-bar only)
- trendline: {type: "linear", color?, strokeDash?, showEquation?} (optional) — regression line (scatter only)
- facet: {field, ncol?, showTitle?, shareAxis?} (optional) — facet/small multiples (bar, scatter)
- style: {preset: default|science|ieee|grayscale, scheme?: string (e.g. 'viridis','Set2', overrides preset colors), showDataLabels?, showSampleCounts?, font?: {family?, size?, titleSize? (chart title), labelSize? (tick labels), axisTitleSize? (axis titles, fallback: labelSize)}, colors?: string[], background?}
- annotations: array of objects. Types:
  - {type: "text", text: "...", x?: "50%"|number, y?: number, color?, fontSize?} (pixel/% coords)
  - {type: "hline", value: number (required), text?, color?, strokeDash?: number[], lineWidth?, labelPosition?: "start"|"middle"|"end"}
  - {type: "vline", value: number|string (required), text?, color?, strokeDash?: number[], lineWidth?, labelPosition?: "start"|"middle"|"end"}
  - {type: "line", x?, y?, x2?, y2?} (pixel coords)
  - {type: "rect", x?, y?, x2?, y2?} (pixel coords)
  For reference lines at data coordinates, prefer hline/vline over line/rect.
  NOTE: hline/vline are NOT rendered on heatmap, histogram, or faceted charts. Do NOT add them for these chart types.
- exportConfig: {format: svg|png, dpi, physicalWidth?: mm, physicalHeight?: mm, transparentBackground?} (physicalWidth/Height=출력 물리 크기(mm), 미지정=DOM 크기)
- significance: array of {groupA, groupB, pValue?, label?} (optional) — statistical significance brackets (bar/grouped-bar/error-bar only). Rendered as overlay graphics by ChartPreview.
- encoding.size: NOT YET RENDERED — schema exists but renderer ignores it. Do NOT generate patches for this field.

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

// ─── 미구현 렌더 경로 방어 ────────────────────────────────

/**
 * 스키마에는 존재하지만 echarts-converter에서 아직 렌더링하지 않는 경로.
 * AI가 패치를 생성하면 조용히 적용되지만 화면에 반영 안 됨 → 사용자 혼란 방지.
 */
const UNRENDERED_PATH_PREFIXES = [
  '/encoding/size',
  '/encoding/shape',
  '/encoding/color/scale',
] as const;

const UNRENDERED_PATHS = [
  '/encoding/color/legend/title',
  '/encoding/color/legend/titleFontSize',
] as const;

function joinPointer(base: string, token: string): string {
  const escaped = token.replace(/~/g, '~0').replace(/\//g, '~1');
  return `${base}/${escaped}`;
}

function collectTouchedPaths(path: string, value: unknown): string[] {
  const touched = new Set<string>([path]);

  const walk = (currentPath: string, currentValue: unknown): void => {
    if (!currentValue || typeof currentValue !== 'object') return;
    if (Array.isArray(currentValue)) {
      currentValue.forEach((item, index) => {
        const childPath = joinPointer(currentPath, String(index));
        touched.add(childPath);
        walk(childPath, item);
      });
      return;
    }

    for (const [key, nested] of Object.entries(currentValue)) {
      const childPath = joinPointer(currentPath, key);
      touched.add(childPath);
      walk(childPath, nested);
    }
  };

  walk(path, value);
  return [...touched];
}

function assertNoUnrenderedPaths(patches: AiEditResponse['patches']): void {
  for (const patch of patches) {
    const touchedPaths = patch.op === 'remove'
      ? [patch.path]
      : collectTouchedPaths(patch.path, patch.value);
    const blockedPath = touchedPaths.find(touched =>
      UNRENDERED_PATH_PREFIXES.some(
        prefix => touched === prefix || touched.startsWith(`${prefix}/`),
      ) || UNRENDERED_PATHS.includes(touched as typeof UNRENDERED_PATHS[number]),
    );
    if (blockedPath) {
      throw new AiServiceError(
        `아직 렌더링이 구현되지 않은 경로입니다: ${blockedPath}. 이 기능은 향후 업데이트에서 지원될 예정입니다.`,
        'UNRENDERED_PATH',
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

  const jsonStr = extractJsonFromLlmResponse(rawText);
  if (!jsonStr) {
    throw new AiServiceError(
      `AI 응답에서 JSON을 찾을 수 없습니다.\n응답 미리보기: ${rawText.slice(0, 200)}`,
      'PARSE_FAILED',
    );
  }

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

  // Readonly 경로 방어 — safeParse 이후에 실행하는 이유:
  // ① result.data가 valid AiEditResponse임이 보장된 상태에서 patch.path 타입 안전 접근
  // ② 프롬프트에서 이미 금지했지만 코드 레벨에서도 강제 (defense-in-depth)
  assertNonReadonlyPaths(result.data.patches);
  assertNoUnrenderedPaths(result.data.patches);

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
