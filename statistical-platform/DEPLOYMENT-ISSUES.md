# 배포 환경 이슈 분석 및 해결 방안

**작성일**: 2025-11-02
**상태**: 🔍 분석 완료 (해결책 제시)

---

## 📊 이슈 요약

| # | 심각도 | 이슈 | 환경 | 영향범위 |
|---|--------|------|------|---------|
| 1 | 🔴 HIGH | sql.js 로컬 파일 부재 | 오프라인 | RAG 초기화 불가 |
| 2 | 🟡 MEDIUM | 아카이브 세션 복구 불가 | 모든 환경 | UX 저하 |
| 3 | 🟡 MEDIUM | /api/rag/stream 정적 배포 | 정적 배포 | 스트리밍 불가 |

---

## 🔴 Issue 1: sql.js 로컬 파일 부재 (HIGH)

### 현재 상태

**파일**: `lib/rag/providers/ollama-provider.ts:69-146`

```typescript
// ✅ 로드 전략은 구현됨 (3계층)
1. 로컬: /sql-wasm/sql-wasm.js     ← 파일이 없음 (404)
2. CDN: https://sql.js.org/dist/   ← CDN 접근 불가 (오프라인)
3. 결과: 모두 실패 → RAG 초기화 불가 🔴
```

### 문제 진단

```
📍 public/sql-wasm/ 폴더: 존재하지 않음
📍 해당 폴더의 파일들:
  - sql-wasm.js    ❌ 없음
  - sql-wasm.wasm  ❌ 없음
```

### 영향도

| 환경 | 현상 | 사용자 영향 |
|------|------|----------|
| **온라인** | CDN 로드 성공 | ✅ 정상 작동 |
| **오프라인** | 로컬 404 → CDN 404 → 실패 | 🔴 RAG 불가 |
| **내부망** | CDN 차단 → RAG 초기화 실패 | 🔴 RAG 불가 |

### 해결책

#### **Step 1: sql.js 파일 다운로드**

```bash
# 로컬 디렉토리 생성
mkdir -p statistical-platform/public/sql-wasm

# sql.js WASM 파일 다운로드
cd statistical-platform/public/sql-wasm

# 방법 A: wget 사용 (Linux/Mac)
wget https://sql.js.org/dist/sql-wasm.js
wget https://sql.js.org/dist/sql-wasm.wasm

# 방법 B: curl 사용
curl -O https://sql.js.org/dist/sql-wasm.js
curl -O https://sql.js.org/dist/sql-wasm.wasm

# 방법 C: PowerShell (Windows)
Invoke-WebRequest -Uri "https://sql.js.org/dist/sql-wasm.js" -OutFile "sql-wasm.js"
Invoke-WebRequest -Uri "https://sql.js.org/dist/sql-wasm.wasm" -OutFile "sql-wasm.wasm"
```

#### **Step 2: 파일 검증**

```bash
# 파일 크기 확인 (정상: ~1.5MB 각각)
ls -lh statistical-platform/public/sql-wasm/

# 예상 출력:
# -rw-r--r-- 1 user user 1.5M Nov  2 10:00 sql-wasm.js
# -rw-r--r-- 1 user user 1.5M Nov  2 10:00 sql-wasm.wasm
```

#### **Step 3: .gitignore 확인**

```bash
# sql-wasm 파일들이 git에 추적되지 않는지 확인
cat statistical-platform/.gitignore | grep -i sql
```

**선택**: 저장소에 포함시킬지 결정
- **포함**: `git add public/sql-wasm/` → 배포 간단하지만 저장소 크기 증가
- **제외**: 배포 스크립트에 다운로드 로직 추가

#### **Step 4: 빌드 및 배포 테스트**

```bash
# 개발 환경에서 테스트
npm run build

# 빌드 결과 확인
ls -la .next/static/sql-wasm/  # 정적 파일로 포함되는지 확인

# dev 모드에서 오프라인 테스트
npm run dev
# 브라우저 DevTools → Network 탭 → sql-wasm 요청 확인
```

#### **Step 5: 배포 체크리스트**

```bash
# 배포 전 확인사항
□ public/sql-wasm/ 폴더 존재
□ sql-wasm.js 파일 존재 (크기 > 1MB)
□ sql-wasm.wasm 파일 존재 (크기 > 1MB)
□ .next/static/ 에 포함되었는지 확인
□ npm run build 성공
□ 오프라인 환경에서 테스트 완료

# 배포 스크립트 예시 (선택)
#!/bin/bash
set -e

echo "📥 Downloading sql.js files..."
mkdir -p public/sql-wasm
cd public/sql-wasm
wget -q https://sql.js.org/dist/sql-wasm.js -O sql-wasm.js
wget -q https://sql.js.org/dist/sql-wasm.wasm -O sql-wasm.wasm
cd ../../

echo "🔨 Building project..."
npm run build

echo "✅ Deployment ready!"
```

