/**
 * 문헌 통합검색 Worker 핸들러
 *
 * 프론트엔드에서 소스별로 개별 호출:
 *   GET /api/literature/search?source=openalex&query=Paralichthys+olivaceus
 *
 * 각 소스를 독립 프록시로 처리 (오케스트레이션은 프론트엔드 측).
 *
 * @see src/lib/types/literature.ts — LiteratureItem, SearchOptions 타입
 * @see src/lib/korea-keywords.ts — 키워드 필터 유틸리티
 */

import type { LiteratureItem, LiteratureSource, SearchOptions } from '../lib/types/literature';
import {
  applyKeywordFilters,
  openAlexTextExtractor,
  specimenTextExtractor,
  type KeywordFilterOptions,
} from '../lib/korea-keywords';

// ─── Env 확장 (worker.ts Env에 병합) ────────────────────────────
export interface LiteratureEnv {
  NCBI_API_KEY?: string;
  NANET_API_KEY?: string;
}

// ─── API 기본 URL ────────────────────────────────────────────────
const OPENALEX_BASE = 'https://api.openalex.org';
const GBIF_BASE = 'https://api.gbif.org/v1';
const OBIS_BASE = 'https://api.obis.org/v3';
const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const NANET_SEARCH_URL = 'http://losi-api.nanet.go.kr/searchTotal';

/** 외부 API 요청 타임아웃 (ms) */
const FETCH_TIMEOUT_MS = 30_000;

/** 한국 해역 WKT (한반도 주변 대략 경계) */
const KOREA_WATERS_WKT = 'POLYGON((124 33, 124 43, 132 43, 132 33, 124 33))';

/** 한국 국가 코드 */
const KOREA_COUNTRY_CODE = 'KR';

// ─── JSON 응답 헬퍼 ─────────────────────────────────────────────
function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── 타임아웃 fetch ─────────────────────────────────────────────
function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...init,
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
}

// ─── 쿼리 파라미터 파싱 ─────────────────────────────────────────
interface ParsedParams {
  source: LiteratureSource;
  query: string;
  options: SearchOptions;
}

const VALID_SOURCES: ReadonlySet<string> = new Set([
  'openalex', 'gbif', 'obis', 'nanet', 'pubmed',
]);

function parseSearchParams(url: URL): ParsedParams | Response {
  const source = url.searchParams.get('source');
  const query = url.searchParams.get('query');

  if (!source || !VALID_SOURCES.has(source)) {
    return jsonResponse(
      { error: 'source 파라미터가 필요합니다 (openalex|gbif|obis|nanet|pubmed).' },
      400,
    );
  }

  if (!query || query.trim().length < 2) {
    return jsonResponse(
      { error: 'query 파라미터가 필요합니다 (최소 2자).' },
      400,
    );
  }

  const maxResults = Math.min(
    parseInt(url.searchParams.get('maxResults') ?? '20', 10) || 20,
    100,
  );
  const yearFromRaw = url.searchParams.get('yearFrom');
  const yearToRaw = url.searchParams.get('yearTo');
  const includeKoreaKeyword = url.searchParams.get('includeKoreaKeyword') === 'true';
  const keywordsRaw = url.searchParams.get('keywords');
  const keywordOperator = url.searchParams.get('keywordOperator') === 'AND' ? 'AND' : 'OR';
  const excludeRaw = url.searchParams.get('excludeKeywords');

  const keywords = keywordsRaw
    ? keywordsRaw.split(',').map(k => k.trim()).filter(k => k.length > 0)
    : [];
  const excludeKeywords = excludeRaw
    ? excludeRaw.split(',').map(k => k.trim()).filter(k => k.length > 0)
    : [];

  return {
    source: source as LiteratureSource,
    query: query.trim(),
    options: {
      yearFrom: yearFromRaw ? parseInt(yearFromRaw, 10) || undefined : undefined,
      yearTo: yearToRaw ? parseInt(yearToRaw, 10) || undefined : undefined,
      maxResults,
      includeKoreaKeyword,
      keywords,
      keywordOperator,
      excludeKeywords,
    },
  };
}

// ═════════════════════════════════════════════════════════════════
// 메인 핸들러
// ═════════════════════════════════════════════════════════════════

