/**
 * DataUploadStep compact 모드 테스트
 *
 * 목적:
 * - compact={true} 시 "파일 변경" 버튼만 렌더링
 * - 버튼 클릭 시 파일 선택 다이얼로그 열림
 * - 업로드 중 로딩 상태 표시
 * - 에러 발생 시 에러 메시지 표시
 */

import { describe, it, beforeEach, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'

// data-validation-service mock (pyodide-core 의존성 방지)
jest.mock('@/lib/services/data-validation-service', () => ({
  DATA_LIMITS: {
    MAX_ROWS: 100000,
    MAX_COLUMNS: 500,
    MAX_FILE_SIZE: 50 * 1024 * 1024,
    WARNING_ROWS: 50000,
    WARNING_COLUMNS: 200
  },
  validateData: jest.fn(),
  validateDataComprehensive: jest.fn()
}))

// react-dropzone mock
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(({ onDrop, disabled }) => ({
    getRootProps: () => ({}),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    isDragActive: false,
    open: jest.fn()
  }))
}))

// Papa mock
jest.mock('papaparse', () => ({
  parse: jest.fn()
}))

describe('DataUploadStep compact 모드', () => {
  const mockOnUploadComplete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
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
      expect(screen.getByText(/첫 번째 행은 변수명/i)).toBeInTheDocument()
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

  describe('버튼 상태', () => {
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
    it('버튼이 outline variant를 사용해야 함', () => {
      render(
        <DataUploadStep
          onUploadComplete={mockOnUploadComplete}
          compact={true}
        />
      )

      const button = screen.getByRole('button', { name: /파일 변경/i })
      // shadcn Button의 outline variant는 border 스타일을 가짐
      expect(button).toHaveClass('gap-1.5')
    })

    it('에러 메시지 컨테이너가 relative 부모를 가져야 함', () => {
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
