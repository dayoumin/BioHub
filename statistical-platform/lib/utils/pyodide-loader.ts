/**
 * Pyodide CDN 로더 유틸리티
 *
 * Pyodide는 CDN에서 동적으로 로드됩니다 (npm 패키지 사용 안 함)
 * 싱글톤 패턴으로 인스턴스 재사용 및 메모리 효율성 보장
 */

import type { PyodideInterface } from '@/types/pyodide'
import { getPyodideCDNUrls } from '@/lib/constants'

// Pyodide CDN URL 가져오기 (환경 변수 자동 반영)
const cdnUrls = getPyodideCDNUrls()

// 싱글톤 패턴: 캐시된 Pyodide 인스턴스
let cachedPyodide: PyodideInterface | null = null
let loadingPromise: Promise<PyodideInterface> | null = null

// 로드된 패키지 추적 (중복 로딩 방지)
const loadedPackages = new Set<string>()

/**
 * Pyodide 스크립트를 CDN에서 로드합니다 (내부 함수)
 */
async function loadPyodideScript(): Promise<void> {
  if (window.loadPyodide) {
    return // 이미 로드됨
  }

  console.log(`[Pyodide Loader] CDN에서 Pyodide 스크립트 로딩 중... (버전: ${cdnUrls.version})`)

  const script = document.createElement('script')
  script.src = cdnUrls.scriptURL
  script.async = true

  await new Promise<void>((resolve, reject) => {
    script.onload = () => {
      console.log('[Pyodide Loader] 스크립트 로드 완료')
      resolve()
    }
    script.onerror = (error) => {
      console.error('[Pyodide Loader] 스크립트 로드 실패:', error)
      reject(new Error('Pyodide CDN 스크립트 로드 실패'))
    }
    document.head.appendChild(script)
  })
}

/**
 * Pyodide 인스턴스를 생성합니다 (내부 함수)
 */
async function createPyodideInstance(): Promise<PyodideInterface> {
  await loadPyodideScript()

  console.log('[Pyodide Loader] Pyodide 인스턴스 생성 중...')

  const pyodide = await window.loadPyodide!({
    indexURL: cdnUrls.indexURL
  })

  console.log('[Pyodide Loader] Pyodide 초기화 완료')

  return pyodide
}

/**
 * Pyodide를 CDN에서 로드합니다 (싱글톤 패턴)
 *
 * 동일한 인스턴스를 재사용하여 메모리 효율성과 성능을 향상시킵니다.
 * 여러 페이지에서 동시에 호출해도 하나의 인스턴스만 생성됩니다.
 *
 * @returns Pyodide 인스턴스 (캐시됨)
 * @throws 브라우저 환경이 아니거나 CDN 로드 실패 시 에러
 *
 * @example
 * ```typescript
 * const pyodide = await loadPyodideFromCDN()
 * await pyodide.loadPackage(['numpy', 'scipy'])
 * ```
 */
export async function loadPyodideFromCDN(): Promise<PyodideInterface> {
  // 브라우저 환경 체크
  if (typeof window === 'undefined') {
    throw new Error('Pyodide는 브라우저 환경에서만 사용할 수 있습니다')
  }

  // 이미 캐시된 인스턴스가 있으면 반환
  if (cachedPyodide) {
    console.log('[Pyodide Loader] 캐시된 인스턴스 반환')
    return cachedPyodide
  }

  // 로딩 중이면 동일한 Promise 반환 (중복 로딩 방지)
  if (loadingPromise) {
    console.log('[Pyodide Loader] 로딩 중인 인스턴스 대기...')
    return loadingPromise
  }

  // 새로운 인스턴스 생성
  loadingPromise = createPyodideInstance()

  try {
    cachedPyodide = await loadingPromise
    return cachedPyodide
  } finally {
    loadingPromise = null
  }
}

/**
 * Pyodide와 필요한 패키지를 함께 로드합니다
 *
 * 이미 로드된 패키지는 스킵하여 중복 로딩을 방지합니다.
 *
 * @param packages 로드할 패키지 목록
 * @returns Pyodide 인스턴스 (캐시됨)
 *
 * @example
 * ```typescript
 * const pyodide = await loadPyodideWithPackages(['numpy', 'scipy', 'pandas'])
 * ```
 */
export async function loadPyodideWithPackages(
  packages: string[]
): Promise<PyodideInterface> {
  const pyodide = await loadPyodideFromCDN()

  // 아직 로드되지 않은 패키지만 필터링
  const newPackages = packages.filter(pkg => !loadedPackages.has(pkg))

  if (newPackages.length > 0) {
    console.log(`[Pyodide Loader] 새 패키지 로딩 중: ${newPackages.join(', ')}`)
    await pyodide.loadPackage(newPackages)

    // 로드된 패키지 추적
    newPackages.forEach(pkg => loadedPackages.add(pkg))
    console.log('[Pyodide Loader] 패키지 로드 완료')
  } else {
    console.log('[Pyodide Loader] 모든 패키지 이미 로드됨')
  }

  return pyodide
}

/**
 * Pyodide 버전 정보를 가져옵니다
 *
 * @returns Pyodide 버전 (예: 'v0.29.3')
 */
export function getPyodideVersion(): string {
  return cdnUrls.version
}

/**
 * 캐시된 Pyodide 인스턴스를 초기화합니다 (테스트용)
 *
 * @internal
 */
export function resetPyodideCache(): void {
  cachedPyodide = null
  loadingPromise = null
  loadedPackages.clear()
  console.log('[Pyodide Loader] 캐시 초기화 완료')
}
