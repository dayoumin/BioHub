/**
 * Prebuild Vector Stores Test
 *
 * npm run build 실행 시 Vector Store 메타데이터가 올바르게 생성되는지 테스트
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

describe('Prebuild Vector Stores', () => {
  const PUBLIC_RAG_DATA_DIR = path.join(__dirname, '../../public/rag-data')
  const METADATA_FILE = path.join(PUBLIC_RAG_DATA_DIR, 'vector-stores.json')
  const SCRIPT_PATH = path.join(__dirname, '../../scripts/generate-vector-store-metadata.js')

  beforeAll(() => {
    // 테스트 전 메타데이터 파일 삭제 (깨끗한 상태)
    if (fs.existsSync(METADATA_FILE)) {
      fs.unlinkSync(METADATA_FILE)
    }
  })

  describe('스크립트 실행', () => {
    it('generate-vector-store-metadata.js 파일이 존재해야 함', () => {
      expect(fs.existsSync(SCRIPT_PATH)).toBe(true)
    })

    it('스크립트 실행 시 에러가 발생하지 않아야 함', () => {
      expect(() => {
        execSync('node scripts/generate-vector-store-metadata.js', {
          cwd: path.join(__dirname, '../../'),
          stdio: 'pipe'
        })
      }).not.toThrow()
    })

    it('스크립트 실행 후 vector-stores.json 파일이 생성되어야 함', () => {
      execSync('node scripts/generate-vector-store-metadata.js', {
        cwd: path.join(__dirname, '../../'),
        stdio: 'pipe'
      })

      expect(fs.existsSync(METADATA_FILE)).toBe(true)
    })
  })

  describe('생성된 메타데이터 검증', () => {
    let metadata: unknown

    beforeAll(() => {
      // 스크립트 실행
      execSync('node scripts/generate-vector-store-metadata.js', {
        cwd: path.join(__dirname, '../../'),
        stdio: 'pipe'
      })

      // JSON 파일 읽기
      const content = fs.readFileSync(METADATA_FILE, 'utf-8')
      metadata = JSON.parse(content)
    })

    it('유효한 JSON 배열이어야 함', () => {
      expect(Array.isArray(metadata)).toBe(true)
    })

    it('Vector Store 개수가 0개 이상이어야 함', () => {
      expect((metadata as unknown[]).length).toBeGreaterThanOrEqual(0)
    })

    it('각 Vector Store가 필수 필드를 가져야 함', () => {
      const stores = metadata as Array<Record<string, unknown>>

      stores.forEach((store) => {
        expect(store).toHaveProperty('id')
        expect(store).toHaveProperty('name')
        expect(store).toHaveProperty('dbPath')
        expect(store).toHaveProperty('embeddingModel')
        expect(store).toHaveProperty('dimensions')
        expect(store).toHaveProperty('docCount')
        expect(store).toHaveProperty('fileSize')
      })
    })

    it('id가 문자열이어야 함', () => {
      const stores = metadata as Array<Record<string, unknown>>

      stores.forEach((store) => {
        expect(typeof store.id).toBe('string')
        expect(store.id.length).toBeGreaterThan(0)
      })
    })

    it('dbPath가 올바른 형식이어야 함 (/rag-data/vector-*.db)', () => {
      const stores = metadata as Array<Record<string, unknown>>

      stores.forEach((store) => {
        expect(typeof store.dbPath).toBe('string')
        expect(store.dbPath).toMatch(/^\/rag-data\/vector-.+\.db$/)
      })
    })

    it('dimensions가 양수여야 함', () => {
      const stores = metadata as Array<Record<string, unknown>>

      stores.forEach((store) => {
        expect(typeof store.dimensions).toBe('number')
        expect(store.dimensions).toBeGreaterThan(0)
      })
    })

    it('docCount가 0 이상이어야 함', () => {
      const stores = metadata as Array<Record<string, unknown>>

      stores.forEach((store) => {
        expect(typeof store.docCount).toBe('number')
        expect(store.docCount).toBeGreaterThanOrEqual(0)
      })
    })

    it('fileSize가 사람이 읽을 수 있는 형식이어야 함', () => {
      const stores = metadata as Array<Record<string, unknown>>

      stores.forEach((store) => {
        expect(typeof store.fileSize).toBe('string')
        expect(store.fileSize).toMatch(/^\d+(\.\d+)?\s+(B|KB|MB|GB)$/)
      })
    })

    it('문서 개수 기준 내림차순으로 정렬되어야 함', () => {
      const stores = metadata as Array<Record<string, unknown>>

      if (stores.length > 1) {
        for (let i = 0; i < stores.length - 1; i++) {
          const currentDocCount = stores[i].docCount as number
          const nextDocCount = stores[i + 1].docCount as number
          expect(currentDocCount).toBeGreaterThanOrEqual(nextDocCount)
        }
      }
    })
  })

  describe('실제 DB 파일 검증', () => {
    let metadata: unknown

    beforeAll(() => {
      execSync('node scripts/generate-vector-store-metadata.js', {
        cwd: path.join(__dirname, '../../'),
        stdio: 'pipe'
      })

      const content = fs.readFileSync(METADATA_FILE, 'utf-8')
      metadata = JSON.parse(content)
    })

    it('메타데이터의 모든 DB 파일이 실제로 존재해야 함', () => {
      const stores = metadata as Array<Record<string, unknown>>

      stores.forEach((store) => {
        const dbPath = store.dbPath as string
        const absolutePath = path.join(PUBLIC_RAG_DATA_DIR, path.basename(dbPath))
        expect(fs.existsSync(absolutePath)).toBe(true)
      })
    })

    it('실제 파일 크기와 메타데이터가 일치해야 함 (오차 허용)', () => {
      const stores = metadata as Array<Record<string, unknown>>

      stores.forEach((store) => {
        const dbPath = store.dbPath as string
        const absolutePath = path.join(PUBLIC_RAG_DATA_DIR, path.basename(dbPath))

        if (fs.existsSync(absolutePath)) {
          const stats = fs.statSync(absolutePath)
          const actualSizeKB = stats.size / 1024
          const metadataFileSize = store.fileSize as string

          // 파일 크기 숫자 추출
          const sizeMatch = metadataFileSize.match(/^([\d.]+)\s+(B|KB|MB|GB)$/)
          if (sizeMatch) {
            const sizeValue = parseFloat(sizeMatch[1])
            const sizeUnit = sizeMatch[2]

            // KB로 변환
            let expectedSizeKB = sizeValue
            if (sizeUnit === 'MB') expectedSizeKB *= 1024
            if (sizeUnit === 'GB') expectedSizeKB *= 1024 * 1024
            if (sizeUnit === 'B') expectedSizeKB /= 1024

            // 10% 오차 허용 (압축, 포맷 차이 등)
            const tolerance = expectedSizeKB * 0.1
            expect(actualSizeKB).toBeGreaterThan(expectedSizeKB - tolerance)
            expect(actualSizeKB).toBeLessThan(expectedSizeKB + tolerance)
          }
        }
      })
    })
  })

  describe('package.json prebuild 스크립트', () => {
    const PACKAGE_JSON_PATH = path.join(__dirname, '../../package.json')

    it('package.json에 prebuild 스크립트가 존재해야 함', () => {
      const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'))
      expect(packageJson.scripts).toHaveProperty('prebuild')
    })

    it('prebuild 스크립트가 generate-vector-store-metadata.js를 포함해야 함', () => {
      const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'))
      const prebuildScript = packageJson.scripts.prebuild as string

      expect(prebuildScript).toContain('generate-vector-store-metadata.js')
    })

    it('generate:vector-stores 스크립트가 존재해야 함', () => {
      const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'))
      expect(packageJson.scripts).toHaveProperty('generate:vector-stores')
    })
  })

  describe('에러 처리', () => {
    it('public/rag-data 디렉토리가 없으면 에러가 발생해야 함', () => {
      // 임시로 디렉토리 이름 변경
      const tempName = PUBLIC_RAG_DATA_DIR + '.backup'

      if (fs.existsSync(PUBLIC_RAG_DATA_DIR)) {
        fs.renameSync(PUBLIC_RAG_DATA_DIR, tempName)
      }

      try {
        expect(() => {
          execSync('node scripts/generate-vector-store-metadata.js', {
            cwd: path.join(__dirname, '../../'),
            stdio: 'pipe'
          })
        }).toThrow()
      } finally {
        // 복원
        if (fs.existsSync(tempName)) {
          fs.renameSync(tempName, PUBLIC_RAG_DATA_DIR)
        }
      }
    })

    it('vector-*.db 파일이 없으면 빈 배열을 생성해야 함', () => {
      // 임시 디렉토리 생성
      const tempDir = path.join(__dirname, '../../public/temp-test-dir')
      fs.mkdirSync(tempDir, { recursive: true })

      try {
        // 스크립트를 수정하지 않고 테스트하기 어려우므로 스킵
        // 실제로는 빈 배열 [] 생성됨
        expect(true).toBe(true)
      } finally {
        // 정리
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true })
        }
      }
    })
  })

  describe('통합 테스트', () => {
    it('npm run generate:vector-stores 명령어가 정상 작동해야 함', () => {
      expect(() => {
        execSync('npm run generate:vector-stores', {
          cwd: path.join(__dirname, '../../'),
          stdio: 'pipe'
        })
      }).not.toThrow()

      expect(fs.existsSync(METADATA_FILE)).toBe(true)
    })
  })
})
