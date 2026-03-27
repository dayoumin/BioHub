/**
 * 문헌검색 키워드 필터링 유틸리티
 *
 * Worker 핸들러에서 외부 API 결과를 후처리할 때 사용.
 * - Korea 키워드 OR 그룹 (한국 관련 문헌 필터링)
 * - 사용자 키워드 AND/OR 연산
 * - 제외 키워드 차단
 */

import { KOREA_FILTER_KEYWORDS } from './korea-filter-config';
import type { LiteratureItem } from './types/literature';

/**
 * 키워드 필터 옵션
 */
export interface KeywordFilterOptions {
  /** Korea 키워드 포함 여부 (OR 그룹으로 처리) */
  includeKoreaKeyword?: boolean;
  /** 사용자 정의 키워드 */
  keywords?: string[];
  /** 키워드 연산자 (AND/OR) - 사용자 키워드에만 적용 */
  keywordOperator?: 'AND' | 'OR';
  /** 제외할 키워드 */
  excludeKeywords?: string[];
}

/**
 * 텍스트 추출 함수 타입
 * 각 데이터 소스에 맞게 텍스트를 추출
 */
export type TextExtractor = (item: LiteratureItem) => string;

/**
 * OpenAlex용 텍스트 추출기 (title, abstract, journal)
 */
export const openAlexTextExtractor: TextExtractor = (item) => {
  return [
    item.title,
    item.abstract || '',
    item.journal || '',
  ].join(' ').toLowerCase();
};

/**
 * GBIF/OBIS용 텍스트 추출기 (표본 메타데이터)
 */
export const specimenTextExtractor: TextExtractor = (item) => {
  return [
    item.title,
    item.locality || '',
    item.institutionCode || '',
    item.basisOfRecord || '',
    item.eventDate || '',
  ].join(' ').toLowerCase();
};

/**
 * 키워드 배열을 정규화 (빈 문자열 제거, 소문자 변환, 중복 제거)
 */
export function normalizeKeywords(keywords: string[]): string[] {
  const normalized = keywords
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length > 0);

  // 중복 제거 (Set 대신 filter 사용으로 downlevelIteration 불필요)
  return normalized.filter((item, index) => normalized.indexOf(item) === index);
}

/**
 * 키워드 필터 적용 (통합)
 *
 * **핵심 로직:**
 * - Korea 키워드: 항상 OR 그룹 (하나라도 매칭되면 통과)
 * - 사용자 키워드: keywordOperator에 따라 AND/OR 적용
 * - 최종 결과: (Korea OR 매칭) AND (사용자 키워드 조건)
 *
 * @param items 필터링할 아이템 배열
 * @param options 필터 옵션
 * @param extractText 텍스트 추출 함수
 * @returns 필터링된 아이템 배열
 */
export function applyKeywordFilters(
  items: LiteratureItem[],
  options: KeywordFilterOptions,
  extractText: TextExtractor
): LiteratureItem[] {
  const {
    includeKoreaKeyword = false,
    keywords = [],
    keywordOperator = 'OR',
    excludeKeywords = [],
  } = options;

  // 키워드 정규화 (빈 문자열 방어)
  const normalizedUserKeywords = normalizeKeywords(keywords);
  const normalizedExcludeKeywords = normalizeKeywords(excludeKeywords);
  const koreaKeywords = includeKoreaKeyword
    ? KOREA_FILTER_KEYWORDS.map(k => k.toLowerCase())
    : [];

  // 필터링 조건이 없으면 모두 통과
  const hasKoreaFilter = koreaKeywords.length > 0;
  const hasUserFilter = normalizedUserKeywords.length > 0;
  const hasExcludeFilter = normalizedExcludeKeywords.length > 0;

  if (!hasKoreaFilter && !hasUserFilter && !hasExcludeFilter) {
    return items;
  }

  return items.filter(item => {
    const combinedText = extractText(item);

    // 1. 제외 키워드 체크 (하나라도 포함되면 제외)
    if (hasExcludeFilter) {
      const hasExcluded = normalizedExcludeKeywords.some(keyword =>
        combinedText.includes(keyword)
      );
      if (hasExcluded) return false;
    }

    // 2. Korea 키워드 체크 (OR 그룹 - 하나라도 매칭되면 통과)
    let passKoreaFilter = true;
    if (hasKoreaFilter) {
      passKoreaFilter = koreaKeywords.some(keyword =>
        combinedText.includes(keyword)
      );
    }

    // 3. 사용자 키워드 체크 (AND/OR 연산자 적용)
    let passUserFilter = true;
    if (hasUserFilter) {
      if (keywordOperator === 'OR') {
        // OR: 하나라도 포함되면 통과
        passUserFilter = normalizedUserKeywords.some(keyword =>
          combinedText.includes(keyword)
        );
      } else {
        // AND: 모두 포함되어야 통과
        passUserFilter = normalizedUserKeywords.every(keyword =>
          combinedText.includes(keyword)
        );
      }
    }

    // 4. 최종 조건
    // - Korea 필터가 있으면: Korea 통과 AND 사용자 키워드 통과
    // - Korea 필터가 없으면: 사용자 키워드만 확인
    if (hasKoreaFilter && hasUserFilter) {
      return passKoreaFilter && passUserFilter;
    } else if (hasKoreaFilter) {
      return passKoreaFilter;
    } else {
      return passUserFilter;
    }
  });
}
