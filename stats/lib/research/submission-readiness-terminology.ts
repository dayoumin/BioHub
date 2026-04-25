export const FORBIDDEN_SUBMISSION_COPY = [
  '투고 성공률',
  '합격 가능성',
  'acceptance probability',
  'acceptance rate prediction',
  '저널 추천 1위',
  '1위 추천 저널',
  '게재 확률',
] as const

export const RECOMMENDED_SUBMISSION_COPY = [
  '투고 전 체크리스트',
  '저널 요구사항 대조',
  '연구 범위 일치 신호',
  '형식 및 근거 위험',
  '확인 필요 항목',
] as const

export function findForbiddenSubmissionCopy(text: string): string[] {
  const normalized = text.toLocaleLowerCase()
  return FORBIDDEN_SUBMISSION_COPY.filter((term) => (
    normalized.includes(term.toLocaleLowerCase())
  ))
}

export function hasForbiddenSubmissionCopy(text: string): boolean {
  return findForbiddenSubmissionCopy(text).length > 0
}