export async function handleLiteratureApi(
  request: Request,
  env: LiteratureEnv,
  url: URL,
): Promise<Response> {
  // GET /api/literature/search 만 처리
  if (url.pathname !== '/api/literature/search' || request.method !== 'GET') {
    return jsonResponse({ error: 'Not found' }, 404);
  }

  const parsed = parseSearchParams(url);
  if (parsed instanceof Response) return parsed;

  const { source, query, options } = parsed;
  const filterOptions: KeywordFilterOptions = {
    includeKoreaKeyword: options.includeKoreaKeyword,
    keywords: options.keywords,
    keywordOperator: options.keywordOperator,
    excludeKeywords: options.excludeKeywords,
  };
  const startTime = Date.now();

  try {
    let items: LiteratureItem[];

    switch (source) {
      case 'openalex':
        items = await searchOpenAlex(query, options, filterOptions);
        break;
      case 'gbif':
        items = await searchGbif(query, options, filterOptions);
        break;
      case 'obis':
        items = await searchObis(query, options, filterOptions);
        break;
      case 'nanet':
        items = await searchNanet(query, options, env);
        break;
      case 'pubmed':
        items = await searchPubmed(query, options, env);
        break;
      default: {
        // exhaustive check
        const _never: never = source;
        return jsonResponse({ error: `지원하지 않는 소스: ${_never}` }, 400);
      }
    }

    const elapsed = Date.now() - startTime;
    return jsonResponse({ source, items, elapsed }, 200);
  } catch (err: unknown) {
    const elapsed = Date.now() - startTime;
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Literature:${source}] Error after ${elapsed}ms:`, message);
    return jsonResponse({ source, error: message, elapsed }, 502);
  }
}

// ═════════════════════════════════════════════════════════════════
// OpenAlex
// ═════════════════════════════════════════════════════════════════

/** OpenAlex inverted index -> 일반 텍스트 */
function invertedIndexToText(
  invertedIndex: Record<string, number[]> | undefined,
): string | undefined {
  if (!invertedIndex) return undefined;

  const words: Array<{ word: string; position: number }> = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const position of positions) {
      words.push({ word, position });
    }
  }
  words.sort((a, b) => a.position - b.position);
  return words.map(w => w.word).join(' ');
}

// OpenAlex API 응답 타입
interface OpenAlexWork {
  id: string;
  doi?: string;
  title: string;
  display_name: string;
  publication_year: number | null;
  authorships: Array<{
    author: { display_name: string };
  }>;
  primary_location?: {
    source?: { display_name: string };
    pdf_url?: string;
    landing_page_url?: string;
  };
  abstract_inverted_index?: Record<string, number[]>;
  cited_by_count: number;
}

interface OpenAlexSearchResult {
  meta: { count: number; page: number; per_page: number };
  results: OpenAlexWork[];
}

async function searchOpenAlex(
  query: string,
  options: SearchOptions,
  filterOptions: KeywordFilterOptions,
): Promise<LiteratureItem[]> {
  const maxResults = options.maxResults ?? 20;

  // 키워드 필터가 있으면 더 많이 요청 (후처리 필터링)
  const hasKoreaFilter = filterOptions.includeKoreaKeyword;
  const hasUserFilter = (filterOptions.keywords?.length ?? 0) > 0
    || (filterOptions.excludeKeywords?.length ?? 0) > 0;
  let multiplier = 1;
  if (hasKoreaFilter) multiplier *= 2;
  if (hasUserFilter) multiplier *= 1.5;
  const requestCount = Math.min(Math.ceil(maxResults * multiplier), 100);

  const params = new URLSearchParams({
    search: `"${query}"`,
    per_page: requestCount.toString(),
    sort: 'publication_year:asc',
  });

  // 연도 필터
  const filters: string[] = [];
  if (options.yearFrom || options.yearTo) {
    const from = options.yearFrom ?? 1800;
    const to = options.yearTo ?? new Date().getFullYear();
    filters.push(`publication_year:${from}-${to}`);
  }
  if (filters.length > 0) {
    params.append('filter', filters.join(','));
  }

  const url = `${OPENALEX_BASE}/works?${params.toString()}`;

  const response = await fetchWithTimeout(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'BioHub/1.0 (mailto:biohub@ecomarin.com)',
    },
  });

  if (!response.ok) {
    throw new Error(`OpenAlex API error: ${response.status}`);
  }

  const data = await response.json() as OpenAlexSearchResult;

  let items: LiteratureItem[] = data.results.map(work => ({
    id: `openalex_${work.id.split('/').pop() ?? work.id}`,
    source: 'openalex' as const,
    title: work.display_name || work.title,
    authors: work.authorships.map(a => a.author.display_name),
    year: work.publication_year,
    journal: work.primary_location?.source?.display_name,
    doi: work.doi?.replace('https://doi.org/', ''),
    abstract: invertedIndexToText(work.abstract_inverted_index),
    url: work.primary_location?.landing_page_url || work.id,
    pdfUrl: work.primary_location?.pdf_url,
    citedByCount: work.cited_by_count,
    searchedName: query,
  }));

  // 키워드 필터 적용
  items = applyKeywordFilters(items, filterOptions, openAlexTextExtractor);

  return items.slice(0, maxResults);
}

// ═════════════════════════════════════════════════════════════════
// GBIF
// ═════════════════════════════════════════════════════════════════

interface GbifSpeciesSearchResult {
  results: Array<{
    key: number;
    nubKey?: number;
    speciesKey?: number;
    scientificName: string;
  }>;
}

interface GbifOccurrence {
  key: number;
  scientificName: string;
  basisOfRecord: string;
  country?: string;
  countryCode?: string;
  locality?: string;
  stateProvince?: string;
  decimalLatitude?: number;
  decimalLongitude?: number;
  eventDate?: string;
  year?: number;
  institutionCode?: string;
  catalogNumber?: string;
  recordedBy?: string;
  identifiedBy?: string;
  datasetName?: string;
}

interface GbifOccurrenceResponse {
  count: number;
  results: GbifOccurrence[];
}

async function searchGbif(
  query: string,
  options: SearchOptions,
  filterOptions: KeywordFilterOptions,
): Promise<LiteratureItem[]> {
  const maxResults = options.maxResults ?? 20;

  // Step 1: 종 키 조회
  const speciesKey = await findGbifSpeciesKey(query);

  // Step 2: 한국 표본 데이터 검색
  const occParams = new URLSearchParams({
    country: KOREA_COUNTRY_CODE,
    limit: '100',
  });

  if (speciesKey !== null) {
    occParams.append('speciesKey', speciesKey.toString());
  } else {
    occParams.append('scientificName', query);
  }

  // 연도 필터
  if (options.yearFrom) {
    occParams.append('year', `${options.yearFrom},${options.yearTo ?? 2030}`);
  } else if (options.yearTo) {
    occParams.append('year', `1700,${options.yearTo}`);
  }

  const occUrl = `${GBIF_BASE}/occurrence/search?${occParams.toString()}`;
  const occResponse = await fetchWithTimeout(occUrl);

  if (!occResponse.ok) {
    throw new Error(`GBIF occurrence API error: ${occResponse.status}`);
  }

  const occData = await occResponse.json() as GbifOccurrenceResponse;

  // Step 3: LiteratureItem 변환
  let items: LiteratureItem[] = occData.results
    .filter(occ => occ.scientificName)
    .map(occ => convertGbifOccurrence(occ, query));

  // GBIF는 이미 country=KR 이므로 Korea 키워드 필터 불필요.
  // 사용자 키워드/제외 키워드만 적용
  items = applyKeywordFilters(
    items,
    { keywords: filterOptions.keywords, keywordOperator: filterOptions.keywordOperator, excludeKeywords: filterOptions.excludeKeywords },
    specimenTextExtractor,
  );

  // 연도순 정렬
  items.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
  return items.slice(0, maxResults);
}

async function findGbifSpeciesKey(scientificName: string): Promise<number | null> {
  const params = new URLSearchParams({
    q: scientificName,
    rank: 'SPECIES',
    limit: '5',
  });

  const url = `${GBIF_BASE}/species/search?${params.toString()}`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return null;

    const data = await response.json() as GbifSpeciesSearchResult;

    // nubKey 우선
    for (const result of data.results) {
      if (result.nubKey) return result.nubKey;
    }
    // speciesKey 차선
    if (data.results.length > 0 && data.results[0].speciesKey) {
      return data.results[0].speciesKey;
    }
    return data.results.length > 0 ? data.results[0].key : null;
  } catch {
    return null;
  }
}

function convertGbifOccurrence(occ: GbifOccurrence, searchedName: string): LiteratureItem {
  const titleParts: string[] = [occ.scientificName];
  if (occ.institutionCode) titleParts.push(`[${occ.institutionCode}]`);
  if (occ.catalogNumber) titleParts.push(occ.catalogNumber);
  if (occ.locality) titleParts.push(`- ${occ.locality}`);

  const authors: string[] = [];
  if (occ.recordedBy) authors.push(occ.recordedBy);
  if (occ.identifiedBy && occ.identifiedBy !== occ.recordedBy) {
    authors.push(`(ID: ${occ.identifiedBy})`);
  }

  const locality = [occ.stateProvince, occ.locality].filter(Boolean).join(', ') || 'Korea';
  const coordinates = occ.decimalLatitude != null && occ.decimalLongitude != null
    ? { lat: occ.decimalLatitude, lng: occ.decimalLongitude }
    : undefined;

  return {
    id: `gbif_${occ.key}`,
    source: 'gbif',
    title: titleParts.join(' '),
    authors,
    year: occ.year ?? null,
    journal: occ.datasetName ?? occ.institutionCode,
    url: `https://www.gbif.org/occurrence/${occ.key}`,
    searchedName,
    locality,
    coordinates,
    basisOfRecord: occ.basisOfRecord,
    institutionCode: occ.institutionCode,
    catalogNumber: occ.catalogNumber,
    eventDate: occ.eventDate,
  };
}

