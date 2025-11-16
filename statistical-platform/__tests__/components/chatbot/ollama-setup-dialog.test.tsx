/**
 * Ollama 설치 안내 다이얼로그 테스트
 *
 * 목적: Vercel 배포 시 Ollama 미설치 사용자를 위한 설치 안내 UI 검증
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OllamaSetupDialog } from '@/components/chatbot/ollama-setup-dialog'

// navigator.clipboard 모킹
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
})

describe('OllamaSetupDialog - Vercel 배포 설치 안내', () => {
  const mockOnOpenChange = jest.fn()
  const mockOnRetry = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('다이얼로그 표시', () => {
    it('open=true일 때 다이얼로그가 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText('RAG 챗봇을 사용하려면 Ollama 설치가 필요합니다')).toBeInTheDocument()
    })

    it('4단계 설치 안내가 모두 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText(/1\. Ollama 설치/)).toBeInTheDocument()
      expect(screen.getByText(/2\. 임베딩 모델 다운로드/)).toBeInTheDocument()
      expect(screen.getByText(/3\. 생성 모델 다운로드/)).toBeInTheDocument()
      expect(screen.getByText(/4\. 설치 완료/)).toBeInTheDocument()
    })
  })

  describe('OS별 다운로드 링크', () => {
    it('Windows, Mac, Linux 다운로드 버튼이 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText('Windows')).toBeInTheDocument()
      expect(screen.getByText('Mac')).toBeInTheDocument()
      expect(screen.getByText('Linux')).toBeInTheDocument()
    })

    it('Windows 버튼 클릭 시 새 창에서 다운로드 페이지가 열려야 함', () => {
      const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null)

      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      const windowsButton = screen.getByText('Windows')
      fireEvent.click(windowsButton)

      expect(windowOpenSpy).toHaveBeenCalledWith('https://ollama.com/download/windows', '_blank')

      windowOpenSpy.mockRestore()
    })
  })

  describe('명령어 복사 기능', () => {
    it('임베딩 모델 명령어가 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText('ollama pull qwen3-embedding:0.6b')).toBeInTheDocument()
    })

    it('생성 모델 명령어가 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText('ollama pull qwen3:4b')).toBeInTheDocument()
    })
  })

  describe('버튼 표시', () => {
    it('연결 재시도 버튼이 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText('연결 재시도')).toBeInTheDocument()
    })

    it('나중에 하기 버튼이 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText('나중에 하기')).toBeInTheDocument()
    })
  })

  describe('참고사항 표시', () => {
    it('참고사항 섹션이 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText(/Ollama는 로컬에서 실행되며 인터넷 연결이 필요하지 않습니다/)).toBeInTheDocument()
      expect(screen.getByText(/모델 다운로드는 최초 1회만 필요합니다/)).toBeInTheDocument()
      expect(screen.getByText(/설치 후 Ollama 서비스가 자동으로 실행됩니다/)).toBeInTheDocument()
    })
  })

})
