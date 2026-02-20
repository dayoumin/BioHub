/**
 * Pyodide CDN URL 실제 함수 테스트
 *
 * 목적: getPyodideCDNUrls()가 환경 변수에 따라 올바른 URL을 반환하는지 검증
 * 이전 테스트와의 차이: 실제 함수를 import하여 실행 (Mock 아님)
 */

import { describe, it, beforeEach, afterEach } from 'vitest'
import { getPyodideCDNUrls } from '@/lib/constants'

describe('getPyodideCDNUrls - Real Function Test', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // 환경 변수 초기화
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    // 환경 변수 복원
    process.env = originalEnv
  })

  describe('1. CDN 모드 (Vercel 배포)', () => {
    it('should return CDN URLs when NEXT_PUBLIC_PYODIDE_USE_LOCAL is undefined', () => {
      delete process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL

      const urls = getPyodideCDNUrls()

      expect(urls.scriptURL).toContain('cdn.jsdelivr.net')
      expect(urls.scriptURL).toContain('pyodide.js')
      expect(urls.indexURL).toContain('cdn.jsdelivr.net')
      expect(urls.indexURL.endsWith('/')).toBe(true)
      expect(urls.version).toMatch(/^v\d+\.\d+\.\d+$/) // v0.28.3 형식
    })

    it('should return CDN URLs when NEXT_PUBLIC_PYODIDE_USE_LOCAL is false', () => {
      process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL = 'false'

      const urls = getPyodideCDNUrls()

      expect(urls.scriptURL).toBe(`https://cdn.jsdelivr.net/pyodide/${urls.version}/full/pyodide.js`)
      expect(urls.indexURL).toBe(`https://cdn.jsdelivr.net/pyodide/${urls.version}/full/`)
    })

    it('should return CDN URLs when NEXT_PUBLIC_PYODIDE_USE_LOCAL is any non-"true" string', () => {
      process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL = 'no'

      const urls = getPyodideCDNUrls()

      expect(urls.scriptURL).toContain('cdn.jsdelivr.net')
      expect(urls.indexURL).toContain('cdn.jsdelivr.net')
    })
  })

  describe('2. 로컬 모드 (내부망 배포)', () => {
    it('should return local URLs when NEXT_PUBLIC_PYODIDE_USE_LOCAL is "true"', () => {
      process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL = 'true'

      const urls = getPyodideCDNUrls()

      expect(urls.scriptURL).toBe('/pyodide/pyodide.js')
      expect(urls.indexURL).toBe('/pyodide/')
      expect(urls.version).toBe('local') // 로컬 모드는 version이 'local'
    })

    it('should have different version identifiers for CDN and local modes', () => {
      // CDN 모드: 실제 버전 (v0.28.3)
      delete process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL
      const cdnUrls = getPyodideCDNUrls()
      expect(cdnUrls.version).toMatch(/^v\d+\.\d+\.\d+$/)

      // 로컬 모드: 'local' (버전 관리 불필요)
      process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL = 'true'
      const localUrls = getPyodideCDNUrls()
      expect(localUrls.version).toBe('local')

      // 의도적으로 다름 (로컬은 버전 추적 불필요)
      expect(cdnUrls.version).not.toBe(localUrls.version)
    })
  })

  describe('3. URL 형식 검증', () => {
    it('should return valid HTTPS URLs in CDN mode', () => {
      delete process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL

      const urls = getPyodideCDNUrls()

      expect(urls.scriptURL).toMatch(/^https:\/\//)
      expect(urls.indexURL).toMatch(/^https:\/\//)
    })

    it('should return absolute paths in local mode', () => {
      process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL = 'true'

      const urls = getPyodideCDNUrls()

      expect(urls.scriptURL).toMatch(/^\//)
      expect(urls.indexURL).toMatch(/^\//)
    })

    it('should have consistent URL structure', () => {
      delete process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL

      const urls = getPyodideCDNUrls()

      // indexURL은 scriptURL의 디렉토리
      const scriptDir = urls.scriptURL.substring(0, urls.scriptURL.lastIndexOf('/') + 1)
      expect(urls.indexURL).toBe(scriptDir)
    })
  })

  describe('4. 버전 관리', () => {
    it('should include version in CDN URLs', () => {
      delete process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL

      const urls = getPyodideCDNUrls()

      expect(urls.scriptURL).toContain(urls.version)
      expect(urls.indexURL).toContain(urls.version)
    })

    it('should use v0.28.3 or later', () => {
      const urls = getPyodideCDNUrls()

      const versionMatch = urls.version.match(/^v(\d+)\.(\d+)\.(\d+)$/)
      expect(versionMatch).not.toBeNull()

      const [, major, minor] = versionMatch!
      const majorNum = parseInt(major)
      const minorNum = parseInt(minor)

      // v0.28.3 이상 (0.28 또는 그 이상)
      expect(majorNum).toBeGreaterThanOrEqual(0)
      if (majorNum === 0) {
        expect(minorNum).toBeGreaterThanOrEqual(28)
      }
    })
  })

  describe('5. 일관성 검증', () => {
    it('should return same URLs for repeated calls in same environment', () => {
      delete process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL

      const urls1 = getPyodideCDNUrls()
      const urls2 = getPyodideCDNUrls()

      expect(urls1.scriptURL).toBe(urls2.scriptURL)
      expect(urls1.indexURL).toBe(urls2.indexURL)
      expect(urls1.version).toBe(urls2.version)
    })

    it('should return different URLs when environment changes', () => {
      delete process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL
      const cdnUrls = getPyodideCDNUrls()

      process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL = 'true'
      const localUrls = getPyodideCDNUrls()

      expect(cdnUrls.scriptURL).not.toBe(localUrls.scriptURL)
      expect(cdnUrls.indexURL).not.toBe(localUrls.indexURL)
    })
  })

  describe('6. 엣지 케이스', () => {
    it('should handle empty string as false', () => {
      process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL = ''

      const urls = getPyodideCDNUrls()

      expect(urls.scriptURL).toContain('cdn.jsdelivr.net')
    })

    it('should handle "TRUE" (uppercase) as non-true', () => {
      process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL = 'TRUE'

      const urls = getPyodideCDNUrls()

      // "true" (소문자)만 로컬 모드로 인식
      expect(urls.scriptURL).toContain('cdn.jsdelivr.net')
    })

    it('should handle "1" as non-true', () => {
      process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL = '1'

      const urls = getPyodideCDNUrls()

      expect(urls.scriptURL).toContain('cdn.jsdelivr.net')
    })
  })

  describe('7. 실제 사용 시나리오', () => {
    it('should work with pyodide-core.service.ts pattern', () => {
      delete process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL

      const { scriptURL, indexURL } = getPyodideCDNUrls()

      // pyodide-core.service.ts에서 사용하는 패턴
      expect(scriptURL).toBeTruthy()
      expect(indexURL).toBeTruthy()
      expect(typeof scriptURL).toBe('string')
      expect(typeof indexURL).toBe('string')
    })

    it('should work with pyodide-worker.ts pattern', () => {
      process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL = 'true'

      const { scriptURL, indexURL } = getPyodideCDNUrls()

      // Worker에서 사용하는 패턴
      const finalScriptUrl = scriptURL || '/pyodide/pyodide.js'
      const finalIndexUrl = indexURL || '/pyodide/'

      expect(finalScriptUrl).toBe('/pyodide/pyodide.js')
      expect(finalIndexUrl).toBe('/pyodide/')
    })
  })

  describe('8. 회귀 방지: 함수 수정 감지', () => {
    it('should fail if function returns undefined', () => {
      const urls = getPyodideCDNUrls()

      expect(urls).toBeDefined()
      expect(urls.scriptURL).toBeDefined()
      expect(urls.indexURL).toBeDefined()
      expect(urls.version).toBeDefined()
    })

    it('should fail if function returns wrong structure', () => {
      const urls = getPyodideCDNUrls()

      // 반환 객체 구조 검증
      expect(urls).toHaveProperty('scriptURL')
      expect(urls).toHaveProperty('indexURL')
      expect(urls).toHaveProperty('version')
    })

    it('should fail if CDN URLs change unexpectedly', () => {
      delete process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL

      const urls = getPyodideCDNUrls()

      // CDN URL 패턴 검증 (변경 시 테스트 실패)
      expect(urls.scriptURL).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/pyodide\/v[\d.]+\/full\/pyodide\.js$/)
      expect(urls.indexURL).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/pyodide\/v[\d.]+\/full\/$/)
    })

    it('should fail if local URLs change unexpectedly', () => {
      process.env.NEXT_PUBLIC_PYODIDE_USE_LOCAL = 'true'

      const urls = getPyodideCDNUrls()

      // 로컬 URL 패턴 검증 (변경 시 테스트 실패)
      expect(urls.scriptURL).toBe('/pyodide/pyodide.js')
      expect(urls.indexURL).toBe('/pyodide/')
    })
  })
})
