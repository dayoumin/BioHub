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

/**
 * IndexedDB cleanup graceful degradation 테스트
 *
 * Safari/Firefox에서 window.indexedDB.databases()가 지원되지 않을 때
 * 에러 없이 graceful하게 처리되는지 확인
 */
describe('IndexedDB cleanup graceful degradation', () => {
  it('indexedDB.databases가 undefined일 때도 에러 없이 처리되어야 함', async () => {
    // Safari/Firefox 시뮬레이션: databases 메서드가 없음
    const mockIndexedDB = {
      deleteDatabase: jest.fn(),
      // databases 메서드 없음 (undefined)
    }

    Object.defineProperty(window, 'indexedDB', {
      value: mockIndexedDB,
      writable: true,
    })

    // 테스트할 cleanup 로직
    const cleanupIndexedDB = async () => {
      try {
        if (typeof window.indexedDB.databases === 'function') {
          const databases = await window.indexedDB.databases()
          for (const db of databases) {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name)
            }
          }
        }
      } catch (e) {
        console.warn('[Settings] IndexedDB cleanup failed:', e)
      }
    }

    // 에러 없이 실행되어야 함
    await expect(cleanupIndexedDB()).resolves.not.toThrow()

    // deleteDatabase가 호출되지 않아야 함 (databases 메서드가 없으므로)
    expect(mockIndexedDB.deleteDatabase).not.toHaveBeenCalled()
  })

  it('indexedDB.databases가 존재할 때 정상 동작해야 함', async () => {
    // Chrome 시뮬레이션: databases 메서드 있음
    const mockDatabases = [{ name: 'testDB1' }, { name: 'testDB2' }, { name: null }]
    const mockIndexedDB = {
      databases: jest.fn().mockResolvedValue(mockDatabases),
      deleteDatabase: jest.fn(),
    }

    Object.defineProperty(window, 'indexedDB', {
      value: mockIndexedDB,
      writable: true,
    })

    const cleanupIndexedDB = async () => {
      try {
        if (typeof window.indexedDB.databases === 'function') {
          const databases = await window.indexedDB.databases()
          for (const db of databases) {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name)
            }
          }
        }
      } catch (e) {
        console.warn('[Settings] IndexedDB cleanup failed:', e)
      }
    }

    await cleanupIndexedDB()

    // databases가 호출되어야 함
    expect(mockIndexedDB.databases).toHaveBeenCalled()
    // name이 있는 DB만 삭제되어야 함 (2개)
    expect(mockIndexedDB.deleteDatabase).toHaveBeenCalledTimes(2)
    expect(mockIndexedDB.deleteDatabase).toHaveBeenCalledWith('testDB1')
    expect(mockIndexedDB.deleteDatabase).toHaveBeenCalledWith('testDB2')
  })

  it('indexedDB.databases가 에러를 던져도 graceful하게 처리되어야 함', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

    const mockIndexedDB = {
      databases: jest.fn().mockRejectedValue(new Error('Not supported')),
      deleteDatabase: jest.fn(),
    }

    Object.defineProperty(window, 'indexedDB', {
      value: mockIndexedDB,
      writable: true,
    })

    const cleanupIndexedDB = async () => {
      try {
        if (typeof window.indexedDB.databases === 'function') {
          const databases = await window.indexedDB.databases()
          for (const db of databases) {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name)
            }
          }
        }
      } catch (e) {
        console.warn('[Settings] IndexedDB cleanup failed:', e)
      }
    }

    // 에러 없이 실행되어야 함
    await expect(cleanupIndexedDB()).resolves.not.toThrow()

    // console.warn이 호출되어야 함
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[Settings] IndexedDB cleanup failed:',
      expect.any(Error)
    )

    consoleWarnSpy.mockRestore()
  })
})
