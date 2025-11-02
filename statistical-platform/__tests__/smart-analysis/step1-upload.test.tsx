/**
 * Smart Analysis - Step 1: 데이터 업로드 테스트
 *
 * 테스트 대상:
 * - Store에서 실제 데이터 가져오기
 * - 컬럼 타입 자동 감지 (숫자형 vs 범주형)
 * - Null 체크 및 에러 처리
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { useAppStore } from '@/lib/store'
import type { Dataset } from '@/lib/store'

describe('Smart Analysis - Step 1: 데이터 업로드', () => {

  beforeEach(() => {
    // 각 테스트 전에 Store 초기화
    useAppStore.setState({
      datasets: [],
      projects: [],
      results: []
    })
  })

  describe('컬럼 타입 자동 감지', () => {

    it('숫자형 컬럼을 올바르게 감지해야 함', () => {
      // Given: 숫자형 데이터
      const testData = [
        { age: 25, score: 85.5, height: 170 },
        { age: 30, score: 90.0, height: 175 },
        { age: 28, score: 88.2, height: 168 }
      ]

      const dataset = useAppStore.getState().addDataset({
        name: 'Test Dataset',
        description: 'Test',
        format: 'csv',
        size: '1KB',
        rows: 3,
        columns: 3,
        status: 'active',
        data: testData
      })

      // When: 컬럼 타입 감지 로직 실행
      const columns = Object.keys(testData[0])
      const numericColumns: string[] = []
      const categoricalColumns: string[] = []

      columns.forEach(column => {
        const allNumeric = testData.every(row => {
          const value = row[column as keyof typeof row]
          if (value === null || value === undefined || value === '') {
            return true
          }
          return typeof value === 'number' || !isNaN(Number(value))
        })

        if (allNumeric) {
          numericColumns.push(column)
        } else {
          categoricalColumns.push(column)
        }
      })

      // Then: 모든 컬럼이 숫자형으로 분류되어야 함
      expect(numericColumns).toEqual(['age', 'score', 'height'])
      expect(categoricalColumns).toEqual([])
      expect(dataset.rows).toBe(3)
    })

    it('범주형 컬럼을 올바르게 감지해야 함', () => {
      // Given: 범주형 데이터
      const testData = [
        { name: 'Alice', group: 'A', gender: 'F' },
        { name: 'Bob', group: 'B', gender: 'M' },
        { name: 'Charlie', group: 'A', gender: 'M' }
      ]

      useAppStore.getState().addDataset({
        name: 'Categorical Dataset',
        description: 'Test',
        format: 'csv',
        size: '1KB',
        rows: 3,
        columns: 3,
        status: 'active',
        data: testData
      })

      // When: 컬럼 타입 감지
      const columns = Object.keys(testData[0])
      const numericColumns: string[] = []
      const categoricalColumns: string[] = []

      columns.forEach(column => {
        const allNumeric = testData.every(row => {
          const value = row[column as keyof typeof row]
          if (value === null || value === undefined || value === '') {
            return true
          }
          return typeof value === 'number' || !isNaN(Number(value))
        })

        if (allNumeric) {
          numericColumns.push(column)
        } else {
          categoricalColumns.push(column)
        }
      })

      // Then: 모든 컬럼이 범주형으로 분류되어야 함
      expect(numericColumns).toEqual([])
      expect(categoricalColumns).toEqual(['name', 'group', 'gender'])
    })

    it('혼합 타입 컬럼을 올바르게 분류해야 함', () => {
      // Given: 숫자형 + 범주형 혼합 데이터
      const testData = [
        { age: 25, name: 'Alice', score: 85.5, group: 'A' },
        { age: 30, name: 'Bob', score: 90.0, group: 'B' },
        { age: 28, name: 'Charlie', score: 88.2, group: 'A' }
      ]

      useAppStore.getState().addDataset({
        name: 'Mixed Dataset',
        description: 'Test',
        format: 'csv',
        size: '1KB',
        rows: 3,
        columns: 4,
        status: 'active',
        data: testData
      })

      // When: 컬럼 타입 감지
      const columns = Object.keys(testData[0])
      const numericColumns: string[] = []
      const categoricalColumns: string[] = []

      columns.forEach(column => {
        const allNumeric = testData.every(row => {
          const value = row[column as keyof typeof row]
          if (value === null || value === undefined || value === '') {
            return true
          }
          return typeof value === 'number' || !isNaN(Number(value))
        })

        if (allNumeric) {
          numericColumns.push(column)
        } else {
          categoricalColumns.push(column)
        }
      })

      // Then: 올바르게 분류되어야 함
      expect(numericColumns).toEqual(['age', 'score'])
      expect(categoricalColumns).toEqual(['name', 'group'])
    })

    it('결측치가 있는 데이터를 처리해야 함', () => {
      // Given: 결측치 포함 데이터
      const testData = [
        { age: 25, score: 85.5, name: 'Alice' },
        { age: null, score: 90.0, name: 'Bob' },
        { age: 28, score: null, name: '' },
        { age: undefined, score: 88.2, name: 'Charlie' }
      ]

      useAppStore.getState().addDataset({
        name: 'Missing Data',
        description: 'Test',
        format: 'csv',
        size: '1KB',
        rows: 4,
        columns: 3,
        status: 'active',
        data: testData
      })

      // When: 컬럼 타입 감지 (결측치는 무시)
      const columns = Object.keys(testData[0])
      const numericColumns: string[] = []
      const categoricalColumns: string[] = []

      columns.forEach(column => {
        const allNumeric = testData.every((row: Record<string, unknown>) => {
          const value = row[column]
          if (value === null || value === undefined || value === '') {
            return true  // 결측치는 허용
          }
          return typeof value === 'number' || !isNaN(Number(value))
        })

        if (allNumeric) {
          numericColumns.push(column)
        } else {
          categoricalColumns.push(column)
        }
      })

      // Then: 결측치를 제외하고 타입 판별
      expect(numericColumns).toEqual(['age', 'score'])
      expect(categoricalColumns).toEqual(['name'])
    })
  })

  describe('에러 처리', () => {

    it('존재하지 않는 Dataset ID는 undefined를 반환해야 함', () => {
      // Given: 빈 Store
      const { getDatasetById } = useAppStore.getState()

      // When: 존재하지 않는 ID 조회
      const dataset = getDatasetById('nonexistent-id')

      // Then: undefined 반환
      expect(dataset).toBeUndefined()
    })

    it('데이터가 없는 Dataset을 처리해야 함', () => {
      // Given: 데이터 없는 Dataset
      const dataset = useAppStore.getState().addDataset({
        name: 'Empty Dataset',
        description: 'Test',
        format: 'csv',
        size: '0KB',
        rows: 0,
        columns: 0,
        status: 'active',
        data: []
      })

      // When: 데이터 조회
      const retrievedDataset = useAppStore.getState().getDatasetById(dataset.id)

      // Then: Dataset은 존재하지만 data는 빈 배열
      expect(retrievedDataset).toBeDefined()
      expect(retrievedDataset?.data).toEqual([])
      expect(retrievedDataset?.rows).toBe(0)
    })

    it('data 속성이 undefined인 Dataset을 처리해야 함', () => {
      // Given: data 속성이 없는 Dataset
      const dataset = useAppStore.getState().addDataset({
        name: 'No Data',
        description: 'Test',
        format: 'csv',
        size: '0KB',
        rows: 0,
        columns: 0,
        status: 'active'
        // data 속성 없음
      })

      // When: 데이터 조회
      const retrievedDataset = useAppStore.getState().getDatasetById(dataset.id)

      // Then: data는 undefined
      expect(retrievedDataset).toBeDefined()
      expect(retrievedDataset?.data).toBeUndefined()
    })
  })

  describe('Store 통합 테스트', () => {

    it('실제 CSV 업로드 시나리오를 시뮬레이션해야 함', () => {
      // Given: 실제 CSV 파싱 결과와 유사한 데이터
      const parsedCSVData = [
        { age: '25', score: '85.5', name: 'Alice', group: 'Control' },
        { age: '30', score: '90.0', name: 'Bob', group: 'Treatment' },
        { age: '28', score: '88.2', name: 'Charlie', group: 'Control' }
      ]

      // 문자열을 숫자로 변환 (실제 파서가 하는 작업)
      const convertedData = parsedCSVData.map(row => ({
        age: Number(row.age),
        score: Number(row.score),
        name: row.name,
        group: row.group
      }))

      const dataset = useAppStore.getState().addDataset({
        name: 'Uploaded CSV',
        description: 'User uploaded data',
        format: 'csv',
        size: '2KB',
        rows: 3,
        columns: 4,
        status: 'active',
        data: convertedData
      })

      // When: 컬럼 타입 감지
      const columns = Object.keys(convertedData[0])
      const numericColumns: string[] = []
      const categoricalColumns: string[] = []

      columns.forEach(column => {
        const allNumeric = convertedData.every(row => {
          const value = row[column as keyof typeof row]
          if (value === null || value === undefined || value === '') {
            return true
          }
          return typeof value === 'number' || !isNaN(Number(value))
        })

        if (allNumeric) {
          numericColumns.push(column)
        } else {
          categoricalColumns.push(column)
        }
      })

      // Then: 정확한 분류
      expect(numericColumns).toEqual(['age', 'score'])
      expect(categoricalColumns).toEqual(['name', 'group'])
      expect(dataset.rows).toBe(3)
      expect(dataset.columns).toBe(4)
    })
  })
})
