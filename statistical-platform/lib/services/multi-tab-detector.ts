/**
 * 다중 탭 감지 및 차단 시스템
 *
 * BroadcastChannel을 사용하여 동일 출처의 다른 탭을 감지하고
 * 사용자에게 경고를 표시하며 기능을 제한합니다.
 */

type MultiTabDetectorCallback = (tabCount: number, tabId: string) => void

export class MultiTabDetector {
  private static instance: MultiTabDetector | null = null
  private channel: BroadcastChannel | null = null
  private tabId: string
  private otherTabs: Map<string, number> = new Map() // tabId -> lastHeartbeat
  private listeners: Set<MultiTabDetectorCallback> = new Set()
  private readonly CHANNEL_NAME = 'multi-tab-detector'
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private cleanupInterval: ReturnType<typeof setInterval> | null = null
  private readonly HEARTBEAT_INTERVAL = 500 // 500ms
  private readonly HEARTBEAT_TIMEOUT = 2000 // 2초 이상 신호 없으면 탭 제거

  private constructor() {
    this.tabId = this.generateTabId()
    this.initialize()
  }

  static getInstance(): MultiTabDetector {
    if (!MultiTabDetector.instance) {
      MultiTabDetector.instance = new MultiTabDetector()
    }
    return MultiTabDetector.instance
  }

  /**
   * 초기화: BroadcastChannel 설정 및 하트비트 시작
   */
  private initialize(): void {
    if (!this.isSupported()) {
      console.warn('[MultiTabDetector] BroadcastChannel not supported')
      return
    }

    try {
      this.channel = new BroadcastChannel(this.CHANNEL_NAME)

      // 메시지 수신 리스너
      this.channel.addEventListener('message', (event) => {
        this.handleMessage(event.data)
      })

      // 하트비트 시작
      this.startHeartbeat()

      // 타임아웃된 탭 정리
      this.startCleanup()

      // 페이지 나갈 때 정리
      window.addEventListener('beforeunload', () => this.destroy())

      console.log(`[MultiTabDetector] Initialized with tabId: ${this.tabId}`)
    } catch (error) {
      console.error('[MultiTabDetector] Failed to initialize:', error)
    }
  }

  /**
   * 하트비트 시작 - 주기적으로 신호 전송
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.channel) {
        this.channel.postMessage({
          type: 'heartbeat',
          tabId: this.tabId,
          timestamp: Date.now(),
        })
      }
    }, this.HEARTBEAT_INTERVAL)
  }

  /**
   * 타임아웃된 탭 정리
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      const deadTabIds: string[] = []

      for (const [tabId, lastHeartbeat] of this.otherTabs.entries()) {
        if (now - lastHeartbeat > this.HEARTBEAT_TIMEOUT) {
          deadTabIds.push(tabId)
        }
      }

      // 타임아웃된 탭 제거
      if (deadTabIds.length > 0) {
        for (const tabId of deadTabIds) {
          this.otherTabs.delete(tabId)
        }
        this.notifyListeners()
      }
    }, 1000)
  }

  /**
   * 메시지 처리
   */
  private handleMessage(data: unknown): void {
    if (typeof data !== 'object' || data === null) return

    const message = data as Record<string, unknown>
    const messageType = message.type as string
    const tabId = message.tabId as string | undefined

    if (!tabId || tabId === this.tabId) return

    switch (messageType) {
      case 'heartbeat': {
        const timestamp = message.timestamp as number | undefined
        if (timestamp) {
          this.otherTabs.set(tabId, timestamp)
          this.notifyListeners()
        }
        break
      }
    }
  }

  /**
   * 리스너 등록
   */
  onTabCountChange(callback: MultiTabDetectorCallback): void {
    this.listeners.add(callback)
    // 등록 시 현재 상태 즉시 알림
    callback(this.otherTabs.size, this.tabId)
  }

  /**
   * 리스너 제거
   */
  removeListener(callback: MultiTabDetectorCallback): void {
    this.listeners.delete(callback)
  }

  /**
   * 모든 리스너에 알림
   */
  private notifyListeners(): void {
    const count = this.otherTabs.size
    this.listeners.forEach((callback) => {
      callback(count, this.tabId)
    })
  }

  /**
   * 현재 탭이 유일한 탭인지 확인
   */
  isUniqueTab(): boolean {
    return this.otherTabs.size === 0
  }

  /**
   * 현재 탭 ID 반환
   */
  getTabId(): string {
    return this.tabId
  }

  /**
   * 다른 탭 개수 반환
   */
  getOtherTabsCount(): number {
    return this.otherTabs.size
  }

  /**
   * BroadcastChannel 지원 여부 확인
   */
  private isSupported(): boolean {
    return typeof BroadcastChannel !== 'undefined'
  }

  /**
   * 탭 ID 생성 (UUID)
   */
  private generateTabId(): string {
    return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * 정리
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    if (this.channel) {
      try {
        this.channel.close()
      } catch (error) {
        // 이미 닫혔을 수 있음
      }
    }

    this.listeners.clear()
    this.otherTabs.clear()

    if (MultiTabDetector.instance === this) {
      MultiTabDetector.instance = null
    }
  }
}