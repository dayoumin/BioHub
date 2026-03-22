/**
 * 상대 시간 표시 유틸
 *
 * 하드코딩 한국어와 i18n labels 양쪽 지원.
 */

interface TimeAgoLabels {
  justNow: string
  minutesAgo: (n: number) => string
  hoursAgo: (n: number) => string
  daysAgo: (n: number) => string
}

const KO_LABELS: TimeAgoLabels = {
  justNow: '방금 전',
  minutesAgo: (n) => `${n}분 전`,
  hoursAgo: (n) => `${n}시간 전`,
  daysAgo: (n) => `${n}일 전`,
}

/**
 * timestamp(ms)를 상대 시간 문자열로 변환
 *
 * @param timestamp - Unix timestamp (ms) 또는 Date
 * @param labels - i18n 레이블 (생략 시 한국어 기본값)
 */
export function formatTimeAgo(
  timestamp: number | Date,
  labels: TimeAgoLabels = KO_LABELS,
): string {
  const ms = typeof timestamp === 'number' ? timestamp : timestamp.getTime()
  const diff = Date.now() - ms
  const minutes = Math.floor(diff / 60_000)

  if (minutes < 1) return labels.justNow
  if (minutes < 60) return labels.minutesAgo(minutes)

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return labels.hoursAgo(hours)

  const days = Math.floor(hours / 24)
  return labels.daysAgo(days)
}
