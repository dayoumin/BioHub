/**
 * node:async_hooks Polyfill for Browser (Improved)
 *
 * LangGraph.js의 AsyncLocalStorage를 브라우저에서 작동하도록 구현
 *
 * 개선 사항:
 * 1. Promise/async-await 지원 (비동기 경계 후에도 컨텍스트 유지)
 * 2. 중첩/순차 실행 지원 (스택 기반 컨텍스트 복원)
 * 3. 런타임 경고 (미지원 API 호출 감지)
 * 4. 브라우저 전용 (Node.js 환경에서 로드 시 경고)
 *
 * ⚠️ 제한 사항 (CRITICAL):
 * 1. 병렬 실행 비권장 (동일 인스턴스):
 *    - 동일 ALS 인스턴스에서 두 개의 run()이 동시에 실행되면 _currentContextId가 덮어쓰기됨
 *    - 서로의 getStore()를 오염시킬 수 있음 (병렬 가드 없음)
 *    - 권장: 그래프마다 별도 AsyncLocalStorage 인스턴스 사용
 *    - 런타임 보호: activeContextCount > 20이면 에러 발생 (회귀 방지)
 *
 * 2. Promise 영구 대기 시 메모리 누수:
 *    - Promise가 영원히 pending 상태면 cleanup이 실행되지 않음 (finally 미호출)
 *    - contextStores 엔트리와 activeContextCount가 해제되지 않아 누적 가능
 *    - 실제로는 대부분의 Promise가 settle되므로 큰 문제는 아님
 *    - 진단: activeContextCount > 10 시 경고 로그 출력
 *
 * 3. bind/snapshot 제한적 구현:
 *    - 기존 컨텍스트가 없을 때만 캡처한 store로 감싸짐
 *    - 실행 중 컨텍스트가 이미 있으면 원 함수 그대로 실행 (덮어쓰지 않음)
 *    - 호출자가 기대한 컨텍스트가 없을 수 있음
 *
 * 4. ESM/CJS 이중 export:
 *    - Jest: CommonJS만 인식 (module.exports)
 *    - Webpack/Vite: ESM named export 인식 (export { ... })
 *    - 순수 Node.js ESM: named import 가능
 *
 * ✅ 지원되는 패턴:
 * - 중첩 run() 호출 (outer → inner → outer 복원)
 * - 순차 run() 호출 (await 후 재호출)
 * - LangGraph runWithConfig 중첩/순차 호출
 */

// 환경 체크
if (typeof window === 'undefined') {
  console.warn('⚠️ async-hooks-polyfill loaded in Node.js environment! This should only be used in browser.')
}

// 컨텍스트 저장소 (격리를 위한 전역 맵)
const contextStores = new Map()
let contextIdCounter = 0
let activeContextCount = 0

/**
 * AsyncLocalStorage Polyfill
 *
 * 간이 컨텍스트 격리:
 * - 각 run() 호출마다 고유 ID 할당
 * - Promise 체인을 따라 컨텍스트 전파
 * - WeakMap 대신 Map 사용 (성능 trade-off)
 */
class AsyncLocalStorage {
  constructor() {
    this._contextKey = Symbol('AsyncLocalStorageContext')
    this._currentContextId = null
    this._isPolyfill = true // 폴리필 마커
  }

  /**
   * 현재 실행 컨텍스트의 store 반환
   */
  getStore() {
    if (this._currentContextId === null) {
      return undefined
    }
    return contextStores.get(`${this._contextKey.toString()}-${this._currentContextId}`)
  }

  /**
   * store를 설정하고 callback 실행
   *
   * Promise를 반환하는 경우:
   * - finally()로 컨텍스트 정리를 지연
   * - async/await 후에도 컨텍스트 유지
   *
   * 중첩 지원:
   * - 이전 컨텍스트를 스택에 저장 (previousContextId)
   * - cleanup 시 복원하여 Node.js ALS처럼 동작
   * - LangGraph의 runWithConfig 중첩 호출 지원
   */
  run(store, callback, ...args) {
    // 컨텍스트 스택 관리 (중첩 허용)
    // - 이전 컨텍스트를 previousContextId에 저장
    // - cleanup 시 복원하여 스택처럼 동작
    const contextId = ++contextIdCounter
    const previousContextId = this._currentContextId  // 스택 push
    const storeKey = `${this._contextKey.toString()}-${contextId}`

    // 동시 실행 경고 (전역 카운터)
    // 임계값 초과 시 에러 (회귀 방지)
    if (activeContextCount > 20) {
      const errorMsg = `❌ AsyncLocalStorage: ${activeContextCount}개의 동시 실행 컨텍스트 감지. 병렬 실행 비권장 정책 위반 가능성.`
      console.error(errorMsg)
      throw new Error(errorMsg)
    } else if (activeContextCount > 10) {
      console.warn(`⚠️ AsyncLocalStorage: ${activeContextCount}개의 동시 실행 컨텍스트 감지. 성능 저하 가능성.`)
    }

    // 컨텍스트 설정
    this._currentContextId = contextId
    contextStores.set(storeKey, store)
    activeContextCount++

    const cleanup = () => {
      this._currentContextId = previousContextId  // 스택 pop
      contextStores.delete(storeKey)
      activeContextCount--
    }

    try {
      const result = callback(...args)

      // Promise인 경우 비동기 처리
      if (result && typeof result.then === 'function') {
        // Promise cleanup은 finally에서 처리
        return result.finally(cleanup)
      }

      // 동기 함수인 경우 즉시 정리
      cleanup()
      return result
    } catch (error) {
      cleanup()
      throw error
    }
  }

