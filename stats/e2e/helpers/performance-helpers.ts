/**
 * Performance Measurement Helpers for E2E Tests
 *
 * Phase 5 비기능 테스트용 성능 측정 유틸리티.
 * - 페이지 로드, 액션 시간, FCP, 메모리 사용량 측정
 */

import { Page } from '@playwright/test'

/** 페이지 로드 시간 측정 (goto → DOMContentLoaded) */
export async function measurePageLoad(page: Page, url: string): Promise<number> {
  const start = Date.now()
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  return Date.now() - start
}

/** 특정 액션 실행 후 셀렉터 표시까지 걸린 시간 측정.
 *  waitForSelector에 콤마 구분 문자열 전달 시 각각을 개별 셀렉터로 분리하여
 *  하나라도 visible이면 통과 (page.waitForSelector는 CSS 콤마를 지원하지 않음). */
export async function measureAction(
  page: Page,
  action: () => Promise<void>,
  waitForSelector: string | string[],
  timeout = 30000,
): Promise<number> {
  const start = Date.now()
  await action()

  const selectors =
    typeof waitForSelector === 'string'
      ? waitForSelector.split(',').map((s) => s.trim())
      : waitForSelector

  if (selectors.length === 1) {
    await page.waitForSelector(selectors[0], { timeout })
  } else {
    // Race: 여러 셀렉터 중 하나라도 visible이면 resolve
    await Promise.race(
      selectors.map((sel) =>
        page.waitForSelector(sel, { timeout }).catch(() => null),
      ),
    )
  }
  return Date.now() - start
}

/** First Contentful Paint 측정 (이미 로드된 페이지에서 호출) */
export async function measureFCP(page: Page): Promise<number> {
  return page.evaluate(() => {
    return new Promise<number>((resolve) => {
      // 이미 paint 이벤트가 발생했을 수 있으므로 먼저 확인
      const existing = performance.getEntriesByName('first-contentful-paint')
      if (existing.length > 0) {
        resolve(existing[0].startTime)
        return
      }

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            observer.disconnect()
            resolve(entry.startTime)
            return
          }
        }
      })
      observer.observe({ entryTypes: ['paint'] })

      // fallback timeout
      setTimeout(() => {
        observer.disconnect()
        resolve(-1)
      }, 10000)
    })
  })
}

/** JS 힙 메모리 사용량 (Chrome only, bytes) */
export async function getMemoryUsage(page: Page): Promise<number> {
  return page.evaluate(() => {
    const perf = performance as Performance & {
      memory?: { usedJSHeapSize: number }
    }
    return perf.memory?.usedJSHeapSize ?? -1
  })
}

/** 메모리 증가량 측정: before/after diff (MB) */
export function memoryDiffMB(before: number, after: number): number {
  if (before < 0 || after < 0) return -1
  return (after - before) / (1024 * 1024)
}

/** 네트워크 요청 수 카운트 */
export async function countNetworkRequests(
  page: Page,
  action: () => Promise<void>,
): Promise<number> {
  let count = 0
  const handler = (): void => {
    count++
  }
  page.on('request', handler)
  await action()
  page.off('request', handler)
  return count
}

/** 타이밍 측정 결과 인터페이스 */
export interface TimingResult {
  label: string
  durationMs: number
  passed: boolean
  thresholdMs: number
}

/** 시간 기준 검증 (측정값 < 임계값이면 pass) */
export function checkTiming(
  label: string,
  durationMs: number,
  thresholdMs: number,
): TimingResult {
  return {
    label,
    durationMs,
    passed: durationMs < thresholdMs,
    thresholdMs,
  }
}