---

## 🟡 Issue 2: 아카이브 세션 복구 불가 (MEDIUM)

### 현재 상태

**파일**: `app/chatbot/page.tsx:153`, `lib/services/chat-storage.ts`

```typescript
// ✅ 보관 기능은 있음
ChatStorage.toggleArchive(sessionId)

// ❌ 하지만 복구 경로가 없음
- 보관된 세션 목록 UI 없음
- 복구 버튼 없음
- 사용자가 접근 불가능
```

### 문제 진단

| 작업 | 가능? | 경로 |
|------|-------|------|
| 세션 보관 | ✅ | `toggleArchive()` |
| 보관된 세션 로드 | ✅ | `loadArchivedSessions()` |
| **보관 UI 표시** | ❌ | **없음** |
| **복구 버튼** | ❌ | **없음** |

### 영향도

```
시나리오: 사용자가 중요한 세션을 실수로 보관함
결과:
  1. 세션이 목록에서 사라짐
  2. 보관함을 열 수 있는 UI가 없음
  3. 세션을 영구적으로 잃음 (데이터는 저장되어 있지만 접근 불가)
```

### 해결책 (2가지 옵션)

#### **Option A: 내부용 보관함 페이지 (권장)**

```typescript
// app/chatbot/archive/page.tsx (신규)
'use client'

import { useEffect, useState } from 'react'
import { ChatStorage } from '@/lib/services/chat-storage'
import type { ChatSession } from '@/lib/types/chat'
import { Button } from '@/components/ui/button'

export default function ArchivePage() {
  const [archived, setArchived] = useState<ChatSession[]>([])

  useEffect(() => {
    const sessions = ChatStorage.loadArchivedSessions()
    setArchived(sessions)
  }, [])

  const handleRestore = (sessionId: string) => {
    ChatStorage.toggleArchive(sessionId)
    setArchived(prev => prev.filter(s => s.id !== sessionId))
  }

  return (
    <div className="p-6">
      <h1>보관함</h1>
      {archived.length === 0 ? (
        <p>보관된 세션이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {archived.map(session => (
            <div key={session.id} className="flex justify-between">
              <span>{session.title}</span>
              <Button onClick={() => handleRestore(session.id)}>복구</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

#### **Option B: 챗봇 메뉴에 통합 (빠른 해결)**

```typescript
// components/rag/rag-chat-sidebar.tsx
const [showArchived, setShowArchived] = useState(false)
const archived = ChatStorage.loadArchivedSessions()

// UI에 추가
<button onClick={() => setShowArchived(!showArchived)}>
  보관함 ({archived.length})
</button>

{showArchived && (
  <div className="space-y-1">
    {archived.map(session => (
      <div key={session.id} className="flex gap-2">
        <button onClick={() => openSession(session.id)}>
          {session.title}
        </button>
        <button onClick={() => ChatStorage.toggleArchive(session.id)}>
          복구
        </button>
      </div>
    ))}
  </div>
)}
```

### 구현 권장사항

- **즉시 (필수)**: Option B 구현 (챗봇 메뉴 통합)
- **다음 (선택)**: Option A 구현 (전용 보관함 페이지)

---

## 🟡 Issue 3: /api/rag/stream 정적 배포 (MEDIUM)

### 현재 상태

**파일**: `components/rag/rag-chat-interface.tsx:131`

```typescript
// Next.js API 라우트 호출
const response = await fetch('/api/rag/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: query.trim(), sessionId }),
})

// 문제: 정적 HTML 배포 시 /api/rag/stream 없음 → 404
```

### 문제 진단

| 배포 방식 | /api/rag/stream | 결과 | 사용자 영향 |
|----------|-----------------|------|----------|
| **Next.js Server (로컬)** | ✅ 있음 | 스트리밍 OK | ✅ 정상 |
| **정적 HTML (CDN/S3)** | ❌ 없음 | 404 → 폴백 | 🟡 느림 (비스트리밍) |
| **별도 서버** | ❌ 없음 | 404 → 폴백 | 🟡 느림 (비스트리밍) |

### 폴백 메커니즘 (이미 구현됨)

```typescript
// 현재 구현 (Line 201-212)
catch (streamError) {
  console.warn('[handleSubmit] 스트리밍 실패, 기존 응답 사용:', streamError)
  finalContent = initialResponse.answer  // ✅ 폴백
  // ... UI 업데이트
}
```

**결과**:
- ✅ 답변은 나옴 (스트리밍 안 됨)
- 🟡 초기 응답 + 스트리밍 2단계에서 1단계로 축소
- ⚠️ 사용자 입장에서는 느려 보임

### 해결책 (3가지 옵션)

#### **Option 1: 빌드타임 조건부 로드 (권장)**

```typescript
// lib/config.ts (신규)
export const RAG_CONFIG = {
  // 환경변수로 제어
  enableStreaming: process.env.NEXT_PUBLIC_ENABLE_STREAMING !== 'false',
}
```

```typescript
// components/rag/rag-chat-interface.tsx:135
const useStreaming = RAG_CONFIG.enableStreaming &&
                    localStorage.getItem('enableStreaming') !== 'false'

