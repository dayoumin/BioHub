# Next.js Static Export 가이드

**목적**: `output: 'export'` 설정과 API route 제약사항을 명확히 문서화

**작성일**: 2025-11-18
**최종 수정**: 2025-11-18

---

## 📋 목차

1. [Static Export란?](#static-export란)
2. [왜 Static Export를 사용하는가?](#왜-static-export를-사용하는가)
3. [API Route 제약사항](#api-route-제약사항)
4. [현재 프로젝트 구조](#현재-프로젝트-구조)
5. [FAQ](#faq)

---

## 1. Static Export란?

### 1.1 개념

```typescript
// next.config.ts
const nextConfig = {
  output: 'export'  // ← Static Site Generation (SSG) 모드
}
```

**의미**: Next.js를 **순수 정적 HTML/CSS/JS**로 빌드

### 1.2 빌드 결과물

```
.next/
└── out/              # Static export 출력 폴더
    ├── index.html
    ├── statistics/
    │   ├── anova.html
    │   ├── t-test.html
    │   └── ...
    ├── _next/
    │   ├── static/
    │   └── ...
    └── ...
```

**특징**:
- ✅ 모든 페이지가 `.html` 파일로 변환
- ✅ 서버 없이 배포 가능 (Nginx, Apache, GitHub Pages)
- ✅ CDN에 바로 올릴 수 있음
- ❌ 서버 사이드 렌더링 (SSR) 불가
- ❌ API route 사용 불가

### 1.3 배포 방식 비교

| 방식 | 서버 필요 | API route | 동적 렌더링 | 빌드 크기 |
|-----|---------|-----------|------------|----------|
| **Static Export** (`output: 'export'`) | ❌ 불필요 | ❌ 불가 | ❌ 불가 | 작음 |
| **Server Mode** (기본값) | ✅ 필요 | ✅ 가능 | ✅ 가능 | 큼 |

---

## 2. 왜 Static Export를 사용하는가?

### 2.1 프로젝트 배포 시나리오

우리 프로젝트는 **2가지 배포 방식**을 지원:

```
📦 Statistical Platform

1. Vercel/Netlify (클라우드)
   └── Static export → CDN 배포
       ✅ 서버 비용 0원
       ✅ 무한 확장 가능
       ✅ 빠른 로딩

2. 로컬 오프라인 (폐쇄망)
   └── Static export → 파일 서버
       ✅ 인터넷 없이 작동
       ✅ 설치형 (Nginx/Apache)
       ✅ 내부망 배포
```

### 2.2 Static Export의 장점

**1. 서버 비용 절감**
```
Server Mode:  Vercel Pro ($20/월) + 서버 유지보수
Static Export: Vercel Hobby (무료) 또는 GitHub Pages (무료)
```

**2. 오프라인 배포 가능**
```
군대/병원/연구소 (폐쇄망)
└── USB/CD로 파일 복사
    └── Nginx로 서빙
        └── 인터넷 없이 작동 ✅
```

**3. 보안**
```
Server Mode:  서버 공격 가능성
Static Export: 정적 파일만 → 공격 표면 최소화
```

---

## 3. API Route 제약사항

### 3.1 문제 상황

**에러 메시지**:
```
Error: export const dynamic = "force-static"/export const revalidate
not configured on route "/api/rag/parse-file" with "output: export".
```

**의미**:
- Static export 모드에서는 API route를 사용할 수 없음
- `/api/*` 경로는 서버가 필요함
- 정적 HTML로 변환 불가

### 3.2 왜 API Route가 작동하지 않는가?

#### Server Mode (기본값)
```typescript
// app/api/rag/parse-file/route.ts
export async function POST(request: NextRequest) {
  const file = await request.formData()  // ← 서버에서 실행
  // 파일 파싱...
  return NextResponse.json({ result })
}
```

**동작**:
1. 사용자가 `/api/rag/parse-file` 호출
2. **Vercel 서버**가 요청 받음
3. Node.js 런타임에서 함수 실행
4. 결과 반환

#### Static Export
```
빌드 시:
  /api/rag/parse-file → ❌ HTML로 변환 불가
  (동적 코드는 정적 파일로 만들 수 없음)

런타임 시:
  사용자가 /api/rag/parse-file 호출
  → 서버 없음
  → 404 에러
```

### 3.3 해결 방법

#### 방법 1: `dynamic = 'error'` (현재 사용 중)

**목적**: "이 API route는 static export에서 사용 안 함"을 명시

```typescript
// app/api/rag/parse-file/route.ts
export const dynamic = 'error'  // ← 추가

export async function POST(request: NextRequest) {
  // ...
}
```

**동작**:
```
빌드 시:
  - 이 route를 번들에서 제외
  - 에러 발생 안 함 ✅

dev 모드 (npm run dev):
  - 서버 모드로 실행
  - API route 정상 작동 ✅

production (npm run build + output: 'export'):
  - API route 번들에서 제외
  - 호출 시 404 (하지만 사용 안 하므로 OK)
```

**장점**:
- ✅ 빌드 에러 해결
- ✅ dev 모드에서는 정상 작동
- ✅ 코드 수정 최소화

**단점**:
- 🟡 production에서 API route 사용 불가
- 🟡 클라이언트 사이드로 로직 이동 필요

#### 방법 2: 클라이언트 사이드로 변경 (향후 작업)

**Before (Server-side API)**:
```typescript
// components/rag/file-uploader.tsx
const response = await fetch('/api/rag/parse-file', {
  method: 'POST',
  body: formData
})
```

**After (Client-side)**:
```typescript
// components/rag/file-uploader.tsx
import { parseFileClient } from '@/lib/rag/parsers/client-parser'

const result = await parseFileClient(file)  // ← 브라우저에서 직접 파싱
```

**장점**:
- ✅ Static export에서도 작동
- ✅ 서버 불필요

**단점**:
- 🟡 브라우저에서 파싱 (성능 저하 가능)
- 🟡 대용량 파일 처리 제한

---

## 4. 현재 프로젝트 구조

### 4.1 Static Export 사용 현황

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'export',  // ✅ Static export 활성화
  // ...
}
```

### 4.2 API Route 현황

**정의된 API route** (2개):
```
app/api/
├── rag/
│   ├── parse-file/route.ts        ← export const dynamic = 'error'
│   └── supported-formats/route.ts ← export const dynamic = 'error'
```

**사용처**:
```typescript
// components/rag/file-uploader.tsx
fetch('/api/rag/supported-formats')  // ← dev 모드에서만 작동
fetch('/api/rag/parse-file', ...)   // ← dev 모드에서만 작동
```

### 4.3 동작 모드별 차이

| 기능 | dev 모드 | production (static export) |
|-----|---------|---------------------------|
| **통계 분석** | ✅ 작동 | ✅ 작동 |
| **RAG 검색** | ✅ 작동 | ✅ 작동 |
| **파일 업로드 파싱** | ✅ 작동 (API route) | ❌ 미사용 (클라이언트 파싱) |

### 4.4 Runtime vs Build time

```
📦 Statistical Platform

런타임 (브라우저):
├── 통계 분석: Pyodide (WASM) ✅
├── RAG 검색: sql.js (WASM) ✅
└── 파일 파싱:
    ├── dev: API route (서버) ✅
    └── production: 클라이언트 (WASM) 🟡 (미구현)

빌드타임 (Node.js):
├── Static HTML 생성 ✅
├── 메타데이터 생성 (better-sqlite3) ✅
└── API route 번들에서 제외 ✅
```

---

## 5. FAQ

### Q1. dev 모드에서는 API route가 작동하는데 왜 빌드 시 에러?

**A**: dev 모드는 서버 모드로 실행되기 때문입니다.

```bash
npm run dev
# → Next.js 개발 서버 실행 (Server Mode)
# → API route 작동 ✅

npm run build (output: 'export')
# → Static HTML 생성 (Static Mode)
# → API route 변환 불가 ❌
```

---

### Q2. `dynamic = 'error'`를 추가하면 어떻게 되나요?

**A**: 빌드 시 해당 route를 번들에서 제외합니다.

```typescript
export const dynamic = 'error'

의미: "이 route는 static export에서 사용하지 않음"
결과: 빌드 에러 발생 안 함, 번들에 포함 안 됨
```

---

### Q3. production에서 API route를 꼭 써야 한다면?

**A**: `output: 'export'`를 제거하고 Server Mode로 배포하세요.

```typescript
// next.config.ts (Server Mode)
const nextConfig: NextConfig = {
  // output: 'export',  ← 주석 처리 또는 제거
}
```

**배포 플랫폼**:
- Vercel (서버 모드 지원)
- AWS / GCP / Azure
- 자체 서버 (Node.js 필요)

**단점**:
- ❌ 서버 비용 발생
- ❌ 오프라인 배포 불가
- ❌ 서버 유지보수 필요

---

### Q4. 현재 API route가 사용되는데 왜 `dynamic = 'error'`?

**A**: dev 모드 개발 편의성 + production 정적 배포 모두 지원하기 위함입니다.

```
개발 시 (dev 모드):
  API route 사용 ✅
  → 빠른 개발

배포 시 (production):
  클라이언트 사이드 파싱 🟡
  → Static export 유지
  → (미래: 클라이언트 파싱 구현 필요)
```

**향후 계획**:
1. 클라이언트 사이드 파싱 구현
2. API route 완전 제거
3. 또는 Server Mode 옵션 추가 (환경변수로 전환)

---

### Q5. 왜 API route를 클라이언트 사이드로 옮겨야 하나요?

**A**: Static export의 장점을 유지하기 위함입니다.

**Server-side (API route)**:
```
장점: 서버에서 파싱 (빠름, 강력)
단점: 서버 필요, 오프라인 배포 불가
```

**Client-side (브라우저)**:
```
장점: 서버 불필요, 오프라인 작동, 무료 배포
단점: 브라우저 성능 제한, 대용량 파일 제한
```

**우리 프로젝트의 선택**:
- ✅ Static export (오프라인 배포 중요)
- ✅ 클라이언트 사이드로 이동
- 🟡 대용량 파일은 제한 (허용 가능)

---

## 📚 관련 문서

- [DEPLOYMENT_SCENARIOS.md](DEPLOYMENT_SCENARIOS.md) - 배포 시나리오 (온라인/오프라인)
- [Next.js Static Export 공식 문서](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

---

## 🔄 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|----------|--------|
| 2025-11-18 | 초기 작성 (API route dynamic export 설명) | Claude Code |

---

## 🎯 요약

### 핵심 개념

1. **`output: 'export'`** = 정적 사이트 생성 (서버 불필요)
2. **API route** = 서버 필요 (static export와 불호환)
3. **`dynamic = 'error'`** = "이 route는 static export에서 제외"

### 현재 상태

```
✅ dev 모드: API route 작동 (개발 편의성)
✅ production: Static export (오프라인 배포)
🟡 향후: 클라이언트 파싱 구현 필요
```

### 헷갈리지 않는 법

**"빌드 에러가 나는데 왜 dev에서는 작동해?"**
→ dev는 서버 모드, production은 static export (다른 모드!)

**"API route를 왜 못 쓰나?"**
→ Static export = 정적 HTML만 = 서버 불필요 = API route 불가

**"`dynamic = 'error'`는 뭐야?"**
→ "이 API route는 빌드에서 제외해줘" (에러 방지)

**"production에서 API route 필요하면?"**
→ 옵션 1: 클라이언트 사이드로 이동 (현재 방향)
→ 옵션 2: `output: 'export'` 제거 (서버 모드로 전환)
