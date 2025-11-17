/**
 * StorageService 테스트
 * localStorage 옵트아웃 기능 검증
 */

import { StorageService } from '@/lib/services/storage-service'

describe('StorageService', () => {
  let localStorageMock: Record<string, string>

  beforeEach(() => {
    // localStorage mock 초기화
    localStorageMock = {}

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => localStorageMock[key] || null,
        setItem: (key: string, value: string) => {
          localStorageMock[key] = value
        },
        removeItem: (key: string) => {
          delete localStorageMock[key]
        },
        clear: () => {
          localStorageMock = {}
        },
      },
      writable: true,
    })
  })

  describe('localStorage 사용 허용 시', () => {
    beforeEach(() => {
      // 기본값: true (또는 명시적으로 true)
      localStorageMock['statPlatform_localStorageEnabled'] = 'true'
    })

    it('getItem이 정상적으로 동작해야 함', () => {
      localStorageMock['test_key'] = 'test_value'
      expect(StorageService.getItem('test_key')).toBe('test_value')
    })

    it('setItem이 정상적으로 동작해야 함', () => {
      StorageService.setItem('test_key', 'test_value')
      expect(localStorageMock['test_key']).toBe('test_value')
    })
  })

  describe('localStorage 사용 비허용 시', () => {
    beforeEach(() => {
      localStorageMock['statPlatform_localStorageEnabled'] = 'false'
    })

    it('getItem이 null을 반환해야 함', () => {
      localStorageMock['test_key'] = 'test_value'
      expect(StorageService.getItem('test_key')).toBeNull()
    })

    it('setItem이 저장하지 않아야 함', () => {
      StorageService.setItem('test_key', 'test_value')
      expect(localStorageMock['test_key']).toBeUndefined()
    })

    it('설정 키 자체는 항상 허용되어야 함', () => {
      // 설정 키는 옵트아웃 상태에서도 읽기/쓰기 가능
      StorageService.setItem('statPlatform_localStorageEnabled', 'true')
      expect(localStorageMock['statPlatform_localStorageEnabled']).toBe('true')

      StorageService.setItem('statPlatform_notifyAnalysisComplete', 'false')
      expect(localStorageMock['statPlatform_notifyAnalysisComplete']).toBe('false')
    })
  })

  describe('removeItem', () => {
    it('옵트아웃 상태에서도 삭제는 허용되어야 함', () => {
      localStorageMock['statPlatform_localStorageEnabled'] = 'false'
      localStorageMock['test_key'] = 'test_value'

      StorageService.removeItem('test_key')
      expect(localStorageMock['test_key']).toBeUndefined()
    })
  })

  describe('isEnabled', () => {
    it('localStorage 허용 시 true 반환', () => {
      localStorageMock['statPlatform_localStorageEnabled'] = 'true'
      expect(StorageService.isEnabled()).toBe(true)
    })

    it('localStorage 비허용 시 false 반환', () => {
      localStorageMock['statPlatform_localStorageEnabled'] = 'false'
      expect(StorageService.isEnabled()).toBe(false)
    })

    it('설정 없을 시 기본값 true 반환', () => {
      expect(StorageService.isEnabled()).toBe(true)
    })
  })
})