// ═════════════════════════════════════════════════════════════════
// OBIS
// ═════════════════════════════════════════════════════════════════

interface ObisTaxonResponse {
  total: number;
  results: Array<{
    taxonID: number;
    scientificName: string;
  }>;
}

interface ObisOccurrence {
  id: number;
  scientificName: string;
  scientificNameAuthorship?: string;
  basisOfRecord?: string;
  decimalLatitude?: number;
  decimalLongitude?: number;
  eventDate?: string;
  year?: number;
  locality?: string;
  country?: string;
  recordedBy?: string;
  identifiedBy?: string;
  institutionCode?: string;
  catalogNumber?: string;
  datasetName?: string;
}

interface ObisOccurrenceResponse {
  total: number;
  results: ObisOccurrence[];
}

async function searchObis(
  query: string,
  options: SearchOptions,
  filterOptions: KeywordFilterOptions,
): Promise<LiteratureItem[]> {
  const maxResults = options.maxResults ?? 20;

  // Step 1: taxon 검색으로 taxonID 획득
  const taxonId = await findObisTaxonId(query);

  // Step 2: 한국 해역 occurrence 검색
  const occParams = new URLSearchParams({
    geometry: KOREA_WATERS_WKT,
    size: '100',
  });

  if (taxonId !== null) {
    occParams.append('taxonid', taxonId.toString());
  } else {
    occParams.append('scientificname', query);
  }

  if (options.yearFrom) {
    occParams.append('startdate', `${options.yearFrom}-01-01`);
  }
  if (options.yearTo) {
    occParams.append('enddate', `${options.yearTo}-12-31`);
  }

  const occUrl = `${OBIS_BASE}/occurrence?${occParams.toString()}`;
  const occResponse = await fetchWithTimeout(occUrl);

  if (!occResponse.ok) {
    throw new Error(`OBIS occurrence API error: ${occResponse.status}`);
  }

  const occData = await occResponse.json() as ObisOccurrenceResponse;

  // Step 3: LiteratureItem 변환
  let items: LiteratureItem[] = occData.results
    .filter(occ => occ.scientificName)
    .map(occ => convertObisOccurrence(occ, query));

  // OBIS는 이미 geometry로 한국 해역만 조회하므로 Korea 키워드 필터 불필요
  items = applyKeywordFilters(
    items,
    { keywords: filterOptions.keywords, keywordOperator: filterOptions.keywordOperator, excludeKeywords: filterOptions.excludeKeywords },
    specimenTextExtractor,
  );

  items.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
  return items.slice(0, maxResults);
}

