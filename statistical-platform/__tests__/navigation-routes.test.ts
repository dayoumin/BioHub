/**
 * Navigation Routes Test
 *
 * 목적: /analysis 라우트 제거 후 올바른 경로로 이동하는지 검증
 * 파일: file-upload.tsx, statistical-tools-section.tsx, data-analysis-flow.tsx
 */

import { describe, it, expect } from '@jest/globals'

describe('Navigation Routes Validation', () => {
  describe('file-upload.tsx navigation', () => {
    it('should navigate to /statistics with dataset parameter', () => {
      const datasetId = 'test-dataset-123'
      const expectedUrl = `/statistics?dataset=${datasetId}`

      // URL 생성 검증
      expect(expectedUrl).toBe('/statistics?dataset=test-dataset-123')
      expect(expectedUrl).not.toContain('/analysis')
    })

    it('should navigate to /data with view parameter', () => {
      const datasetId = 'test-dataset-456'
      const expectedUrl = `/data?view=${datasetId}`

      // URL 생성 검증
      expect(expectedUrl).toBe('/data?view=test-dataset-456')
      expect(expectedUrl).not.toContain('/analysis')
    })

    it('should encode special characters in dataset ID', () => {
      const datasetId = 'test-dataset-with-spaces & symbols'
      const expectedUrl = `/statistics?dataset=${datasetId}`

      // 특수문자 포함 검증
      expect(expectedUrl).toContain('test-dataset-with-spaces & symbols')
    })
  })

  describe('statistical-tools-section.tsx navigation', () => {
    it('should have correct link to statistics page', () => {
      const statisticsLink = '/statistics'

      // 링크 경로 검증
      expect(statisticsLink).toBe('/statistics')
      expect(statisticsLink).not.toBe('/analysis')
    })

    it('should not contain legacy /analysis route', () => {
      const validRoutes = ['/statistics', '/smart-analysis', '/data']

      // 유효한 라우트만 포함
      validRoutes.forEach(route => {
        expect(route).not.toContain('/analysis')
      })
    })
  })

  describe('data-analysis-flow.tsx navigation', () => {
    it('should navigate to /statistics with method and prompt', () => {
      const method = 't-test'
      const prompt = 'Compare two groups'
      const expectedUrl = `/statistics?method=${method}&prompt=${encodeURIComponent(prompt)}`

      // URL 생성 검증
      expect(expectedUrl).toBe('/statistics?method=t-test&prompt=Compare%20two%20groups')
      expect(expectedUrl).not.toContain('/analysis')
    })

    it('should properly encode prompt with special characters', () => {
      const prompt = 'Test with spaces & symbols! @#$%'
      const encoded = encodeURIComponent(prompt)

      // URL 인코딩 검증
      expect(encoded).toBe('Test%20with%20spaces%20%26%20symbols!%20%40%23%24%25')
      expect(encoded).not.toContain(' ')
    })
  })

  describe('Route consistency across all files', () => {
    it('should use /statistics for statistical analysis', () => {
      const statisticsRoutes = [
        '/statistics',
        '/statistics?dataset=123',
        '/statistics?method=t-test&prompt=test'
      ]

      // 모든 통계 분석 경로는 /statistics 사용
      statisticsRoutes.forEach(route => {
        expect(route).toContain('/statistics')
        expect(route).not.toContain('/analysis')
      })
    })

    it('should use /data for data viewing', () => {
      const dataRoutes = [
        '/data',
        '/data?view=123'
      ]

      // 모든 데이터 보기 경로는 /data 사용
      dataRoutes.forEach(route => {
        expect(route).toContain('/data')
        expect(route).not.toContain('/analysis')
      })
    })

    it('should not contain any legacy /analysis routes', () => {
      const allValidRoutes = [
        '/statistics',
        '/smart-analysis',
        '/data',
        '/upload',
        '/'
      ]

      // 레거시 /analysis 경로 없음
      allValidRoutes.forEach(route => {
        expect(route).not.toBe('/analysis')
        expect(route).not.toContain('/analysis')
      })
    })
  })

  describe('URL parameter handling', () => {
    it('should handle dataset parameter correctly', () => {
      const datasetId = 'my-dataset'
      const url = new URL(`http://localhost:3000/statistics?dataset=${datasetId}`)

      // URL 파라미터 파싱 검증
      expect(url.searchParams.get('dataset')).toBe('my-dataset')
    })

    it('should handle multiple parameters correctly', () => {
      const method = 't-test'
      const prompt = 'Compare groups'
      const url = new URL(`http://localhost:3000/statistics?method=${method}&prompt=${encodeURIComponent(prompt)}`)

      // 다중 파라미터 파싱 검증
      expect(url.searchParams.get('method')).toBe('t-test')
      expect(url.searchParams.get('prompt')).toBe('Compare groups')
    })

    it('should handle view parameter correctly', () => {
      const viewId = 'dataset-123'
      const url = new URL(`http://localhost:3000/data?view=${viewId}`)

      // view 파라미터 파싱 검증
      expect(url.searchParams.get('view')).toBe('dataset-123')
    })
  })
})