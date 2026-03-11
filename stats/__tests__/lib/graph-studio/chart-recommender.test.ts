/**
 * chart-recommender 테스트
 */

import { describe, it, expect } from 'vitest'
import { recommendCharts } from '@/lib/graph-studio/chart-recommender'
import type { ColumnMeta } from '@/types/graph-studio'

function col(name: string, type: ColumnMeta['type']): ColumnMeta {
  return { name, type, uniqueCount: 5, sampleValues: [], hasNull: false }
}

describe('recommendCharts', () => {
  it('nominal + quantitative → bar, boxplot, histogram, line (최대 4)', () => {
    const cols = [col('group', 'nominal'), col('value', 'quantitative')]
    const recs = recommendCharts(cols)

    expect(recs).toHaveLength(4)
    expect(recs[0].type).toBe('bar')
    expect(recs.map(r => r.type)).toContain('boxplot')
    expect(recs.map(r => r.type)).toContain('histogram')
  })

  it('quantitative × 2 → scatter 포함', () => {
    const cols = [col('x', 'quantitative'), col('y', 'quantitative')]
    const recs = recommendCharts(cols)

    expect(recs.map(r => r.type)).toContain('scatter')
  })

  it('temporal + quantitative → line 포함', () => {
    const cols = [col('date', 'temporal'), col('value', 'quantitative')]
    const recs = recommendCharts(cols)

    expect(recs.map(r => r.type)).toContain('line')
  })

  it('nominal + quantitative × 2 → heatmap 후보에 포함', () => {
    const cols = [col('group', 'nominal'), col('x', 'quantitative'), col('y', 'quantitative')]
    const recs = recommendCharts(cols, 8) // maxResults 확대

    expect(recs.map(r => r.type)).toContain('heatmap')
  })

  it('빈 컬럼 → 빈 배열', () => {
    expect(recommendCharts([])).toHaveLength(0)
  })

  it('nominal만 → 빈 배열 (차트 추천 불가)', () => {
    const cols = [col('a', 'nominal'), col('b', 'nominal')]
    expect(recommendCharts(cols)).toHaveLength(0)
  })

  it('maxResults 제한', () => {
    const cols = [col('group', 'nominal'), col('x', 'quantitative'), col('y', 'quantitative')]
    const recs = recommendCharts(cols, 2)

    expect(recs).toHaveLength(2)
  })

  it('우선순위 순서: bar(1) < scatter(2) < boxplot(3)', () => {
    const cols = [col('group', 'nominal'), col('x', 'quantitative'), col('y', 'quantitative')]
    const recs = recommendCharts(cols, 8)

    const barIdx = recs.findIndex(r => r.type === 'bar')
    const scatterIdx = recs.findIndex(r => r.type === 'scatter')
    const boxIdx = recs.findIndex(r => r.type === 'boxplot')

    expect(barIdx).toBeLessThan(scatterIdx)
    expect(scatterIdx).toBeLessThan(boxIdx)
  })
})