async function findObisTaxonId(scientificName: string): Promise<number | null> {
  const params = new URLSearchParams({ scientificname: scientificName });
  const url = `${OBIS_BASE}/taxon?${params.toString()}`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return null;

    const data = await response.json() as ObisTaxonResponse;
    return data.results.length > 0 ? data.results[0].taxonID : null;
  } catch {
    return null;
  }
}

function convertObisOccurrence(occ: ObisOccurrence, searchedName: string): LiteratureItem {
  const titleParts: string[] = [occ.scientificName];
  if (occ.scientificNameAuthorship) titleParts.push(occ.scientificNameAuthorship);
  if (occ.institutionCode) titleParts.push(`[${occ.institutionCode}]`);
  if (occ.catalogNumber) titleParts.push(occ.catalogNumber);

  const authors: string[] = [];
  if (occ.recordedBy) authors.push(occ.recordedBy);
  if (occ.identifiedBy && occ.identifiedBy !== occ.recordedBy) {
    authors.push(`(ID: ${occ.identifiedBy})`);
  }

  // 위치 정보
  const locationParts: string[] = [];
  if (occ.locality) {
    locationParts.push(occ.locality);
  } else if (occ.country) {
    locationParts.push(occ.country);
  }
  if (occ.decimalLatitude != null && occ.decimalLongitude != null) {
    locationParts.push(
      `(${occ.decimalLatitude.toFixed(2)}\u00B0N, ${occ.decimalLongitude.toFixed(2)}\u00B0E)`,
    );
  }
  const locality = locationParts.length > 0 ? locationParts.join(' ') : 'Korean waters';

  const coordinates = occ.decimalLatitude != null && occ.decimalLongitude != null
    ? { lat: occ.decimalLatitude, lng: occ.decimalLongitude }
    : undefined;

  return {
    id: `obis_${occ.id}`,
    source: 'obis',
    title: titleParts.join(' '),
    authors,
    year: occ.year ?? null,
    journal: occ.datasetName ?? occ.institutionCode,
    url: `https://obis.org/occurrence/${occ.id}`,
    searchedName,
    locality,
    coordinates,
    basisOfRecord: occ.basisOfRecord,
    institutionCode: occ.institutionCode,
    catalogNumber: occ.catalogNumber,
    eventDate: occ.eventDate,
  };
}

