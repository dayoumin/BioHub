/**
 * DoclingSetupDialog 컴포넌트 테스트
 */

import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DoclingSetupDialog } from '@/components/rag/docling-setup-dialog'

// TooltipProvider mock
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// environment-detector mock
vi.mock('@/lib/utils/environment-detector', () => ({
  getDoclingEndpoint: () => 'http://localhost:8000',
}))

// fetch mock
global.fetch = vi.fn()

describe('DoclingSetupDialog', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnRetry = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // 기본적으로 Docling 서버 미실행 상태
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'))
  })

  it('다이얼로그가 올바르게 렌더링됨', async () => {
    render(<DoclingSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

    await waitFor(() => {
      expect(screen.getByText(/PDF 파싱 설정/)).toBeInTheDocument()
    })
    expect(screen.getByText(/고품질 PDF 파싱을 위한 Docling 설치 가이드/)).toBeInTheDocument()
  })

  it('4단계 모두 표시됨', async () => {
    render(<DoclingSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

    await waitFor(() => {
      expect(screen.getByText(/1. Python 설치 확인/)).toBeInTheDocument()
    })
    expect(screen.getByText(/2. Docling 설치/)).toBeInTheDocument()
    expect(screen.getByText(/3. Docling 서버 실행/)).toBeInTheDocument()
    expect(screen.getByText(/4. 연결 확인/)).toBeInTheDocument()
  })

  it('Docling 서버가 실행 중이면 "✓ 설치됨" 표시 및 Step 4로 이동', async () => {
    // 이전 mock 초기화 후 새로 설정
    ;(global.fetch as jest.Mock).mockReset()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'healthy' }),
    })

    render(<DoclingSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

    await waitFor(() => {
      expect(screen.getByText(/✓ Docling이 이미 설치되어 있습니다/)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('4/4')).toBeInTheDocument()
    })
  })

  it('fetch 타임아웃 시 Docling 미설치로 처리', async () => {
    // 이전 mock 초기화 후 AbortSignal 타임아웃 시뮬레이션
    ;(global.fetch as jest.Mock).mockReset()
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('The operation was aborted due to timeout'), {
        name: 'AbortError',
      }),
    )

    render(<DoclingSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

    await waitFor(() => {
      expect(screen.getByText(/pip install docling/)).toBeInTheDocument()
    })

    // Step 1에 머물러 있는지 확인
    await waitFor(() => {
      expect(screen.getByText('1/4')).toBeInTheDocument()
    })
  })

  it('나중에 하기 버튼 클릭 시 onOpenChange(false) 호출', async () => {
    render(<DoclingSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

    await waitFor(() => {
      const laterButton = screen.getByText('나중에 하기')
      fireEvent.click(laterButton)
    })

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('연결 재시도 버튼이 항상 활성화되어 있음', async () => {
    render(<DoclingSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

    await waitFor(() => {
      const retryButton = screen.getByText('연결 재시도')
      expect(retryButton).not.toBeDisabled()
    })

    // Step 4 이전에는 안내 메시지 표시
    await waitFor(() => {
      expect(screen.getByText('위 단계를 완료한 후 재시도하세요')).toBeInTheDocument()
    })
  })

  it('Step 4에서 연결 재시도 버튼 클릭 시 onRetry 호출', async () => {
    // 이전 mock 초기화 후 새로 설정
    ;(global.fetch as jest.Mock).mockReset()
    // 첫 번째 호출: 초기 서버 체크 (성공)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'healthy' }),
    })
    // 두 번째 호출: 재시도 시 서버 체크 (성공)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'healthy' }),
    })

    render(
      <DoclingSetupDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onRetry={mockOnRetry}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('4/4')).toBeInTheDocument()
    })

    const retryButton = screen.getByText('연결 재시도')
    expect(retryButton).not.toBeDisabled()

    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalled()
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('Windows에서 올바른 명령어 표시', async () => {
    // Windows userAgent mock
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      configurable: true,
    })

    render(<DoclingSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

    await waitFor(() => {
      expect(screen.getByText('python --version')).toBeInTheDocument()
      expect(screen.getByText('pip install docling')).toBeInTheDocument()
    })
  })

  it('Mac/Linux에서 올바른 명령어 표시', async () => {
    // macOS userAgent mock
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      configurable: true,
    })

    render(<DoclingSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

    await waitFor(() => {
      expect(screen.getByText('python3 --version')).toBeInTheDocument()
      expect(screen.getByText('pip3 install docling')).toBeInTheDocument()
    })
  })

  it('복사 버튼 클릭 시 클립보드에 복사', async () => {
    // clipboard mock
    const mockWriteText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    })

    render(<DoclingSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

    await waitFor(() => {
      const copyButtons = screen.getAllByRole('button')
      // 첫 번째 복사 버튼 (Python 확인)
      const copyButton = copyButtons.find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-copy')
      )
      if (copyButton) {
        fireEvent.click(copyButton)
      }
    })

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled()
    })
  })

  it('Dialog 재오픈 시 상태 초기화', async () => {
    // 첫 렌더링: Docling 서버 실행 중
    ;(global.fetch as jest.Mock).mockReset()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'healthy' }),
    })

    const { rerender } = render(
      <DoclingSetupDialog open={true} onOpenChange={mockOnOpenChange} />
    )

    await waitFor(() => {
      expect(screen.getByText('4/4')).toBeInTheDocument()
    })

    // Dialog 닫기
    rerender(
      <DoclingSetupDialog open={false} onOpenChange={mockOnOpenChange} />
    )

    // Docling 서버 미실행으로 변경
    ;(global.fetch as jest.Mock).mockReset()
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'))

    // Dialog 다시 열기
    rerender(
      <DoclingSetupDialog open={true} onOpenChange={mockOnOpenChange} />
    )

    // 상태가 초기화되어 Step 1로 돌아가야 함
    await waitFor(() => {
      expect(screen.getByText('1/4')).toBeInTheDocument()
    })
  })
})
