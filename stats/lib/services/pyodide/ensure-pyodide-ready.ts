/**
 * Pyodide lazy init 공통 헬퍼
 *
 * 동적 import → 싱글턴 getInstance → 미초기화 시 initialize.
 * assumption-testing-service, diagnostic-pipeline, normality-enrichment-service에서 공유.
 */

import type { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { logger } from '@/lib/utils/logger'

/**
 * Pyodide 코어 서비스를 로드하고 초기화된 인스턴스를 반환한다.
 * 초기화 실패 시 null을 반환 (호출자가 graceful fallback 처리).
 */
export async function ensurePyodideReady(caller: string): Promise<PyodideCoreService | null> {
  try {
    const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
    const pyodide = PyodideCoreService.getInstance()

    if (!pyodide.isInitialized()) {
      await pyodide.initialize()
    }

    return pyodide
  } catch (err) {
    logger.warn(`${caller}: Pyodide initialization failed, skipping`, { error: err })
    return null
  }
}
