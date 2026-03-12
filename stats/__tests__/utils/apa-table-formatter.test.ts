import { describe, it, expect } from 'vitest'
import { generateApaHtml, generateApaPlainText } from '@/lib/utils/apa-table-formatter'
import type { TableColumn, TableRow } from '@/components/statistics/common/StatisticsTable'

const sampleColumns: TableColumn[] = [
  { key: 'group', header: '집단', type: 'text' },
  { key: 'n', header: 'n', type: 'number' },
  { key: 'mean', header: 'M', type: 'number' },
  { key: 'sd', header: 'SD', type: 'number' },
  { key: 'pValue', header: 'p', type: 'pvalue' },
]

const sampleData: TableRow[] = [
  { group: '실험군', n: 30, mean: 12.345, sd: 2.567, pValue: 0.032 },
  { group: '대조군', n: 28, mean: 10.123, sd: 3.012, pValue: 0.0005 },
]

describe('generateApaHtml', () => {
  it('should generate valid HTML table structure', () => {
    const html = generateApaHtml(sampleColumns, sampleData)

    expect(html).toContain('<table')
    expect(html).toContain('<thead>')
    expect(html).toContain('<tbody>')
    expect(html).toContain('</table>')
  })

  it('should use Times New Roman font (APA standard)', () => {
    const html = generateApaHtml(sampleColumns, sampleData)

    expect(html).toContain('Times New Roman')
  })

  it('should apply APA 3-line rule — top border on header, separator, and bottom border on last row', () => {
    const html = generateApaHtml(sampleColumns, sampleData)

    // 헤더 상단선
    expect(html).toContain('border-top:2px solid black')
    // 헤더 하단선 (구분선)
    expect(html).toContain('border-bottom:1px solid black')
    // 마지막 행 하단선
    expect(html).toContain('border-bottom:2px solid black')
  })

  it('should NOT contain vertical borders', () => {
    const html = generateApaHtml(sampleColumns, sampleData)

    expect(html).not.toContain('border-left')
    expect(html).not.toContain('border-right')
  })

  it('should italicize ASCII statistical symbols in headers', () => {
    const html = generateApaHtml(sampleColumns, sampleData)

    expect(html).toContain('<em>n</em>')
    expect(html).toContain('<em>M</em>')
    expect(html).toContain('<em>SD</em>')
    expect(html).toContain('<em>p</em>')
  })

  it('should italicize Greek statistical symbols in headers', () => {
    const greekColumns: TableColumn[] = [
      { key: 'label', header: '항목', type: 'text' },
      { key: 'eta', header: 'η²', type: 'number' },
      { key: 'etap', header: 'ηp²', type: 'number' },
      { key: 'chi', header: 'χ²', type: 'number' },
      { key: 'omega', header: 'ω²', type: 'number' },
    ]
    const greekData: TableRow[] = [
      { label: 'test', eta: 0.15, etap: 0.12, chi: 5.6, omega: 0.08 },
    ]
    const html = generateApaHtml(greekColumns, greekData)

    expect(html).toContain('<em>η²</em>')
    expect(html).toContain('<em>ηp²</em>')
    expect(html).toContain('<em>χ²</em>')
    expect(html).toContain('<em>ω²</em>')
  })

  it('should format p-values with APA convention (no leading zero)', () => {
    const html = generateApaHtml(sampleColumns, sampleData)

    // 0.032 → .032
    expect(html).toContain('.032')
    expect(html).not.toContain('0.032')
    // 0.0005 → < .001
    expect(html).toContain('< .001')
  })

  it('should display integer values without decimal places (n, df)', () => {
    const html = generateApaHtml(sampleColumns, sampleData)

    // n=30 → "30" (not "30.000")
    expect(html).toContain('>30<')
    expect(html).toContain('>28<')
    expect(html).not.toContain('30.000')
  })

  it('should display float values with 3 decimal places', () => {
    const html = generateApaHtml(sampleColumns, sampleData)

    expect(html).toContain('12.345')
    expect(html).toContain('2.567')
    expect(html).toContain('10.123')
  })

  it('should NOT apply font-style:italic to all th — only stat symbols get em', () => {
    const html = generateApaHtml(sampleColumns, sampleData)

    // th에 font-style:italic이 없어야 함 (APA: 통계 기호만 이탤릭)
    expect(html).not.toMatch(/<th[^>]*font-style:italic/)
    // 통계 기호는 <em>으로 이탤릭
    expect(html).toContain('<em>n</em>')
    // 비통계 헤더 "집단"은 <em> 래핑 없음
    expect(html).not.toContain('<em>집단</em>')
  })

  it('should not double-wrap ηp² (no nested em)', () => {
    const greekColumns: TableColumn[] = [
      { key: 'etap', header: 'ηp²', type: 'number' },
    ]
    const html = generateApaHtml(greekColumns, [{ etap: 0.12 }])

    expect(html).toContain('<em>ηp²</em>')
    // 이중 래핑 없음
    expect(html).not.toContain('<em><em>')
    expect(html).not.toContain('<em>η<em>p</em>')
  })

  it('should include caption when title is provided', () => {
    const html = generateApaHtml(sampleColumns, sampleData, 'Table 1')

    expect(html).toContain('<caption')
    expect(html).toContain('Table 1')
    expect(html).toContain('font-style:italic')
  })

  it('should NOT include caption when title is omitted', () => {
    const html = generateApaHtml(sampleColumns, sampleData)

    expect(html).not.toContain('<caption')
  })

  it('should render em dash for null/undefined values', () => {
    const dataWithNull: TableRow[] = [
      { group: '실험군', n: 30, mean: null, sd: undefined, pValue: 0.05 },
    ]
    const html = generateApaHtml(sampleColumns, dataWithNull)

    expect(html).toContain('\u2014') // em dash
  })
})

