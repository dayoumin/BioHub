/**
 * MultiTabDetector 테스트
 */

import { MultiTabDetector } from './multi-tab-detector'

describe('MultiTabDetector', () => {
  let detector: MultiTabDetector

  beforeEach(() => {
    // 싱글톤 초기화
    detector = MultiTabDetector.getInstance()
  })

  afterEach(() => {
    detector.destroy()
  })

  describe('초기화', () => {
    it('싱글톤 인스턴스가 생성되어야 함', () => {
      const instance1 = MultiTabDetector.getInstance()
      const instance2 = MultiTabDetector.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('탭 ID가 생성되어야 함', () => {
      const tabId = detector.getTabId()
      expect(tabId).toBeDefined()
      expect(tabId).toMatch(/^tab-\d+-[a-z0-9]{9}$/)
    })

    it('초기에 다른 탭이 없어야 함', () => {
      expect(detector.isUniqueTab()).toBe(true)
      expect(detector.getOtherTabsCount()).toBe(0)
    })
  })

  describe('리스너 관리', () => {
    it('리스너를 등록할 수 있어야 함', () => {
      const callback = jest.fn()
      detector.onTabCountChange(callback)

      // 등록 시 즉시 호출됨
      expect(callback).toHaveBeenCalled()
    })

    it('리스너를 제거할 수 있어야 함', () => {
      const callback = jest.fn()
      detector.onTabCountChange(callback)
      detector.removeListener(callback)

      expect(detector.getOtherTabsCount()).toBe(0)
    })

    it('다중 리스너를 지원해야 함', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()

      detector.onTabCountChange(callback1)
      detector.onTabCountChange(callback2)

      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })
  })

  describe('다른 탭 감지', () => {
    it('BroadcastChannel이 지원되지 않으면 경고를 표시해야 함', () => {
      const warnSpy = jest.spyOn(console, 'warn')
      const originalBroadcastChannel = global.BroadcastChannel

      // BroadcastChannel 미지원 시뮬레이션
      ;(global as any).BroadcastChannel = undefined

      const newDetector = MultiTabDetector.getInstance()
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('BroadcastChannel not supported')
      )

      newDetector.destroy()
      ;(global as any).BroadcastChannel = originalBroadcastChannel
      warnSpy.mockRestore()
    })
  })

  describe('정리', () => {
    it('destroy 호출 시 리소스가 정리되어야 함', () => {
      const callback = jest.fn()
      detector.onTabCountChange(callback)

      detector.destroy()

      // destroy 후 새 인스턴스는 새로 생성되어야 함
      const newDetector = MultiTabDetector.getInstance()
      expect(newDetector.getTabId()).not.toBe(detector.getTabId())

      newDetector.destroy()
    })
  })
})