  /**
   * 현재 비동기 컨텍스트에 store 설정
   * (run() 없이 직접 설정, 주의 필요)
   *
   * 메모리 누수 방지:
   * - 기존 컨텍스트가 있으면 먼저 정리
   * - 새 컨텍스트 생성 시 카운터 증가
   */
  enterWith(store) {
    // 기존 컨텍스트 정리 (메모리 누수 방지)
    if (this._currentContextId !== null) {
      const oldStoreKey = `${this._contextKey.toString()}-${this._currentContextId}`
      contextStores.delete(oldStoreKey)
      activeContextCount = Math.max(0, activeContextCount - 1)
    }

    // 새 컨텍스트 생성
    this._currentContextId = ++contextIdCounter
    const storeKey = `${this._contextKey.toString()}-${this._currentContextId}`
    contextStores.set(storeKey, store)
    activeContextCount++
  }

  /**
   * 현재 컨텍스트 비활성화
   */
  disable() {
    if (this._currentContextId !== null) {
      const storeKey = `${this._contextKey.toString()}-${this._currentContextId}`
      contextStores.delete(storeKey)
      this._currentContextId = null
      activeContextCount = Math.max(0, activeContextCount - 1)
    }
  }

  /**
   * exit() - Node.js API 호환성
   * 브라우저에서는 완전 구현 불가 (경고 출력)
   *
   * 동작:
   * - 컨텍스트 임시 비활성화 (store는 유지)
   * - callback 완료 후 복원
   * - 메모리 누수 없음 (store 삭제 안 함)
   */
  exit(callback, ...args) {
    console.warn('⚠️ AsyncLocalStorage.exit() is not fully supported in browser polyfill')
    const previousContextId = this._currentContextId

    // 임시로 컨텍스트 비활성화 (store는 유지)
    this._currentContextId = null

    try {
      return callback(...args)
    } finally {
      // 컨텍스트 복원 (store는 이미 존재함)
      this._currentContextId = previousContextId
    }
  }

  /**
   * bind() - 함수에 현재 컨텍스트 바인딩
   *
   * 최소 구현:
   * - 현재 컨텍스트를 캡처하여 함수 래핑
   * - 완벽한 구현은 아니지만 기본 동작 지원
   * - 프로덕션에서 조용한 실패 방지
   */
  bind(fn) {
    const currentStore = this.getStore()
    const self = this

    return function boundFunction(...args) {
      // 현재 컨텍스트가 없으면 캡처한 store로 실행
      if (self._currentContextId === null && currentStore !== undefined) {
        return self.run(currentStore, () => fn(...args))
      }
      // 이미 컨텍스트가 있으면 그대로 실행
      return fn(...args)
    }
  }

  /**
   * snapshot() - 현재 컨텍스트 스냅샷
   *
   * 최소 구현:
   * - 현재 store를 캡처하여 복원 함수 반환
   * - 완벽한 구현은 아니지만 기본 동작 지원
   */
  snapshot() {
    const currentStore = this.getStore()
    const self = this

    return function restoreSnapshot(fn, ...args) {
      // 캡처한 store가 있으면 그걸로 실행
      if (currentStore !== undefined) {
        return self.run(currentStore, () => fn(...args))
      }
      // 없으면 그대로 실행
      return fn(...args)
    }
  }
}

/**
 * Node.js async_hooks 호환 함수들
 * (LangGraph가 직접 사용하지 않지만 호환성을 위해 export)
 */
const executionAsyncId = () => 0
const triggerAsyncId = () => 0
const executionAsyncResource = () => ({})
const asyncWrapProviders = {}

/**
 * 폴리필 검증 함수 (개발 환경에서 사용)
 */
function validatePolyfill() {
  if (typeof window !== 'undefined') {
    console.info('ℹ️ Using AsyncLocalStorage polyfill (browser mode)')
    console.info('ℹ️ Limitations: Nested/sequential run() is supported')
    console.info('ℹ️ Warning: Avoid parallel execution on the same instance (use separate instances)')
  }
}

/**
 * Export 전략:
 *
 * 1. CommonJS (Jest/Node.js require):
 *    - module.exports로 내보내기
 *    - Jest가 이것만 인식
 *
 * 2. ESM (Webpack/Vite import):
 *    - Webpack의 NormalModuleReplacementPlugin이 이 파일을 import할 때
 *    - Webpack은 CommonJS를 자동으로 ESM으로 변환
 *    - 따라서 명시적 ESM export 불필요
 *
 * 3. 순수 Node.js ESM 환경:
 *    - 이 파일을 직접 import하는 경우 (드물음)
 *    - module.exports의 named export를 사용 가능
 *    - 예: import { AsyncLocalStorage } from './polyfill.js'
 *
 * 결론: CommonJS만 명시하고, Webpack/번들러가 ESM 변환 담당
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AsyncLocalStorage,
    executionAsyncId,
    triggerAsyncId,
    executionAsyncResource,
    asyncWrapProviders,
    validatePolyfill
  }
  module.exports.AsyncLocalStorage = AsyncLocalStorage
  module.exports.default = AsyncLocalStorage
} else {
  // ESM 환경 (동적 export - 사용되지 않을 가능성 높음)
  // Webpack이 module.exports를 ESM으로 변환하므로 여기는 도달하지 않음
  console.warn('⚠️ async-hooks-polyfill: ESM 환경에서 직접 로드됨 (Webpack 권장)')
}