describe('generateApaPlainText', () => {
  it('should produce tab-separated headers', () => {
    const text = generateApaPlainText(sampleColumns, sampleData)
    const firstLine = text.split('\n')[0]

    expect(firstLine).toBe('집단\tn\tM\tSD\tp')
  })

  it('should produce tab-separated data rows', () => {
    const text = generateApaPlainText(sampleColumns, sampleData)
    const lines = text.split('\n')

    // 1 header + 2 data rows
    expect(lines).toHaveLength(3)
  })

  it('should format p-values with APA convention in plain text', () => {
    const text = generateApaPlainText(sampleColumns, sampleData)

    expect(text).toContain('.032')
    expect(text).toContain('< .001')
  })

  it('should display integer values without decimal places in plain text', () => {
    const text = generateApaPlainText(sampleColumns, sampleData)
    const dataLines = text.split('\n').slice(1)

    // n=30 tab-separated: "실험군\t30\t12.345\t..."
    expect(dataLines[0]).toContain('\t30\t')
    expect(dataLines[0]).not.toContain('30.000')
  })

  it('should use em dash for null values in plain text', () => {
    const dataWithNull: TableRow[] = [
      { group: '실험군', n: 30, mean: null, sd: undefined, pValue: 0.05 },
    ]
    const text = generateApaPlainText(sampleColumns, dataWithNull)

    expect(text).toContain('\u2014')
  })
})

describe('CI column formatting', () => {
  it('should format CI arrays as [lower, upper]', () => {
    const ciColumns: TableColumn[] = [
      { key: 'label', header: '항목', type: 'text' },
      { key: 'ci', header: '95% CI', type: 'ci' },
    ]
    const ciData: TableRow[] = [
      { label: 'Mean diff', ci: [1.234, 5.678] },
    ]

    const html = generateApaHtml(ciColumns, ciData)
    expect(html).toContain('[1.234, 5.678]')

    const text = generateApaPlainText(ciColumns, ciData)
    expect(text).toContain('[1.234, 5.678]')
  })
})

describe('percentage column formatting', () => {
  it('should format percentage values', () => {
    const pctColumns: TableColumn[] = [
      { key: 'label', header: '항목', type: 'text' },
      { key: 'pct', header: '%', type: 'percentage' },
    ]
    const pctData: TableRow[] = [
      { label: '비율', pct: 0.856 },
    ]

    const html = generateApaHtml(pctColumns, pctData)
    expect(html).toContain('85.6%')
  })
})

describe('XSS prevention', () => {
  it('should escape HTML in title', () => {
    const html = generateApaHtml(sampleColumns, sampleData, '<script>alert("XSS")</script>')

    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })

  it('should escape HTML in column headers', () => {
    const xssColumns: TableColumn[] = [
      { key: 'x', header: '<img src=x onerror=alert(1)>', type: 'text' },
    ]
    const html = generateApaHtml(xssColumns, [{ x: 'safe' }])

    expect(html).toContain('&lt;img')
    expect(html).not.toContain('<img')
  })

  it('should escape HTML in cell values', () => {
    const cols: TableColumn[] = [
      { key: 'name', header: 'Name', type: 'text' },
    ]
    const data: TableRow[] = [
      { name: '<script>alert(1)</script>' },
    ]
    const html = generateApaHtml(cols, data)

    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>alert')
  })
})

describe('column.align respect', () => {
  it('should use column.align when explicitly set', () => {
    const cols: TableColumn[] = [
      { key: 'val', header: 'Value', type: 'number', align: 'right' },
    ]
    const data: TableRow[] = [{ val: 42 }]
    const html = generateApaHtml(cols, data)

    expect(html).toContain('text-align:right')
    expect(html).not.toContain('text-align:center')
  })

  it('should default text type to left and number type to right (APA decimal alignment)', () => {
    const cols: TableColumn[] = [
      { key: 'a', header: 'Text', type: 'text' },
      { key: 'b', header: 'Num', type: 'number' },
    ]
    const data: TableRow[] = [{ a: 'hello', b: 1 }]
    const html = generateApaHtml(cols, data)

    expect(html).toContain('text-align:left')
    expect(html).toContain('text-align:right')
    expect(html).not.toContain('text-align:center')
  })
})
