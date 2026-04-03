import type { LiteratureItem } from '@/lib/types/literature'

/**
 * 저자 목록 → best-effort APA 형식 문자열
 *
 * LiteratureItem.authors는 "Kim Jungwoo" 같은 display name 형태이므로
 * "Kim, J." 정규화는 하지 않음. 원본 문자열 그대로 APA 구두점 규칙만 적용.
 */
export function formatAuthors(authors: string[]): string {
  if (authors.length === 0) return 'Unknown'
  if (authors.length === 1) return authors[0]
  if (authors.length <= 7) {
    const last = authors[authors.length - 1]
    return `${authors.slice(0, -1).join(', ')}, & ${last}`
  }
  // APA 7판: 저자 8명 이상 → 첫 6명, ..., 마지막 저자
  return `${authors.slice(0, 6).join(', ')}, ... ${authors[authors.length - 1]}`
}

/**
 * LiteratureItem → best-effort 인용 문자열 (APA 7판 구조 참고)
 *
 * 형식: 저자. (연도). 제목. 저널. doi/url.
 * author normalization은 미지원 — display name을 그대로 사용.
 */
export function buildCitationString(item: LiteratureItem): string {
  const authors = formatAuthors(item.authors)
  const year = item.year != null ? `(${item.year})` : '(n.d.)'
  const doi = item.doi
    ? `https://doi.org/${item.doi}`
    : item.url

  const parts: string[] = [authors, year, item.title]
  if (item.journal) parts.push(item.journal)
  parts.push(doi)

  return parts.join('. ') + '.'
}
