/**
 * 애플리케이션 전반에서 사용되는 상수들
 */

// 통계 분석 관련 상수
export const STATISTICS = {
  SIGNIFICANCE_LEVELS: {
    HIGH: 0.01,
    MEDIUM: 0.05,
    LOW: 0.10
  },
  CONFIDENCE_LEVELS: {
    HIGH: 0.99,
    MEDIUM: 0.95, 
    LOW: 0.90
  },
  TEST_VALUES: {
    DEFAULT_ONE_SAMPLE: 0,
    MIN_SAMPLE_SIZE: 3,
    MAX_COLUMNS_FOR_CORRELATION: 2
  }
} as const

// Pyodide 로딩 관련 상수
// 단일 진실 공급원 (Single Source of Truth) - 모든 파일은 이 상수를 참조해야 함
const PYODIDE_VERSION = 'v0.28.3'

export const PYODIDE = {
  // 버전 관리
  VERSION: PYODIDE_VERSION,
  // 환경별 버전 오버라이드 (테스트/디버깅용)
  // 예: NEXT_PUBLIC_PYODIDE_VERSION=v0.24.1 npm run dev
  OVERRIDE_VERSION: typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PYODIDE_VERSION,

  // CDN URLs (자동 생성)
  CDN_URL: `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`,
  SCRIPT_URL: `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/pyodide.js`,

  // 패키지 목록
  PACKAGES: ['numpy', 'scipy', 'pandas'],

  // 로딩 진행률
  LOADING_PROGRESS: {
    IDLE: 0,
    BASIC: 40,
    SCIPY: 80,
    READY: 100
  },

  // 타임아웃 설정
  TIMEOUT: {
    LOAD_SCRIPT: 30000,
    LOAD_PACKAGES: 60000
  }
} as const

/**
 * Pyodide CDN URL을 동적으로 생성합니다
 * 환경 변수(OVERRIDE_VERSION)가 있으면 우선 사용
 *
 * 듀얼 모드 지원:
 * - 온라인 모드 (기본): CDN에서 Pyodide 로드
 * - 오프라인 모드: 로컬 경로(/pyodide/)에서 Pyodide 로드
 *   → 환경 변수: NEXT_PUBLIC_PYODIDE_USE_LOCAL=true
 *
 * @returns 현재 사용 중인 Pyodide CDN URL 객체
 *
 * @example
 * 온라인 배포:
 * ```bash
 * # .env.local 없이 빌드
 * npm run build
 * # → out/ (~5 MB, CDN 사용)
 * ```
 *
 * 오프라인 배포:
 * ```bash
 * # .env.local 생성
 * echo "NEXT_PUBLIC_PYODIDE_USE_LOCAL=true" > .env.local
 * # Pyodide 복사
 * cp -r pyodide/* public/pyodide/
 * # 빌드
 * npm run build
 * # → out/ (~250 MB, Pyodide 포함)
 * ```
 */
export function getPyodideCDNUrls() {
  // 오프라인 모드 체크 (환경 변수)
  const useLocal = typeof process !== 'undefined'
    && process.env?.NEXT_PUBLIC_PYODIDE_USE_LOCAL === 'true'

  if (useLocal) {
    // 오프라인 모드: 로컬 경로 사용
    const localPath = (typeof process !== 'undefined'
      && process.env?.NEXT_PUBLIC_PYODIDE_LOCAL_PATH)
      || '/pyodide/'

    return {
      version: 'local',
      indexURL: localPath,
      scriptURL: `${localPath}pyodide.js`,
      isLocal: true
    } as const
  }

  // 온라인 모드: CDN 사용 (기본)
  const version = PYODIDE.OVERRIDE_VERSION || PYODIDE.VERSION
  const baseUrl = `https://cdn.jsdelivr.net/pyodide/${version}/full`

  return {
    version,
    indexURL: `${baseUrl}/`,
    scriptURL: `${baseUrl}/pyodide.js`,
    isLocal: false
  } as const
}

