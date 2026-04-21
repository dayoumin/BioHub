import type { AppLanguageCode } from '@/lib/preferences'

/**
 * 사용자 친화적인 에러 메시지 매핑
 */

const DEFAULT_ERROR_MESSAGE: Record<AppLanguageCode, string> = {
  ko: '오류가 발생했습니다. 다시 시도해주세요.',
  en: 'An error occurred. Please try again.',
}

export const ERROR_MESSAGES: Record<string, Record<AppLanguageCode, string>> = {
  'File too large': {
    ko: '파일이 너무 큽니다. 50MB 이하의 파일을 선택해주세요.',
    en: 'The file is too large. Please choose a file smaller than 50 MB.',
  },
  'Invalid file type': {
    ko: '지원하지 않는 파일 형식입니다. CSV 또는 Excel 파일을 업로드해주세요.',
    en: 'Unsupported file type. Please upload a CSV or Excel file.',
  },
  'No data in file': {
    ko: '파일에 데이터가 없습니다. 파일 내용을 확인해주세요.',
    en: 'The file does not contain any data. Check the file contents and try again.',
  },
  ENOENT: {
    ko: '파일을 찾을 수 없습니다. 다시 시도해주세요.',
    en: 'The file could not be found. Please try again.',
  },
  'Unexpected token': {
    ko: '파일 형식이 올바르지 않습니다. CSV 파일을 확인해주세요.',
    en: 'The file format is invalid. Please check the CSV file.',
  },
  'CSV parsing error': {
    ko: '파일을 읽는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.',
    en: 'An error occurred while reading the file. Please check the CSV format.',
  },
  'Invalid CSV': {
    ko: 'CSV 파일 형식이 올바르지 않습니다.',
    en: 'The CSV file format is invalid.',
  },
  'Too many rows': {
    ko: '데이터가 너무 많습니다. 100,000행 이하로 줄여주세요.',
    en: 'The dataset has too many rows. Reduce it to 100,000 rows or fewer.',
  },
  'Too many columns': {
    ko: '컬럼이 너무 많습니다. 1,000개 이하로 줄여주세요.',
    en: 'The dataset has too many columns. Reduce it to 1,000 columns or fewer.',
  },
  'No numeric columns': {
    ko: '수치형 데이터가 없습니다. 분석할 수 있는 숫자 데이터가 필요합니다.',
    en: 'No numeric columns were found. Numeric data is required for this analysis.',
  },
  'Insufficient data': {
    ko: '데이터가 너무 적습니다. 최소 3개 이상의 데이터가 필요합니다.',
    en: 'There is not enough data. At least three data points are required.',
  },
  'Shapiro-Wilk failed': {
    ko: '정규성 검정을 수행할 수 없습니다. 데이터를 확인해주세요.',
    en: 'The normality check could not be completed. Review the data and try again.',
  },
  'Levene test failed': {
    ko: '등분산성 검정을 수행할 수 없습니다. 그룹 데이터를 확인해주세요.',
    en: 'The homogeneity of variance check could not be completed. Review the group data and try again.',
  },
  'Analysis failed': {
    ko: '분석 중 오류가 발생했습니다. 데이터와 선택한 방법을 확인해주세요.',
    en: 'Analysis failed. Check the data and selected method, then try again.',
  },
  'Not enough groups': {
    ko: '그룹 비교를 위해서는 최소 2개 이상의 그룹이 필요합니다.',
    en: 'At least two groups are required for a group comparison.',
  },
  'Singular matrix': {
    ko: '데이터에 다중공선성 문제가 있습니다. 변수 간 상관관계를 확인해주세요.',
    en: 'The data has a multicollinearity issue. Review correlations between variables.',
  },
  '정규성 검정 실패': {
    ko: '정규성 검정 실패',
    en: 'The normality check failed. Expert review is recommended.',
  },
  '등분산성 검정 실패': {
    ko: '등분산성 검정 실패',
    en: 'The homogeneity of variance check failed. Expert review is recommended.',
  },
  'Pyodide initialization failed': {
    ko: '통계 엔진을 불러오는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.',
    en: 'An error occurred while loading the statistics engine. Refresh the page and try again.',
  },
  'Python execution error': {
    ko: '통계 계산 중 오류가 발생했습니다. 다시 시도해주세요.',
    en: 'An error occurred during the statistical computation. Please try again.',
  },
  'Pyodide 계산 오류': {
    ko: 'Pyodide 계산 오류',
    en: 'Analysis failed. Check the data and selected method, then try again.',
  },
  NameError: {
    ko: '분석에 필요한 변수를 찾을 수 없습니다. 변수 선택을 확인해주세요.',
    en: 'A required variable could not be found. Review the variable selection and try again.',
  },
  ValueError: {
    ko: '데이터 값이 분석 조건에 맞지 않습니다. 데이터를 확인해주세요.',
    en: 'The data values do not satisfy the analysis requirements. Review the data and try again.',
  },
  TypeError: {
    ko: '데이터 타입이 올바르지 않습니다. 수치형/범주형 변수를 확인해주세요.',
    en: 'The data type is invalid. Review the numeric and categorical variables.',
  },
  ZeroDivisionError: {
    ko: '0으로 나눌 수 없습니다. 데이터에 상수 변수가 없는지 확인해주세요.',
    en: 'A division by zero occurred. Check whether the data contains constant variables.',
  },
  MemoryError: {
    ko: '데이터가 너무 커서 메모리가 부족합니다. 데이터 크기를 줄여주세요.',
    en: 'There is not enough memory to process this dataset. Reduce the data size and try again.',
  },
  LinAlgError: {
    ko: '행렬 계산 오류입니다. 변수 간 완전한 상관(다중공선성)이 있는지 확인해주세요.',
    en: 'A matrix computation error occurred. Check for perfect correlation between variables.',
  },
  ConvergenceWarning: {
    ko: '분석이 수렴하지 않았습니다. 데이터를 확인하거나 다른 분석 방법을 시도해주세요.',
    en: 'The analysis did not converge. Review the data or try a different method.',
  },
  'Network error': {
    ko: '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.',
    en: 'There is a network problem. Check your internet connection and try again.',
  },
  Timeout: {
    ko: '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
    en: 'The request timed out. Please try again in a moment.',
  },
  'Unknown error': {
    ko: '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    en: 'An unknown error occurred. Please try again later.',
  },
  'Permission denied': {
    ko: '파일 접근 권한이 없습니다. 파일 권한을 확인해주세요.',
    en: 'File access is denied. Check the file permissions and try again.',
  },
  'Out of memory': {
    ko: '메모리가 부족합니다. 다른 프로그램을 종료하고 다시 시도해주세요.',
    en: 'There is not enough memory available. Close other programs and try again.',
  },
  "Cohen's d에 유효한 숫자를 입력하세요": {
    ko: "Cohen's d에 유효한 숫자를 입력하세요",
    en: "Enter a valid number for Cohen's d.",
  },
  "Cohen's f에 유효한 숫자를 입력하세요": {
    ko: "Cohen's f에 유효한 숫자를 입력하세요",
    en: "Enter a valid number for Cohen's f.",
  },
  'α에 유효한 숫자를 입력하세요': {
    ko: 'α에 유효한 숫자를 입력하세요',
    en: 'Enter a valid number for alpha.',
  },
  '검정력에 유효한 숫자를 입력하세요': {
    ko: '검정력에 유효한 숫자를 입력하세요',
    en: 'Enter a valid number for power.',
  },
  '그룹 수에 유효한 숫자를 입력하세요': {
    ko: '그룹 수에 유효한 숫자를 입력하세요',
    en: 'Enter a valid number for the number of groups.',
  },
  '비율 p₁에 유효한 숫자를 입력하세요': {
    ko: '비율 p₁에 유효한 숫자를 입력하세요',
    en: 'Enter a valid number for proportion p₁.',
  },
  '비율 p₂에 유효한 숫자를 입력하세요': {
    ko: '비율 p₂에 유효한 숫자를 입력하세요',
    en: 'Enter a valid number for proportion p₂.',
  },
  '상관계수 r에 유효한 숫자를 입력하세요': {
    ko: '상관계수 r에 유효한 숫자를 입력하세요',
    en: 'Enter a valid number for correlation r.',
  },
  '유의수준 α는 0~1 사이여야 합니다': {
    ko: '유의수준 α는 0~1 사이여야 합니다',
    en: 'Alpha must be between 0 and 1.',
  },
  '검정력은 0~1 사이여야 합니다': {
    ko: '검정력은 0~1 사이여야 합니다',
    en: 'Power must be between 0 and 1.',
  },
  '검정력(1-β)은 유의수준(α)보다 커야 합니다': {
    ko: '검정력(1-β)은 유의수준(α)보다 커야 합니다',
    en: 'Power (1-beta) must be greater than alpha.',
  },
  '효과 크기 d는 0보다 커야 합니다': {
    ko: '효과 크기 d는 0보다 커야 합니다',
    en: "Effect size d must be greater than 0.",
  },
  '효과 크기 f는 0보다 커야 합니다': {
    ko: '효과 크기 f는 0보다 커야 합니다',
    en: "Effect size f must be greater than 0.",
  },
  '그룹 수는 3 이상의 정수여야 합니다': {
    ko: '그룹 수는 3 이상의 정수여야 합니다',
    en: 'The number of groups must be an integer greater than or equal to 3.',
  },
  '수렴하지 않음': {
    ko: '수렴하지 않음 — 효과 크기가 너무 작거나 그룹 수가 많을 수 있습니다',
    en: 'The estimate did not converge. The effect size may be too small or there may be too many groups.',
  },
  '비율은 0 초과 1 미만이어야 합니다': {
    ko: '비율은 0 초과 1 미만이어야 합니다',
    en: 'Proportions must be greater than 0 and less than 1.',
  },
  '두 비율이 동일합니다': {
    ko: '두 비율이 동일합니다 — 탐지할 차이가 없습니다',
    en: 'The two proportions are identical, so there is no difference to detect.',
  },
  'r은 -1 ~ 1 범위여야 합니다': {
    ko: 'r은 -1 ~ 1 범위여야 합니다',
    en: 'r must be between -1 and 1.',
  },
  'r이 0이면 검정력을 달성할 수 없습니다': {
    ko: 'r이 0이면 검정력을 달성할 수 없습니다',
    en: 'If r is 0, the target power cannot be achieved.',
  },
}

