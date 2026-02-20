/**
 * 사용자 친화적인 에러 메시지 매핑
 */

export const ERROR_MESSAGES: Record<string, string> = {
  // 파일 업로드 관련
  'File too large': '파일이 너무 큽니다. 50MB 이하의 파일을 선택해주세요.',
  'Invalid file type': '지원하지 않는 파일 형식입니다. CSV 또는 Excel 파일을 업로드해주세요.',
  'No data in file': '파일에 데이터가 없습니다. 파일 내용을 확인해주세요.',
  'ENOENT': '파일을 찾을 수 없습니다. 다시 시도해주세요.',

  // CSV 파싱 관련
  'Unexpected token': '파일 형식이 올바르지 않습니다. CSV 파일을 확인해주세요.',
  'CSV parsing error': '파일을 읽는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.',
  'Invalid CSV': 'CSV 파일 형식이 올바르지 않습니다.',

  // 데이터 검증 관련
  'Too many rows': '데이터가 너무 많습니다. 100,000행 이하로 줄여주세요.',
  'Too many columns': '컬럼이 너무 많습니다. 1,000개 이하로 줄여주세요.',
  'No numeric columns': '수치형 데이터가 없습니다. 분석할 수 있는 숫자 데이터가 필요합니다.',
  'Insufficient data': '데이터가 너무 적습니다. 최소 3개 이상의 데이터가 필요합니다.',

  // 통계 분석 관련
  'Shapiro-Wilk failed': '정규성 검정을 수행할 수 없습니다. 데이터를 확인해주세요.',
  'Levene test failed': '등분산성 검정을 수행할 수 없습니다. 그룹 데이터를 확인해주세요.',
  'Analysis failed': '분석 중 오류가 발생했습니다. 데이터와 선택한 방법을 확인해주세요.',
  'Not enough groups': '그룹 비교를 위해서는 최소 2개 이상의 그룹이 필요합니다.',
  'Singular matrix': '데이터에 다중공선성 문제가 있습니다. 변수 간 상관관계를 확인해주세요.',

  // Pyodide 관련
  'Pyodide initialization failed': '통계 엔진을 불러오는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.',
  'Python execution error': '통계 계산 중 오류가 발생했습니다. 다시 시도해주세요.',

  // 네트워크 관련
  'Network error': '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.',
  'Timeout': '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',

  // 일반 오류
  'Unknown error': '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  'Permission denied': '파일 접근 권한이 없습니다. 파일 권한을 확인해주세요.',
  'Out of memory': '메모리가 부족합니다. 다른 프로그램을 종료하고 다시 시도해주세요.'
}

/**
 * 기술적 에러 메시지를 사용자 친화적인 메시지로 변환
 */
export function getUserFriendlyErrorMessage(error: string | Error): string {
  const errorString = typeof error === 'string' ? error : error.message

  // 정확한 매칭 시도
  if (ERROR_MESSAGES[errorString]) {
    return ERROR_MESSAGES[errorString]
  }

  // 부분 매칭 시도
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (errorString.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  // 기본 메시지
  return '오류가 발생했습니다. 다시 시도해주세요.'
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