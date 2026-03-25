/**
 * 최근 사용한 통계 분석 관리 유틸리티
 * localStorage를 사용하여 최근 사용한 통계 ID를 저장합니다.
 */

import { createLocalStorageIO } from '@/lib/utils/local-storage-factory'

const STORAGE_KEY = 'statPlatform_recent'
const MAX_RECENT_ITEMS = 5

const { readJson, writeJson } = createLocalStorageIO('[recent-statistics]')

/**
 * 통계 페이지 방문 시 최근 사용 목록에 추가
 * @param statisticId - 통계 ID (예: 'descriptive', 'anova', 't-test')
 */
export function addToRecentStatistics(statisticId: string): void {
  try {
    let recent = readJson<string[]>(STORAGE_KEY, [])

    // 이미 존재하면 제거 (맨 앞으로 이동하기 위해)
    recent = recent.filter(id => id !== statisticId)

    // 맨 앞에 추가
    recent.unshift(statisticId)

    // 최대 개수 제한
    if (recent.length > MAX_RECENT_ITEMS) {
      recent = recent.slice(0, MAX_RECENT_ITEMS)
    }

    // 저장
    writeJson(STORAGE_KEY, recent)
  } catch (error) {
    console.error('Failed to add to recent statistics:', error)
  }
}

/**
 * 최근 사용한 통계 목록 가져오기
 * @returns 최근 사용한 통계 ID 배열
 */
export function getRecentStatistics(): string[] {
  return readJson<string[]>(STORAGE_KEY, [])
}

/**
 * 최근 사용 목록 초기화
 */
export function clearRecentStatistics(): void {
  try {
    writeJson(STORAGE_KEY, [])
  } catch (error) {
    console.error('Failed to clear recent statistics:', error)
  }
}
