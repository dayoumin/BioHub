/**
 * 차트 유형별 아이콘 매핑 (lucide-react)
 *
 * DataTab (아이콘 그리드) + LeftDataPanel (추천 차트) 공유
 */

import type { ChartType } from '@/types/graph-studio';
import {
  BarChart2,
  BarChart3,
  ChartColumnStacked,
  ChartLine,
  ChartScatter,
  SlidersHorizontal,
  BarChart,
  ChartNoAxesCombined,
  Grid3X3,
  Activity,
  ChartSpline,
  ChartArea,
} from 'lucide-react';

export const CHART_TYPE_ICONS: Record<ChartType, React.ElementType> = {
  bar: BarChart2,
  'grouped-bar': BarChart3,
  'stacked-bar': ChartColumnStacked,
  line: ChartLine,
  scatter: ChartScatter,
  boxplot: SlidersHorizontal,
  histogram: BarChart,
  'error-bar': ChartNoAxesCombined,
  heatmap: Grid3X3,
  violin: Activity,
  'km-curve': ChartSpline,
  'roc-curve': ChartArea,
};
