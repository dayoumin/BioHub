/**
 * RAG 시스템 UI 상수 중앙화
 *
 * RAGAssistant, RAGChatInterface 등에서 사용하는 UI 텍스트 한 곳에서 관리
 * 변경 시 모든 컴포넌트에 자동 적용됨
 */

export const RAG_UI_CONFIG = {
  // 제목
  titles: {
    assistant: '💬 RAG 도우미',
    chatInterface: '무엇을 도와드릴까요?',
  },

  // 플레이스홀더
  placeholders: {
    query: '질문을 입력하세요.',
  },

  // 메시지
  messages: {
    thinking: '생각 중...',
    errorDefault: '알 수 없는 오류',
    sessionEmpty: '질문을 입력해주세요.',
    noHistory: (showFavoritesOnly: boolean) =>
      showFavoritesOnly ? '즐겨찾기한 대화가 없습니다' : '대화 기록이 없습니다',
    welcomeSubtext: '통계 분석에 대해 궁금한 점을 물어보세요',
    exampleQuestion: '예: "t-test의 가정은 무엇인가요?"',
  },

  // 버튼 레이블
  buttons: {
    send: '전송',
    newChat: '새 대화',
    favorites: '즐겨찾기',
  },

  // 참조 문서
  sources: {
    title: '참조 문서',
    relevance: '관련도',
    label: (count: number) => `참조 문서 (${count}개)`,
  },

  // 사이드바
  sidebar: {
    title: '대화 기록',
    closeButton: '닫기',
  },
} as const
