/**
 * chart-snapshot-storage 테스트
 *
 * - saveSnapshot → loadSnapshot 왕복
 * - 없는 키 조회 → undefined
 * - loadSnapshots 일괄 조회 (일부 없는 경우)
 * - deleteSnapshot → loadSnapshot undefined
 * - deleteSnapshots 일괄 삭제
 * - dataUrlToUint8Array PNG 시그니처 검증
 *
 * 참고: fake-indexeddb/auto가 vitest.setup.ts에 설정되어 있어
 *       IndexedDB가 전역으로 제공됩니다. 테스트 간 충돌을 피하기 위해
 *       각 테스트는 고유한 ID를 사용합니다.
 */

import {
  saveSnapshot,
  loadSnapshot,
  loadSnapshots,
  deleteSnapshot,
  deleteSnapshots,
  dataUrlToUint8Array,
  type ChartSnapshot,
} from '@/lib/graph-studio/chart-snapshot-storage'

// ── 헬퍼 ──────────────────────────────────────────────────────

function makeSnapshot(id: string, width = 800, height = 600): ChartSnapshot {
  // 최소 PNG: 8바이트 시그니처 + 더미 바이트
  const data = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3])
  return {
    id,
    data,
    cssWidth: width,
    cssHeight: height,
    pixelRatio: 2,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * 테스트용 PNG data URL 생성 (1x1 투명 PNG)
 * PNG 시그니처: 137 80 78 71 13 10 26 10 (0x89 0x50 0x4E 0x47 ...)
 */
function makePngDataUrl(): string {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
}

// ── saveSnapshot / loadSnapshot ────────────────────────────────

describe('saveSnapshot + loadSnapshot 왕복', () => {
  it('저장 후 동일 데이터 복원', async () => {
    const snap = makeSnapshot('rt-001')
    await saveSnapshot(snap)

    const loaded = await loadSnapshot('rt-001')
    expect(loaded).toBeDefined()
    expect(loaded!.id).toBe('rt-001')
    expect(loaded!.cssWidth).toBe(800)
    expect(loaded!.cssHeight).toBe(600)
    expect(loaded!.pixelRatio).toBe(2)
    // Uint8Array는 cross-realm 이슈 방지를 위해 생성자 이름으로 확인
    expect(loaded!.data.constructor.name).toBe('Uint8Array')
    expect(loaded!.data.length).toBe(snap.data.length)
    // PNG 시그니처 첫 바이트 137 확인
    expect(loaded!.data[0]).toBe(137)
    expect(loaded!.data[1]).toBe(80)   // 'P'
  })

  it('같은 ID로 덮어쓰기 → 최신 데이터 반환', async () => {
    await saveSnapshot(makeSnapshot('rt-002', 400, 300))
    await saveSnapshot(makeSnapshot('rt-002', 1200, 900))

    const loaded = await loadSnapshot('rt-002')
    expect(loaded!.cssWidth).toBe(1200)
    expect(loaded!.cssHeight).toBe(900)
  })
})

// ── loadSnapshot 없는 키 ────────────────────────────────────────

describe('loadSnapshot — 없는 키', () => {
  it('존재하지 않는 ID → undefined 반환', async () => {
    const result = await loadSnapshot('nonexistent-key-xyz')
    expect(result).toBeUndefined()
  })
})

// ── loadSnapshots 일괄 조회 ────────────────────────────────────

describe('loadSnapshots 일괄 조회', () => {
  it('존재하는 항목만 Map에 포함 (없는 항목은 제외)', async () => {
    await saveSnapshot(makeSnapshot('bulk-a1'))
    await saveSnapshot(makeSnapshot('bulk-a2'))
    // 'bulk-a3'은 저장 안 함

    const map = await loadSnapshots(['bulk-a1', 'bulk-a2', 'bulk-a3'])

    expect(map.size).toBe(2)                       // 2개만 포함
    expect(map.has('bulk-a1')).toBe(true)
    expect(map.has('bulk-a2')).toBe(true)
    expect(map.has('bulk-a3')).toBe(false)          // 없는 항목 제외
    expect(map.get('bulk-a1')!.id).toBe('bulk-a1')
  })

  it('빈 ID 배열 → 빈 Map 반환', async () => {
    const map = await loadSnapshots([])
    expect(map.size).toBe(0)
  })

  it('모두 없는 경우 → 빈 Map 반환', async () => {
    const map = await loadSnapshots(['ghost-x1', 'ghost-x2'])
    expect(map.size).toBe(0)
  })
})

// ── deleteSnapshot ─────────────────────────────────────────────

describe('deleteSnapshot', () => {
  it('삭제 후 loadSnapshot → undefined', async () => {
    await saveSnapshot(makeSnapshot('del-snap-1'))

    // 삭제 전 존재 확인
    const before = await loadSnapshot('del-snap-1')
    expect(before).toBeDefined()

    await deleteSnapshot('del-snap-1')

    // 삭제 후 없음 확인
    const after = await loadSnapshot('del-snap-1')
    expect(after).toBeUndefined()
  })

  it('존재하지 않는 ID 삭제 — 에러 없이 조용히 처리', async () => {
    await expect(deleteSnapshot('ghost-snap-id')).resolves.toBeUndefined()
  })
})

// ── deleteSnapshots 일괄 삭제 ──────────────────────────────────

describe('deleteSnapshots 일괄 삭제', () => {
  it('지정된 ID들 전부 삭제됨', async () => {
    await saveSnapshot(makeSnapshot('bdel-1'))
    await saveSnapshot(makeSnapshot('bdel-2'))
    await saveSnapshot(makeSnapshot('bdel-3'))

    await deleteSnapshots(['bdel-1', 'bdel-2'])

    const map = await loadSnapshots(['bdel-1', 'bdel-2', 'bdel-3'])
    expect(map.size).toBe(1)
    expect(map.has('bdel-3')).toBe(true)    // 삭제 안 된 항목 유지
    expect(map.has('bdel-1')).toBe(false)
    expect(map.has('bdel-2')).toBe(false)
  })

  it('빈 배열 전달 — 에러 없이 조용히 처리', async () => {
    await expect(deleteSnapshots([])).resolves.toBeUndefined()
  })
})

// ── dataUrlToUint8Array ────────────────────────────────────────

describe('dataUrlToUint8Array', () => {
  it('PNG data URL → Uint8Array, 첫 바이트 137 (PNG 시그니처)', () => {
    const dataUrl = makePngDataUrl()
    const bytes = dataUrlToUint8Array(dataUrl)

    expect(bytes.constructor.name).toBe('Uint8Array')
    expect(bytes.length).toBeGreaterThan(0)
    // PNG 시그니처: 0x89 0x50 0x4E 0x47 = 137 80 78 71
    expect(bytes[0]).toBe(137)  // 0x89 — PNG magic number
    expect(bytes[1]).toBe(80)   // 'P'
    expect(bytes[2]).toBe(78)   // 'N'
    expect(bytes[3]).toBe(71)   // 'G'
  })

  it('base64 없는 잘못된 data URL → 에러 발생', () => {
    expect(() => dataUrlToUint8Array('not-a-data-url')).toThrow()
  })

  it('변환 결과를 IndexedDB에 저장 후 복원 가능', async () => {
    const dataUrl = makePngDataUrl()
    const bytes = dataUrlToUint8Array(dataUrl)

    const snap: ChartSnapshot = {
      id: 'dataurl-rt-001',
      data: bytes,
      cssWidth: 1,
      cssHeight: 1,
      pixelRatio: 1,
      updatedAt: new Date().toISOString(),
    }

    await saveSnapshot(snap)
    const loaded = await loadSnapshot('dataurl-rt-001')

    expect(loaded).toBeDefined()
    expect(loaded!.data[0]).toBe(137)              // PNG 시그니처 유지
    expect(loaded!.data.length).toBe(bytes.length)
  })
})
