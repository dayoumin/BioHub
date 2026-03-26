import { describe, expect, it } from 'vitest'
import { tablesToCsvString, type ExportableTable } from '@/lib/bio-tools/bio-export-csv'

// ─── helpers ─────────────────────────────────────

function table(overrides: Partial<ExportableTable> = {}): ExportableTable {
  return {
    title: 'Test',
    headers: ['A', 'B'],
    rows: [['a1', 'b1']],
    ...overrides,
  }
}

// ─── escapeCsvCell (간접 테스트 — tablesToCsvString 경유) ───

describe('CSV 이스케이핑', () => {
  it('쉼표 포함 셀 → 따옴표로 감싸기', () => {
    const csv = tablesToCsvString([table({ rows: [['a,b', 'c']] })])
    expect(csv).toContain('"a,b"')
  })

  it('따옴표 포함 셀 → 따옴표 이중화', () => {
    const csv = tablesToCsvString([table({ rows: [['say "hi"', 'c']] })])
    expect(csv).toContain('"say ""hi"""')
  })

  it('줄바꿈 포함 셀 → 따옴표로 감싸기', () => {
    const csv = tablesToCsvString([table({ rows: [['line1\nline2', 'c']] })])
    expect(csv).toContain('"line1\nline2"')
  })

  it('특수 문자 없는 셀 → 따옴표 없이 그대로', () => {
    const csv = tablesToCsvString([table({ rows: [['plain', '123']] })])
    expect(csv).toContain('plain,123')
    expect(csv).not.toContain('"plain"')
  })

  it('null → 빈 문자열', () => {
    const csv = tablesToCsvString([table({ rows: [[null, 'b']] })])
    expect(csv).toContain(',b')
  })

  it('숫자 → 문자열 변환', () => {
    const csv = tablesToCsvString([table({ rows: [[42, 3.14]] })])
    expect(csv).toContain('42,3.14')
  })
})

// ─── tablesToCsvString ──────────────────────────

describe('tablesToCsvString', () => {
  it('단일 테이블 — title 행 없이 headers + rows만 출력', () => {
    const csv = tablesToCsvString([
      table({ title: 'Ignored', headers: ['X', 'Y'], rows: [['1', '2']] }),
    ])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe('X,Y')
    expect(lines[1]).toBe('1,2')
  })

  it('다중 테이블 — title 행 포함 + 빈 줄 구분', () => {
    const csv = tablesToCsvString([
      table({ title: 'Table A', headers: ['H1'], rows: [['r1']] }),
      table({ title: 'Table B', headers: ['H2'], rows: [['r2']] }),
    ])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('Table A')
    expect(lines[1]).toBe('H1')
    expect(lines[2]).toBe('r1')
    expect(lines[3]).toBe('')
    expect(lines[4]).toBe('Table B')
    expect(lines[5]).toBe('H2')
    expect(lines[6]).toBe('r2')
    expect(lines).toHaveLength(7)
  })

  it('다중 테이블 — 마지막 테이블 뒤에 빈 줄 없음', () => {
    const csv = tablesToCsvString([
      table({ title: 'A', rows: [['1']] }),
      table({ title: 'B', rows: [['2']] }),
    ])
    expect(csv).not.toMatch(/\n$/)
  })

  it('빈 rows → 헤더만 출력', () => {
    const csv = tablesToCsvString([table({ headers: ['A', 'B'], rows: [] })])
    expect(csv).toBe('A,B')
  })

  it('빈 배열 → 빈 문자열', () => {
    expect(tablesToCsvString([])).toBe('')
  })

  it('title에 쉼표 포함 시 이스케이핑', () => {
    const csv = tablesToCsvString([
      table({ title: 'A, B table' }),
      table({ title: 'C table' }),
    ])
    expect(csv.split('\n')[0]).toBe('"A, B table"')
  })

  it('복합 시나리오 — null + 따옴표 + 숫자 혼합', () => {
    const csv = tablesToCsvString([
      table({
        headers: ['Name', 'Value', 'Note'],
        rows: [
          ['Shannon H\'', 2.45, null],
          ['Simpson "1-D"', 0.87, 'good, ok'],
        ],
      }),
    ])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('Name,Value,Note')
    expect(lines[1]).toBe("Shannon H',2.45,")
    expect(lines[2]).toBe('"Simpson ""1-D""",0.87,"good, ok"')
  })
})
