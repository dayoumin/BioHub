/**
 * 통계 페이지의 "적용 예시" 섹션 색상 관리
 *
 * 모든 통계 페이지에서 일관된 스타일을 사용하기 위한 중앙화된 색상 관리
 * 색상 변경이 필요한 경우 이 파일만 수정하면 전체 페이지에 적용됩니다.
 */

/**
 * 예시 카드의 스타일 클래스
 * 기본적으로 중립적인 색상 사용 (bg-muted)
 */
export const EXAMPLE_CARD_STYLES = {
  /** 예시 카드 컨테이너 스타일 */
  container: 'bg-muted p-3 rounded border',
  /** 예시 제목 스타일 */
  title: 'font-medium',
  /** 예시 설명 스타일 */
  description: 'text-muted-foreground',
} as const

/**
 * 예시 카드 스타일을 반환하는 헬퍼 함수
 * @returns 예시 카드의 Tailwind 클래스 문자열
 */
export function getExampleCardClass(): string {
  return EXAMPLE_CARD_STYLES.container
}

/**
 * 예시 제목 스타일을 반환하는 헬퍼 함수
 * @returns 예시 제목의 Tailwind 클래스 문자열
 */
export function getExampleTitleClass(): string {
  return EXAMPLE_CARD_STYLES.title
}

/**
 * 예시 설명 스타일을 반환하는 헬퍼 함수
 * @returns 예시 설명의 Tailwind 클래스 문자열
 */
export function getExampleDescriptionClass(): string {
  return EXAMPLE_CARD_STYLES.description
}
