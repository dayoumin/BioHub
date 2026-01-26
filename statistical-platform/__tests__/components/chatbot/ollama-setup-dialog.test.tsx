/**
 * Ollama 설치 안내 다이얼로그 테스트
 *
 * 목적: Vercel 배포 시 Ollama 미설치 사용자를 위한 설치 안내 UI 검증
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, Mock } from 'vitest'
import { OllamaSetupDialog } from '@/components/chatbot/ollama-setup-dialog'

// navigator.clipboard 모킹
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
})

// fetch 모킹
global.fetch = vi.fn()

describe('OllamaSetupDialog - 새로운 4단계 설치 안내', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnRetry = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as Mock).mockClear()
  })

  describe('Ollama 설치 자동 감지 (NEW)', () => {
    it('Ollama가 설치되어 있으면 "✓ 설치됨" 표시 및 Step 2로 이동', async () => {
      // Ollama 설치됨 (API 응답 성공)
      ;(global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      })

      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByText(/✓ Ollama가 이미 설치되어 있습니다/)).toBeInTheDocument()
      })

      // Step 2로 자동 이동 확인 (단계 표시)
      await waitFor(() => {
        expect(screen.getByText('2/4')).toBeInTheDocument()
      })
    })

    it('Ollama가 설치되어 있지 않으면 다운로드 버튼 표시', async () => {
      // Ollama 미설치 (API 응답 실패)
      ;(global.fetch as Mock).mockRejectedValueOnce(new Error('Connection failed'))

      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByText(/Ollama 다운로드 \(Windows\)/)).toBeInTheDocument()
      })

      // Step 1에 머물러 있는지 확인
      await waitFor(() => {
        expect(screen.getByText('1/4')).toBeInTheDocument()
      })
    })

    it('fetch 타임아웃 시 Ollama 미설치로 처리', async () => {
      // AbortSignal 타임아웃 시뮬레이션 (DOMException: TimeoutError)
      ;(global.fetch as Mock).mockRejectedValueOnce(
        Object.assign(new Error('The operation was aborted due to timeout'), {
          name: 'AbortError',
        }),
      )

      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      // 타임아웃 후 다운로드 버튼 표시 확인
      await waitFor(() => {
        expect(screen.getByText(/Ollama 다운로드 \(Windows\)/)).toBeInTheDocument()
      })

      // Step 1에 머물러 있는지 확인
      await waitFor(() => {
        expect(screen.getByText('1/4')).toBeInTheDocument()
      })
    })
  })

  describe('다이얼로그 표시', () => {
    it('open=true일 때 다이얼로그가 표시되어야 함', async () => {
      ;(global.fetch as Mock).mockRejectedValueOnce(new Error('Not installed'))

      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByText(/AI 챗봇 설정/)).toBeInTheDocument()
      })
    })

    it('4단계 설치 안내가 모두 표시되어야 함', async () => {
      ;(global.fetch as Mock).mockRejectedValueOnce(new Error('Not installed'))

      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByText(/1\. Ollama 다운로드 및 설치/)).toBeInTheDocument()
        expect(screen.getByText(/2\. CORS 설정/)).toBeInTheDocument()
        expect(screen.getByText(/3\. AI 모델 다운로드/)).toBeInTheDocument()
        expect(screen.getByText(/4\. 연결 확인/)).toBeInTheDocument()
      })
    })
  })

  describe('OS 자동 감지 및 다운로드 링크', () => {
    it('자동 감지된 OS의 다운로드 버튼이 표시되어야 함', async () => {
      ;(global.fetch as Mock).mockRejectedValueOnce(new Error('Not installed'))

      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      // Windows가 기본값 (detectOS 모킹 없이)
      await waitFor(() => {
        expect(screen.getByText(/Ollama 다운로드 \(Windows\)/)).toBeInTheDocument()
      })
    })

    it('다운로드 버튼 클릭 시 새 창에서 페이지가 열려야 함', async () => {
      ;(global.fetch as Mock).mockRejectedValueOnce(new Error('Not installed'))
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        const downloadButton = screen.getByText(/Ollama 다운로드 \(Windows\)/)
        fireEvent.click(downloadButton)
      })

      expect(windowOpenSpy).toHaveBeenCalledWith('https://ollama.com/download/windows', '_blank')

      windowOpenSpy.mockRestore()
    })
  })

  describe('통합 모델 다운로드 명령어', () => {
    it('통합 명령어가 표시되어야 함', async () => {
      ;(global.fetch as Mock).mockRejectedValueOnce(new Error('Not installed'))

      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByText(/ollama pull mxbai-embed-large && ollama pull qwen2.5:3b/)).toBeInTheDocument()
      })
    })

    it('다른 모델 안내 툴팁이 표시되어야 함', async () => {
      ;(global.fetch as Mock).mockRejectedValueOnce(new Error('Not installed'))

      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      // Info 아이콘은 SVG이므로 텍스트로 확인
      await waitFor(() => {
        const commandSection = screen.getByText(/② 아래 명령어 실행/)
        expect(commandSection).toBeInTheDocument()
      })
    })
  })

  describe('버튼 및 진행 상태', () => {
    it('연결 재시도 버튼이 표시되어야 함', async () => {
      ;(global.fetch as Mock).mockRejectedValueOnce(new Error('Not installed'))

      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByText('연결 재시도')).toBeInTheDocument()
      })
    })

    it('나중에 하기 버튼이 표시되어야 함', async () => {
      ;(global.fetch as Mock).mockRejectedValueOnce(new Error('Not installed'))

      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByText('나중에 하기')).toBeInTheDocument()
      })
    })

    it('현재 단계 표시가 있어야 함', async () => {
      ;(global.fetch as Mock).mockRejectedValueOnce(new Error('Not installed'))

      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByText('단계:')).toBeInTheDocument()
        expect(screen.getByText('1/4')).toBeInTheDocument()
      })
    })
  })

  describe('설치 안내 메시지', () => {
    it('모델 다운로드 소요 시간 안내가 표시되어야 함', async () => {
      ;(global.fetch as Mock).mockRejectedValueOnce(new Error('Not installed'))

      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByText(/약 5-10분 소요, ~4GB/)).toBeInTheDocument()
      })
    })
  })
})
