/**
 * 도움말 검색 로직
 * 제목, 내용, 키워드를 기반으로 검색
 */

import type { HelpItem, HelpSearchResult } from './types'
import { getAllHelpItems } from './help-data'

/**
 * 검색어를 정규화 (소문자, 공백 제거)
 */
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim()
}

/**
 * 텍스트에서 검색어 매칭 점수 계산
 * - 정확히 일치: 10점
 * - 단어 시작 일치: 5점
 * - 포함: 2점
 */
function calculateMatchScore(text: string, query: string): number {
  const normalizedText = text.toLowerCase()
  const normalizedQuery = normalizeQuery(query)

  if (!normalizedQuery) return 0

  // 정확히 일치
  if (normalizedText === normalizedQuery) return 10

  // 단어 시작 일치 (예: "결측" 검색 시 "결측값" 매칭)
  const words = normalizedText.split(/\s+/)
  const startsWithMatch = words.some(word => word.startsWith(normalizedQuery))
  if (startsWithMatch) return 5

  // 포함
  if (normalizedText.includes(normalizedQuery)) return 2

  return 0
}

/**
 * 도움말 항목 검색
 * @param query 검색어
 * @param limit 최대 결과 수 (기본: 10)
 * @returns 검색 결과 (점수 내림차순)
 */
export function searchHelp(query: string, limit = 10): HelpSearchResult[] {
  const normalizedQuery = normalizeQuery(query)

  if (!normalizedQuery || normalizedQuery.length < 1) {
    return []
  }

  const allItems = getAllHelpItems()
  const results: HelpSearchResult[] = []

  for (const item of allItems) {
    let totalScore = 0
    const matchedIn: ('title' | 'description' | 'content' | 'keywords')[] = []

    // 제목 검색 (가중치 3x)
    const titleScore = calculateMatchScore(item.title, query)
    if (titleScore > 0) {
      totalScore += titleScore * 3
      matchedIn.push('title')
    }

    // 내용 검색 (가중치 1x)
    const contentScore = calculateMatchScore(item.content, query)
    if (contentScore > 0) {
      totalScore += contentScore
      matchedIn.push('content')
    }

    // 설명 검색 (가중치 1.5x)
    if (item.description) {
      const descScore = calculateMatchScore(item.description, query)
      if (descScore > 0) {
        totalScore += descScore * 1.5
        matchedIn.push('description')
      }
    }

    // 키워드 검색 (가중치 2x, 각 키워드)
    for (const keyword of item.keywords) {
      const keywordScore = calculateMatchScore(keyword, query)
      if (keywordScore > 0) {
        totalScore += keywordScore * 2
        if (!matchedIn.includes('keywords')) {
          matchedIn.push('keywords')
        }
      }
    }

    if (totalScore > 0) {
      results.push({
        item,
        score: totalScore,
        matchedIn,
      })
    }
  }

  // 점수 내림차순 정렬 후 limit 적용
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * HTML 특수문자 이스케이프
 */
function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char] || char)
}

/**
 * 검색어 하이라이트 (HTML 반환)
 * XSS 방지: text를 먼저 이스케이프한 후 하이라이트 적용
 */
export function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text)

  // 1. 먼저 HTML 이스케이프
  const escapedText = escapeHtml(text)

  // 2. 이스케이프된 텍스트에서 하이라이트 적용
  const normalizedQuery = normalizeQuery(query)
  const escapedQuery = escapeHtml(normalizedQuery)
  const regex = new RegExp(`(${escapeRegex(escapedQuery)})`, 'gi')

  return escapedText.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>')
}

/**
 * 정규표현식 특수문자 이스케이프
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 인기 검색어 / 추천 검색어
 */
export const SUGGESTED_QUERIES = [
  '결측값',
  '데이터 업로드',
  't-검정',
  'ANOVA',
  '변수 선택',
  'CSV',
  '단축키',
]
