/**
 * 문헌 통합검색 타입 정의 (Worker 측)
 *
 * stats/lib/types/literature.ts와 동일한 타입.
 * Worker(src/)와 프론트엔드(stats/)는 별도 빌드이므로 타입을 각각 유지.
 * 변경 시 양쪽을 동기화할 것.
 *
 * @see stats/lib/types/literature.ts (프론트엔드 측 동일 타입)
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
  includeKoreaKeyword?: boolean;
  keywords?: string[];
  keywordOperator?: 'AND' | 'OR';
  excludeKeywords?: string[];
}

// 소스별 에러
export interface SourceError {
  source: ErrorSource;
  error: string;
}
