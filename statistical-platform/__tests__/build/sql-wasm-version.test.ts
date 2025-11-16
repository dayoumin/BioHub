/**
 * sql.js WASM 버전 일치 테스트
 *
 * 목적: npm 패키지와 public 폴더의 sql.js 파일이 동일한 버전인지 검증
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

describe('sql.js WASM 버전 일치 검증', () => {
  const npmDir = path.join(__dirname, '../../node_modules/sql.js/dist')
  const publicDir = path.join(__dirname, '../../public/sql-wasm')

  const files = ['sql-wasm.js', 'sql-wasm.wasm']

  /**
   * 파일의 MD5 해시 계산
   */
  function getFileHash(filePath: string): string {
    const content = fs.readFileSync(filePath)
    return crypto.createHash('md5').update(content).digest('hex')
  }

  describe('파일 존재 확인', () => {
    it('npm 패키지 파일이 존재해야 함', () => {
      files.forEach(file => {
        const filePath = path.join(npmDir, file)
        expect(fs.existsSync(filePath)).toBe(true)
      })
    })

    it('public 폴더 파일이 존재해야 함', () => {
      files.forEach(file => {
        const filePath = path.join(publicDir, file)
        expect(fs.existsSync(filePath)).toBe(true)
      })
    })
  })

  describe('버전 일치 확인 (MD5 해시)', () => {
    it('sql-wasm.js 파일이 npm 패키지와 동일해야 함', () => {
      const npmHash = getFileHash(path.join(npmDir, 'sql-wasm.js'))
      const publicHash = getFileHash(path.join(publicDir, 'sql-wasm.js'))

      expect(publicHash).toBe(npmHash)
    })

    it('sql-wasm.wasm 파일이 npm 패키지와 동일해야 함', () => {
      const npmHash = getFileHash(path.join(npmDir, 'sql-wasm.wasm'))
      const publicHash = getFileHash(path.join(publicDir, 'sql-wasm.wasm'))

      expect(publicHash).toBe(npmHash)
    })
  })

  describe('파일 크기 확인', () => {
    it('sql-wasm.js 크기가 npm 패키지와 동일해야 함', () => {
      const npmSize = fs.statSync(path.join(npmDir, 'sql-wasm.js')).size
      const publicSize = fs.statSync(path.join(publicDir, 'sql-wasm.js')).size

      expect(publicSize).toBe(npmSize)
    })

    it('sql-wasm.wasm 크기가 npm 패키지와 동일해야 함', () => {
      const npmSize = fs.statSync(path.join(npmDir, 'sql-wasm.wasm')).size
      const publicSize = fs.statSync(path.join(publicDir, 'sql-wasm.wasm')).size

      expect(publicSize).toBe(npmSize)
    })
  })

  describe('스크립트 동작 확인', () => {
    it('download-sql-wasm.js 스크립트가 존재해야 함', () => {
      const scriptPath = path.join(__dirname, '../../scripts/build/download-sql-wasm.js')
      expect(fs.existsSync(scriptPath)).toBe(true)
    })

    it('스크립트가 npm 패키지 경로를 참조해야 함', () => {
      const scriptPath = path.join(__dirname, '../../scripts/build/download-sql-wasm.js')
      const scriptContent = fs.readFileSync(scriptPath, 'utf-8')

      // npm 패키지 경로 참조 확인
      expect(scriptContent).toContain('node_modules/sql.js/dist')
      expect(scriptContent).toContain('public/sql-wasm')
    })
  })
})
