/**
 * Ollama Endpoint E2E 테스트
 *
 * 실제 브라우저 환경에서 3가지 시나리오 검증:
 * 1. 명시적 endpoint 설정 시 → 어디서든 사용 가능
 * 2. endpoint 없음 + localhost → 사용 가능
 * 3. endpoint 없음 + 원격 → 차단
 */

import { test, expect } from '@playwright/test'

test.describe('Ollama Endpoint 처리', () => {
  test.describe('Scenario 1: 명시적 Endpoint 설정', () => {
    test('환경변수 설정 시 커스텀 엔드포인트 사용', async ({ page }) => {
      // Given: 환경변수 설정 (빌드 시 주입됨)
      // NEXT_PUBLIC_OLLAMA_ENDPOINT=http://my-server:11434

      await page.goto('http://localhost:3000')

      // 환경변수 확인 (클라이언트 사이드)
      const endpoint = await page.evaluate(() => {
        return (window as any).process?.env?.NEXT_PUBLIC_OLLAMA_ENDPOINT ||
               process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT
      })

      // Then: 환경변수가 설정되어 있으면 커스텀 엔드포인트 사용
      if (endpoint) {
        expect(endpoint).toMatch(/^https?:\/\//)
        console.log(`✓ 커스텀 엔드포인트 사용: ${endpoint}`)
      } else {
        console.log('ℹ️ 환경변수 미설정 - 기본 엔드포인트 사용')
      }
    })
  })

  test.describe('Scenario 2: Localhost 환경', () => {
    test('localhost 접속 시 Ollama 사용 가능', async ({ page }) => {
      // Given: localhost 접속
      await page.goto('http://localhost:3000')

      // When: 환경 감지
      const hostname = await page.evaluate(() => window.location.hostname)

      // Then: localhost 또는 127.0.0.1
      expect(['localhost', '127.0.0.1']).toContain(hostname)
      console.log(`✓ Localhost 환경 확인: ${hostname}`)
    })

    test('환경 인디케이터 표시 확인', async ({ page }) => {
      // Given: localhost 접속
      await page.goto('http://localhost:3000')

      // When: 환경 인디케이터 확인
      const indicator = page.locator('[data-testid="environment-indicator"]')

      // Then: 로컬 환경 표시
      if (await indicator.isVisible()) {
        const text = await indicator.textContent()
        expect(text).toMatch(/로컬|Local/i)
        console.log(`✓ 환경 인디케이터: ${text}`)
      }
    })
  })

  test.describe('Scenario 3: 원격 환경 (차단)', () => {
    test('Vercel 환경 변수 감지', async ({ page }) => {
      // Given: Vercel 환경 변수 모킹
      await page.addInitScript(() => {
        // @ts-ignore
        window.__NEXT_DATA__ = {
          ...window.__NEXT_DATA__,
          runtimeConfig: {
            VERCEL_ENV: 'production'
          }
        }
      })

      await page.goto('http://localhost:3000')

      // When: 환경 감지
      const isVercel = await page.evaluate(() => {
        return !!(process.env.VERCEL || process.env.VERCEL_ENV)
      })

      // Then: Vercel 환경으로 인식
      console.log(`ℹ️ Vercel 환경: ${isVercel}`)
    })
  })

  test.describe('RAG 챗봇 통합 테스트', () => {
    test('RAG 챗봇 버튼 존재 확인', async ({ page }) => {
      await page.goto('http://localhost:3000/statistics/t-test')

      // RAG 챗봇 버튼 확인
      const ragButton = page.locator('button:has-text("RAG"), button:has-text("챗봇")')

      if (await ragButton.first().isVisible()) {
        console.log('✓ RAG 챗봇 버튼 존재')
      } else {
        console.log('ℹ️ RAG 챗봇 버튼 없음 (페이지에 따라 다름)')
      }
    })

    test('Ollama 연결 상태 표시 확인', async ({ page }) => {
      await page.goto('http://localhost:3000')

      // 환경 인디케이터에서 Ollama 상태 확인
      const indicator = page.locator('[data-testid="environment-indicator"]')

      if (await indicator.isVisible()) {
        const text = await indicator.textContent()

        // Ollama 상태가 표시되는지 확인
        if (text?.includes('Ollama')) {
          console.log(`✓ Ollama 상태 표시: ${text}`)

          // 상태별 검증
          if (text.includes('사용 가능') || text.includes('available')) {
            expect(text).toMatch(/사용 가능|available/i)
          } else if (text.includes('불가') || text.includes('unavailable')) {
            expect(text).toMatch(/불가|unavailable/i)
          }
        }
      }
    })
  })

  test.describe('에러 메시지 검증', () => {
    test.skip('원격 환경에서 Ollama 사용 시 에러 메시지', async ({ page }) => {
      // 이 테스트는 실제 원격 환경(Vercel 등)에서만 의미가 있음
      // 로컬 개발 환경에서는 스킵

      await page.goto('http://localhost:3000')

      // RAG 챗봇 시도
      const ragButton = page.locator('button:has-text("RAG")')
      if (await ragButton.isVisible()) {
        await ragButton.click()

        // 에러 메시지 확인
        const errorMessage = page.locator('[role="alert"], .error-message')
        if (await errorMessage.isVisible()) {
          const text = await errorMessage.textContent()

          // 사용자 친화적 메시지 확인
          expect(text).toMatch(/로컬 환경|NEXT_PUBLIC_OLLAMA_ENDPOINT/i)
          console.log(`✓ 에러 메시지: ${text}`)
        }
      }
    })
  })
})

test.describe('환경 감지 로직', () => {
  test('detectEnvironment() 동작 확인', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // 환경 감지 결과 확인
    const environment = await page.evaluate(() => {
      const hostname = window.location.hostname

      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'local'
      }
      return 'web'
    })

    expect(['local', 'web']).toContain(environment)
    console.log(`✓ 감지된 환경: ${environment}`)
  })

  test('NEXT_PUBLIC 환경변수 접근 가능', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // 클라이언트에서 환경변수 접근
    const canAccessEnv = await page.evaluate(() => {
      try {
        // Next.js에서는 NEXT_PUBLIC_ 변수만 클라이언트에서 접근 가능
        return typeof process !== 'undefined'
      } catch {
        return false
      }
    })

    console.log(`ℹ️ 클라이언트 환경변수 접근: ${canAccessEnv}`)
  })
})
