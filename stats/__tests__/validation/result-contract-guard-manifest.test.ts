import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  globToRegExp,
  loadGuardManifest,
  matchChangedFiles,
} from '@/validation/scripts/result-contract-guard.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const manifestPath = path.resolve(__dirname, '../../validation/result-contract-guard.manifest.json')

describe('result contract guard manifest', () => {
  it('manifest가 critical paths와 command groups를 모두 가진다', () => {
    const manifest = loadGuardManifest(manifestPath)

    expect(manifest.criticalPaths.length).toBeGreaterThan(0)
    expect(manifest.commands.length).toBeGreaterThan(0)
    expect(manifest.commands.every((command) => typeof command.name === 'string' && typeof command.run === 'string')).toBe(true)
  })

  it('critical path matching이 interpreter/export/method identity 변경을 잡는다', () => {
    const manifest = loadGuardManifest(manifestPath)
    const matched = matchChangedFiles([
      'stats/lib/services/result-interpreter.ts',
      'stats/lib/services/export/code-export.ts',
      'stats/lib/utils/method-identity.ts',
      'README.md',
    ], manifest.criticalPaths)

    expect(matched).toEqual([
      'stats/lib/services/result-interpreter.ts',
      'stats/lib/services/export/code-export.ts',
      'stats/lib/utils/method-identity.ts',
    ])
  })

  it('glob matcher는 하위 디렉터리 패턴을 처리한다', () => {
    const matcher = globToRegExp('stats/lib/validation/**')

    expect(matcher.test('stats/lib/validation/result-schema.ts')).toBe(true)
    expect(matcher.test('stats/lib/validation/subdir/extra.ts')).toBe(true)
    expect(matcher.test('stats/lib/services/result-interpreter.ts')).toBe(false)
  })
})
