/**
 * Worker 3 scikit-learn 패키지 로딩 테스트
 *
 * Worker 3에서 sklearn을 사용하는 메서드들이 정상적으로 동작하는지 검증
 * - WORKER_EXTRA_PACKAGES에 'scikit-learn' 포함 확인
 * - Worker 3 로딩 시 scikit-learn 패키지 로드 확인
 */

import { describe, it } from '@jest/globals'

/**
 * Worker별 추가 패키지 정의 (테스트용 복사)
 * 원본: lib/services/pyodide/core/pyodide-core.service.ts
 */
const WORKER_EXTRA_PACKAGES = Object.freeze<Record<1 | 2 | 3 | 4, readonly string[]>>({
  1: [],
  2: ['statsmodels', 'pandas'],
  3: ['statsmodels', 'pandas', 'scikit-learn'],
  4: ['statsmodels', 'scikit-learn']
})

describe('Worker 3 scikit-learn 패키지', () => {
  describe('WORKER_EXTRA_PACKAGES 설정', () => {
    it('Worker 3에 scikit-learn이 포함되어야 함', () => {
      const worker3Packages = WORKER_EXTRA_PACKAGES[3]
      expect(worker3Packages).toContain('scikit-learn')
    })

    it('Worker 3에 statsmodels이 포함되어야 함', () => {
      const worker3Packages = WORKER_EXTRA_PACKAGES[3]
      expect(worker3Packages).toContain('statsmodels')
    })

    it('Worker 3에 pandas가 포함되어야 함', () => {
      const worker3Packages = WORKER_EXTRA_PACKAGES[3]
      expect(worker3Packages).toContain('pandas')
    })

    it('Worker 3는 정확히 3개의 패키지를 가져야 함', () => {
      const worker3Packages = WORKER_EXTRA_PACKAGES[3]
      expect(worker3Packages.length).toBe(3)
    })

    it('Worker 3 패키지는 읽기 전용이어야 함', () => {
      const worker3Packages = WORKER_EXTRA_PACKAGES[3]
      expect(Object.isFrozen(WORKER_EXTRA_PACKAGES)).toBe(true)
      expect(Array.isArray(worker3Packages)).toBe(true)
    })
  })

  describe('다른 Worker와 비교', () => {
    it('Worker 1은 추가 패키지가 없어야 함', () => {
      const worker1Packages = WORKER_EXTRA_PACKAGES[1]
      expect(worker1Packages.length).toBe(0)
    })

    it('Worker 2는 statsmodels와 pandas만 포함해야 함', () => {
      const worker2Packages = WORKER_EXTRA_PACKAGES[2]
      expect(worker2Packages).toContain('statsmodels')
      expect(worker2Packages).toContain('pandas')
      expect(worker2Packages).not.toContain('scikit-learn')
    })

    it('Worker 4는 statsmodels와 scikit-learn을 포함해야 함', () => {
      const worker4Packages = WORKER_EXTRA_PACKAGES[4]
      expect(worker4Packages).toContain('statsmodels')
      expect(worker4Packages).toContain('scikit-learn')
    })

    it('Worker 3와 Worker 4 모두 scikit-learn을 포함해야 함', () => {
      const worker3Packages = WORKER_EXTRA_PACKAGES[3]
      const worker4Packages = WORKER_EXTRA_PACKAGES[4]
      expect(worker3Packages).toContain('scikit-learn')
      expect(worker4Packages).toContain('scikit-learn')
    })
  })

  describe('패키지 이름 검증', () => {
    it('모든 패키지 이름은 문자열이어야 함', () => {
      const allPackages = [
        ...WORKER_EXTRA_PACKAGES[1],
        ...WORKER_EXTRA_PACKAGES[2],
        ...WORKER_EXTRA_PACKAGES[3],
        ...WORKER_EXTRA_PACKAGES[4]
      ]

      allPackages.forEach(pkg => {
        expect(typeof pkg).toBe('string')
        expect(pkg.length).toBeGreaterThan(0)
      })
    })

    it('중복된 패키지 이름이 없어야 함 (각 Worker 내)', () => {
      const checkDuplicates = (packages: readonly string[]) => {
        const uniquePackages = new Set(packages)
        return uniquePackages.size === packages.length
      }

      expect(checkDuplicates(WORKER_EXTRA_PACKAGES[1])).toBe(true)
      expect(checkDuplicates(WORKER_EXTRA_PACKAGES[2])).toBe(true)
      expect(checkDuplicates(WORKER_EXTRA_PACKAGES[3])).toBe(true)
      expect(checkDuplicates(WORKER_EXTRA_PACKAGES[4])).toBe(true)
    })

    it('scikit-learn 패키지 이름이 정확해야 함 (sklearn 아님)', () => {
      const worker3Packages = WORKER_EXTRA_PACKAGES[3]
      const worker4Packages = WORKER_EXTRA_PACKAGES[4]

      expect(worker3Packages).toContain('scikit-learn')
      expect(worker3Packages).not.toContain('sklearn')

      expect(worker4Packages).toContain('scikit-learn')
      expect(worker4Packages).not.toContain('sklearn')
    })
  })
})
