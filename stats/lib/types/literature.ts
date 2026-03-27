/**
 * 문헌 통합검색 타입 정의
 *
 * 5개 학술 DB(OpenAlex, GBIF, OBIS, NANET, PubMed)를 통합 검색하는
 * /literature 페이지 + Worker API에서 공통으로 사용하는 타입.
 */

// 문헌 검색 소스 (외부 API)
export type LiteratureSource = 'openalex' | 'gbif' | 'obis' | 'nanet' | 'pubmed';

// 에러에서 사용할 수 있는 모든 소스 (내부 시스템 에러 포함)
export type ErrorSource = LiteratureSource | 'system';

// 검색된 문헌 메타데이터
export interface LiteratureItem {
  id: string; // 고유 ID (source_원본ID)
  source: LiteratureSource;

  // 기본 정보
  title: string;
  authors: string[];
  year: number | null;
  journal?: string;
  abstract?: string; // OpenAlex만
  url: string;
  pdfUrl?: string; // OpenAlex만
  doi?: string;
  citedByCount?: number; // OpenAlex만
  searchedName: string; // 검색에 사용된 학명

  // GBIF/OBIS 전용 (표본 데이터)
  locality?: string;
  coordinates?: { lat: number; lng: number };
  basisOfRecord?: string;
  institutionCode?: string;
  catalogNumber?: string;
  eventDate?: string;
}

// 검색 옵션
export interface SearchOptions {
  yearFrom?: number;
  yearTo?: number;
  maxResults?: number;
  includeKoreaKeyword?: boolean; // Korea 키워드 포함 여부 (기본: true)
  keywords?: string[]; // 추가 검색 키워드
  keywordOperator?: 'AND' | 'OR'; // 키워드 연산자 (기본: OR)
  excludeKeywords?: string[]; // 제외할 키워드
}

// 소스별 에러
export interface SourceError {
  source: ErrorSource;
  error: string;
}

// 소스별 검색 결과 (프론트엔드 fetch 응답)
export interface SourceSearchResult {
  source: LiteratureSource;
  items: LiteratureItem[];
  error?: string;
  elapsed: number;
}
