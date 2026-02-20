/**
 * Assumption Test Cache Service
 *
 * 가설검정 결과를 캐싱하여 중복 실행을 방지합니다.
 * Smart Flow에서 Step 3 (Data Validation)에서 수행한 가정 검정 결과를
 * Step 4 (Analysis Execution)에서 재사용합니다.
 *
 * @example
 * // Step 3에서 캐시에 저장
 * assumptionCache.setNormality('집중도', { statistic: 0.98, pValue: 0.15, isNormal: true })
 *
 * // Step 4에서 캐시에서 조회 (재실행 방지)
 * const cached = assumptionCache.getNormality('집중도')
 * if (cached) {
 *   // 캐시 사용
 * } else {
 *   // 새로 계산
 * }
 */

import type { StatisticalAssumptions } from '@/types/smart-flow'

/**
 * 정규성 검정 결과 타입
 */
interface NormalityResult {
  statistic: number
  pValue: number
  isNormal: boolean
  testName?: 'shapiro-wilk' | 'kolmogorov-smirnov'
}

/**
 * 등분산성 검정 결과 타입
 */
interface HomogeneityResult {
  statistic: number
  pValue: number
  equalVariance: boolean
  testName?: 'levene' | 'bartlett'
}

/**
 * 독립성 검정 결과 타입
 */
interface IndependenceResult {
  statistic: number
  pValue?: number
  isIndependent: boolean
  testName?: 'durbin-watson'
}

/**
 * 캐시 엔트리 타입
 */
interface CacheEntry<T> {
  result: T
  timestamp: number
  dataHash: string
}

/**
 * 데이터 해시 생성 (충돌 방지를 위한 강화된 체크섬)
 *
 * mean/variance만 사용하면 다른 데이터셋이 같은 해시를 가질 수 있음.
 * 첫/마지막 값, 정렬된 값의 체크섬을 추가하여 충돌 방지.
 */
function generateDataHash(data: number[]): string {
  if (data.length === 0) return 'empty'

  const n = data.length
  const sum = data.reduce((a, b) => a + b, 0)
  const mean = sum / n
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n

  // 정렬된 값의 체크섬 (순서 독립적 해시)
  const sorted = [...data].sort((a, b) => a - b)
  const first = sorted[0]
  const last = sorted[n - 1]
  const median = sorted[Math.floor(n / 2)]

  // 간단한 체크섬: 모든 값의 합 + 인덱스 가중치
  const checksum = data.reduce((acc, val, i) => acc + val * (i + 1), 0)

  return `n${n}_m${mean.toFixed(4)}_v${variance.toFixed(4)}_f${first.toFixed(2)}_l${last.toFixed(2)}_md${median.toFixed(2)}_cs${checksum.toFixed(2)}`
}

/**
 * 그룹 데이터 해시 생성
 */
function generateGroupsHash(groups: number[][]): string {
  return groups.map((g, i) => `g${i}:${generateDataHash(g)}`).join('|')
}

/**
 * 가정 검정 캐시 클래스
 */
class AssumptionCacheService {
  private static instance: AssumptionCacheService | null = null

  private normalityCache = new Map<string, CacheEntry<NormalityResult>>()
  private homogeneityCache = new Map<string, CacheEntry<HomogeneityResult>>()
  private independenceCache = new Map<string, CacheEntry<IndependenceResult>>()

  // 캐시 만료 시간 (5분)
  private readonly CACHE_TTL = 5 * 60 * 1000

  private constructor() {
    // Singleton
  }

  static getInstance(): AssumptionCacheService {
    if (!AssumptionCacheService.instance) {
      AssumptionCacheService.instance = new AssumptionCacheService()
    }
    return AssumptionCacheService.instance
  }

  /**
   * 캐시 유효성 검사
   */
  private isValid<T>(entry: CacheEntry<T> | undefined, dataHash: string): boolean {
    if (!entry) return false
    if (entry.dataHash !== dataHash) return false
    if (Date.now() - entry.timestamp > this.CACHE_TTL) return false
    return true
  }

  // ===== 정규성 검정 캐시 =====

  /**
   * 정규성 검정 결과 조회
   */
  getNormality(variableName: string, data: number[]): NormalityResult | null {
    const cacheKey = variableName
    const dataHash = generateDataHash(data)
    const entry = this.normalityCache.get(cacheKey)

    if (this.isValid(entry, dataHash)) {
      return entry!.result
    }
    return null
  }

