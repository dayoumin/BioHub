/**
 * Pyodide 헬퍼 유틸리티
 * 메모리 관리와 동시성 문제를 해결하기 위한 헬퍼 함수들
 */

import type { PyodideInterface } from '@/types/pyodide'

/**
 * 정규식 특수문자를 이스케이프 처리하는 함수
 * 보안 취약점 방지를 위해 필수
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Pyodide 실행 컨텍스트 관리자
 * 자동으로 글로벌 변수를 정리하고 네임스페이스를 격리합니다
 */
export class PyodideContext {
  private namespace: string
  private globalKeys: Set<string> = new Set()

  constructor(private pyodide: PyodideInterface) {
    // 고유한 네임스페이스 생성 (브라우저 환경 체크)
    const timestamp = Date.now()
    const randomPart = Math.random().toString(36).substr(2, 9)
    // crypto.randomUUID가 사용 가능하면 사용, 아니면 timestamp + random 조합
    const uuid = (typeof window !== 'undefined' && typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID().replace(/-/g, '').substr(0, 12)
      : `${timestamp}_${randomPart}`
    this.namespace = `ctx_${uuid}`
  }

  /**
   * 글로벌 변수 설정 (자동 추적)
   */
  setGlobal(key: string, value: any): void {
    const fullKey = `${this.namespace}_${key}`
    this.pyodide.globals.set(fullKey, value)
    this.globalKeys.add(fullKey)
  }

  /**
   * 글로벌 변수 가져오기
   */
  getGlobal(key: string): any {
    const fullKey = `${this.namespace}_${key}`
    return this.pyodide.globals.get(fullKey)
  }

  /**
   * Python 코드 실행 (네임스페이스 적용)
   */
  async runPythonAsync(code: string): Promise<any> {
    // 코드에서 변수명을 네임스페이스 버전으로 치환
    let namespacedCode = code

    // data_array -> ctx_xxx_data_array 형태로 치환
    this.globalKeys.forEach(fullKey => {
      const originalKey = fullKey.replace(`${this.namespace}_`, '')
      // 정규식 특수문자를 안전하게 이스케이프 처리
      namespacedCode = namespacedCode.replace(
        new RegExp(`\\b${escapeRegExp(originalKey)}\\b`, 'g'),
        fullKey
      )
    })

    return await this.pyodide.runPythonAsync(namespacedCode)
  }

  /**
   * 모든 글로벌 변수 정리
   */
  cleanup(): void {
    this.globalKeys.forEach(key => {
      try {
        this.pyodide.globals.delete(key)
      } catch (e) {
        console.warn(`Failed to delete global ${key}:`, e)
      }
    })
    this.globalKeys.clear()
  }
}

/**
 * Pyodide 실행 래퍼
 * 자동으로 컨텍스트를 관리하고 정리합니다
 */
export async function withPyodideContext<T>(
  pyodide: PyodideInterface,
  callback: (context: PyodideContext) => Promise<T>
): Promise<T> {
  const context = new PyodideContext(pyodide)

  try {
    return await callback(context)
  } finally {
    // 항상 정리 수행
    context.cleanup()
  }
}

/**
 * 재시도 로직을 포함한 Pyodide 실행
 */
export async function retryPyodideOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      console.warn(`Pyodide operation failed (attempt ${i + 1}/${maxRetries}):`, error)

      if (i < maxRetries - 1) {
        // 지수 백오프
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }
  }

  throw lastError || new Error('Pyodide operation failed after all retries')
}

/**
 * 효율적인 해시 생성 함수
 */
export async function generateSecureHash(data: string): Promise<string> {
  // Web Crypto API 사용 가능 여부 확인
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder()
      const buffer = encoder.encode(data)
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } catch (e) {
      console.warn('Web Crypto API failed, falling back to simple hash:', e)
    }
  }

  // 폴백: 간단한 해시 함수
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}