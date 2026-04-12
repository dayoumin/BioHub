import { describe, expect, it } from 'vitest'
import { buildAnalysisVisualizationColumns } from '@/lib/graph-studio'
import type { AnalysisResult } from '@/types/analysis'

describe('buildAnalysisVisualizationColumns', () => {
  it('boxplot-multiple visualizationData를 Graph Studio boxplot 데이터로 변환한다', () => {
    const result: AnalysisResult = {
      method: 'anova',
      statistic: 4.2,
      pValue: 0.01,
      interpretation: '유의한 차이가 있습니다.',
      visualizationData: {
        type: 'boxplot-multiple',
        data: [
          { label: 'Control', values: [10, 12, 11] },
          { label: 'Treatment', values: [14, 16, 15] },
        ] as unknown as Record<string, unknown>,
      },
    }

    const built = buildAnalysisVisualizationColumns(result)

    expect(built).not.toBeNull()
    expect(built?.chartType).toBe('boxplot')
    expect(built?.xField).toBe('group')
    expect(built?.yField).toBe('value')
    expect(built?.data.group).toEqual(['Control', 'Control', 'Control', 'Treatment', 'Treatment', 'Treatment'])
    expect(built?.data.value).toEqual([10, 12, 11, 14, 16, 15])
  })

  it('contingency-table visualizationData를 grouped-bar 데이터로 변환한다', () => {
    const result: AnalysisResult = {
      method: 'chi-square',
      statistic: 8.4,
      pValue: 0.004,
      interpretation: '변수 간 관련성이 있습니다.',
      visualizationData: {
        type: 'contingency-table',
        data: {
          rowLabels: ['Male', 'Female'],
          colLabels: ['Yes', 'No'],
          matrix: [
            [12, 8],
            [7, 13],
          ],
        },
      },
    }

    const built = buildAnalysisVisualizationColumns(result)

    expect(built).not.toBeNull()
    expect(built?.chartType).toBe('grouped-bar')
    expect(built?.colorField).toBe('row')
    expect(built?.data.column).toEqual(['Yes', 'No', 'Yes', 'No'])
    expect(built?.data.row).toEqual(['Male', 'Male', 'Female', 'Female'])
    expect(built?.data.count).toEqual([12, 8, 7, 13])
  })

  it('지원하지 않는 visualizationData여도 groupStats가 있으면 bar 차트로 fallback한다', () => {
    const result: AnalysisResult = {
      method: 'mixed-model',
      statistic: 2.1,
      pValue: 0.08,
      interpretation: '차이가 없습니다.',
      groupStats: [
        { name: 'A', mean: 10, std: 2, n: 12 },
        { name: 'B', mean: 14, std: 3, n: 12 },
      ],
      visualizationData: {
        type: 'unsupported-custom-type',
        data: {},
      },
    }

    const built = buildAnalysisVisualizationColumns(result)

    expect(built).not.toBeNull()
    expect(built?.chartType).toBe('bar')
    expect(built?.xField).toBe('group')
    expect(built?.yField).toBe('mean')
    expect(built?.data.group).toEqual(['A', 'B'])
    expect(built?.data.mean).toEqual([10, 14])
  })
})
