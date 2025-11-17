/**
 * Settings Page 간소화 테스트
 *
 * 핵심 기능만 테스트:
 * 1. 페이지 렌더링
 * 2. localStorage 저장/로드
 */

import { render, screen } from '@testing-library/react'
import SettingsPage from '@/app/(dashboard)/settings/page'
import { ChatStorage } from '@/lib/services/chat-storage'

// ChatStorage 모킹
jest.mock('@/lib/services/chat-storage', () => ({
  ChatStorage: {
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
  },
}))

// recent-statistics 유틸 모킹
jest.mock('@/lib/utils/recent-statistics', () => ({
  getRecentStatistics: jest.fn(() => []),
  clearRecentStatistics: jest.fn(),
}))

describe('SettingsPage - Simple Tests', () => {
  let localStorageMock: { [key: string]: string }

  beforeEach(() => {
    // localStorage 모킹
    localStorageMock = {}
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => localStorageMock[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          localStorageMock[key] = value
        }),
        removeItem: jest.fn((key: string) => {
          delete localStorageMock[key]
        }),
        clear: jest.fn(() => {
          localStorageMock = {}
        }),
      },
      writable: true,
    })

    // ChatStorage 기본값
    ;(ChatStorage.loadSettings as jest.Mock).mockReturnValue({
      floatingButtonEnabled: true,
      theme: 'system',
    })

    // window.dispatchEvent 모킹
    window.dispatchEvent = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('페이지가 렌더링되고 4개 탭이 표시되어야 함', () => {
    render(<SettingsPage />)

    expect(screen.getByText('설정')).toBeInTheDocument()
    expect(screen.getByText('애플리케이션 설정을 관리하세요')).toBeInTheDocument()

    // 4개 탭 확인
    expect(screen.getByRole('tab', { name: /외관 및 알림/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /AI 챗봇/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /데이터/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /즐겨찾기/ })).toBeInTheDocument()
  })

  it('기본적으로 외관 및 알림 탭이 활성화되어야 함', () => {
    render(<SettingsPage />)

    expect(screen.getByText('테마 설정')).toBeInTheDocument()
    expect(screen.getByText('플로팅 챗봇 버튼')).toBeInTheDocument()
    expect(screen.getByText('알림 설정')).toBeInTheDocument()
  })

  it('localStorage에서 설정을 로드해야 함', () => {
    localStorageMock['statPlatform_ollamaEndpoint'] = 'http://custom:11434'
    localStorageMock['statPlatform_embeddingModel'] = 'mxbai-embed-large'
    localStorageMock['statPlatform_topK'] = '7'

    render(<SettingsPage />)

    // localStorage.getItem이 호출되었는지 확인
    expect(window.localStorage.getItem).toHaveBeenCalledWith('statPlatform_ollamaEndpoint')
    expect(window.localStorage.getItem).toHaveBeenCalledWith('statPlatform_embeddingModel')
    expect(window.localStorage.getItem).toHaveBeenCalledWith('statPlatform_topK')
  })

  it('ChatStorage에서 플로팅 버튼 설정을 로드해야 함', () => {
    render(<SettingsPage />)

    expect(ChatStorage.loadSettings).toHaveBeenCalled()
  })

  it('4개 탭이 모두 존재해야 함', () => {
    render(<SettingsPage />)

    // 모든 탭 확인
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(4)

    // 탭 텍스트 확인
    expect(screen.getByText('외관 및 알림')).toBeInTheDocument()
    expect(screen.getByText('AI 챗봇 (RAG)')).toBeInTheDocument()
    expect(screen.getByText('데이터')).toBeInTheDocument()
    expect(screen.getByText('즐겨찾기')).toBeInTheDocument()
  })
})
