/**
 * Storage Service
 * localStorage 옵트아웃 기능을 제공하는 중앙화된 스토리지 서비스
 *
 * 사용자가 "로컬 저장 허용"을 끄면 모든 localStorage 작업을 차단
 */

/**
 * localStorage 사용 가능 여부 확인
 * - statPlatform_localStorageEnabled 키는 항상 허용 (설정 자체를 저장해야 함)
 * - 다른 모든 키는 플래그 체크
 */
function isStorageEnabled(key: string): boolean {
  // 설정 키 자체는 항상 허용 (순환 참조 방지)
  if (
    key === 'statPlatform_localStorageEnabled' ||
    key === 'statPlatform_notifyAnalysisComplete' ||
    key === 'statPlatform_notifyError'
  ) {
    return true
  }

  // localStorage 사용 가능 여부 확인
  try {
    const enabled = localStorage.getItem('statPlatform_localStorageEnabled')
    // 기본값: true (명시적으로 false일 때만 차단)
    return enabled !== 'false'
  } catch {
    // localStorage 접근 불가 시 기본값 true
    return true
  }
}

/**
 * Storage Service
 * localStorage wrapper with opt-out support
 */
export const StorageService = {
  /**
   * localStorage.getItem wrapper
   * 옵트아웃 시 null 반환
   */
  getItem(key: string): string | null {
    if (!isStorageEnabled(key)) {
      return null
    }

    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.error('[StorageService] getItem failed:', error)
      return null
    }
  },

  /**
   * localStorage.setItem wrapper
   * 옵트아웃 시 저장하지 않음
   */
  setItem(key: string, value: string): void {
    if (!isStorageEnabled(key)) {
      return
    }

    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.error('[StorageService] setItem failed:', error)
    }
  },

  /**
   * localStorage.removeItem wrapper
   * 옵트아웃 시에도 삭제는 허용 (정리 목적)
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('[StorageService] removeItem failed:', error)
    }
  },

  /**
   * localStorage.clear wrapper
   */
  clear(): void {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('[StorageService] clear failed:', error)
    }
  },

  /**
   * localStorage 사용 가능 여부 확인
   */
  isEnabled(): boolean {
    return isStorageEnabled('dummy-key')
  },
}
