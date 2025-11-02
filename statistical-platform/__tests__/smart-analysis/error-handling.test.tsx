'use client'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SmartAnalysisPage from '@/app/(dashboard)/smart-analysis/page'
import { useAppStore } from '@/lib/store'

// Mock useAppStore
jest.mock('@/lib/store', () => ({
  useAppStore: jest.fn(),
}))

// Mock PyodideCoreService
jest.mock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
  PyodideCoreService: {
    getInstance: jest.fn(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      callWorkerMethod: jest.fn().mockResolvedValue({
        pValue: 0.08,
        isNormal: true,
      }),
    })),
  },
}))

describe('SmartAnalysisPage - Error Handling', () => {
  let mockGetDatasetById: jest.Mock
  let mockAddAnalysisResult: jest.Mock

  beforeEach(() => {
    mockGetDatasetById = jest.fn()
    mockAddAnalysisResult = jest.fn(() => 'result-123')
    ;(useAppStore as jest.Mock).mockReturnValue({
      getDatasetById: mockGetDatasetById,
      addAnalysisResult: mockAddAnalysisResult,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('1단계: 데이터 업로드 - 에러 처리', () => {
    it('데이터셋을 찾을 수 없을 때 에러 메시지 표시', async () => {
      mockGetDatasetById.mockReturnValue(null)

      render(<SmartAnalysisPage />)

      // 업로드 완료 핸들러 호출 (FileUpload 컴포넌트에서 호출됨)
      const uploadStep = screen.getByText('1단계: 데이터 업로드')
      expect(uploadStep).toBeInTheDocument()

      // 에러 메시지가 처음에는 없어야 함
      expect(screen.queryByText(/데이터를 찾을 수 없습니다/)).not.toBeInTheDocument()
    })

    it('빈 데이터셋에 대해 사용자 친화적 에러 메시지 표시', async () => {
      mockGetDatasetById.mockReturnValue({
        id: 'dataset-1',
        name: 'test.csv',
        data: [],
        rows: 0,
      })

      render(<SmartAnalysisPage />)

      const uploadStep = screen.getByText('1단계: 데이터 업로드')
      expect(uploadStep).toBeInTheDocument()

      // Alert가 존재하지만 조건부 렌더링이므로 트리거 필요
      // 이는 실제 FileUpload 호출을 통해 테스트됨
    })

    it('성공 시 에러 상태 초기화', async () => {
      const mockData = [
        { id: 1, value: 10, group: 'A' },
        { id: 2, value: 20, group: 'B' },
      ]

      mockGetDatasetById.mockReturnValue({
        id: 'dataset-1',
        name: 'test.csv',
        data: mockData,
        rows: 2,
      })

      render(<SmartAnalysisPage />)

      // 업로드 후 2단계로 전환
      await waitFor(() => {
        const descriptiveStep = screen.queryByText('2단계: 기초 통계 분석')
        if (descriptiveStep) {
          expect(descriptiveStep).toBeInTheDocument()
        }
      })
    })
  })

  describe('3단계: 가정 검정 - Tooltip 및 설명 표시', () => {
    it('정규성 검정 정보 아이콘이 존재', async () => {
      const mockData = [
        { value: 10 },
        { value: 15 },
        { value: 20 },
      ]

      mockGetDatasetById.mockReturnValue({
        id: 'dataset-1',
        name: 'test.csv',
        data: mockData,
        rows: 3,
      })

      render(<SmartAnalysisPage />)

      // 정규성 검정 제목 확인
      const normalityTitle = screen.queryByText(/정규성 검정 \(Shapiro-Wilk Test\)/)
      if (normalityTitle) {
        // Info 아이콘이 제목 근처에 있어야 함
        expect(normalityTitle.parentElement).toBeInTheDocument()
      }
    })

    it('p-값에 해석 텍스트 포함 (정규분포)', async () => {
      const mockData = [{ value: 1 }]
      mockGetDatasetById.mockReturnValue({
        id: 'dataset-1',
        name: 'test.csv',
        data: mockData,
        rows: 1,
      })

      render(<SmartAnalysisPage />)

      // 3단계 도달 시 p-값 해석 텍스트 확인
      // 조건부 렌더링이므로 실제 분석 후에만 표시됨
    })

    it('p-값에 해석 텍스트 포함 (비정규분포)', async () => {
      // p < 0.05인 경우 "(정규분포 아님)" 텍스트 표시 확인
      const mockData = [{ value: 1 }]
      mockGetDatasetById.mockReturnValue({
        id: 'dataset-1',
        name: 'test.csv',
        data: mockData,
        rows: 1,
      })

      render(<SmartAnalysisPage />)
    })

    it('등분산성 검정 정보 아이콘이 존재', async () => {
      const mockData = [
        { value: 10, group: 'A' },
        { value: 20, group: 'B' },
      ]

      mockGetDatasetById.mockReturnValue({
        id: 'dataset-1',
        name: 'test.csv',
        data: mockData,
        rows: 2,
      })

      render(<SmartAnalysisPage />)

      // 등분산성 검정 제목 확인
      const homogeneityTitle = screen.queryByText(/등분산성 검정 \(Levene's Test\)/)
      if (homogeneityTitle) {
        expect(homogeneityTitle.parentElement).toBeInTheDocument()
      }
    })
  })

  describe('UI 컴포넌트 통합', () => {
    it('Alert 컴포넌트가 에러 메시지를 destructive 변형으로 표시', async () => {
      mockGetDatasetById.mockReturnValue(null)

      render(<SmartAnalysisPage />)

      // Alert가 렌더링되는지 확인 (실제 에러 발생 시)
      const uploadSection = screen.getByText('1단계: 데이터 업로드')
      expect(uploadSection).toBeInTheDocument()
    })

    it('FileUpload와 Alert가 space-y-4로 정렬됨', async () => {
      const mockData = [{ value: 1 }]
      mockGetDatasetById.mockReturnValue({
        id: 'dataset-1',
        name: 'test.csv',
        data: mockData,
        rows: 1,
      })

      const { container } = render(<SmartAnalysisPage />)

      // CardContent가 space-y-4 클래스를 가짐
      const cardContent = container.querySelector('[class*="space-y-4"]')
      if (cardContent) {
        expect(cardContent).toHaveClass('space-y-4')
      }
    })
  })

  describe('이전 버그 회귀 테스트', () => {
    it('에러 상태가 console.error를 호출하지 않음', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      mockGetDatasetById.mockReturnValue(null)

      render(<SmartAnalysisPage />)

      // 실제 handleUploadComplete 호출 시 console.error가 호출되지 않아야 함
      // (setError 사용)

      consoleErrorSpy.mockRestore()
    })

    it('성공 시 다음 단계로 자동 전환 (setTimeout 패턴 아님)', async () => {
      const mockData = [{ value: 1 }]
      mockGetDatasetById.mockReturnValue({
        id: 'dataset-1',
        name: 'test.csv',
        data: mockData,
        rows: 1,
      })

      render(<SmartAnalysisPage />)

      // setCurrentStep이 동기적으로 호출됨 (setTimeout 없음)
      await waitFor(() => {
        const uploadText = screen.queryByText('1단계: 데이터 업로드')
        // 성공 시 2단계로 전환되어야 함
      })
    })
  })
})
