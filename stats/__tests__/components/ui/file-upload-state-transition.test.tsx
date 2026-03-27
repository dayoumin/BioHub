/**
 * FileUpload 상태 전이 테스트
 *
 * 검증 대상:
 * 1. 업로드 성공 시 isUploading=false로 전환 → 성공 UI 도달
 * 2. 업로드 중 로딩 UI 표시
 * 3. 에러 시 에러 UI 표시 + 로딩 해제
 */

import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

// ===== Mocks =====

const mockAddDataset = vi.fn(() => ({ id: 'ds-1' }))
vi.mock('@/lib/store', () => ({
  useAppStore: () => ({ addDataset: mockAddDataset }),
}))

const mockParseCSVFile = vi.fn()
const mockValidateFile = vi.fn()
const mockValidateData = vi.fn()
const mockCreateDatasetFromValidation = vi.fn()

vi.mock('@/lib/data-processing', () => ({
  parseCSVFile: (...args: unknown[]) => mockParseCSVFile(...args),
  validateFile: (...args: unknown[]) => mockValidateFile(...args),
  validateData: (...args: unknown[]) => mockValidateData(...args),
  createDatasetFromValidation: (...args: unknown[]) => mockCreateDatasetFromValidation(...args),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

vi.mock('@/components/data/data-format-guide', () => ({
  DataFormatGuide: () => <div>guide</div>,
}))

vi.mock('@/components/common/UploadDropZone', () => ({
  uploadZoneClassName: () => 'mock-zone',
  UploadDropZoneContent: ({ label }: { label: string }) => <div>{label}</div>,
}))

import { FileUpload } from '@/components/ui/file-upload'

describe('FileUpload 상태 전이', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateFile.mockReturnValue({ isValid: true })
    mockParseCSVFile.mockResolvedValue({
      headers: ['group', 'score'],
      rows: [{ group: 'A', score: 10 }],
    })
    mockValidateData.mockReturnValue({
      isValid: true,
      columns: [],
      rowCount: 1,
      errors: [],
      warnings: [],
    })
    mockCreateDatasetFromValidation.mockReturnValue({
      name: 'test-data',
      columns: 2,
      rows: 1,
    })
  })

  it('초기 상태: 드롭존이 표시되어야 함', () => {
    render(<FileUpload />)
    expect(screen.getByText(/드래그하거나 클릭/)).toBeInTheDocument()
  })

  it('업로드 성공 후 성공 UI가 도달 가능해야 함 (isUploading=false 전환)', async () => {
    const onComplete = vi.fn()
    render(<FileUpload onUploadComplete={onComplete} />)

    // hidden input을 찾아서 파일 변경 이벤트 발생
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()

    const file = new File(['group,score\nA,10'], 'test.csv', { type: 'text/csv' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    input.dispatchEvent(new Event('change', { bubbles: true }))

    // 성공 UI 도달 확인: "업로드 완료" 텍스트 + "분석 시작" 버튼
    await waitFor(() => {
      expect(screen.getByText('업로드 완료')).toBeInTheDocument()
    })

    // 로딩 스피너가 없어야 함 (isUploading=false 확인)
    expect(screen.queryByText(/처리 중/)).not.toBeInTheDocument()

    // 성공 패널의 액션 버튼들이 보여야 함
    expect(screen.getByText('분석 시작')).toBeInTheDocument()
    expect(screen.getByText('데이터 보기')).toBeInTheDocument()
    expect(screen.getByText('다른 파일')).toBeInTheDocument()

    // 콜백 호출 확인
    expect(onComplete).toHaveBeenCalledWith('ds-1')
  })

  it('업로드 중 로딩 UI가 표시되어야 함', async () => {
    // parseCSVFile이 지연되도록 설정
    let resolveParser!: (value: unknown) => void
    mockParseCSVFile.mockReturnValue(
      new Promise((resolve) => {
        resolveParser = resolve
      })
    )

    render(<FileUpload />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['data'], 'test.csv', { type: 'text/csv' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    input.dispatchEvent(new Event('change', { bubbles: true }))

    // 로딩 상태 확인
    await waitFor(() => {
      expect(screen.getByText(/처리 중/)).toBeInTheDocument()
    })

    // 드롭존은 보이지 않아야 함
    expect(screen.queryByText(/드래그하거나 클릭/)).not.toBeInTheDocument()

    // parser resolve → 나머지 진행
    resolveParser({
      headers: ['group', 'score'],
      rows: [{ group: 'A', score: 10 }],
    })

    // 성공 UI로 전이
    await waitFor(() => {
      expect(screen.getByText('업로드 완료')).toBeInTheDocument()
    })
  })

  it('파싱 에러 시 에러 상태 + 로딩 해제', async () => {
    mockParseCSVFile.mockRejectedValue(new Error('파싱 실패'))

    render(<FileUpload />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['bad'], 'test.csv', { type: 'text/csv' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await waitFor(() => {
      expect(screen.getByText('파싱 실패')).toBeInTheDocument()
    })

    // 로딩이 끝나고 드롭존이 다시 보여야 함 (isUploading=false)
    expect(screen.getByText(/드래그하거나 클릭/)).toBeInTheDocument()
  })
})
