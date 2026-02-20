# RAG UI 통합 가이드

## 개요

통계 페이지에 RAG Assistant 사이드바를 통합하는 방법을 설명합니다.

## 사이드바 형태 (옵션 A)

### 1. 컴포넌트 Import

```tsx
import { RAGAssistant } from '@/components/rag/rag-assistant'
import { Button } from '@/components/ui/button'
import { MessageSquare, X } from 'lucide-react'
```

### 2. 상태 관리 추가

```tsx
export default function TTestPage() {
  // 기존 상태...
  const [showRagSidebar, setShowRagSidebar] = useState(false)

  // ...
}
```

### 3. 레이아웃 수정

#### Before:
```tsx
return (
  <StatisticsPageLayout...>
    {/* Step 1 */}
    {/* Step 2 */}
    {/* Step 3 */}
  </StatisticsPageLayout>
)
```

#### After:
```tsx
return (
  <div className="flex gap-4 h-full">
    {/* 메인 콘텐츠 */}
    <div className="flex-1">
      <StatisticsPageLayout...>
        {/* Step 1 */}
        {/* Step 2 */}
        {/* Step 3 */}
      </StatisticsPageLayout>
    </div>

    {/* RAG 사이드바 (토글 가능) */}
    {showRagSidebar && (
      <div className="w-96 border-l pl-4">
        <RAGAssistant method="tTest" />
      </div>
    )}

    {/* 토글 버튼 (우하단 고정) */}
    <Button
      onClick={() => setShowRagSidebar(!showRagSidebar)}
      className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg"
      size="icon"
    >
      {showRagSidebar ? (
        <X className="h-6 w-6" />
      ) : (
        <MessageSquare className="h-6 w-6" />
      )}
    </Button>
  </div>
)
```

### 4. 스타일 조정 (선택)

```css
/* global.css 또는 tailwind.config.ts */
.rag-sidebar-enter {
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

## 전체 예제 코드

```tsx
'use client'

import React, { useState } from 'react'
import { RAGAssistant } from '@/components/rag/rag-assistant'
import { Button } from '@/components/ui/button'
import { MessageSquare, X } from 'lucide-react'
// ... 기존 imports

export default function TTestPage() {
  // 기존 상태...
  const { state, actions } = useStatisticsPage<TTestResult>({
    withUploadedData: true,
    withError: true
  })

  // RAG 사이드바 토글
  const [showRagSidebar, setShowRagSidebar] = useState(false)

  return (
    <div className="relative">
      <div className="flex gap-4">
        {/* 메인 콘텐츠 */}
        <div className={showRagSidebar ? "flex-1" : "w-full"}>
          <StatisticsPageLayout
            title="독립표본 t-검정"
            subtitle="두 그룹의 평균 비교"
            // ... 기존 props
          >
            {/* 기존 Step 1-2-3 코드 */}
          </StatisticsPageLayout>
        </div>

        {/* RAG 사이드바 */}
        {showRagSidebar && (
          <div className="w-96 border-l pl-4 h-screen sticky top-0">
            <RAGAssistant method="tTest" />
          </div>
        )}
      </div>

      {/* 플로팅 토글 버튼 */}
      <Button
        onClick={() => setShowRagSidebar(!showRagSidebar)}
        className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg z-50"
        size="icon"
        title={showRagSidebar ? 'RAG 도우미 닫기' : 'RAG 도우미 열기'}
      >
        {showRagSidebar ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageSquare className="h-6 w-6" />
        )}
      </Button>
    </div>
  )
}
```

## 메서드 ID 매핑

RAG에 전달할 `method` prop 값:

| 통계 메서드 | method 값 |
|------------|-----------|
| 독립표본 t-검정 | `'tTest'` |
| 일원 분산분석 | `'anova'` |
| 선형 회귀 | `'linearRegression'` |
| 상관분석 | `'correlation'` |
| ... | ... |

## 주의사항

1. **기본 상태**: `useState(false)` - 처음에는 숨김
2. **method prop**: 현재 통계 메서드 ID를 정확히 전달
3. **h-screen**: 사이드바는 화면 전체 높이 사용
4. **sticky top-0**: 스크롤 시에도 사이드바 고정
5. **z-50**: 토글 버튼이 다른 요소 위에 표시

## 다음 단계

1. t-test 페이지에 적용하여 테스트
2. 잘 작동하면 다른 통계 페이지에도 적용
3. 필요 시 공통 레이아웃 컴포넌트로 추출

## 문제 해결

### 사이드바가 너무 좁은 경우
```tsx
<div className="w-80 md:w-96 lg:w-[28rem]">
```

### 모바일에서 사이드바 숨기기
```tsx
{showRagSidebar && (
  <div className="hidden lg:block w-96">
    <RAGAssistant method="tTest" />
  </div>
)}
```

### 사이드바 애니메이션 추가
```tsx
import { motion, AnimatePresence } from 'framer-motion'

<AnimatePresence>
  {showRagSidebar && (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-96"
    >
      <RAGAssistant method="tTest" />
    </motion.div>
  )}
</AnimatePresence>
```
