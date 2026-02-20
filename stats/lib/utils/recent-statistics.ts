/**
 * 최근 사용한 통계 분석 관리 유틸리티
 * localStorage를 사용하여 최근 사용한 통계 ID를 저장합니다.
 */

const STORAGE_KEY = 'statPlatform_recent'
const MAX_RECENT_ITEMS = 5

/**
 * 통계 페이지 방문 시 최근 사용 목록에 추가
 * @param statisticId - 통계 ID (예: 'descriptive', 'anova', 't-test')
 */
export function addToRecentStatistics(statisticId: string): void {
  try {
    // 현재 목록 가져오기
    const saved = localStorage.getItem(STORAGE_KEY)
    let recent: string[] = saved ? JSON.parse(saved) : []

    // 이미 존재하면 제거 (맨 앞으로 이동하기 위해)
    recent = recent.filter(id => id !== statisticId)

    // 맨 앞에 추가
    recent.unshift(statisticId)

    // 최대 개수 제한
    if (recent.length > MAX_RECENT_ITEMS) {
      recent = recent.slice(0, MAX_RECENT_ITEMS)
    }

    // 저장
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
  } catch (error) {
    console.error('Failed to add to recent statistics:', error)
  }
}

/**
 * 최근 사용한 통계 목록 가져오기
 * @returns 최근 사용한 통계 ID 배열
 */
export function getRecentStatistics(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch (error) {
    console.error('Failed to load recent statistics:', error)
    return []
  }
}

/**
 * 최근 사용 목록 초기화
 */
export function clearRecentStatistics(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear recent statistics:', error)
  }
}
