/**
 * localStorage 읽기/쓰기 공통 유틸리티
 *
 * 여러 모듈(graph-studio/project-storage, research/project-storage 등)에서
 * 반복되던 isClient 가드, JSON parse/stringify, 에러 핸들링을 한 곳에 모은다.
 *
 * 사용법:
 *   const { readJson, writeJson } = createLocalStorageIO('[my-module]')
 */

/** SSR(Node.js) 환경에서는 localStorage가 없으므로 안전하게 가드 */
function isClient(): boolean {
  return typeof window !== 'undefined'
}

export interface LocalStorageIO {
  /** localStorage에서 JSON 값을 읽는다. 실패 시 fallback 반환. */
  readJson<T>(key: string, fallback: T): T
  /** localStorage에 JSON 값을 쓴다. 실패(quota 초과 등) 시 throw. */
  writeJson(key: string, value: unknown): void
}

/**
 * 모듈별 태그를 받아 localStorage 읽기/쓰기 헬퍼 쌍을 생성한다.
 *
 * @param tag - 에러/경고 메시지에 붙는 모듈 식별 태그 (예: '[project-storage]')
 */
export function createLocalStorageIO(tag: string): LocalStorageIO {
  function readJson<T>(key: string, fallback: T): T {
    if (!isClient()) return fallback

    try {
      const raw = localStorage.getItem(key)
      if (!raw) return fallback
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  }

  function writeJson(key: string, value: unknown): void {
    if (!isClient()) {
      throw new Error(`${tag} ${key} is unavailable outside the browser`)
    }

    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn(`${tag} Failed to write ${key}:`, error)
      throw new Error(`${tag} Failed to write ${key}`)
    }
  }

  return { readJson, writeJson }
}
