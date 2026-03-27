/**
 * 문헌 통합검색 설정
 *
 * Korea 필터 키워드 + 소스별 검색 옵션 + UI 기본값.
 * Worker 핸들러(src/handlers/literature.ts)와
 * 프론트엔드(stats/app/literature/) 양쪽에서 참조.
 */

import type { LiteratureSource } from './types/literature';

/**
 * Korea 관련 키워드 (문헌 필터링용)
 * - OpenAlex 텍스트 필터링에 사용
 * - 역사적 표기 포함
 */
export const KOREA_FILTER_KEYWORDS = [
  // 국가명 (영문)
  'korea',
  'korean',
  'south korea',
  'republic of korea',

  // 국가명 (역사적 표기)
  'corea',        // 19세기 서양 문헌
  'chosen',       // 일제강점기 일본 문헌
  'tyosen',       // 일제강점기 로마자 표기
  'chosun',

  // 국가명 (한글/한자)
  '한국',
  '조선',
  '朝鮮',
  '대한',
  '大韓',

  // 해역 (핵심만)
  'korean waters',
  'korean peninsula',
  'east sea',
  'sea of japan',  // 일본 문헌에서 동해 표기 (중요!)
  'yellow sea',
  'korea strait',

  // 주요 섬 (명확한 한국 영토)
  'jeju',
  'cheju',        // 제주 옛 표기
  'ulleungdo',
  'ullungdo',
  'dagelet',      // 울릉도 서양 표기
  'dokdo',

  // 한글 해역/지역
  '동해',
  '서해',
  '남해',
  '제주',
] as const;

export const LITERATURE_SEARCH_CONFIG = {
  /**
   * 검색 기본 설정
   */
  search: {
    // 소스별 최대 결과 수
    maxResultsPerSource: 20,

    // 기본 검색 소스
    defaultSources: ['openalex', 'gbif', 'obis'] as LiteratureSource[],

    // 한국 키워드 기본 포함 여부
    includeKoreaKeywordByDefault: true,

    // API 요청 타임아웃 (ms)
    requestTimeout: 30000,

    // 검색 결과 최소 표시 수 (이보다 적으면 경고)
    minResultsWarningThreshold: 5,
  },

  /**
   * UI 설정
   */
  ui: {
    // 검색 결과 페이지당 표시 수
    resultsPerPage: 20,

    // 로딩 상태 최소 표시 시간 (ms) - UX 개선
    minLoadingTime: 500,
  },

  /**
   * 소스 표시명
   */
  sourceLabels: {
    openalex: 'OpenAlex',
    gbif: 'GBIF',
    obis: 'OBIS',
    nanet: '국회도서관',
    pubmed: 'PubMed'
  } as Record<LiteratureSource, string>,
} as const;