export function containsHangul(value: string): boolean {
  return /[가-힣]/.test(value)
}

export type LocalizedErrorResolutionKind = 'mapped' | 'fallback' | 'raw'

export interface LocalizedErrorResolution {
  message: string
  kind: LocalizedErrorResolutionKind
  rawMessage: string
  matchedKey?: string
}

interface ErrorMessageLookupResult {
  key: string
  message: string
}

function lookupErrorMessage(
  errorString: string,
  language: AppLanguageCode,
): ErrorMessageLookupResult | null {
  if (ERROR_MESSAGES[errorString]) {
    return {
      key: errorString,
      message: ERROR_MESSAGES[errorString][language],
    }
  }

  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (errorString.toLowerCase().includes(key.toLowerCase())) {
      return {
        key,
        message: value[language],
      }
    }
  }

  return null
}

/**
 * 기술적 에러 메시지를 사용자 친화적인 메시지로 변환
 */
export function getUserFriendlyErrorMessage(error: string | Error): string {
  return getLocalizedErrorMessage(error, 'ko')
}

export function resolveLocalizedErrorMessage(
  error: string | Error,
  language: AppLanguageCode,
  options: {
    fallback?: string
    allowRawEnglishMessage?: boolean
  } = {},
): LocalizedErrorResolution {
  const errorString = (typeof error === 'string' ? error : error.message).trim()
  const lookedUp = lookupErrorMessage(errorString, language)

  if (lookedUp) {
    return {
      message: lookedUp.message,
      kind: 'mapped',
      rawMessage: errorString,
      matchedKey: lookedUp.key,
    }
  }

  if (
    options.allowRawEnglishMessage !== false
    && !options.fallback
    && language === 'en'
    && errorString
    && !containsHangul(errorString)
  ) {
    return {
      message: errorString,
      kind: 'raw',
      rawMessage: errorString,
    }
  }

  return {
    message: options.fallback ?? DEFAULT_ERROR_MESSAGE[language],
    kind: 'fallback',
    rawMessage: errorString,
  }
}

export function getLocalizedErrorMessage(
  error: string | Error,
  language: AppLanguageCode,
  fallback?: string,
): string {
  return resolveLocalizedErrorMessage(error, language, { fallback }).message
}

/**
 * 에러 레벨에 따른 아이콘과 색상 반환
 */
export function getErrorLevel(error: string): {
  level: 'error' | 'warning' | 'info'
  color: string
  icon: string
} {
  const errorString = error.toLowerCase()

  if (errorString.includes('warning') || errorString.includes('recommend')) {
    return { level: 'warning', color: 'text-yellow-600', icon: '⚠️' }
  }

  if (errorString.includes('info') || errorString.includes('note')) {
    return { level: 'info', color: 'text-blue-600', icon: 'ℹ️' }
  }

  return { level: 'error', color: 'text-red-600', icon: '❌' }
}
