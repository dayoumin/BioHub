/**
 * SimpleUploadDialog 플로우 테스트
 *
 * 검증 대상:
 * 1. 파일 검증 통과 시 "파일 확인 완료" (= "업로드 완료" 아님) 표시
 * 2. 검증 후 /data로 라우팅 (실제 업로드는 /data 페이지에서)
 * 3. 잘못된 확장자 → 에러 표시
 * 4. 50MB 초과 → 에러 표시
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'

// ===== Mocks =====

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/common/UploadDropZone', () => ({
  uploadZoneClassName: () => 'mock-zone',
  UploadDropZoneContent: ({ label, buttonLabel }: { label: string; buttonLabel: string }) => (
    <div>
      <span>{label}</span>
      <button>{buttonLabel}</button>
    </div>
  ),
}))

import { SimpleUploadDialog } from '@/components/home/simple-upload-dialog'

function triggerFileSelect(fileName: string, size = 1024): void {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  expect(input).toBeTruthy()

  const file = new File(['x'.repeat(size)], fileName, { type: 'text/csv' })
  // File.size는 읽기 전용이지만 File 생성자에서 내용으로 결정됨
  Object.defineProperty(input, 'files', {
    value: [file],
    configurable: true,
  })
  fireEvent.change(input)
}

function createLargeFile(name: string, sizeBytes: number): File {
  // ArrayBuffer로 정확한 크기의 파일 생성
  const buffer = new ArrayBuffer(sizeBytes)
  return new File([buffer], name, { type: 'text/csv' })
}

describe('SimpleUploadDialog 플로우', () => {
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('초기 상태: 드롭존 + "파일 선택" 버튼이 보여야 함', () => {
    render(<SimpleUploadDialog open={true} onOpenChange={mockOnOpenChange} />)
    expect(screen.getByText(/드래그하거나 클릭/)).toBeInTheDocument()
    expect(screen.getByText('파일 선택')).toBeInTheDocument()
  })

  it('CSV 파일 선택 시 "파일 확인 완료" 표시 (= "업로드 완료" 아님)', () => {
    render(<SimpleUploadDialog open={true} onOpenChange={mockOnOpenChange} />)
    triggerFileSelect('data.csv')

    // "파일 확인 완료"가 표시되어야 함 (거짓 "업로드 완료"가 아님)
    expect(screen.getByText('파일 확인 완료')).toBeInTheDocument()
    expect(screen.queryByText('업로드 완료')).not.toBeInTheDocument()

    // 파일명이 표시되어야 함
    expect(screen.getByText('data.csv')).toBeInTheDocument()

    // "업로드 페이지로 이동 중..." 안내
    expect(screen.getByText(/업로드 페이지로 이동 중/)).toBeInTheDocument()
  })

  it('검증 후 1.2초 뒤 /data로 라우팅해야 함', () => {
    render(<SimpleUploadDialog open={true} onOpenChange={mockOnOpenChange} />)
    triggerFileSelect('test.csv')

    // 아직 라우팅 안 됨
    expect(mockPush).not.toHaveBeenCalled()

    // 1.2초 경과
    act(() => {
      vi.advanceTimersByTime(1200)
    })

    expect(mockPush).toHaveBeenCalledWith('/data')
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('잘못된 확장자 → 에러 표시, 드롭존 유지', () => {
    render(<SimpleUploadDialog open={true} onOpenChange={mockOnOpenChange} />)
    triggerFileSelect('readme.txt')

    expect(screen.getByText('CSV, Excel, TSV 파일만 지원됩니다')).toBeInTheDocument()
    // 드롭존이 여전히 보여야 함 (success 상태가 아님)
    expect(screen.queryByText('파일 확인 완료')).not.toBeInTheDocument()
  })

  it('50MB 초과 파일 → 에러 표시', () => {
    render(<SimpleUploadDialog open={true} onOpenChange={mockOnOpenChange} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const bigFile = createLargeFile('huge.csv', 51 * 1024 * 1024)
    Object.defineProperty(input, 'files', {
      value: [bigFile],
      configurable: true,
    })
    fireEvent.change(input)

    expect(screen.getByText(/50MB 이하/)).toBeInTheDocument()
    expect(screen.queryByText('파일 확인 완료')).not.toBeInTheDocument()
  })

  it('xlsx 파일도 검증 통과해야 함', () => {
    render(<SimpleUploadDialog open={true} onOpenChange={mockOnOpenChange} />)
    triggerFileSelect('report.xlsx')

    expect(screen.getByText('파일 확인 완료')).toBeInTheDocument()
    expect(screen.getByText('report.xlsx')).toBeInTheDocument()
  })

  it('에러 닫기 버튼 클릭 시 에러 메시지 사라져야 함', () => {
    render(<SimpleUploadDialog open={true} onOpenChange={mockOnOpenChange} />)
    triggerFileSelect('bad.png')

    expect(screen.getByText('CSV, Excel, TSV 파일만 지원됩니다')).toBeInTheDocument()

    const closeBtn = screen.getByLabelText('오류 메시지 닫기')
    fireEvent.click(closeBtn)

    expect(screen.queryByText('CSV, Excel, TSV 파일만 지원됩니다')).not.toBeInTheDocument()
  })
})
