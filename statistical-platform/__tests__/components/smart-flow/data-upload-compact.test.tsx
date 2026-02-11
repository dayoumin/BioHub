/**
 * DataUploadStep compact 모드 테스트
 *
 * 목적:
 * - compact={true} 시 "파일 변경" 버튼만 렌더링
 * - 버튼 클릭 시 파일 선택 다이얼로그 열림 (open() 호출)
 * - 업로드 중 로딩 상태 표시
 * - 에러 발생 시 에러 메시지 표시
 */

import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'

// ===== Mock: Terminology =====
vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    domain: 'aquaculture', displayName: '수산과학',
    variables: {}, validation: {}, success: {}, selectorUI: {},
    smartFlow: { stepTitles: {}, stepShortLabels: { exploration: '', method: '', variable: '', analysis: '' }, statusMessages: {}, buttons: {}, resultSections: { effectSizeDetail: '' }, executionStages: { prepare: { label: '', message: '' }, preprocess: { label: '', message: '' }, assumptions: { label: '', message: '' }, analysis: { label: '', message: '' }, additional: { label: '', message: '' }, finalize: { label: '', message: '' } }, layout: { appTitle: '', historyTitle: '', historyClose: '', historyCount: () => '', aiChatbot: '', helpLabel: '', settingsLabel: '', nextStep: '', analyzingDefault: '', dataSizeGuide: '', currentLimits: '', memoryRecommendation: '', detectedMemory: () => '', limitFileSize: '', limitDataSize: '', limitRecommended: '', memoryTier4GB: '', memoryTier8GB: '', memoryTier16GB: '' }, execution: { runningTitle: '', resumeButton: '', pauseButton: '', cancelButton: '', pauseDisabledTooltip: '', cancelConfirm: '', logSectionLabel: () => '', noLogs: '', dataRequired: '', unknownError: '', estimatedTimeRemaining: () => '' } },
    purposeInput: { purposes: {}, inputModes: { aiRecommend: '', directSelect: '', modeAriaLabel: '' }, buttons: { back: '', allMethods: '', useThisMethod: '' }, labels: { selectionPrefix: '', directBadge: '', purposeHeading: '' }, messages: { purposeHelp: '', guidanceAlert: '', aiRecommendError: '', genericError: '' }, aiLabels: { recommendTitle: '' } },
    dataExploration: { empty: { title: '', description: '' }, features: { descriptiveTitle: '', descriptiveDesc: '', distributionTitle: '', distributionDesc: '', correlationTitle: '', correlationDesc: '' }, tabs: { dataSummary: '', fullDataView: () => '', statistics: '', preview: '' }, headers: { variableName: '', count: '', mean: '', stdDev: '', median: '', min: '', max: '', skewness: '', kurtosis: '', outliers: '' }, interpretGuide: { title: '', skewness: '', kurtosis: '', outlierDef: '', nDef: '' }, outlier: { detected: () => '', variableDetail: () => '', moreVars: () => '', count: () => '', info: () => '' }, chartTypes: { histogram: '', boxplot: '', ariaLabel: '' }, distribution: { title: '', description: '' }, histogram: { title: () => '', yAxisLabel: '' }, boxplot: { selectInstruction: '', singleTitle: () => '', multipleTitle: () => '' }, scatterTabs: { scatter: '', heatmap: '' }, scatter: { variableRelation: '', xAxis: '', yAxis: '' }, correlation: { coefficient: '', determination: '', strong: '', medium: '', weak: '' }, heatmap: { title: '', description: '', calculating: '', variableCount: () => '' }, heatmapGuide: { title: '', strongPositive: '', strongNegative: '', noCorrelation: '', veryStrong: '' }, strongCorrelations: { title: '' }, strength: { weak: '', medium: '', strong: '', veryStrong: '' }, assumptions: { loading: '', loadingDescription: '', badge: '', title: '', description: '' }, normality: { title: '', normal: '', nonNormal: '', statLabel: '', normalInterpretation: '', nonNormalInterpretation: '' }, homogeneity: { title: '', equal: '', unequal: '', statLabel: '', equalInterpretation: '', unequalInterpretation: '' }, highlight: { description: () => '', clearButton: '', notFound: '' }, preview: { title: '', topN: () => '', viewAll: () => '', fullDataInstruction: () => '' }, warnings: { fewNumericVars: '', correlationRequires: '', currentStatus: () => '', nextStepHint: '' }, fallbackFileName: '' },
    dataUpload: {
      buttons: { selectFile: '파일 선택', changeFile: '파일 변경', uploading: '업로드 중...', cancel: '취소', loadSelectedSheet: '이 시트로 분석', loading: '불러오는 중...', deleteRecentFile: '최근 파일 삭제' },
      labels: { dragOrClick: '파일을 드래그하거나 클릭하여 업로드', dropHere: '여기에 파일을 놓으세요', fileSpecifications: '첫 번째 행은 변수명으로 사용됩니다 (CSV, Excel 지원)', helpText: '첫 번째 행은 변수명으로 사용됩니다', recentFiles: '최근 업로드한 파일', recentFilesNote: '* 최근 파일 목록은 참고용입니다.', selectSheet: '시트 선택', sheetsFound: () => '', selectSheetPlaceholder: '시트를 선택하세요', sheetInfo: () => '', processing: () => '', estimatedTime: () => '', analyzing: '분석 중...', fileMetadata: () => '' },
      errors: { fileTooLarge: () => '', fileSizeExceeded: '', currentFileSize: () => '', validationFailed: '', noDataInFile: '', noDataTitle: '', noValidData: '', tooManyRows: () => '', dataSizeExceeded: '', currentRowCount: () => '', processingError: '', excelValidationFailed: '', excelFileError: '', excelProcessingError: '', unsupportedFormat: '', unsupportedFormatTitle: '', csvRequired: '', sheetProcessingError: '' },
      success: { fileUploaded: '', dataLoaded: () => '', excelFileUploaded: '', sheetLoaded: '' },
      toast: { selectSheet: '', sheetsFoundDescription: () => '' },
      warnings: { highMemoryTitle: '', highMemoryDescription: '' },
    },
  }),
  useTerminologyContext: () => ({ dictionary: { domain: 'aquaculture', displayName: '수산과학' }, setDomain: vi.fn(), currentDomain: 'aquaculture' }),
}))

