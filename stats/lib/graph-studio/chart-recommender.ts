/**
 * 차트 유형 추천 알고리즘
 *
 * 데이터 컬럼 메타 기반으로 적합한 차트 유형을 우선순위 순으로 반환.
 * LeftDataPanel의 추천 차트 그리드에서 사용.
 */

import type { ChartType, ColumnMeta } from '@/types/graph-studio';

export interface ChartRecommendation {
  type: ChartType;
  label: string;
  /** 우선순위 (1이 가장 높음) */
  priority: number;
}

/**
 * 컬럼 메타 기반 차트 추천.
 * 최대 maxResults개 반환 (기본 4).
 */
export function recommendCharts(
  columns: ColumnMeta[],
  maxResults = 4,
): ChartRecommendation[] {
  const hasCat = columns.some(c => c.type === 'nominal' || c.type === 'ordinal');
  const hasNum = columns.some(c => c.type === 'quantitative');
  const numCount = columns.filter(c => c.type === 'quantitative').length;
  const hasTemporal = columns.some(c => c.type === 'temporal');

  const result: ChartRecommendation[] = [];

  if (hasCat && hasNum) result.push({ type: 'bar', label: '막대 그래프', priority: 1 });
  if (numCount >= 2)    result.push({ type: 'scatter', label: '산점도', priority: 2 });
  if (hasCat && hasNum) result.push({ type: 'boxplot', label: '박스 플롯', priority: 3 });
  if (numCount >= 1)    result.push({ type: 'histogram', label: '히스토그램', priority: 4 });
  if (hasTemporal && hasNum) result.push({ type: 'line', label: '꺾은선 그래프', priority: 5 });
  else if (hasCat && hasNum && numCount >= 1) result.push({ type: 'line', label: '꺾은선 그래프', priority: 6 });
  if (hasCat && numCount >= 2) result.push({ type: 'heatmap', label: '히트맵', priority: 7 });

  return result.slice(0, maxResults);
}
