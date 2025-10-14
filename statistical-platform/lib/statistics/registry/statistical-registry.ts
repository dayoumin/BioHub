/**
 * Statistical Registry
 *
 * 메타데이터 기반 메서드 라우팅 및 동적 그룹 로딩
 * Registry Pattern의 핵심 구현
 */

import { METHOD_METADATA, type MethodId } from './method-metadata'
import type {
  StatisticalGroup,
  GroupModule,
  CalculationResult,
  UsageStats,
} from './types'
import type { CalculatorContext, DataRow, MethodParameters } from '../calculator-types'

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
    methodId: MethodId,
    data: DataRow[],
    params: MethodParameters,
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

    // Context는 나중에 StatisticalCalculator와 통합 시 전달받을 예정
    const context = this.getContext()

    switch (groupId) {
      case 'descriptive': {
        const { createDescriptiveGroup } = await import('../groups/descriptive.group')
        return createDescriptiveGroup(context)
      }
      case 'hypothesis': {
        const { createHypothesisGroup } = await import('../groups/hypothesis.group')
        return createHypothesisGroup(context)
      }
      case 'regression': {
        const { createRegressionGroup } = await import('../groups/regression.group')
        return createRegressionGroup(context)
      }
      case 'nonparametric': {
        const { createNonparametricGroup } = await import('../groups/nonparametric.group')
        return createNonparametricGroup(context)
      }
      case 'anova': {
        const { createAnovaGroup } = await import('../groups/anova.group')
        return createAnovaGroup(context)
      }
      case 'advanced': {
        const { createAdvancedGroup } = await import('../groups/advanced.group')
        return createAdvancedGroup(context)
      }
      default: {
        const exhaustiveCheck: never = groupId
        throw new Error(`Unknown group: ${exhaustiveCheck}`)
      }
    }
  }

  /**
   * Context 가져오기 (임시)
   * 실제로는 StatisticalCalculator에서 전달받을 예정
   */
  private getContext(): CalculatorContext {
    // TODO: StatisticalCalculator와 통합 시 실제 CalculatorContext 전달
    return {
      pyodideService: null as any, // 실제 서비스가 주입될 때까지 null로 둡니다.
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