// ═════════════════════════════════════════════════════════════════
// NANET (국회도서관)
// ═════════════════════════════════════════════════════════════════

interface NanetApiSearchItem {
  lodID: string;
  divFlag: string;
  title: string;
  authorList?: Array<{ name?: string }>;
  pubYear?: string;
  journal?: { title?: string };
  publisher?: string;
}

async function searchNanet(
  query: string,
  options: SearchOptions,
  env: LiteratureEnv,
): Promise<LiteratureItem[]> {
  const apiKey = env.NANET_API_KEY;
  if (!apiKey) {
    throw new Error('NANET_API_KEY가 설정되지 않았습니다.');
  }

  const maxResults = options.maxResults ?? 20;
  const limit = Math.min(maxResults, 100);

  const params: Record<string, string> = {
    authKey: apiKey,
    searchTerm: query,
    searchRange: 'ARTICLE',
    pageNo: '1',
    printRowCnt: limit.toString(),
  };

  if (options.yearFrom) {
    params.startYear = options.yearFrom.toString();
    params.endYear = (options.yearTo ?? new Date().getFullYear()).toString();
  }

  const body = new URLSearchParams(params);

  const response = await fetchWithTimeout(NANET_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': 'application/json',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`NANET API error: ${response.status}`);
  }

  const data = await response.json() as { result?: Array<{ searchList?: unknown[] }> };
  const searchList = (data.result?.[0]?.searchList ?? []) as NanetApiSearchItem[];

  return searchList.map((item): LiteratureItem => {
    const authors = item.authorList
      ?.map(a => a.name)
      .filter((name): name is string => typeof name === 'string' && name.length > 0)
      ?? [];

    const year = item.pubYear ? parseInt(item.pubYear, 10) : null;

    return {
      id: `nanet_${item.lodID}`,
      source: 'nanet',
      title: item.title,
      authors,
      year: Number.isNaN(year) ? null : year,
      journal: item.journal?.title,
      url: `https://www.nanet.go.kr/usermain/search/searchView.do?lodID=${item.lodID}&divFlag=${item.divFlag}`,
      searchedName: query,
    };
  });
}

// ═════════════════════════════════════════════════════════════════
// PubMed (NCBI E-utilities)
// ═════════════════════════════════════════════════════════════════

interface ESearchResult {
  esearchresult: {
    idlist: string[];
    count: string;
  };
}

interface ESummaryResult {
  result: Record<string, {
    uid: string;
    title: string;
    authors?: Array<{ name: string }>;
    pubdate?: string;
    fulljournalname?: string;
    elocationid?: string;
    articleids?: Array<{ idtype: string; value: string }>;
  }>;
}

