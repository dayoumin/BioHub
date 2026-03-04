/**
 * 패싯(Facet) 레이아웃 유틸리티
 *
 * - 행 배열을 패싯 필드 값으로 그룹 분리
 * - N개 패싯의 ECharts grid 위치를 백분율 문자열로 계산
 *
 * echarts-converter.ts의 buildFacetOption()에서 사용.
 * converter 파일 비대화 방지를 위해 별도 분리.
 */

// ─── Grid 레이아웃 상수 ──────────────────────────────────

const MARGIN_LEFT = 6;
const MARGIN_TOP = 10;
const MARGIN_RIGHT = 2;
const MARGIN_BOTTOM = 6;
const GAP_H = 8;   // 패싯 간 수평 간격 (%)
const GAP_V = 12;  // 패싯 간 수직 간격 (%)

// ─── 타입 ─────────────────────────────────────────────────

export interface FacetGridItem {
  left: string;       // '6%'
  top: string;        // '10%'
  width: string;      // '42%'
  height: string;     // '30%'
  titleLeft: string;  // 패싯 제목 x 위치
  titleTop: string;   // 패싯 제목 y 위치
}

export interface FacetLayout {
  cols: number;
  rows: number;
  items: FacetGridItem[];
}

// ─── 행 파티셔닝 ──────────────────────────────────────────

/**
 * 행 배열을 패싯 필드 값으로 그룹 분리. 순서 보존.
 *
 * @example
 *   partitionRowsByFacet(rows, 'species')
 *   // Map { 'Bass' => [...], 'Bream' => [...], 'Carp' => [...] }
 */
export function partitionRowsByFacet(
  rows: Record<string, unknown>[],
  field: string,
): Map<string, Record<string, unknown>[]> {
  const groups = new Map<string, Record<string, unknown>[]>();

  for (const row of rows) {
    const key = String(row[field] ?? '');
    const group = groups.get(key);
    if (group) {
      group.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  return groups;
}

// ─── Grid 위치 계산 ──────────────────────────────────────

/**
 * N개 패싯의 grid 위치를 백분율 문자열로 계산.
 *
 * @param nFacets - 패싯 개수
 * @param ncol - 열 수 (미지정 시 ceil(sqrt(n)))
 */
export function computeFacetLayout(nFacets: number, ncol?: number): FacetLayout {
  if (nFacets <= 0) return { cols: 0, rows: 0, items: [] };
  const cols = ncol ?? Math.ceil(Math.sqrt(nFacets));
  const rows = Math.ceil(nFacets / cols);

  const cellWidth = (100 - MARGIN_LEFT - MARGIN_RIGHT - GAP_H * (cols - 1)) / cols;
  const cellHeight = (100 - MARGIN_TOP - MARGIN_BOTTOM - GAP_V * (rows - 1)) / rows;

  const items: FacetGridItem[] = [];

  for (let i = 0; i < nFacets; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const left = MARGIN_LEFT + col * (cellWidth + GAP_H);
    const top = MARGIN_TOP + row * (cellHeight + GAP_V);

    items.push({
      left: `${left.toFixed(1)}%`,
      top: `${top.toFixed(1)}%`,
      width: `${cellWidth.toFixed(1)}%`,
      height: `${cellHeight.toFixed(1)}%`,
      titleLeft: `${(left + cellWidth / 2).toFixed(1)}%`,
      titleTop: `${(top - 3).toFixed(1)}%`,  // 제목은 grid 위 3% 지점
    });
  }

  return { cols, rows, items };
}
