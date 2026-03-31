/**
 * LLM 입력 검증 유틸리티
 *
 * 사용자 입력에서 프롬프트 인젝션 패턴을 제거.
 * Clean Style 프로젝트의 sanitize.ts에서 이식.
 */

/** 프롬프트 인젝션 패턴 (대소문자 무시) */
const INJECTION_PATTERNS = [
  /system\s*:/gi,
  /IGNORE\s+(ALL\s+)?PREVIOUS\s+INSTRUCTIONS/gi,
  /DO\s+NOT\s+FOLLOW/gi,
  /YOU\s+ARE\s+NOW/gi,
  /FORGET\s+(ALL\s+)?PREVIOUS/gi,
  /새로운\s+역할/gi,
  /지시를?\s+무시/gi,
  /이전\s+지시/gi,
]

/**
 * 사용자 입력에서 프롬프트 인젝션 패턴 제거
 *
 * - 마크다운 코드 블록/헤더 제거
 * - 과도한 줄바꿈 축소
 * - 인젝션 패턴 제거 (영어 + 한국어)
 * - 줄 수 제한 (30줄)
 */
export function sanitizeUserInput(input: string): string {
  let cleaned = input
    .replace(/```[\s\S]*?```/g, '')    // 코드 블록 전체 제거
    .replace(/#{1,6}\s/g, '')           // 마크다운 헤더 제거
    .replace(/\n{3,}/g, '\n\n')         // 3줄 이상 → 2줄

  for (const pattern of INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, '')
  }

  const lines = cleaned.split('\n')
  if (lines.length > 30) {
    cleaned = lines.slice(0, 30).join('\n')
  }

  return cleaned.trim()
}
