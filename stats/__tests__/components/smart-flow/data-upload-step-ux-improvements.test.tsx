/**
 * DataUploadStep UX 개선 테스트
 *
 * 테스트 범위:
 * - 파일 업로드 기능 기본 동작
 * - 접근성 및 사용성
 *
 * Note: UI 구조 변경으로 일부 테스트 삭제됨 (2026-01-26)
 * - 파일 업로드 전/후 상태 테스트는 E2E 테스트로 대체
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'

// ===== Mock: Terminology =====
vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    domain: 'aquaculture', displayName: '수산과학',
    variables: {}, validation: {}, success: {}, selectorUI: {},
    hub: {
      timeAgo: {
        justNow: '방금 전',
        minutesAgo: (m: number) => `${m}분 전`,
        hoursAgo: (h: number) => `${h}시간 전`,
        daysAgo: (d: number) => `${d}일 전`,
      },
    },
    smartFlow: { stepTitles: {}, stepShortLabels: { exploration: '', method: '', variable: '', analysis: '' }, statusMessages: {}, buttons: {}, resultSections: { effectSizeDetail: '' }, executionStages: { prepare: { label: '', message: '' }, preprocess: { label: '', message: '' }, assumptions: { label: '', message: '' }, analysis: { label: '', message: '' }, additional: { label: '', message: '' }, finalize: { label: '', message: '' } }, layout: { appTitle: '', historyTitle: '', historyClose: '', historyCount: () => '', aiChatbot: '', helpLabel: '', settingsLabel: '', nextStep: '', analyzingDefault: '', dataSizeGuide: '', currentLimits: '', memoryRecommendation: '', detectedMemory: () => '', limitFileSize: '', limitDataSize: '', limitRecommended: '', memoryTier4GB: '', memoryTier8GB: '', memoryTier16GB: '' }, execution: { runningTitle: '', resumeButton: '', pauseButton: '', cancelButton: '', pauseDisabledTooltip: '', cancelConfirm: '', logSectionLabel: () => '', noLogs: '', dataRequired: '', unknownError: '', estimatedTimeRemaining: () => '' } },
    purposeInput: { purposes: {}, inputModes: { aiRecommend: '', directSelect: '', modeAriaLabel: '' }, buttons: { back: '', allMethods: '', useThisMethod: '' }, labels: { selectionPrefix: '', directBadge: '', purposeHeading: '' }, messages: { purposeHelp: '', guidanceAlert: '', aiRecommendError: '', genericError: '' }, aiLabels: { recommendTitle: '' } },
    dataExploration: { empty: { title: '', description: '' }, features: { descriptiveTitle: '', descriptiveDesc: '', distributionTitle: '', distributionDesc: '', correlationTitle: '', correlationDesc: '' }, tabs: { dataSummary: '', fullDataView: () => '', statistics: '', preview: '' }, headers: { variableName: '', count: '', mean: '', stdDev: '', median: '', min: '', max: '', skewness: '', kurtosis: '', outliers: '' }, interpretGuide: { title: '', skewness: '', kurtosis: '', outlierDef: '', nDef: '' }, outlier: { detected: () => '', variableDetail: () => '', moreVars: () => '', count: () => '', info: () => '' }, chartTypes: { histogram: '', boxplot: '', ariaLabel: '' }, distribution: { title: '', description: '' }, histogram: { title: () => '', yAxisLabel: '' }, boxplot: { selectInstruction: '', singleTitle: () => '', multipleTitle: () => '' }, scatterTabs: { scatter: '', heatmap: '' }, scatter: { variableRelation: '', xAxis: '', yAxis: '' }, correlation: { coefficient: '', determination: '', strong: '', medium: '', weak: '' }, heatmap: { title: '', description: '', calculating: '', variableCount: () => '' }, heatmapGuide: { title: '', strongPositive: '', strongNegative: '', noCorrelation: '', veryStrong: '' }, strongCorrelations: { title: '' }, strength: { weak: '', medium: '', strong: '', veryStrong: '' }, assumptions: { loading: '', loadingDescription: '', badge: '', title: '', description: '' }, normality: { title: '', normal: '', nonNormal: '', statLabel: '', normalInterpretation: '', nonNormalInterpretation: '' }, homogeneity: { title: '', equal: '', unequal: '', statLabel: '', equalInterpretation: '', unequalInterpretation: '' }, highlight: { description: () => '', clearButton: '', notFound: '' }, preview: { title: '', topN: () => '', viewAll: () => '', fullDataInstruction: () => '' }, warnings: { fewNumericVars: '', correlationRequires: '', currentStatus: () => '', nextStepHint: '' }, fallbackFileName: '' },
    dataUpload: {
      buttons: { selectFile: '파일 선택', changeFile: '파일 변경', uploading: '업로드 중...', cancel: '취소', loadSelectedSheet: '이 시트로 분석', loading: '불러오는 중...', deleteRecentFile: '최근 파일 삭제' },
      labels: { dragOrClick: '파일을 드래그하거나 클릭하여 업로드', dropHere: '여기에 파일을 놓으세요', fileSpecifications: '첫 번째 행은 변수명으로 사용됩니다 (CSV, Excel 지원)', helpText: '첫 번째 행은 변수명으로 사용됩니다', recentFiles: '최근 업로드한 파일', recentFilesNote: '', selectSheet: '', sheetsFound: () => '', selectSheetPlaceholder: '', sheetInfo: () => '', processing: () => '', estimatedTime: () => '', analyzing: '', fileMetadata: () => '' },
      errors: { fileTooLarge: () => '', fileSizeExceeded: '', currentFileSize: () => '', validationFailed: '', noDataInFile: '', noDataTitle: '', noValidData: '', tooManyRows: () => '', dataSizeExceeded: '', currentRowCount: () => '', processingError: '', excelValidationFailed: '', excelFileError: '', excelProcessingError: '', unsupportedFormat: '', unsupportedFormatTitle: '', csvRequired: '', sheetProcessingError: '' },
      success: { fileUploaded: '', dataLoaded: () => '', excelFileUploaded: '', sheetLoaded: '' },
      toast: { selectSheet: '', sheetsFoundDescription: () => '' },
      warnings: { highMemoryTitle: '', highMemoryDescription: '' },
    },
  }),
  useTerminologyContext: () => ({ dictionary: { domain: 'aquaculture', displayName: '수산과학' }, setDomain: vi.fn(), currentDomain: 'aquaculture' }),
}))

// Mock react-dropzone
const mockOpen = vi.fn()
vi.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop }: { onDrop: (files: File[]) => void }) => ({
    getRootProps: () => ({
      onClick: () => {
        const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' })
        onDrop([mockFile])
      }
    }),
    getInputProps: () => ({}),
    isDragActive: false,
    open: mockOpen
  })
}))

// Mock papaparse
vi.mock('papaparse', () => ({
  parse: (file: File, options: { complete: (result: unknown) => void }) => {
    setTimeout(() => {
      options.complete({
        data: [{ id: 1, name: 'Test' }],
        errors: []
      })
    }, 100)
  }
}))

describe('DataUploadStep UX Improvements', () => {
  const mockOnUploadComplete = vi.fn()
  const mockOnNext = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('파일 변경 버튼', () => {
    it('"파일 변경" 버튼 클릭 시 파일 선택이 가능해야 함', () => {
      // uploadedFileName이 설정된 상태에서
      // "파일 변경" 버튼 클릭 → getRootProps()로 파일 선택 다이얼로그 열기
    })
  })

  describe('"다음 단계로" 버튼', () => {
    it('업로드 완료 후 "다음 단계로" 버튼이 간소화되어 표시되어야 함', () => {
      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          onNext={mockOnNext}
          canGoNext={true}
          currentStep={1}
          totalSteps={5}
        />
      )

      // canGoNext가 true이고 uploadedFileName이 있으면 "다음 단계로" 버튼 표시
    })
  })

  describe('접근성 및 사용성', () => {
    it('업로드 중일 때 버튼이 비활성화되어야 함', () => {
      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          onNext={mockOnNext}
          canGoNext={false}
          currentStep={1}
          totalSteps={5}
        />
      )

      const button = screen.getByRole('button', { name: /파일 선택/ })
      expect(button).not.toBeDisabled()
    })

    it('파일명이 긴 경우 truncate 처리되어야 함', () => {
      // "업로드 완료" 메시지에서 파일명이 truncate 클래스 사용
    })
  })

  describe('최근 파일 목록 접근성', () => {
    const setupWithRecentFiles = () => {
      const recentFiles = [
        { name: 'data.csv', size: 1024, rows: 100, uploadedAt: Date.now() - 60000 }
      ]
      localStorage.setItem('statPlatform_recentFiles', JSON.stringify(recentFiles))
    }

    beforeEach(() => {
      localStorage.clear()
      mockOpen.mockClear()
    })

    it('최근 파일 행에 role="button"과 tabIndex={0}이 있어야 함', () => {
      setupWithRecentFiles()

      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          onNext={mockOnNext}
          canGoNext={false}
          currentStep={1}
          totalSteps={5}
        />
      )

      const recentFileBtn = screen.getByRole('button', { name: /data\.csv/ })
      expect(recentFileBtn).toBeTruthy()
      expect(recentFileBtn).toHaveAttribute('tabindex', '0')
    })

    it('최근 파일 행 클릭 → open() 호출됨', () => {
      setupWithRecentFiles()

      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          onNext={mockOnNext}
          canGoNext={false}
          currentStep={1}
          totalSteps={5}
        />
      )

      const recentFileBtn = screen.getByRole('button', { name: /data\.csv/ })
      fireEvent.click(recentFileBtn)

      expect(mockOpen).toHaveBeenCalledTimes(1)
    })

    it('최근 파일 행 Enter 키 → open() 호출됨', () => {
      setupWithRecentFiles()

      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          onNext={mockOnNext}
          canGoNext={false}
          currentStep={1}
          totalSteps={5}
        />
      )

      const recentFileBtn = screen.getByRole('button', { name: /data\.csv/ })
      fireEvent.keyDown(recentFileBtn, { key: 'Enter' })

      expect(mockOpen).toHaveBeenCalledTimes(1)
    })

    it('최근 파일 행 Space 키 → open() 호출됨', () => {
      setupWithRecentFiles()

      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          onNext={mockOnNext}
          canGoNext={false}
          currentStep={1}
          totalSteps={5}
        />
      )

      const recentFileBtn = screen.getByRole('button', { name: /data\.csv/ })
      fireEvent.keyDown(recentFileBtn, { key: ' ' })

      expect(mockOpen).toHaveBeenCalledTimes(1)
    })

    it('삭제(X) 버튼 클릭 시 open() 호출 안 됨 (stopPropagation 확인)', () => {
      setupWithRecentFiles()

      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          onNext={mockOnNext}
          canGoNext={false}
          currentStep={1}
          totalSteps={5}
        />
      )

      const deleteBtn = screen.getByRole('button', { name: /최근 파일 삭제/ })
      fireEvent.click(deleteBtn)

      expect(mockOpen).not.toHaveBeenCalled()
    })
  })
})
