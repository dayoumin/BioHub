# 챗봇 아키텍처 가이드

**작성일**: 2025-11-16
**목적**: 3가지 챗봇 구현체의 구조, 역할, Hydration 문제 해결 방법 문서화

---

## 📋 개요

이 프로젝트는 **3가지 챗봇 UI**를 유지하며, 각각 다른 용도로 사용됩니다:

| 구현체 | 위치 | 용도 | RAG 컴포넌트 | 상태 관리 |
|--------|------|------|--------------|----------|
| **1. 전용 페이지** | `/chatbot` | Grok 스타일 전체 화면 챗봇 | `RAGChatInterface` | localStorage |
| **2. 우측 패널** | `ChatPanel` | 통계 페이지 우측 보조 패널 | `RAGAssistantCompact` | UI Context |
| **3. 플로팅 버튼** | `FloatingChatbot` | Intercom 스타일 팝업 | `RAGAssistant` | 로컬 state |

---

## 🏗️ 1. 전용 페이지 (`/chatbot`)

### **파일 위치**
- **페이지**: `app/chatbot/page.tsx`
- **컴포넌트**: `components/rag/rag-chat-interface.tsx`

### **특징**
- ✅ Grok 스타일 사이드바 (검색, 즐겨찾기, 프로젝트, 히스토리)
- ✅ 세션 관리 (다중 대화, 프로젝트 그룹화)
- ✅ 전체 화면 (`h-[calc(100vh-64px)]`)
- ✅ 키보드 단축키 (Ctrl+N: 새 대화)

### **주요 기능**
```typescript
// app/chatbot/page.tsx
export default function ChatbotPage() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [forceUpdate, setForceUpdate] = useState(0)

  // localStorage에서 세션 로드
  useEffect(() => {
    const loadedSessions = ChatStorage.loadSessions()
    if (loadedSessions.length > 0) {
      setCurrentSessionId(loadedSessions[0].id)
    }
  }, [])

  return (
    <RAGChatInterface
      sessionId={currentSessionId}
      onSessionUpdate={() => triggerUpdate()}
    />
  )
}
```

### **⚠️ Hydration 문제**
- **원인**: `useEffect`에서 localStorage 읽기 → 서버/클라이언트 불일치
- **해결**: `isMounted` 상태 추가 (아래 "Hydration 해결 패턴" 참조)

---

## 🏗️ 2. 우측 패널 (`ChatPanel`)

### **파일 위치**
- **컴포넌트**: `components/chatbot/chat-panel.tsx`
- **RAG**: `components/rag/rag-assistant-compact.tsx`

### **특징**
- ✅ 통계 페이지 우측 고정 패널
- ✅ 드래그 리사이즈 (320px ~ 800px)
- ✅ 접기/펼치기 토글
- ✅ 즐겨찾기 필터

### **주요 기능**
```typescript
// components/chatbot/chat-panel.tsx
export function ChatPanel({ className }: ChatPanelProps) {
  const {
    chatPanelWidth,
    isChatPanelCollapsed,
    toggleChatPanelCollapse
  } = useUI()  // ← UI Context 사용

  return (
    <aside style={{ width: chatPanelWidth }}>
      <RAGAssistantCompact />
    </aside>
  )
}
```

### **⚠️ Hydration 문제 가능성**
- ✅ **안전**: UI Context는 Provider에서 관리 (서버/클라이언트 일관성)
- ⚠️ **주의**: `RAGAssistantCompact` 내부에서 localStorage 사용 시 문제 발생 가능

---

## 🏗️ 3. 플로팅 챗봇 (`FloatingChatbot`)

### **파일 위치**
- **컴포넌트**: `components/chatbot/floating-chatbot.tsx`
- **RAG**: `components/rag/rag-assistant.tsx`

### **특징**
- ✅ Intercom 스타일 우하단 버튼
- ✅ 400×600px 팝업 (PC) / 전체 화면 (모바일)
- ✅ 설정에서 on/off 가능
- ✅ 특정 페이지에서 숨김 (`/chatbot` 제외)

### **주요 기능**
```typescript
// components/chatbot/floating-chatbot.tsx
export function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)

  // 설정 로드 (localStorage)
  useEffect(() => {
    const settings = ChatStorage.loadSettings()
    setIsEnabled(settings.floatingButtonEnabled)
  }, [])

  return (
    <RAGAssistant />
  )
}
```

### **⚠️ Hydration 문제 가능성**
- ⚠️ **위험**: `useEffect`에서 localStorage 읽기
- 🔧 **해결 필요**: `isMounted` 패턴 적용 필요

---

## 🛠️ Hydration 해결 패턴

### **문제 상황**
```typescript
// ❌ 잘못된 예시 - Hydration 에러 발생
export default function Page() {
  const [data, setData] = useState<Data[]>([])

  useEffect(() => {
    const loaded = ChatStorage.loadSessions()  // localStorage 읽기
    setData(loaded)  // ← 서버: [], 클라이언트: [...] → 불일치!
  }, [])

  return <div>{data.map(...)}</div>  // ← Hydration 에러!
}
```

