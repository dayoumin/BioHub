/**
 * 스마트 분석 파일 업로드 성능 테스트
 *
 * 목적: 빠른 검증 → 즉시 전환 → 백그라운드 상세 검증 패턴 검증
 *
 * 테스트 시나리오:
 * 1. 작은 데이터셋 (100행): 즉시 전환 검증
 * 2. 중간 데이터셋 (1,000행): 성능 개선 확인
 * 3. 큰 데이터셋 (10,000행): 백그라운드 처리 확인
 */

import { DataValidationService } from '@/lib/services/data-validation-service'
import type { DataRow } from '@/types/smart-flow'

describe('스마트 분석 업로드 성능 최적화', () => {
  // 테스트용 데이터 생성 헬퍼
  function generateMockData(rows: number, columns: number = 5): DataRow[] {
    const data: DataRow[] = []
    const columnNames = Array.from({ length: columns }, (_, i) => `col_${i + 1}`)

    for (let i = 0; i < rows; i++) {
      const row: DataRow = {}
      columnNames.forEach((col, idx) => {
        row[col] = idx % 2 === 0 ? i * 10 : `category_${i % 5}`
      })
      data.push(row)
    }

    return data
  }

  describe('빠른 검증 (performValidation)', () => {
    it('작은 데이터셋 (100행)은 50ms 이내 처리', () => {
      const data = generateMockData(100)
      const start = performance.now()

      const result = DataValidationService.performValidation(data)

      const duration = performance.now() - start

      expect(result.isValid).toBe(true)
      expect(result.totalRows).toBe(100)
      expect(duration).toBeLessThan(50) // 50ms 이내
    })

    it('중간 데이터셋 (1,000행)은 100ms 이내 처리', () => {
      const data = generateMockData(1000)
      const start = performance.now()

      const result = DataValidationService.performValidation(data)

      const duration = performance.now() - start

      expect(result.isValid).toBe(true)
      expect(result.totalRows).toBe(1000)
      expect(duration).toBeLessThan(100) // 100ms 이내
    })

    it('큰 데이터셋 (10,000행)은 300ms 이내 처리', () => {
      const data = generateMockData(10000)
      const start = performance.now()

      const result = DataValidationService.performValidation(data)

      const duration = performance.now() - start

      expect(result.isValid).toBe(true)
      expect(result.totalRows).toBe(10000)
      expect(duration).toBeLessThan(300) // 300ms 이내
    })
  })

  describe('상세 검증 (performDetailedValidation)', () => {
    it('작은 데이터셋 (100행)은 200ms 이내 처리', () => {
      const data = generateMockData(100)
      const start = performance.now()

      const result = DataValidationService.performDetailedValidation(data)

      const duration = performance.now() - start

      expect(result.isValid).toBe(true)
      expect(result.columnStats).toBeDefined()
      expect(result.columnStats?.length).toBe(5)
      expect(duration).toBeLessThan(200)
    })

    it('중간 데이터셋 (1,000행)은 500ms 이내 처리', () => {
      const data = generateMockData(1000)
      const start = performance.now()

      const result = DataValidationService.performDetailedValidation(data)

      const duration = performance.now() - start

      expect(result.isValid).toBe(true)
      expect(result.columnStats).toBeDefined()
      expect(duration).toBeLessThan(500)
    })

    it('큰 데이터셋 (10,000행)은 샘플링을 사용하여 1초 이내 처리', () => {
      const data = generateMockData(10000)
      const start = performance.now()

      const result = DataValidationService.performDetailedValidation(data)

      const duration = performance.now() - start

      expect(result.isValid).toBe(true)
      expect(result.totalRows).toBe(10000) // 원본 행 수 유지
      expect(result.columnStats).toBeDefined() // 상세 통계 포함
      expect(duration).toBeLessThan(1000) // 1초 이내
    })
  })

  describe('성능 비교: 빠른 검증 vs 상세 검증', () => {
    it('빠른 검증이 상세 검증보다 최소 2배 빠름', () => {
      const data = generateMockData(1000)

      // 빠른 검증
      const quickStart = performance.now()
      DataValidationService.performValidation(data)
      const quickDuration = performance.now() - quickStart

      // 상세 검증
      const detailedStart = performance.now()
      DataValidationService.performDetailedValidation(data)
      const detailedDuration = performance.now() - detailedStart

      // 빠른 검증이 최소 2배 빠름
      expect(quickDuration * 2).toBeLessThan(detailedDuration)

      console.log(`📊 성능 비교 (1,000행):
        - 빠른 검증: ${quickDuration.toFixed(2)}ms
        - 상세 검증: ${detailedDuration.toFixed(2)}ms
        - 속도 향상: ${(detailedDuration / quickDuration).toFixed(1)}배`)
    })
  })

  describe('에러 처리', () => {
    it('빈 데이터는 즉시 검증 실패 반환', () => {
      const start = performance.now()
      const result = DataValidationService.performValidation([])
      const duration = performance.now() - start

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('데이터가 없습니다.')
      expect(duration).toBeLessThan(10) // 10ms 이내
    })

    it('너무 많은 행은 즉시 검증 실패 반환', () => {
      const data = generateMockData(100001) // MAX_ROWS + 1
      const start = performance.now()
      const result = DataValidationService.performValidation(data)
      const duration = performance.now() - start

      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('데이터가 너무 많습니다')
      expect(duration).toBeLessThan(50) // 즉시 반환
    })
  })

  describe('백그라운드 처리 시뮬레이션', () => {
    it('빠른 검증 → 전환 → 백그라운드 상세 검증 패턴 검증', async () => {
      const data = generateMockData(5000)
      let validationResults: any = null
      let stepChanged = false

      // 1단계: 빠른 검증
      const quickStart = performance.now()
      const quickValidation = DataValidationService.performValidation(data)
      const quickDuration = performance.now() - quickStart

      validationResults = quickValidation
      expect(quickValidation.isValid).toBe(true)
      expect(quickDuration).toBeLessThan(200) // 빠르게 완료

      // 2단계: 즉시 다음 단계로 전환 (시뮬레이션)
      stepChanged = true
      expect(stepChanged).toBe(true)

      // 3단계: 백그라운드 상세 검증 (비동기)
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          const detailedValidation = DataValidationService.performDetailedValidation(data)
          validationResults = detailedValidation
          resolve()
        }, 100)
      })

      // 최종 검증 결과 확인
      expect(validationResults.columnStats).toBeDefined()
      expect(validationResults.columnStats.length).toBe(5)

      console.log(`✅ 백그라운드 처리 패턴 검증 완료:
        - 빠른 검증: ${quickDuration.toFixed(2)}ms
        - 즉시 전환: ✓
        - 상세 검증: 백그라운드 완료 ✓`)
    })
  })
})
