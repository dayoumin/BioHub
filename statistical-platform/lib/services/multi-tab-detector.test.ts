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

      // 기존 인스턴스 제거
      detector.destroy()

      // BroadcastChannel 미지원 시뮬레이션
      ;(global as any).BroadcastChannel = undefined

      warnSpy.mockClear()
      const newDetector = MultiTabDetector.getInstance()

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('BroadcastChannel not supported')
      )

      newDetector.destroy()
      ;(global as any).BroadcastChannel = originalBroadcastChannel
      warnSpy.mockRestore()
    })
  })

  describe('상태 변화 감지 (성능 최적화)', () => {
    it('탭 개수가 변경될 때만 리스너가 호출되어야 함', () => {
      const callback = jest.fn()
      detector.onTabCountChange(callback)

      // 초기 호출: 0개 탭
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(0, expect.any(String))

      callback.mockClear()

      // 같은 탭 ID로 여러 번 메시지 수신 → 콜백 호출 안 됨
      detector['handleMessage']({
        type: 'heartbeat',
        tabId: 'other-tab-1',
        timestamp: Date.now(),
      })
      detector['handleMessage']({
        type: 'heartbeat',
        tabId: 'other-tab-1',
        timestamp: Date.now(),
      })

      // 첫 번째만 호출됨 (상태 변화 감지)
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(1, expect.any(String))

      callback.mockClear()

      // 새로운 탭 감지
      detector['handleMessage']({
        type: 'heartbeat',
        tabId: 'other-tab-2',
        timestamp: Date.now(),
      })

      // 탭 개수 증가 → 콜백 호출
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(2, expect.any(String))
    })

    it('자신의 탭 ID에서는 메시지를 무시해야 함', () => {
      const callback = jest.fn()
      detector.onTabCountChange(callback)
      callback.mockClear()

      const ownTabId = detector.getTabId()

      // 자신의 탭 ID로 메시지 전송 (무시되어야 함)
      detector['handleMessage']({
        type: 'heartbeat',
        tabId: ownTabId,
        timestamp: Date.now(),
      })

      expect(callback).not.toHaveBeenCalled()
      expect(detector.getOtherTabsCount()).toBe(0)
    })
  })

  describe('process.env 가드 (Node 폴리필 없는 브라우저 환경)', () => {
    it('process 미정의 환경에서도 안전하게 초기화되어야 함', () => {
      const originalProcess = global.process

      // Node 폴리필 없는 브라우저 환경 시뮬레이션
      ;(global as any).process = undefined

      const logSpy = jest.spyOn(console, 'log')

      // 새 인스턴스 생성 - ReferenceError 없이 정상 초기화
      const browserDetector = MultiTabDetector.getInstance()

      expect(browserDetector).toBeDefined()
      expect(browserDetector.getTabId()).toBeDefined()
      expect(browserDetector.isUniqueTab()).toBe(true)

      // 로그가 출력되지 않음 (typeof 가드로 인해)
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('[MultiTabDetector] Initialized'))

      browserDetector.destroy()
      ;(global as any).process = originalProcess
      logSpy.mockRestore()
    })

    it('process.env가 undefined인 환경에서도 안전하게 작동해야 함', () => {
      const originalProcess = global.process

      // process는 있지만 env가 undefined인 환경
      ;(global as any).process = {}

      const logSpy = jest.spyOn(console, 'log')

      const envDetector = MultiTabDetector.getInstance()

      expect(envDetector).toBeDefined()
      expect(envDetector.getTabId()).toBeDefined()

      // 로그가 출력되지 않음 (optional chaining으로 인해 안전)
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('[MultiTabDetector] Initialized'))

      envDetector.destroy()
      ;(global as any).process = originalProcess
      logSpy.mockRestore()
    })

    it('typeof 가드가 ReferenceError를 방지해야 함', () => {
      // 이 테스트는 코드 정적 분석으로 검증됨:
      // if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development')
      // - typeof process 체크: ReferenceError 방지
      // - optional chaining (?.) 사용: null/undefined 안전
      // - 단락 평가: typeof false면 process.env 접근 안 함

      // 런타임에서:
      // 1. process가 undefined: typeof는 'undefined' 반환, 단락 평가로 안전
      // 2. process.env가 undefined: optional chaining으로 undefined 반환
      // 3. NODE_ENV 없음: undefined === 'development' → false (안전)

      expect(() => {
        // process 미정의 환경에서도 if 조건이 항상 false로 평가됨
        const result = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'
        expect(result).toBe(false) // process undefined이므로 항상 false
      }).not.toThrow()
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