### **해결 방법 1: `isMounted` 패턴 (권장)**
```typescript
// ✅ 올바른 예시
export default function Page() {
  const [isMounted, setIsMounted] = useState(false)
  const [data, setData] = useState<Data[]>([])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return  // ← 클라이언트 마운트 후에만 실행

    const loaded = ChatStorage.loadSessions()
    setData(loaded)
  }, [isMounted])

  if (!isMounted) {
    return <div>Loading...</div>  // ← 서버 렌더링 시 표시
  }

  return <div>{data.map(...)}</div>  // ← 클라이언트에서만 렌더링
}
```

### **해결 방법 2: Dynamic Import (무거운 컴포넌트)**
```typescript
// ✅ dynamic import로 SSR 비활성화
import dynamic from 'next/dynamic'

const ChatbotPage = dynamic(() => import('./chatbot-impl'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

export default function Page() {
  return <ChatbotPage />
}
```

### **해결 방법 3: Suspense + Client Component**
```typescript
// ✅ Suspense boundary 사용
'use client'

import { Suspense } from 'react'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatbotContent />
    </Suspense>
  )
}

function ChatbotContent() {
  const [data, setData] = useState<Data[]>([])

  useEffect(() => {
    const loaded = ChatStorage.loadSessions()
    setData(loaded)
  }, [])

  return <div>{data.map(...)}</div>
}
```

---

## 🔍 Hydration 문제 진단 체크리스트

각 챗봇 구현체에서 아래 항목을 확인하세요:

### **1. 전용 페이지 (`/chatbot`)**
- [ ] `useEffect`에서 localStorage 읽기 → `isMounted` 적용
- [ ] 초기 state가 서버/클라이언트에서 동일한가?
- [ ] `'use client'` 있는가? (있음 ✓)
- [ ] `export const dynamic = 'force-dynamic'` 제거 (SSR 비활성화용)

### **2. 우측 패널 (`ChatPanel`)**
- [ ] UI Context 사용 → 안전 (Provider에서 관리)
- [ ] `RAGAssistantCompact` 내부 localStorage 사용 확인

### **3. 플로팅 챗봇 (`FloatingChatbot`)**
- [ ] `useEffect`에서 localStorage 읽기 → `isMounted` 적용
- [ ] 설정 로드 시 초기 state 일치 확인

---

## 📦 공통 의존성

### **RAG 컴포넌트**
| 컴포넌트 | 사용처 | 특징 |
|----------|--------|------|
| `RAGChatInterface` | 전용 페이지 | 전체 채팅 UI (메시지 목록, 입력창, 소스 표시) |
| `RAGAssistantCompact` | 우측 패널 | 간소화 버전 (좁은 공간 최적화) |
| `RAGAssistant` | 플로팅 챗봇 | 팝업 최적화 버전 |

### **공통 서비스**
- `ChatStorage` (lib/services/chat-storage.ts): localStorage 관리
- `RAGService` (lib/services/rag/rag-service.ts): RAG 쿼리 처리
- `OllamaProvider` (lib/rag/providers/ollama-provider.ts): LLM 통신

---

## 🚨 중요 규칙

### **1. `'use client'` 필수**
모든 챗봇 컴포넌트는 클라이언트 전용이므로 `'use client'` 필수

### **2. `export const dynamic` 제거**
- ❌ `export const dynamic = 'force-dynamic'` (서버 컴포넌트 전용)
- ✅ Client Component에서는 불필요

### **3. localStorage 사용 시**
- ✅ `isMounted` 패턴 적용
- ✅ 초기 state는 빈 값으로 설정 (`[]`, `null`, `false` 등)
- ❌ `useEffect` 밖에서 localStorage 직접 읽기 금지

### **4. 조건부 렌더링**
```typescript
if (!isMounted) {
  return <div>Loading...</div>  // ← 서버와 동일한 HTML
}

return <ActualContent />  // ← 클라이언트에서만 렌더링
```

---

## 🛠️ 수정 작업 우선순위

### **Priority 1: 전용 페이지 (`/chatbot`)**
- 현재 Hydration 에러 발생 중
- `isMounted` 패턴 적용 필요

### **Priority 2: 플로팅 챗봇 (`FloatingChatbot`)**
- localStorage 사용하지만 조건부 렌더링으로 숨김
- 예방 차원에서 `isMounted` 적용 권장

### **Priority 3: 우측 패널 (`ChatPanel`)**
- UI Context 사용으로 안전
- `RAGAssistantCompact` 내부 검토 필요

---

## 📝 다음 단계

1. ✅ 전용 페이지 Hydration 수정 (`/chatbot`)
2. 🔜 플로팅 챗봇 예방 수정 (`FloatingChatbot`)
3. 🔜 우측 패널 내부 검토 (`RAGAssistantCompact`)
4. 🔜 통합 테스트 (3가지 모두 정상 동작 확인)

---

**Updated**: 2025-11-16
**Author**: Claude Code