  /**
   * 정규성 검정 결과 저장
   */
  setNormality(variableName: string, data: number[], result: NormalityResult): void {
    const cacheKey = variableName
    const dataHash = generateDataHash(data)

    this.normalityCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      dataHash
    })
  }

  // ===== 등분산성 검정 캐시 =====

  /**
   * 등분산성 검정 결과 조회
   */
  getHomogeneity(groupVariableName: string, groups: number[][]): HomogeneityResult | null {
    const cacheKey = groupVariableName
    const dataHash = generateGroupsHash(groups)
    const entry = this.homogeneityCache.get(cacheKey)

    if (this.isValid(entry, dataHash)) {
      return entry!.result
    }
    return null
  }

  /**
   * 등분산성 검정 결과 저장
   */
  setHomogeneity(groupVariableName: string, groups: number[][], result: HomogeneityResult): void {
    const cacheKey = groupVariableName
    const dataHash = generateGroupsHash(groups)

    this.homogeneityCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      dataHash
    })
  }

  // ===== 독립성 검정 캐시 =====

  /**
   * 독립성 검정 결과 조회 (Durbin-Watson 등)
   */
  getIndependence(variableName: string, data: number[]): IndependenceResult | null {
    const cacheKey = variableName
    const dataHash = generateDataHash(data)
    const entry = this.independenceCache.get(cacheKey)

    if (this.isValid(entry, dataHash)) {
      return entry!.result
    }
    return null
  }

  /**
   * 독립성 검정 결과 저장
   */
  setIndependence(variableName: string, data: number[], result: IndependenceResult): void {
    const cacheKey = variableName
    const dataHash = generateDataHash(data)

    this.independenceCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      dataHash
    })
  }

  // ===== 유틸리티 메서드 =====

  /**
   * Smart Flow StatisticalAssumptions 결과를 캐시에 일괄 저장
   */
  cacheFromSmartFlowAssumptions(
    assumptions: StatisticalAssumptions,
    dataInfo: {
      numericVariable?: string
      numericData?: number[]
      groupVariable?: string
      groups?: number[][]
    }
  ): void {
    // 정규성 검정 결과 캐싱
    if (assumptions.normality?.shapiroWilk && dataInfo.numericVariable && dataInfo.numericData) {
      this.setNormality(dataInfo.numericVariable, dataInfo.numericData, {
        statistic: assumptions.normality.shapiroWilk.statistic || 0,
        pValue: assumptions.normality.shapiroWilk.pValue || 0,
        isNormal: assumptions.normality.shapiroWilk.isNormal,
        testName: 'shapiro-wilk'
      })
    }

    // 등분산성 검정 결과 캐싱
    if (assumptions.homogeneity?.levene && dataInfo.groupVariable && dataInfo.groups) {
      this.setHomogeneity(dataInfo.groupVariable, dataInfo.groups, {
        statistic: assumptions.homogeneity.levene.statistic || 0,
        pValue: assumptions.homogeneity.levene.pValue || 0,
        equalVariance: assumptions.homogeneity.levene.equalVariance,
        testName: 'levene'
      })
    }
  }

  /**
   * 전체 캐시 클리어
   */
  clear(): void {
    this.normalityCache.clear()
    this.homogeneityCache.clear()
    this.independenceCache.clear()
  }

  /**
   * 캐시 통계
   */
  getStats(): {
    normalityCount: number
    homogeneityCount: number
    independenceCount: number
  } {
    return {
      normalityCount: this.normalityCache.size,
      homogeneityCount: this.homogeneityCache.size,
      independenceCount: this.independenceCache.size
    }
  }

  /**
   * 디버그: 캐시 내용 출력
   */
  debug(): void {
    console.log('[AssumptionCache] Stats:', this.getStats())
    console.log('[AssumptionCache] Normality keys:', Array.from(this.normalityCache.keys()))
    console.log('[AssumptionCache] Homogeneity keys:', Array.from(this.homogeneityCache.keys()))
  }
}

// 싱글톤 인스턴스 export
export const assumptionCache = AssumptionCacheService.getInstance()

// 타입 export
export type { NormalityResult, HomogeneityResult, IndependenceResult }