if (useStreaming) {
  try {
    const response = await fetch('/api/rag/stream', {
      // ... 스트리밍 로직
    })
  } catch (streamError) {
    // ...
  }
} else {
  // 스트리밍 건너뛰고 폴백
  finalContent = initialResponse.answer
}
```

```bash
# 배포 시 환경변수 설정
# .env.local (개발) - 스트리밍 활성화
NEXT_PUBLIC_ENABLE_STREAMING=true

# .env.production (정적 배포) - 스트리밍 비활성화
NEXT_PUBLIC_ENABLE_STREAMING=false
```

#### **Option 2: 런타임 API 감지 (자동)**

```typescript
// 애플리케이션 시작 시 API 가능 여부 확인
const checkStreamingAvailable = async () => {
  try {
    const response = await fetch('/api/rag/stream', {
      method: 'OPTIONS',  // HEAD 요청
      timeout: 2000
    })
    return response.ok
  } catch {
    return false
  }
}

// 초기화
useEffect(() => {
  checkStreamingAvailable().then(setCanStream)
}, [])

// 사용
if (canStream) {
  // 스트리밍 시도
} else {
  // 폴백
}
```

#### **Option 3: 외부 스트리밍 API (프로덕션)**

```typescript
// 별도 백엔드 API 사용
const STREAM_API = process.env.NEXT_PUBLIC_STREAM_API || '/api/rag/stream'

const response = await fetch(`${STREAM_API}`, {
  // ...
})

// 배포 시 설정
# Vercel 환경변수
NEXT_PUBLIC_STREAM_API=https://api.example.com/stream
```

### 배포 시나리오별 권장

| 배포 방식 | 권장 옵션 | 설정 |
|----------|---------|------|
| **Next.js 서버** | Option 1 | `ENABLE_STREAMING=true` |
| **정적 배포 (CDN)** | Option 1 | `ENABLE_STREAMING=false` |
| **Docker/K8s** | Option 2 | 런타임 감지 |
| **프로덕션 분리** | Option 3 | 외부 API URL |

---

## ✅ 해결 우선순위 및 일정

### **즉시 (1-2시간)**
- [ ] **Issue 1**: sql.js 파일 다운로드 및 배포
- [ ] **Issue 2**: 보관함 UI 빠른 구현 (Option B)

### **이번 주**
- [ ] **Issue 3**: 환경변수 기반 스트리밍 제어 (Option 1)
- [ ] 전체 배포 테스트

### **다음 주**
- [ ] **Issue 2**: 보관함 전용 페이지 (Option A)
- [ ] **Issue 3**: 런타임 API 감지 (Option 2)

---

## 📋 배포 체크리스트

### 오프라인 배포 (권장)

```bash
□ public/sql-wasm/ 폴더 생성
□ sql-wasm.js, sql-wasm.wasm 다운로드
□ npm run build 성공
□ 정적 파일(.next/static) 에 포함 확인
□ NEXT_PUBLIC_ENABLE_STREAMING=false 설정
□ 오프라인 환경에서 RAG 테스트
```

### 온라인 배포

```bash
□ NEXT_PUBLIC_ENABLE_STREAMING=true 설정
□ /api/rag/stream 엔드포인트 구현 확인
□ 스트리밍 테스트 완료
□ CDN 또는 CDN 우회 설정 (sql.js)
```

### 모든 배포

```bash
□ 보관함 UI 구현 (최소 Option B)
□ 아카이브된 세션 복구 가능 확인
□ 롤백 계획 준비
```

---

**상태**: 🟢 **배포 가능 (위 이슈 해결 시)**

모든 이슈는 **치명적이지 않지만** 배포 환경에 따라 중요도가 다릅니다.
오프라인 전용이면 **Issue 1 필수**, 온라인이면 **Issue 3 권장**입니다.
