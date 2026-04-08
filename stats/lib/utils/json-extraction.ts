/**
 * LLM 응답에서 JSON 추출 유틸리티 (공통)
 *
 * LLM이 반환하는 다양한 형식에서 첫 번째 완전한 JSON 객체를 추출한다.
 * - ```json ... ``` 코드 블록
 * - 텍스트 사이 삽입된 raw JSON
 * - 중첩 JSON (balanced-brace 방식으로 안전 추출)
 *
 * 기존 분산 구현을 통합: openrouter-recommender (extractBalancedJson),
 * ai-service (extractJson), diagnostic-pipeline, llm-recommender
 */

/**
 * LLM 응답 문자열에서 첫 번째 완전한 JSON 객체를 추출한다.
 *
 * 1단계: ``` json ``` 코드 블록 내부를 먼저 확인
 * 2단계: balanced-brace 방식으로 첫 번째 `{...}` 객체 추출
 *
 * @returns 추출된 JSON 문자열, 또는 null (JSON을 찾을 수 없을 때)
 */
export function extractJsonFromLlmResponse(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // 1단계: 코드 블록 우선
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlock?.[1]) {
    const inner = codeBlock[1].trim()
    if (inner.startsWith('{')) return inner
  }

  // 2단계: balanced-brace 추출
  return extractBalancedJson(trimmed)
}

/**
 * 중괄호 밸런싱으로 첫 번째 완전한 JSON 객체를 추출한다.
 * greedy regex (`/\{[\s\S]*\}/`) 대신 사용하여 다중 JSON 시 파싱 실패 방지.
 */
function extractBalancedJson(content: string): string | null {
  const start = content.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < content.length; i++) {
    const ch = content[i]

    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue

    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        return content.substring(start, i + 1)
      }
    }
  }

  // 밸런싱 실패 = 불완전 JSON
  return null
}
