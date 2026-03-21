/**
 * 토스트 메시지 상수
 *
 * 훅/서비스/유틸 등 useTerminology() 접근이 불가능한 곳의 토스트 메시지 저장소.
 *
 * 역할 분리:
 * - TerminologyDictionary (t.xxx) → 컴포넌트에서 useTerminology() 훅으로 접근. i18n 주체.
 * - 이 파일 (TOAST.xxx) → 훅/서비스에서 직접 import. React 컨텍스트 밖에서 사용.
 *
 * 규칙:
 * - 컴포넌트에서는 가능하면 t.xxx 우선 사용
 * - 동일 메시지가 두 곳에 존재하면 안 됨 — 새 메시지 추가 전 terminology 확인
 * - 향후 영문 지원 시 { ko, en } 구조로 확장 + lang 파라미터 추가
 */

export const TOAST = {
  data: {
    csvOnlyInHub: '현재 허브에서는 CSV 파일만 지원합니다. Excel 파일은 분석 페이지에서 업로드해 주세요.',
    csvParseError: (msg: string): string => `CSV 파싱 오류: ${msg}`,
    fileParseError: (msg: string): string => `파일 파싱 실패: ${msg}`,
    emptyData: '데이터가 비어 있습니다.',
    loadSuccess: (name: string): string => `${name} 로드 완료`,
    uploadSuccess: (name: string): string => `${name} 업로드 완료 — 데이터를 확인해주세요`,
  },
  history: {
    loadError: '히스토리 로드에 실패했습니다.',
    settingsLoadError: '설정 로드에 실패했습니다.',
    noResults: '분석 결과가 없습니다.',
    reportGenerating: (format: string): string => `${format.toUpperCase()} 보고서를 생성하고 있습니다...`,
    reportSuccess: '보고서가 다운로드되었습니다.',
    reportError: '보고서 생성 실패',
    exportError: '내보내기 중 오류가 발생했습니다.',
  },
  clipboard: {
    copySuccess: '결과가 복사되었습니다',
    copyError: '복사 실패',
    chartCopySuccess: '차트가 클립보드에 복사되었습니다',
    chartCopyError: '클립보드 복사에 실패했습니다',
  },
  navigation: {
    autoSaved: '분석이 자동 저장되었습니다',
    autoSavedDescription: '홈으로 돌아가면 이어서 진행할 수 있습니다.',
    graphStudioOpened: 'Graph Studio를 열었습니다. 데이터를 직접 업로드해주세요.',
  },
  graphStudio: {
    templateSaved: (name: string): string => `"${name}" 템플릿이 저장되었습니다`,
    colorCopied: (color: string): string => `${color} 복사됨`,
    largeDataWarning: (rows: number): string =>
      `데이터가 큽니다 (${rows.toLocaleString()}행). 집계 또는 필터링을 권장합니다.`,
    renderingSlow: '렌더링이 느립니다. 데이터를 집계하거나 필터를 적용하면 빨라집니다.',
    renderingVerySlow: '렌더링 시간이 매우 깁니다. 집계 적용을 강력히 권장합니다.',
  },
} as const
