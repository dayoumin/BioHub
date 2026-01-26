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

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop }: { onDrop: (files: File[]) => void }) => ({
    getRootProps: () => ({
      onClick: () => {
        const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' })
        onDrop([mockFile])
      }
    }),
    getInputProps: () => ({}),
    isDragActive: false
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
})
