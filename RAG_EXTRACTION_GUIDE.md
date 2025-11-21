# RAG 시스템 추출 가이드

**목적**: 현재 통계 플랫폼의 RAG 시스템을 다른 프로젝트로 이식하기 위한 완벽 가이드

**작성일**: 2025-11-21

---

## 📋 목차

1. [RAG 시스템 개요](#1-rag-시스템-개요)
2. [필요한 파일 목록](#2-필요한-파일-목록)
3. [의존성 패키지](#3-의존성-패키지)
4. [환경 설정](#4-환경-설정)
5. [단계별 이식 가이드](#5-단계별-이식-가이드)
6. [사용 예제](#6-사용-예제)

---

## 1. RAG 시스템 개요

### 1.1 핵심 기능

| 기능 | 설명 | 구현 |
|------|------|------|
| **하이브리드 검색** | Keyword (BM25) + Semantic (Vector) | Langchain Ensemble Retriever |
| **Docling 통합** | PDF 구조 분석 + 고품질 파싱 | Docling API (선택) |
| **로컬 임베딩** | 폐쇄망 환경 지원 | Ollama (mxbai-embed-large 등) |
| **Vector Store** | 브라우저 내장 벡터 DB | SQLite (sql.js + absurd-sql) |
| **스트리밍 답변** | 실시간 응답 + 타이핑 효과 | Server-Sent Events |
| **문서 CRUD** | 문서 관리 + 재색인 | IndexedDB + RAG Service |
| **Citation** | 인라인 인용 [1], [2] | remark-citations |

### 1.2 아키텍처

```
사용자 질문
    ↓
[브라우저] RAG Service
    ↓
Ollama (임베딩 생성)
    ↓
sql.js (Hybrid Search)
    ├─ BM25 (Keyword)
    └─ Vector Similarity
    ↓ (IndexedDB에서 로드)
absurd-sql
    ↓
관련 문서 반환
    ↓
Ollama (답변 생성 - 스트리밍)
    ↓
Markdown + Citation [1]
    ↓
사용자에게 표시
```

---

## 2. 필요한 파일 목록

### 2.1 핵심 라이브러리 (37개 파일)

**복사 경로**: `statistical-platform/lib/rag/` → `your-project/lib/rag/`

```
lib/rag/
├── providers/
│   ├── base-provider.ts          # ✅ RAG Provider 인터페이스
│   └── ollama-provider.ts        # ✅ Ollama 구현체 (핵심!)
├── parsers/
│   ├── base-parser.ts            # ✅ 파서 인터페이스
│   ├── pdf-parser.ts             # ✅ Docling PDF 파서
│   ├── markdown-parser.ts        # ✅ Markdown 파서
│   ├── hwp-parser.ts             # ✅ 한글 파일 파서
│   ├── parser-registry.ts        # ✅ 파서 등록/관리
│   └── environment-check.ts      # ✅ 환경 감지
├── strategies/
│   ├── base-strategy.ts          # ✅ 청킹 전략 인터페이스
│   └── chunking/
│       ├── semantic-chunking.ts  # ✅ 의미 기반 청킹
│       └── hwp-chunking.ts       # ✅ 한글 파일 청킹
├── utils/
│   ├── sql-indexeddb.ts          # ✅ SQLite + IndexedDB 초기화
│   ├── blob-utils.ts             # ✅ Blob 처리
│   ├── chunking.ts               # ✅ 텍스트 청킹
│   ├── error-handler.ts          # ✅ 에러 처리
│   ├── model-recommender.ts      # ✅ 모델 추천
│   ├── ollama-check.ts           # ✅ Ollama 상태 확인
│   ├── remark-citations.ts       # ✅ Citation 플러그인
│   └── absurd-sql.d.ts           # ✅ TypeScript 타입
├── config/
│   ├── index.ts                  # ✅ 설정 중앙화
│   ├── ui-constants.ts           # ✅ UI 상수
│   └── markdown-config.ts        # ✅ Markdown 설정
├── hooks/
│   └── use-rag-assistant.ts      # ✅ React Hook (채팅)
├── rag-service.ts                # ✅ RAG 서비스 (진입점!)
├── rag-config.ts                 # ✅ 설정 관리 (localStorage)
├── indexeddb-storage.ts          # ✅ IndexedDB 스토리지
└── __mocks__/                    # 🧪 테스트용 (선택)
    ├── absurd-sql.ts
    └── absurd-sql-backend.ts
```

### 2.2 UI 컴포넌트 (15개 파일)

**복사 경로**: `statistical-platform/components/rag/` → `your-project/components/rag/`

```
components/rag/
├── rag-assistant-compact.tsx         # ✅ 전체 채팅 UI (메인!)
├── rag-chat-interface.tsx            # ✅ 채팅 인터페이스
├── file-uploader.tsx                 # ✅ 파일 업로드
├── docling-setup-dialog.tsx          # ✅ Docling 설정
├── chat-sources-display.tsx          # ✅ 참조 문서 표시
├── chat-header-menu.tsx              # ✅ 채팅 헤더 메뉴
├── document-manager.tsx              # ✅ 문서 관리 (CRUD)
├── vector-store-selector.tsx         # ✅ Vector Store 선택
├── model-settings.tsx                # ✅ 모델 설정
├── session-history-dropdown.tsx      # ✅ 채팅 히스토리
├── session-favorites-dropdown.tsx    # ✅ 즐겨찾기
└── environment-indicator.tsx         # ✅ 환경 표시 (Vercel/Local)
```

### 2.3 API Routes (Next.js)

**복사 경로**: `statistical-platform/app/api/rag/` → `your-project/app/api/rag/`

```
app/api/rag/
├── stream/route.ts               # ✅ 스트리밍 답변 API
├── parse-file/route.ts           # ✅ 파일 파싱 API (Docling)
└── supported-formats/route.ts    # ✅ 지원 포맷 조회 API
```

### 2.4 정적 파일

**복사 경로**: `statistical-platform/public/` → `your-project/public/`

```
public/
├── sql-wasm/                     # ✅ SQLite WASM (필수!)
│   ├── sql-wasm.wasm             # 14MB
│   └── sql-wasm.js
└── rag-data/                     # ✅ Vector Store DB (예시)
    ├── vector-qwen3-embedding-0.6b.db  # 111개 문서 (선택)
    └── vector-stores.json              # 메타데이터
```

### 2.5 빌드 스크립트

**복사 경로**: `statistical-platform/scripts/rag/` → `your-project/scripts/rag/`

```
scripts/rag/
├── generate-metadata.js          # ✅ Vector Store 메타데이터 생성
├── verify-stores.js              # ✅ DB 무결성 검증
└── semantic-rechunk.ts           # ✅ 의미 기반 재청킹 (선택)
```

---

## 3. 의존성 패키지

### 3.1 런타임 의존성 (dependencies)

```json
{
  "dependencies": {
    // ===== RAG 핵심 =====
    "@jlongster/sql.js": "^1.10.3",        // SQLite WASM (브라우저)
    "absurd-sql": "^0.0.54",                // IndexedDB 백엔드
    "@langchain/community": "^1.0.3",       // Langchain 통합
    "@langchain/core": "^1.0.5",
    "@langchain/ollama": "^1.0.1",          // Ollama 연동
    "@langchain/textsplitters": "^1.3.0",   // 문서 청킹

    // ===== 파일 파싱 =====
    "hwp.js": "^0.0.3",                     // 한글 파일 (선택)
    "node-hwp": "^0.1.0-alpha",             // 한글 파일 타입

    // ===== Markdown 렌더링 =====
    "react-markdown": "^9.0.1",
    "remark-math": "^6.0.0",
    "remark-gfm": "^4.0.0",
    "rehype-katex": "^7.0.1",
    "rehype-raw": "^7.0.0",
    "unist-util-visit": "^5.0.0",          // remark-citations 의존

    // ===== UI =====
    "lucide-react": "^0.460.0",            // 아이콘
    "vaul": "^1.1.1"                        // Drawer (모바일)
  }
}
```

### 3.2 개발 의존성 (devDependencies)

```json
{
  "devDependencies": {
    "better-sqlite3": "^12.4.1",           // Node.js 스크립트 전용
    "@types/sql.js": "^1.4.9",             // TypeScript 타입
    "tsx": "^4.19.2"                        // TypeScript 스크립트 실행
  }
}
```

### 3.3 설치 명령어

```bash
# 1. 핵심 RAG 패키지
npm install @jlongster/sql.js absurd-sql
npm install @langchain/community @langchain/core @langchain/ollama @langchain/textsplitters --legacy-peer-deps

# 2. Markdown 렌더링
npm install react-markdown remark-math remark-gfm rehype-katex rehype-raw unist-util-visit

# 3. 파일 파싱 (선택)
npm install hwp.js node-hwp

# 4. UI
npm install lucide-react vaul

# 5. 개발 도구
npm install -D better-sqlite3 @types/sql.js tsx
```

**주의**: `--legacy-peer-deps` 사용 이유는 [RAG_ARCHITECTURE.md](statistical-platform/docs/RAG_ARCHITECTURE.md) 참조

---

## 4. 환경 설정

### 4.1 환경변수 (.env.local)

```bash
# ===== Ollama 설정 =====
NEXT_PUBLIC_OLLAMA_ENDPOINT=http://localhost:11434
NEXT_PUBLIC_OLLAMA_EMBEDDING_MODEL=mxbai-embed-large
NEXT_PUBLIC_OLLAMA_INFERENCE_MODEL=llama3.3:latest

# ===== Vector Store 설정 =====
NEXT_PUBLIC_VECTOR_STORE_ID=qwen3-embedding-0.6b
NEXT_PUBLIC_TOP_K=5

# ===== Docling 설정 (선택) =====
NEXT_PUBLIC_DOCLING_ENDPOINT=http://localhost:8000
```

### 4.2 Next.js 설정 (next.config.mjs)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ===== WASM 지원 =====
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // sql.js WASM 파일 복사
      config.resolve.alias['sql.js'] = '@jlongster/sql.js';

      // WASM 파일 처리
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      };

      // absurd-sql 대체 (브라우저에서만)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },

  // ===== 헤더 설정 (CORS) =====
  async headers() {
    return [
      {
        source: '/api/rag/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 4.3 TypeScript 설정 (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "paths": {
      "@/*": ["./*"],
      "sql.js": ["./node_modules/@jlongster/sql.js"]
    }
  }
}
```

---

## 5. 단계별 이식 가이드

### Step 1: 파일 복사

```bash
# 프로젝트 루트에서 실행 (Windows)
cd d:\Projects\Statistics

# 1. RAG 라이브러리
xcopy statistical-platform\lib\rag your-project\lib\rag /E /I /H /Y

# 2. RAG 컴포넌트
xcopy statistical-platform\components\rag your-project\components\rag /E /I /H /Y

# 3. API Routes
xcopy statistical-platform\app\api\rag your-project\app\api\rag /E /I /H /Y

# 4. 정적 파일
xcopy statistical-platform\public\sql-wasm your-project\public\sql-wasm /E /I /H /Y
xcopy statistical-platform\public\rag-data your-project\public\rag-data /E /I /H /Y

# 5. 빌드 스크립트
xcopy statistical-platform\scripts\rag your-project\scripts\rag /E /I /H /Y
```

**Linux/Mac**:
```bash
cp -r statistical-platform/lib/rag your-project/lib/rag
cp -r statistical-platform/components/rag your-project/components/rag
cp -r statistical-platform/app/api/rag your-project/app/api/rag
cp -r statistical-platform/public/sql-wasm your-project/public/sql-wasm
cp -r statistical-platform/public/rag-data your-project/public/rag-data
cp -r statistical-platform/scripts/rag your-project/scripts/rag
```

---

### Step 2: 패키지 설치

```bash
cd your-project

# 의존성 설치 (3.3 참조)
npm install @jlongster/sql.js absurd-sql
npm install @langchain/community @langchain/core @langchain/ollama @langchain/textsplitters --legacy-peer-deps
npm install react-markdown remark-math remark-gfm rehype-katex rehype-raw unist-util-visit
npm install lucide-react vaul
npm install -D better-sqlite3 @types/sql.js tsx
```

---

### Step 3: 설정 파일 수정

#### 3-1. `.env.local` 생성

```bash
# your-project/.env.local
NEXT_PUBLIC_OLLAMA_ENDPOINT=http://localhost:11434
NEXT_PUBLIC_OLLAMA_EMBEDDING_MODEL=mxbai-embed-large
NEXT_PUBLIC_OLLAMA_INFERENCE_MODEL=llama3.3:latest
NEXT_PUBLIC_VECTOR_STORE_ID=qwen3-embedding-0.6b
NEXT_PUBLIC_TOP_K=5
```

#### 3-2. `next.config.mjs` 수정

4.2의 설정 추가 (WASM 지원 + CORS)

#### 3-3. `package.json` 스크립트 추가

```json
{
  "scripts": {
    "prebuild": "node scripts/rag/generate-metadata.js",
    "generate:vector-stores": "node scripts/rag/generate-metadata.js",
    "verify:rag": "node scripts/rag/verify-stores.js",
    "setup:sql-wasm": "node scripts/build/download-sql-wasm.js"
  }
}
```

---

### Step 4: Ollama 설치 및 모델 다운로드

```bash
# 1. Ollama 설치
# Windows: https://ollama.com/download
# Mac: brew install ollama
# Linux: curl -fsSL https://ollama.com/install.sh | sh

# 2. 모델 다운로드
ollama pull mxbai-embed-large          # 임베딩 모델 (670MB)
ollama pull llama3.3:latest            # 추론 모델 (4.7GB)

# 3. Ollama 서버 실행 (백그라운드)
ollama serve
```

---

### Step 5: RAG 시스템 빌드

```bash
# 1. SQLite WASM 다운로드 (자동)
npm run setup:sql-wasm

# 2. Vector Store 메타데이터 생성
npm run generate:vector-stores

# 3. DB 무결성 검증
npm run verify:rag

# 4. Next.js 빌드
npm run build
```

---

### Step 6: 테스트

```bash
# 개발 서버 실행
npm run dev

# 브라우저에서 열기
open http://localhost:3000/chatbot
```

**테스트 체크리스트**:
- [ ] 채팅 UI 렌더링
- [ ] Ollama 연결 확인 (우측 상단 상태)
- [ ] 파일 업로드 (PDF/Markdown)
- [ ] 질문 입력 + 스트리밍 답변
- [ ] Citation [1], [2] 표시
- [ ] 참조 문서 클릭

---

## 6. 사용 예제

### 6.1 기본 사용 (컴포넌트)

```tsx
// your-project/app/chatbot/page.tsx
'use client'

import { RAGAssistantCompact } from '@/components/rag/rag-assistant-compact'

export default function ChatbotPage() {
  return (
    <div className="h-screen">
      <RAGAssistantCompact />
    </div>
  )
}
```

### 6.2 프로그래밍 방식 사용 (서비스)

```typescript
import { RAGService, type RAGContext } from '@/lib/rag/rag-service'

// RAG 초기화
const ragService = RAGService.getInstance()
await ragService.initialize({
  vectorStoreId: 'qwen3-embedding-0.6b',
  ollamaEndpoint: 'http://localhost:11434',
  embeddingModel: 'mxbai-embed-large',
  inferenceModel: 'llama3.3:latest',
  topK: 5,
})

// 질문 실행 (일반)
const context: RAGContext = {
  question: '통계 검정력이란?',
  conversationHistory: [],
}
const response = await ragService.query(context)
console.log(response.answer)         // 답변
console.log(response.sources)        // 참조 문서
console.log(response.citedDocIds)    // 인용된 문서 ID

// 질문 실행 (스트리밍)
await ragService.queryStream(
  context,
  (chunk) => console.log(chunk),     // 텍스트 조각
  (sources) => console.log(sources)  // 참조 문서 (1회 호출)
)
```

### 6.3 문서 관리 (CRUD)

```typescript
// 문서 추가
const docId = await ragService.addDocument({
  title: 'T-검정 가이드',
  content: 'T-검정은 두 그룹의 평균을 비교하는 통계 방법입니다...',
  category: 'statistics',
  summary: 'T-검정 소개',
})

// 문서 수정
await ragService.updateDocument(docId, {
  title: 'T-검정 완벽 가이드',
  content: '업데이트된 내용...',
})

// 문서 삭제
await ragService.deleteDocument(docId)

// Vector Store 재구축 (문서 변경 후 필수!)
await ragService.rebuildVectorStore({
  onProgress: (percentage, current, total, docTitle) => {
    console.log(`진행: ${percentage}% (${current}/${total}) - ${docTitle}`)
  },
})
```

---

## 7. 고급 설정

### 7.1 커스텀 Vector Store 생성

```bash
# 1. 문서 준비 (Markdown/PDF)
mkdir -p your-project/public/rag-data/custom-docs

# 2. Vector Store 생성 스크립트 (Python)
pip install langchain langchain-community langchain-ollama

python scripts/rag/create-vector-store.py \
  --input your-project/public/rag-data/custom-docs \
  --output your-project/public/rag-data/vector-custom.db \
  --embedding-model mxbai-embed-large

# 3. 메타데이터 재생성
npm run generate:vector-stores

# 4. 환경변수 변경
# .env.local: NEXT_PUBLIC_VECTOR_STORE_ID=custom
```

### 7.2 Docling 서버 설치 (선택)

```bash
# Docker로 실행
docker run -p 8000:8000 ds4sd/docling-serve:latest

# 환경변수 설정
# .env.local: NEXT_PUBLIC_DOCLING_ENDPOINT=http://localhost:8000
```

### 7.3 멀티 Vector Store 지원

```typescript
// 동적으로 Vector Store 전환
const stores = await getAvailableVectorStores()
console.log(stores) // [{ id: 'qwen3-embedding-0.6b', name: '...' }]

// 특정 Store로 초기화
await ragService.initialize({
  vectorStoreId: stores[0].id,
})
```

---

## 8. 문제 해결

### 8.1 SQLite WASM 로드 실패

**증상**: `Failed to load sql-wasm.wasm`

**해결**:
```bash
# 1. WASM 파일 확인
ls -lh your-project/public/sql-wasm/sql-wasm.wasm  # 14MB

# 2. 다시 다운로드
npm run setup:sql-wasm

# 3. 빌드 캐시 삭제
rm -rf .next
npm run build
```

### 8.2 Ollama 연결 실패

**증상**: `Failed to connect to Ollama`

**해결**:
```bash
# 1. Ollama 서버 확인
curl http://localhost:11434/api/version

# 2. 서버 재시작
ollama serve

# 3. 모델 확인
ollama list

# 4. 환경변수 확인
echo $NEXT_PUBLIC_OLLAMA_ENDPOINT
```

### 8.3 better-sqlite3 충돌

**증상**: `peer dep missing: better-sqlite3@^11`

**해결**:
```bash
# --legacy-peer-deps 사용 (4.1.3 참조)
npm install @langchain/textsplitters --legacy-peer-deps
```

---

## 9. 참고 문서

### 프로젝트 내부 문서
- [RAG_ARCHITECTURE.md](statistical-platform/docs/RAG_ARCHITECTURE.md) - RAG 아키텍처 상세
- [DEPLOYMENT_SCENARIOS.md](statistical-platform/docs/DEPLOYMENT_SCENARIOS.md) - 배포 시나리오
- [dailywork.md](dailywork.md) - 최근 작업 기록

### 외부 문서
- [Langchain Docs](https://js.langchain.com/) - Langchain 공식 문서
- [Ollama Docs](https://ollama.com/docs) - Ollama 사용 가이드
- [sql.js](https://sql.js.org/) - SQLite WASM
- [absurd-sql](https://github.com/jlongster/absurd-sql) - IndexedDB 백엔드

---

## 10. 향후 프로젝트 아이디어

현재 RAG 시스템을 기반으로 한 확장 프로젝트:

### 10.1 Multi-tenant RAG (SaaS)
- **디렉토리**: `future-projects/multi-tenant-rag/`
- **기능**: 사용자별 Vector Store 분리, 권한 관리
- **문서**: [PLAN.md](future-projects/multi-tenant-rag/PLAN.md)

### 10.2 Process Builder + RAG
- **디렉토리**: `future-projects/process-rag/`
- **기능**: 프로세스 자동화 + 문서 기반 추천
- **문서**: [PROCESS_BUILDER_PLAN.md](future-projects/process-rag/PROCESS_BUILDER_PLAN.md)

---

## 🎉 완료!

이제 다른 프로젝트에서 RAG 시스템을 사용할 수 있습니다!

**추가 질문이 있으면 GitHub Issues에 등록하거나 문서를 참조하세요.**

---

**Updated**: 2025-11-21 | **Version**: 1.0 | **Author**: Claude Code