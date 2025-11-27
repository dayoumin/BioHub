/**
 * DataExplorationStep ID 컬럼 제외 로직 테스트
 *
 * 테스트 목적:
 * - ID/일련번호로 감지된 컬럼이 데이터 시각화에서 제외되는지 확인
 * - numericVariables, categoricalVariables, 기초 통계량 테이블에서 ID 제외 확인
 */

import { ColumnStatistics } from '@/types/smart-flow'

describe('DataExplorationStep ID 컬럼 제외 로직', () => {
  // 테스트용 columnStats 데이터
  const mockColumnStats: ColumnStatistics[] = [
    {
      name: 'id',
      type: 'numeric',
      numericCount: 100,
      textCount: 0,
      uniqueValues: 100,
      missingCount: 0,
      mean: 50.5,
      std: 28.87,
      min: 1,
      max: 100,
      median: 50,
      q1: 25,
      q3: 75,
      idDetection: {
        isId: true,
        reason: '연속 정수 패턴 (1, 2, 3...)',
        confidence: 0.95,
        source: 'value'
      }
    },
    {
      name: 'sample_no',
      type: 'numeric',
      numericCount: 100,
      textCount: 0,
      uniqueValues: 100,
      missingCount: 0,
      mean: 50.5,
      std: 28.87,
      min: 1,
      max: 100,
      median: 50,
      q1: 25,
      q3: 75,
      idDetection: {
        isId: true,
        reason: '열 이름이 ID 패턴과 일치',
        confidence: 0.95,
        source: 'name'
      }
    },
    {
      name: 'weight',
      type: 'numeric',
      numericCount: 85,
      textCount: 0,
      uniqueValues: 85,
      missingCount: 2,
      mean: 150.3,
      std: 25.4,
      min: 95,
      max: 220,
      median: 148,
      q1: 130,
      q3: 170,
      idDetection: {
        isId: false,
        reason: '',
        confidence: 0,
        source: 'none'
      }
    },
    {
      name: 'length',
      type: 'numeric',
      numericCount: 78,
      textCount: 0,
      uniqueValues: 78,
      missingCount: 1,
      mean: 45.6,
      std: 8.2,
      min: 25,
      max: 68,
      median: 45,
      q1: 40,
      q3: 52,
      idDetection: {
        isId: false,
        reason: '',
        confidence: 0,
        source: 'none'
      }
    },
    {
      name: 'species_code',
      type: 'categorical',
      numericCount: 0,
      textCount: 5,
      uniqueValues: 5,
      missingCount: 0,
      idDetection: {
        isId: true,
        reason: '열 이름이 ID 패턴과 일치',
        confidence: 0.9,
        source: 'name'
      }
    },
    {
      name: 'region',
      type: 'categorical',
      numericCount: 0,
      textCount: 3,
      uniqueValues: 3,
      missingCount: 0,
      idDetection: {
        isId: false,
        reason: '',
        confidence: 0,
        source: 'none'
      }
    }
  ]

  // numericVariables 필터 로직 (DataExplorationStep 107-113줄과 동일)
  function filterNumericVariables(columnStats: ColumnStatistics[]): string[] {
    return columnStats
      .filter(col => col.type === 'numeric' && !col.idDetection?.isId)
      .map(col => col.name)
  }

  // categoricalVariables 필터 로직 (DataExplorationStep 116-121줄과 동일)
  function filterCategoricalVariables(columnStats: ColumnStatistics[]): string[] {
    return columnStats
      .filter(col => col.type === 'categorical' && !col.idDetection?.isId)
      .map(col => col.name)
  }

  // 기초 통계량 테이블 필터 로직 (DataExplorationStep 495-496줄과 동일)
  function filterStatsTableColumns(columnStats: ColumnStatistics[]): ColumnStatistics[] {
    return columnStats
      .filter(col => col.type === 'numeric' && !col.idDetection?.isId)
  }

  describe('numericVariables 필터', () => {
    it('ID로 감지된 numeric 컬럼을 제외해야 함', () => {
      const result = filterNumericVariables(mockColumnStats)

      // id, sample_no는 ID로 감지되어 제외
      expect(result).not.toContain('id')
      expect(result).not.toContain('sample_no')

      // weight, length는 일반 수치형으로 포함
      expect(result).toContain('weight')
      expect(result).toContain('length')

      // 총 2개만 포함되어야 함
      expect(result).toHaveLength(2)
    })

    it('idDetection이 없는 경우 포함되어야 함', () => {
      const statsWithoutIdDetection: ColumnStatistics[] = [
        {
          name: 'age',
          type: 'numeric',
          numericCount: 50,
          textCount: 0,
          uniqueValues: 50,
          missingCount: 0
          // idDetection 없음
        }
      ]

      const result = filterNumericVariables(statsWithoutIdDetection)
      expect(result).toContain('age')
    })

    it('idDetection.isId가 false인 경우 포함되어야 함', () => {
      const statsWithFalseId: ColumnStatistics[] = [
        {
          name: 'temperature',
          type: 'numeric',
          numericCount: 40,
          textCount: 0,
          uniqueValues: 40,
          missingCount: 0,
          idDetection: {
            isId: false,
            reason: '',
            confidence: 0,
            source: 'none'
          }
        }
      ]

      const result = filterNumericVariables(statsWithFalseId)
      expect(result).toContain('temperature')
    })
  })

  describe('categoricalVariables 필터', () => {
    it('ID로 감지된 categorical 컬럼을 제외해야 함', () => {
      const result = filterCategoricalVariables(mockColumnStats)

      // species_code는 ID로 감지되어 제외
      expect(result).not.toContain('species_code')

      // region은 일반 범주형으로 포함
      expect(result).toContain('region')

      // 총 1개만 포함되어야 함
      expect(result).toHaveLength(1)
    })

    it('numeric 타입은 포함하지 않아야 함', () => {
      const result = filterCategoricalVariables(mockColumnStats)

      expect(result).not.toContain('weight')
      expect(result).not.toContain('length')
      expect(result).not.toContain('id')
    })
  })

  describe('기초 통계량 테이블 필터', () => {
    it('ID로 감지된 컬럼을 테이블에서 제외해야 함', () => {
      const result = filterStatsTableColumns(mockColumnStats)

      // ID 컬럼 제외 확인
      const names = result.map(col => col.name)
      expect(names).not.toContain('id')
      expect(names).not.toContain('sample_no')

      // 일반 수치형 포함 확인
      expect(names).toContain('weight')
      expect(names).toContain('length')

      // 총 2개만 포함
      expect(result).toHaveLength(2)
    })

    it('통계량이 올바르게 유지되어야 함', () => {
      const result = filterStatsTableColumns(mockColumnStats)

      const weightCol = result.find(col => col.name === 'weight')
      expect(weightCol).toBeDefined()
      expect(weightCol?.mean).toBe(150.3)
      expect(weightCol?.std).toBe(25.4)
      expect(weightCol?.min).toBe(95)
      expect(weightCol?.max).toBe(220)
    })
  })

  describe('엣지 케이스', () => {
    it('빈 columnStats 배열 처리', () => {
      const emptyStats: ColumnStatistics[] = []

      expect(filterNumericVariables(emptyStats)).toEqual([])
      expect(filterCategoricalVariables(emptyStats)).toEqual([])
      expect(filterStatsTableColumns(emptyStats)).toEqual([])
    })

    it('모든 컬럼이 ID인 경우', () => {
      const allIdStats: ColumnStatistics[] = [
        {
          name: 'row_id',
          type: 'numeric',
          numericCount: 100,
          textCount: 0,
          uniqueValues: 100,
          missingCount: 0,
          idDetection: { isId: true, reason: 'ID', confidence: 0.9, source: 'name' }
        },
        {
          name: 'sample_id',
          type: 'numeric',
          numericCount: 100,
          textCount: 0,
          uniqueValues: 100,
          missingCount: 0,
          idDetection: { isId: true, reason: 'ID', confidence: 0.9, source: 'name' }
        }
      ]

      expect(filterNumericVariables(allIdStats)).toEqual([])
      expect(filterStatsTableColumns(allIdStats)).toEqual([])
    })

    it('ID가 없는 경우 모든 컬럼 포함', () => {
      const noIdStats: ColumnStatistics[] = [
        {
          name: 'var1',
          type: 'numeric',
          numericCount: 50,
          textCount: 0,
          uniqueValues: 50,
          missingCount: 0,
          idDetection: { isId: false, reason: '', confidence: 0, source: 'none' }
        },
        {
          name: 'var2',
          type: 'numeric',
          numericCount: 60,
          textCount: 0,
          uniqueValues: 60,
          missingCount: 0,
          idDetection: { isId: false, reason: '', confidence: 0, source: 'none' }
        }
      ]

      const numericResult = filterNumericVariables(noIdStats)
      expect(numericResult).toContain('var1')
      expect(numericResult).toContain('var2')
      expect(numericResult).toHaveLength(2)
    })
  })
})