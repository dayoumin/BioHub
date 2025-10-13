/**
 * Statistical Registry
 *
 * 메타데이터 기반 메서드 라우팅 및 동적 그룹 로딩
 * Registry Pattern의 핵심 구현
 */

import { METHOD_METADATA } from './method-metadata'
import type {
  StatisticalGroup,
  GroupModule,
  CalculationResult,
  UsageStats
} from './types'

/**
 * StatisticalRegistry
 *
 * 역할:
 * 1. 메서드 ID → 그룹 매핑
 * 2. 그룹 동적 import (Lazy Loading)
 * 3. 사용량 통계 추적
 * 4. 캐싱 관리
 */
export class StatisticalRegistry {
  /**
   * 로드된 그룹 모듈 캐시
   */
  private loadedGroups = new Map<StatisticalGroup, GroupModule>()

  /**
   * 사용량 통계
   */
  private usageStats: UsageStats = {
    groupCounts: {
      descriptive: 0,
      hypothesis: 0,
      regression: 0,
      nonparametric: 0,
      anova: 0,
      advanced: 0
    },
    methodCounts: {},
    totalCalls: 0
  }

  /**
   * 메서드 실행
   *
   * @param methodId 메서드 ID (예: 'mean', 'tTest')
   * @param data 데이터 배열
   * @param params 메서드별 파라미터
   * @returns 계산 결과
   */
  async execute(
    methodId: string,
    data: any[],
    params: any
  ): Promise<CalculationResult> {
    try {
      // 1. 메타데이터 조회
      const metadata = METHOD_METADATA[methodId]
      if (!metadata) {
        return {
          success: false,
          error: `Unknown method: ${methodId}`
        }
      }

      // 2. 그룹 로드 (첫 번째만)
      const group = await this.getOrLoadGroup(metadata.group)

      // 3. 사용량 통계 업데이트
      this.updateUsageStats(metadata.group, methodId)

      // 4. 핸들러 실행
      const handler = group.handlers[methodId]
      if (!handler) {
        return {
          success: false,
          error: `Handler not found for method: ${methodId}`
        }
      }

      return await handler(data, params)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 그룹 가져오기 (캐시 우선, 없으면 동적 로드)
   */
  private async getOrLoadGroup(groupId: StatisticalGroup): Promise<GroupModule> {
    // 캐시 확인
    const cached = this.loadedGroups.get(groupId)
    if (cached) {
      return cached
    }

    // 동적 로드
    const module = await this.loadGroup(groupId)
    this.loadedGroups.set(groupId, module)
    return module
  }

  /**
   * 그룹 동적 로드
   *
   * Day 2-3에 그룹 파일 생성 후 주석 해제
   */
  private async loadGroup(groupId: StatisticalGroup): Promise<GroupModule> {
    // TODO: Day 2-3에 구현
    // 현재는 임시 모듈 반환
    console.log(`[Registry] Loading group: ${groupId}`)

    // 동적 import (Day 2-3에 활성화)
    /*
    switch (groupId) {
      case 'descriptive':
        const descriptive = await import('../groups/descriptive.group')
        return descriptive.DescriptiveGroup
      case 'hypothesis':
        const hypothesis = await import('../groups/hypothesis.group')
        return hypothesis.HypothesisGroup
      case 'regression':
        const regression = await import('../groups/regression.group')
        return regression.RegressionGroup
      case 'nonparametric':
        const nonparametric = await import('../groups/nonparametric.group')
        return nonparametric.NonparametricGroup
      case 'anova':
        const anova = await import('../groups/anova.group')
        return anova.AnovaGroup
      case 'advanced':
        const advanced = await import('../groups/advanced.group')
        return advanced.AdvancedGroup
      default:
        throw new Error(`Unknown group: ${groupId}`)
    }
    */

    // 임시 모듈 (Day 2-3까지)
    return {
      id: groupId,
      methods: [],
      handlers: {}
    }
  }

  /**
   * 사용량 통계 업데이트
   */
  private updateUsageStats(group: StatisticalGroup, methodId: string): void {
    this.usageStats.groupCounts[group]++
    this.usageStats.methodCounts[methodId] =
      (this.usageStats.methodCounts[methodId] || 0) + 1
    this.usageStats.totalCalls++
  }

  /**
   * 사용량 통계 조회
   */
  getUsageStats(): Readonly<UsageStats> {
    return { ...this.usageStats }
  }

  /**
   * 특정 그룹이 로드되었는지 확인
   */
  isGroupLoaded(groupId: StatisticalGroup): boolean {
    return this.loadedGroups.has(groupId)
  }

  /**
   * 로드된 그룹 목록
   */
  getLoadedGroups(): StatisticalGroup[] {
    return Array.from(this.loadedGroups.keys())
  }

  /**
   * 캐시 정리 (테스트용)
   */
  clearCache(): void {
    this.loadedGroups.clear()
  }

  /**
   * 사용량 통계 리셋 (테스트용)
   */
  resetStats(): void {
    this.usageStats = {
      groupCounts: {
        descriptive: 0,
        hypothesis: 0,
        regression: 0,
        nonparametric: 0,
        anova: 0,
        advanced: 0
      },
      methodCounts: {},
      totalCalls: 0
    }
  }
}
