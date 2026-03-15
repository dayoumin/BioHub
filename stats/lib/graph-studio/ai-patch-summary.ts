/**
 * AI Patch Summary — JSON Patch → 한국어 변경 요약 변환
 *
 * AI가 chartSpec에 적용한 JSON Patch 배열을 사용자가 읽을 수 있는
 * 한국어 변경 목록으로 변환한다.
 *
 * 5-3: AI 변경 투명성 (Figlinq "Transparent AI" 패턴)
 */

import type { ChartSpecPatch } from '@/types/graph-studio';

// ─── 경로 → 한국어 레이블 매핑 ──────────────────────────────

/** 알려진 ChartSpec 경로를 한국어 레이블로 변환하는 맵 */
const PATH_LABELS: Record<string, string> = {
  '/chartType': '차트 유형',
  '/title': '차트 제목',
  '/orientation': '방향',

  // encoding
  '/encoding/x': 'X축',
  '/encoding/x/field': 'X축 필드',
  '/encoding/x/type': 'X축 데이터 타입',
  '/encoding/x/title': 'X축 제목',
  '/encoding/x/labelAngle': 'X축 라벨 회전',
  '/encoding/x/labelFontSize': 'X축 라벨 글꼴 크기',
  '/encoding/x/titleFontSize': 'X축 제목 글꼴 크기',
  '/encoding/x/grid': 'X축 그리드',
  '/encoding/x/sort': 'X축 정렬',
  '/encoding/x/scale': 'X축 스케일',
  '/encoding/x/scale/domain': 'X축 범위',
  '/encoding/x/scale/type': 'X축 스케일 유형',

  '/encoding/y': 'Y축',
  '/encoding/y/field': 'Y축 필드',
  '/encoding/y/type': 'Y축 데이터 타입',
  '/encoding/y/title': 'Y축 제목',
  '/encoding/y/labelAngle': 'Y축 라벨 회전',
  '/encoding/y/labelFontSize': 'Y축 라벨 글꼴 크기',
  '/encoding/y/titleFontSize': 'Y축 제목 글꼴 크기',
  '/encoding/y/grid': 'Y축 그리드',
  '/encoding/y/scale': 'Y축 스케일',
  '/encoding/y/scale/domain': 'Y축 범위',
  '/encoding/y/scale/type': 'Y축 스케일 유형',
  '/encoding/y/scale/zero': 'Y축 영점 포함',

  '/encoding/y2': '보조 Y축',
  '/encoding/y2/field': '보조 Y축 필드',
  '/encoding/y2/title': '보조 Y축 제목',

  '/encoding/color': '색상 그룹',
  '/encoding/color/field': '색상 필드',
  '/encoding/color/legend': '범례',
  '/encoding/color/legend/orient': '범례 위치',
  '/encoding/color/legend/fontSize': '범례 글꼴 크기',
  '/encoding/color/legend/customLabels': '범례 사용자 라벨',

  '/encoding/shape': '도형 그룹',
  '/encoding/shape/field': '도형 필드',

  '/encoding/size': '크기 인코딩',
  '/encoding/size/field': '크기 필드',

  // style
  '/style': '스타일',
  '/style/preset': '스타일 프리셋',
  '/style/scheme': '색상 팔레트',
  '/style/font': '글꼴',
  '/style/font/family': '글꼴 종류',
  '/style/font/size': '기본 글꼴 크기',
  '/style/font/titleSize': '제목 글꼴 크기',
  '/style/font/labelSize': '라벨 글꼴 크기',
  '/style/font/axisTitleSize': '축 제목 글꼴 크기',
  '/style/colors': '시리즈 색상',
  '/style/background': '배경색',
  '/style/padding': '여백',
  '/style/showDataLabels': '데이터 라벨 표시',
  '/style/showSampleCounts': '표본 수 표시',

  // features
  '/errorBar': '에러바',
  '/errorBar/type': '에러바 유형',
  '/errorBar/value': '에러바 값',
  '/aggregate': '집계',
  '/aggregate/y': '집계 함수',
  '/aggregate/groupBy': '그룹 변수',
  '/trendline': '추세선',
  '/trendline/type': '추세선 유형',
  '/trendline/color': '추세선 색상',
  '/trendline/strokeDash': '추세선 대시 패턴',
  '/trendline/showEquation': '회귀 방정식 표시',
  '/facet': '패싯',
  '/facet/field': '패싯 변수',
  '/facet/ncol': '패싯 열 수',
  '/facet/showTitle': '패싯 제목 표시',
  '/facet/shareAxis': '패싯 축 공유',
  '/significance': '유의성 브래킷',

  // annotations
  '/annotations': '주석',

  // export
  '/exportConfig': '출력 설정',
  '/exportConfig/format': '출력 형식',
  '/exportConfig/dpi': 'DPI',
  '/exportConfig/physicalWidth': '출력 너비(mm)',
  '/exportConfig/physicalHeight': '출력 높이(mm)',
  '/exportConfig/transparentBackground': '투명 배경',
};