async function searchPubmed(
  query: string,
  options: SearchOptions,
  env: LiteratureEnv,
): Promise<LiteratureItem[]> {
  const apiKey = env.NCBI_API_KEY;
  const maxResults = options.maxResults ?? 20;
  const limit = Math.min(maxResults, 100);

  // Step 1: ESearch — 논문 ID 목록
  let searchQuery = query;
  if (options.yearFrom || options.yearTo) {
    const from = options.yearFrom ?? 1900;
    const to = options.yearTo ?? new Date().getFullYear();
    searchQuery += ` AND ${from}:${to}[PDAT]`;
  }

  const esearchParams = new URLSearchParams({
    db: 'pubmed',
    term: searchQuery,
    retmax: limit.toString(),
    retmode: 'json',
    usehistory: 'y',
  });
  if (apiKey) esearchParams.append('api_key', apiKey);

  const esearchUrl = `${PUBMED_BASE}/esearch.fcgi?${esearchParams.toString()}`;
  const esearchResponse = await fetchWithTimeout(esearchUrl);

  if (!esearchResponse.ok) {
    throw new Error(`PubMed ESearch error: ${esearchResponse.status}`);
  }

  const esearchData = await esearchResponse.json() as ESearchResult;
  const pmids = esearchData.esearchresult.idlist ?? [];

  if (pmids.length === 0) return [];

  // Step 2+3: ESummary(메타데이터) + EFetch(초록) 병렬 실행
  const esummaryParams = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'json',
  });
  if (apiKey) esummaryParams.append('api_key', apiKey);

  const abstractPmids = pmids.slice(0, 10);

  const [esummaryResponse, abstracts] = await Promise.all([
    fetchWithTimeout(`${PUBMED_BASE}/esummary.fcgi?${esummaryParams.toString()}`),
    abstractPmids.length > 0
      ? fetchPubmedAbstracts(abstractPmids, apiKey).catch((): Record<string, string> => {
          console.warn('[PubMed] Abstract fetch failed, returning without abstracts');
          return {};
        })
      : Promise.resolve({} as Record<string, string>),
  ]);

  if (!esummaryResponse.ok) {
    throw new Error(`PubMed ESummary error: ${esummaryResponse.status}`);
  }

  const esummaryData = await esummaryResponse.json() as ESummaryResult;
  const articles: LiteratureItem[] = [];

  for (const pmid of pmids) {
    const item = esummaryData.result[pmid];
    if (!item?.title) continue;

    const doi = item.articleids?.find(a => a.idtype === 'doi')?.value;
    const pmcid = item.articleids?.find(a => a.idtype === 'pmc')?.value;
    const year = item.pubdate ? parseInt(item.pubdate.split(' ')[0], 10) : null;

    articles.push({
      id: `pubmed_${pmid}`,
      source: 'pubmed',
      title: item.title,
      authors: item.authors?.map(a => a.name) ?? [],
      year: Number.isNaN(year) ? null : year,
      journal: item.fulljournalname,
      doi,
      pdfUrl: pmcid
        ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/pdf/`
        : undefined,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      searchedName: query,
      abstract: abstracts[pmid],
    });
  }

  return articles;
}

async function fetchPubmedAbstracts(
  pmids: string[],
  apiKey: string | undefined,
): Promise<Record<string, string>> {
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'xml',
    rettype: 'abstract',
  });
  if (apiKey) params.append('api_key', apiKey);

  const url = `${PUBMED_BASE}/efetch.fcgi?${params.toString()}`;
  const response = await fetchWithTimeout(url);

  if (!response.ok) return {};

  const xmlText = await response.text();
  return parseXmlAbstracts(xmlText);
}

/**
 * PubMed XML에서 PMID-초록 매핑 추출 (간이 파서)
 *
 * Workers 환경에 DOMParser가 없으므로 정규식 사용.
 * PubmedArticle 블록 단위로 파싱하여 PMID-초록 매핑 정확도 확보.
 */
function parseXmlAbstracts(xml: string): Record<string, string> {
  const abstracts: Record<string, string> = {};

  // PubmedArticle 블록 단위로 분리
  const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
  let articleMatch: RegExpExecArray | null;

  while ((articleMatch = articleRegex.exec(xml)) !== null) {
    const block = articleMatch[1];

    // PMID 추출 (첫 번째 PMID만)
    const pmidMatch = /<PMID[^>]*>(\d+)<\/PMID>/.exec(block);
    if (!pmidMatch) continue;
    const pmid = pmidMatch[1];

    // AbstractText 추출 (여러 섹션 합침)
    const abstractParts: string[] = [];
    const abstractRegex = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
    let absMatch: RegExpExecArray | null;
    while ((absMatch = abstractRegex.exec(block)) !== null) {
      const text = absMatch[1]
        .replace(/<[^>]+>/g, '')  // HTML 태그 제거
        .replace(/\s+/g, ' ')    // 공백 정규화
        .trim();
      if (text.length > 0) abstractParts.push(text);
    }

    if (abstractParts.length > 0) {
      abstracts[pmid] = abstractParts.join(' ');
    }
  }

  return abstracts;
}
