/**
 * 대용량 데이터 UX 보호 — 임계값 상수 + 유틸
 *
 * Graph Studio에서 scatter/line은 모든 포인트를 DOM에 렌더링하므로
 * 데이터가 많으면 브라우저가 느려지거나 멈출 수 있다.
 * 행 수 기반 1차 경고 + 렌더링 시간 실측 2차 경고로 보호.
 */

/** 대용량 데이터 임계값 */
export const CHART_DATA_LIMITS = {
  /** 토스트 경고 표시 기준 (행) */
  WARN_ROWS: 50_000,
  /** 렌더링 차단 기준 (행) */
  BLOCK_ROWS: 500_000,
  /** 렌더링 느림 경고 (ms) */
  RENDER_SLOW_MS: 3_000,
  /** 렌더링 매우 느림 — 집계 강력 권장 (ms) */
  RENDER_VERY_SLOW_MS: 10_000,
} as const;

export type DataSizeLevel = 'ok' | 'warn' | 'block';

/** columnar 데이터에서 행 수 추출 */
export function getRowCount(data: Record<string, unknown[]>): number {
  return Object.values(data)[0]?.length ?? 0;
}

/** 행 수 기반 데이터 크기 수준 판정 */
export function getDataSizeLevel(rowCount: number): DataSizeLevel {
  if (rowCount >= CHART_DATA_LIMITS.BLOCK_ROWS) return 'block';
  if (rowCount >= CHART_DATA_LIMITS.WARN_ROWS) return 'warn';
  return 'ok';
}