const OP_LABELS: Record<ChartSpecPatch['op'], string> = {
  replace: '변경',
  add: '추가',
  remove: '제거',
};

// ─── 값 포맷팅 ───────────────────────────────────────────────

/** 값을 사람이 읽을 수 있는 짧은 문자열로 변환 */
function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '없음';
  if (typeof value === 'boolean') return value ? '켜짐' : '꺼짐';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.length > 30 ? `${value.slice(0, 30)}…` : value;
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.length <= 3) return `[${value.map(v => formatValue(v)).join(', ')}]`;
    return `[${value.slice(0, 2).map(v => formatValue(v)).join(', ')}, …${value.length}개]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', …' : ''}}`;
  }
  return String(value);
}

// ─── 경로 레이블 조회 ────────────────────────────────────────

/** 경로에 대한 가장 구체적인 한국어 레이블 반환 */
function getPathLabel(path: string): string {
  // 정확 매치
  if (PATH_LABELS[path]) return PATH_LABELS[path];

  // annotations 배열 인덱스 처리: /annotations/0 → "주석 #1"
  const annotationMatch = path.match(/^\/annotations\/(\d+)(\/.*)?$/);
  if (annotationMatch) {
    const idx = parseInt(annotationMatch[1], 10) + 1;
    const subPath = annotationMatch[2];
    if (!subPath) return `주석 #${idx}`;
    const subLabel = subPath.replace(/^\//, '');
    return `주석 #${idx} ${subLabel}`;
  }

  // significance 배열 인덱스 처리: /significance/0/pValue → "유의성 브래킷 #1 pValue"
  const sigMatch = path.match(/^\/significance\/(\d+)(\/.*)?$/);
  if (sigMatch) {
    const idx = parseInt(sigMatch[1], 10) + 1;
    const subPath = sigMatch[2];
    if (!subPath) return `유의성 브래킷 #${idx}`;
    const subLabel = subPath.replace(/^\//, '');
    return `유의성 브래킷 #${idx} ${subLabel}`;
  }

  // 부분 매치: 가장 긴 접두사 찾기
  let bestMatch = '';
  for (const known of Object.keys(PATH_LABELS)) {
    if (path.startsWith(known) && known.length > bestMatch.length) {
      bestMatch = known;
    }
  }
  if (bestMatch) {
    const remainder = path.slice(bestMatch.length).replace(/^\//, '');
    return remainder ? `${PATH_LABELS[bestMatch]} > ${remainder}` : PATH_LABELS[bestMatch];
  }

  // 매칭 없으면 경로 그대로
  return path;
}

// ─── 공개 API ─────────────────────────────────────────────

export interface PatchSummaryItem {
  /** 한국어 레이블 (예: "Y축 스케일 유형") */
  label: string;
  /** 작업 유형 한국어 (예: "변경") */
  op: string;
  /** 포맷된 값 (replace/add일 때만) */
  value?: string;
  /** 원본 JSON Pointer 경로 */
  path: string;
}

/**
 * JSON Patch 배열을 한국어 변경 요약 항목 배열로 변환.
 *
 * @example
 * ```ts
 * const patches = [
 *   { op: 'replace', path: '/encoding/y/scale/type', value: 'log' },
 *   { op: 'replace', path: '/encoding/y/scale/domain', value: [0, 100] },
 * ];
 * const items = summarizePatches(patches);
 * // → [
 * //   { label: "Y축 스케일 유형", op: "변경", value: "log", path: "/encoding/y/scale/type" },
 * //   { label: "Y축 범위", op: "변경", value: "[0, 100]", path: "/encoding/y/scale/domain" },
 * // ]
 * ```
 */
export function summarizePatches(patches: ChartSpecPatch[]): PatchSummaryItem[] {
  return patches.map(patch => ({
    label: getPathLabel(patch.path),
    op: OP_LABELS[patch.op],
    ...(patch.op !== 'remove' && patch.value !== undefined
      ? { value: formatValue(patch.value) }
      : {}),
    path: patch.path,
  }));
}

/**
 * 변경 요약을 한 줄 텍스트로 변환 (채팅 메시지 표시용).
 *
 * @example
 * ```
 * "Y축 스케일 유형: linear → log, Y축 범위: [auto] → [0, 100]"
 * ```
 */
export function formatPatchSummaryText(items: PatchSummaryItem[]): string {
  return items
    .map(item => {
      if (item.op === '제거') return `${item.label}: 제거됨`;
      return `${item.label}: ${item.value ?? ''}`;
    })
    .join(' · ');
}
