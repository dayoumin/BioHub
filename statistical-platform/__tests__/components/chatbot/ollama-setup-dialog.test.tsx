/**
 * Ollama 설치 안내 다이얼로그 테스트
 *
 * 목적: Vercel 배포 시 Ollama 미설치 사용자를 위한 설치 안내 UI 검증
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { OllamaSetupDialog } from '@/components/chatbot/ollama-setup-dialog'

// navigator.clipboard 모킹
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
})

describe('OllamaSetupDialog - 새로운 3단계 설치 안내', () => {
  const mockOnOpenChange = jest.fn()
  const mockOnRetry = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('다이얼로그 표시', () => {
    it('open=true일 때 다이얼로그가 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText('AI 챗봇 설정하기')).toBeInTheDocument()
      expect(screen.getByText(/간단한 3단계로 AI 챗봇을 시작하세요/)).toBeInTheDocument()
    })

    it('3단계 설치 안내가 모두 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText(/1\. Ollama 다운로드 및 설치/)).toBeInTheDocument()
      expect(screen.getByText(/2\. AI 모델 다운로드/)).toBeInTheDocument()
      expect(screen.getByText(/3\. 연결 확인/)).toBeInTheDocument()
    })
  })

  describe('OS 자동 감지 및 다운로드 링크', () => {
    it('자동 감지된 OS의 다운로드 버튼이 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      // Windows가 기본값 (detectOS 모킹 없이)
      expect(screen.getByText(/Ollama 다운로드 \(Windows\)/)).toBeInTheDocument()
    })

    it('다운로드 버튼 클릭 시 새 창에서 페이지가 열려야 함', () => {
      const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null)

      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      const downloadButton = screen.getByText(/Ollama 다운로드 \(Windows\)/)
      fireEvent.click(downloadButton)

      expect(windowOpenSpy).toHaveBeenCalledWith('https://ollama.com/download/windows', '_blank')

      windowOpenSpy.mockRestore()
    })
  })

  describe('통합 모델 다운로드 명령어', () => {
    it('통합 명령어가 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText(/ollama pull qwen3-embedding:0.6b && ollama pull qwen3:4b/)).toBeInTheDocument()
    })

    it('다른 모델 안내 툴팁이 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      // Info 아이콘은 SVG이므로 텍스트로 확인
      const commandSection = screen.getByText(/② 아래 명령어 복사 및 실행/)
      expect(commandSection).toBeInTheDocument()

      // 부모 요소에 Info 아이콘이 포함되어 있는지 확인
      const parent = commandSection.parentElement
      expect(parent).toBeInTheDocument()
    })
  })

  describe('터미널 열기 안내', () => {
    it('OS별 터미널 이름이 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText(/명령 프롬프트 \(cmd\) 또는 PowerShell/)).toBeInTheDocument()
    })

    it('OS별 터미널 여는 방법이 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText(/Windows 검색에서 "cmd" 입력/)).toBeInTheDocument()
    })
  })

  describe('버튼 및 진행 상태', () => {
    it('연결 재시도 버튼이 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText('연결 재시도')).toBeInTheDocument()
    })

    it('나중에 하기 버튼이 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText('나중에 하기')).toBeInTheDocument()
    })

    it('현재 단계 표시가 있어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText('단계:')).toBeInTheDocument()
      expect(screen.getByText('1/3')).toBeInTheDocument()
    })
  })

  describe('설치 안내 메시지', () => {
    it('Ollama 다운로드 안내가 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText(/아래 버튼을 클릭하여 Ollama를 다운로드하고 설치하세요/)).toBeInTheDocument()
    })

    it('모델 다운로드 소요 시간 안내가 표시되어야 함', () => {
      render(<OllamaSetupDialog open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByText(/모델 다운로드는 약 3-5분 소요됩니다/)).toBeInTheDocument()
    })
  })

})