// open 함수를 외부에서 접근 가능하도록 설정
const mockOpen = vi.fn()

// data-validation-service mock (pyodide-core 의존성 방지)
vi.mock('@/lib/services/data-validation-service', () => ({
  DATA_LIMITS: {
    MAX_ROWS: 100000,
    MAX_COLUMNS: 500,
    MAX_FILE_SIZE: 50 * 1024 * 1024,
    WARNING_ROWS: 50000,
    WARNING_COLUMNS: 200
  },
  validateData: vi.fn(),
  validateDataComprehensive: vi.fn(),
  DataValidationService: {
    validateFileContent: vi.fn()
  }
}))

// react-dropzone mock - open 함수를 mockOpen으로 연결
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn(({ onDrop, disabled }) => ({
    getRootProps: () => ({}),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    isDragActive: false,
    open: mockOpen
  }))
}))

// Papa mock
vi.mock('papaparse', () => ({
  parse: vi.fn()
}))

describe('DataUploadStep compact 모드', () => {
  const mockOnUploadComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOpen.mockClear()
  })

  describe('렌더링', () => {
    it('compact 모드에서 "파일 변경" 버튼이 표시되어야 함', () => {
      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          compact={true}
        />
      )

      const button = screen.getByRole('button', { name: /파일 변경/i })
      expect(button).toBeInTheDocument()
    })

    it('compact 모드에서 드래그앤드롭 영역이 표시되지 않아야 함', () => {
      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          compact={true}
        />
      )

      // 드래그앤드롭 관련 텍스트가 없어야 함
      expect(screen.queryByText(/파일을 드래그/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/클릭하여 업로드/i)).not.toBeInTheDocument()
    })

    it('compact=false 시 전체 업로드 UI가 표시되어야 함', () => {
      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          compact={false}
        />
      )

      // 전체 UI에서는 도움말이 표시됨
      const helpTexts = screen.getAllByText(/첫 번째 행은 변수명/i)
      expect(helpTexts.length).toBeGreaterThan(0)
    })

    it('RefreshCw 아이콘이 버튼에 포함되어야 함', () => {
      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          compact={true}
        />
      )

      // 버튼 내에 svg (아이콘)가 있어야 함
      const button = screen.getByRole('button', { name: /파일 변경/i })
      const svg = button.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('버튼 클릭 동작', () => {
    it('버튼 클릭 시 open() 함수가 호출되어야 함', () => {
      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          compact={true}
        />
      )

      const button = screen.getByRole('button', { name: /파일 변경/i })
      fireEvent.click(button)

      expect(mockOpen).toHaveBeenCalledTimes(1)
    })

    it('기본 상태에서 버튼이 활성화되어 있어야 함', () => {
      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          compact={true}
        />
      )

      const button = screen.getByRole('button', { name: /파일 변경/i })
      expect(button).not.toBeDisabled()
    })

    it('버튼 클릭 시 hidden input이 있어야 함', () => {
      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          compact={true}
        />
      )

      const input = screen.getByTestId('file-input')
      expect(input).toBeInTheDocument()
    })
  })

  describe('Props 전달', () => {
    it('existingFileName이 전달되어도 compact 모드가 동작해야 함', () => {
      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          compact={true}
          existingFileName="test.csv"
        />
      )

      const button = screen.getByRole('button', { name: /파일 변경/i })
      expect(button).toBeInTheDocument()
    })
  })

  describe('스타일', () => {
    it('버튼이 gap-1.5 클래스를 사용해야 함', () => {
      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          compact={true}
        />
      )

      const button = screen.getByRole('button', { name: /파일 변경/i })
      expect(button).toHaveClass('gap-1.5')
    })

    it('컨테이너가 relative 클래스를 가져야 함 (에러 메시지 positioning용)', () => {
      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          compact={true}
        />
      )

      const button = screen.getByRole('button', { name: /파일 변경/i })
      const container = button.parentElement
      expect(container).toHaveClass('relative')
    })
  })
})
