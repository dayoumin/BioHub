/**
 * 통계 페이지의 모든 색상을 중앙화 관리
 *
 * 모든 통계 페이지에서 일관된 스타일을 사용하기 위한 중앙화된 색상 시스템
 * 색상 변경이 필요한 경우 이 파일만 수정하면 전체 페이지에 적용됩니다.
 *
 * @module statistics-colors
 */

/**
 * 통계 페이지에서 사용하는 색상 스킴 정의
 * 기본적으로 중립적인 색상 사용 (bg-muted, text-muted-foreground)
 */
export const STATISTICS_COLORS = {
  /** 예시 카드 스타일 */
  example: {
    container: 'bg-muted p-3 rounded border',
    title: 'font-medium',
    description: 'text-muted-foreground',
  },

  /** 주요 가정 섹션 스타일 */
  assumptions: {
    container: 'p-4 bg-muted border rounded-lg',
    title: 'font-medium mb-2',
    list: 'text-sm space-y-1',
  },

  /** 정보 박스 스타일 */
  infoBox: {
    container: 'p-4 bg-muted rounded-lg',
    title: 'font-medium mb-2',
    text: 'text-sm',
  },

  /** Alert 컴포넌트 스타일 */
  alert: {
    default: 'bg-muted border',
    info: 'bg-muted border',
    success: 'bg-muted border',
    warning: 'bg-muted border',
  },

  /** 테이블 행 강조 스타일 */
  tableRow: {
    highlight: 'hover:bg-muted/50 bg-muted',
    default: 'hover:bg-muted/50',
  },

  /** Badge 스타일 */
  badge: {
    default: 'bg-muted text-foreground',
    success: 'bg-muted text-foreground',
    warning: 'bg-muted text-foreground',
    error: 'bg-muted text-foreground',
  },
} as const

/**
 * 효과 크기 해석 (중립 색상 버전)
 * 기존의 색상 기반 해석을 중립적인 스타일로 변경
 */
export function getEffectSizeInterpretation(value: number, type: 'etaSquared' | 'cohensD' | 'cramersV' = 'etaSquared') {
  if (type === 'etaSquared') {
    if (value >= 0.14) return { level: '큰 효과', color: '', bg: 'bg-muted' }
    if (value >= 0.06) return { level: '중간 효과', color: '', bg: 'bg-muted' }
    if (value >= 0.01) return { level: '작은 효과', color: '', bg: 'bg-muted' }
    return { level: '효과 없음', color: '', bg: 'bg-muted' }
  }

  if (type === 'cohensD') {
    const absValue = Math.abs(value)
    if (absValue >= 0.8) return { level: '큰 효과', color: '', bg: 'bg-muted' }
    if (absValue >= 0.5) return { level: '중간 효과', color: '', bg: 'bg-muted' }
    if (absValue >= 0.2) return { level: '작은 효과', color: '', bg: 'bg-muted' }
    return { level: '효과 없음', color: '', bg: 'bg-muted' }
  }

  if (type === 'cramersV') {
    if (value >= 0.5) return { level: '강한 연관성', color: '', bg: 'bg-muted' }
    if (value >= 0.3) return { level: '중간 연관성', color: '', bg: 'bg-muted' }
    if (value >= 0.1) return { level: '약한 연관성', color: '', bg: 'bg-muted' }
    return { level: '연관성 없음', color: '', bg: 'bg-muted' }
  }

  return { level: '', color: '', bg: 'bg-muted' }
}

/**
 * 헬퍼 함수: 예시 카드 컨테이너 클래스
 */
export function getExampleCardClass(): string {
  return STATISTICS_COLORS.example.container
}

/**
 * 헬퍼 함수: 예시 제목 클래스
 */
export function getExampleTitleClass(): string {
  return STATISTICS_COLORS.example.title
}

/**
 * 헬퍼 함수: 예시 설명 클래스
 */
export function getExampleDescriptionClass(): string {
  return STATISTICS_COLORS.example.description
}

/**
 * 헬퍼 함수: 주요 가정 섹션 컨테이너 클래스
 */
export function getAssumptionsContainerClass(): string {
  return STATISTICS_COLORS.assumptions.container
}

/**
 * 헬퍼 함수: 주요 가정 제목 클래스
 */
export function getAssumptionsTitleClass(): string {
  return STATISTICS_COLORS.assumptions.title
}

/**
 * 헬퍼 함수: 정보 박스 컨테이너 클래스
 */
export function getInfoBoxClass(): string {
  return STATISTICS_COLORS.infoBox.container
}

/**
 * 헬퍼 함수: 테이블 행 강조 클래스
 */
export function getTableRowHighlightClass(): string {
  return STATISTICS_COLORS.tableRow.highlight
}

/**
 * 레거시 호환성: 기존 함수 시그니처 유지
 * @deprecated 대신 getEffectSizeInterpretation 사용 권장
 */
export function getCramersVInterpretation(v: number) {
  return getEffectSizeInterpretation(v, 'cramersV')
}

/**
 * 레거시 호환성: 기존 함수 시그니처 유지
 * @deprecated 대신 getEffectSizeInterpretation 사용 권장
 */
export function getCohensInterpretation(d: number) {
  const result = getEffectSizeInterpretation(d, 'cohensD')
  return result.level
}
