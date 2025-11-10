/**
 * 환경 감지 유틸리티
 *
 * 기능:
 * - 배포 환경 감지 (web/local)
 * - Docling 서버 가용성 체크
 * - Ollama 서버 가용성 체크
 */

export type Environment = 'web' | 'local'

export interface EnvironmentInfo {
  type: Environment
  doclingAvailable: boolean
  ollamaAvailable: boolean
  hostname: string
}

/**
 * 현재 배포 환경 감지
 */
export function detectEnvironment(): Environment {
  // 서버 사이드 렌더링 시 기본값
  if (typeof window === 'undefined') {
    return 'web'
  }

  // Vercel 환경 변수 체크
  if (process.env.NEXT_PUBLIC_VERCEL_ENV) {
    return 'web'
  }

  // localhost 체크
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'local'
  }

  return 'web'
}

/**
 * Docling 서버 가용성 체크 (localhost:8000)
 */
export async function checkDoclingAvailable(): Promise<boolean> {
  // 웹 환경에서는 Docling 불가
  if (detectEnvironment() === 'web') {
    return false
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000) // 2초 타임아웃

    const response = await fetch('http://localhost:8000/health', {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    return response.ok
  } catch {
    return false
  }
}

/**
 * Ollama 서버 가용성 체크 (localhost:11434)
 */
export async function checkOllamaAvailable(): Promise<boolean> {
  const ollamaEndpoint = process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT || 'http://localhost:11434'

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000) // 2초 타임아웃

    const response = await fetch(`${ollamaEndpoint}/api/tags`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    return response.ok
  } catch {
    return false
  }
}

/**
 * 전체 환경 정보 수집
 */
export async function getEnvironmentInfo(): Promise<EnvironmentInfo> {
  const type = detectEnvironment()
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'unknown'

  const [doclingAvailable, ollamaAvailable] = await Promise.all([
    checkDoclingAvailable(),
    checkOllamaAvailable(),
  ])

  return {
    type,
    doclingAvailable,
    ollamaAvailable,
    hostname,
  }
}

/**
 * 환경 정보를 로컬 스토리지에 캐시 (1분 TTL)
 */
const ENV_INFO_KEY = 'environment-info-cache'
const CACHE_TTL = 60 * 1000 // 1분

interface CachedEnvInfo {
  info: EnvironmentInfo
  timestamp: number
}

export async function getCachedEnvironmentInfo(): Promise<EnvironmentInfo> {
  if (typeof window === 'undefined') {
    return getEnvironmentInfo()
  }

  try {
    const cached = localStorage.getItem(ENV_INFO_KEY)
    if (cached) {
      const { info, timestamp }: CachedEnvInfo = JSON.parse(cached)
      const now = Date.now()

      // 캐시가 유효하면 반환
      if (now - timestamp < CACHE_TTL) {
        return info
      }
    }
  } catch {
    // 캐시 읽기 실패 시 무시
  }

  // 캐시가 없거나 만료됨 → 새로 가져오기
  const info = await getEnvironmentInfo()

  try {
    const cached: CachedEnvInfo = {
      info,
      timestamp: Date.now(),
    }
    localStorage.setItem(ENV_INFO_KEY, JSON.stringify(cached))
  } catch {
    // 캐시 저장 실패 시 무시
  }

  return info
}

/**
 * 캐시 무효화
 */
export function invalidateEnvironmentCache(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ENV_INFO_KEY)
  }
}