// 타임아웃 상수 (중앙화)
export const TIMEOUT = {
  // Pyodide 로딩
  PYODIDE_SCRIPT: 30000,      // 30초 - Pyodide 스크립트 로딩
  PYODIDE_PACKAGES: 60000,    // 60초 - 패키지 설치

  // 분석 작업
  ANALYSIS_SHORT: 10000,      // 10초 - 간단한 분석
  ANALYSIS_MEDIUM: 30000,     // 30초 - 일반 분석
  ANALYSIS_LONG: 60000,       // 60초 - 복잡한 분석

  // API 호출
  API_CALL: 5000,             // 5초 - API 호출
  OLLAMA_CHECK: 2000,         // 2초 - Ollama 연결 체크

  // UI 상호작용
  DEBOUNCE: 300,              // 300ms - 디바운스
  TOAST: 3000,                // 3초 - 토스트 메시지

  // E2E 테스트
  E2E_FAST: 5000,             // 5초 - 빠른 동작
  E2E_MEDIUM: 15000,          // 15초 - 일반 동작
  E2E_SLOW: 30000,            // 30초 - 느린 동작
  E2E_VERY_SLOW: 60000,       // 60초 - 매우 느린 동작 (Pyodide 로딩 등)
  E2E_PAGE_LOAD: 90000,       // 90초 - 페이지 전체 로딩
} as const

// UI 관련 상수
export const UI = {
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 3000,
  ANIMATION_DURATION: 200,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_FILE_TYPES: ['text/csv', 'application/vnd.ms-excel']
} as const

// 데이터 검증 상수
export const VALIDATION = {
  MIN_DATASET_ROWS: 1,
  MAX_DATASET_ROWS: 100000,
  MIN_NUMERIC_VALUE: Number.MIN_SAFE_INTEGER,
  MAX_NUMERIC_VALUE: Number.MAX_SAFE_INTEGER,
  MAX_COLUMN_NAME_LENGTH: 100,
  MAX_DATASET_NAME_LENGTH: 255
} as const

// 차트 및 시각화 상수
export const CHART = {
  COLORS: {
    PRIMARY: 'hsl(var(--primary))',
    SECONDARY: 'hsl(var(--secondary))',
    ACCENT: 'hsl(var(--accent))',
    SUCCESS: 'hsl(142.1 76.2% 36.3%)',
    WARNING: 'hsl(38 92% 50%)',
    DESTRUCTIVE: 'hsl(var(--destructive))'
  },
  DIMENSIONS: {
    DEFAULT_WIDTH: 400,
    DEFAULT_HEIGHT: 300,
    MIN_WIDTH: 200,
    MIN_HEIGHT: 150
  }
} as const

// 로컬 스토리지 키
export const STORAGE_KEYS = {
  THEME: 'statistical-platform-theme',
  USER_PREFERENCES: 'statistical-platform-preferences',
  DATASETS: 'statistical-platform-datasets',
  ANALYSIS_HISTORY: 'statistical-platform-analysis-history'
} as const

// 에러 메시지
export const ERROR_MESSAGES = {
  PYODIDE_NOT_READY: '통계 엔진이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.',
  INSUFFICIENT_DATA: '선택한 분석 방법에 필요한 데이터가 부족합니다.',
  INVALID_DATASET: '데이터셋과 분석할 컬럼을 선택해주세요.',
  FILE_TOO_LARGE: '파일 크기가 너무 큽니다. 10MB 이하의 파일을 선택해주세요.',
  INVALID_FILE_TYPE: '지원되지 않는 파일 형식입니다. CSV 파일을 선택해주세요.',
  PARSING_ERROR: '파일을 읽는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.'
} as const

// 성공 메시지
export const SUCCESS_MESSAGES = {
  ANALYSIS_COMPLETED: '분석이 성공적으로 완료되었습니다.',
  DATA_LOADED: '데이터가 성공적으로 로드되었습니다.',
  PYODIDE_READY: '통계 엔진이 준비되었습니다.',
  SETTINGS_SAVED: '설정이 저장되었습니다.'
} as const