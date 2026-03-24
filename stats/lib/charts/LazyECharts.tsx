'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/charts/ChartSkeleton';

/** ECharts를 dynamic import로 로드 — 분석 페이지 초기 번들에 미포함 */
export const LazyReactECharts = dynamic(
  () => import('echarts-for-react').then((mod) => mod.default),
  { ssr: false, loading: () => <ChartSkeleton height={300} title={false} description={false} showCard={false} /> },
);
