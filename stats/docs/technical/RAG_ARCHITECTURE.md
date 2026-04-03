# RAG 시스템 아키텍처

**목적**: RAG 시스템 구조와 의존성을 명확히 문서화하여 혼동 방지

**작성일**: 2025-11-18
**최종 수정**: 2025-11-18

---

## 📋 목차

1. [전체 아키텍처](#전체-아키텍처)
2. [SQLite 의존성 구조](#sqlite-의존성-구조)
3. [패키지 역할 분리](#패키지-역할-분리)
4. [의존성 충돌 해결](#의존성-충돌-해결)
5. [FAQ](#faq)

---

## 1. 전체 아키텍처

### 1.1 시스템 구성

```
📦 Statistical Platform RAG
│
├── 🌐 브라우저 런타임 (클라이언트)
│   ├── Vector Store: SQLite (sql.js + absurd-sql)
│   ├── 임베딩 생성: Ollama (로컬 서버)
│   └── 검색/답변: Langchain
│
├── 🛠️ 빌드/개발 스크립트 (Node.js)
│   ├── generate-metadata.js: 메타데이터 생성
│   └── verify-stores.js: DB 무결성 검증
│
└── 💾 데이터
    ├── public/rag-data/vector-*.db (SQLite 파일)
    └── public/rag-data/vector-stores.json (메타데이터)
```

### 1.2 데이터 흐름

```
사용자 질문
    ↓
[브라우저] RAG Service
    ↓
Ollama (임베딩 생성)
    ↓
sql.js (Vector Store 검색)
    ↓ (IndexedDB에서 로드)
absurd-sql
    ↓
관련 문서 반환
    ↓
Ollama (답변 생성)
    ↓
사용자에게 표시
```

---

## 2. SQLite 의존성 구조

### 2.1 패키지 비교표

| 패키지 | 환경 | 용도 | 우리 프로젝트 사용 |
|--------|------|------|-------------------|
| **sql.js** (@jlongster/sql.js) | 브라우저 | SQLite WASM (클라이언트) | ✅ 런타임 (벡터 검색) |
| **absurd-sql** | 브라우저 | IndexedDB 백엔드 | ✅ 런타임 (영구 저장) |
| **better-sqlite3** | Node.js | SQLite 네이티브 바인딩 | ✅ 빌드 스크립트만 |

### 2.2 런타임 vs 빌드타임 분리

#### 🌐 런타임 (브라우저)

**파일**: `lib/rag/utils/sql-indexeddb.ts`

```typescript
// 브라우저에서 실행되는 코드
import initSqlJs from '@jlongster/sql.js'      // ✅ WASM SQLite
import { SQLiteFS } from 'absurd-sql'          // ✅ IndexedDB 백엔드
import IndexedDBBackend from 'absurd-sql/dist/indexeddb-backend'

// better-sqlite3는 사용하지 않음 ❌
```

**동작**:
1. `public/sql-wasm/sql-wasm.wasm` 로드 (WASM 파일)
2. `public/rag-data/vector-*.db` 다운로드 (첫 방문 시)
3. IndexedDB에 저장 (재방문 시 즉시 로드)

#### 🛠️ 빌드타임 (Node.js)

**파일**: `scripts/rag/generate-metadata.js`

```javascript
// Node.js에서 실행되는 스크립트
const Database = require('better-sqlite3')  // ✅ Node.js 네이티브

// sql.js는 사용하지 않음 ❌
```

**동작**:
1. `public/rag-data/` 폴더 스캔
2. 각 `vector-*.db` 파일 읽기 (better-sqlite3 사용)
3. 메타데이터 추출 (문서 개수, 청크 개수, 모델명 등)
4. `vector-stores.json` 생성

---

## 3. 패키지 역할 분리

### 3.1 dependencies (런타임)

```json
{
  "@jlongster/sql.js": "^1.10.3",        // 브라우저 SQLite
  "absurd-sql": "^0.0.54",                // IndexedDB 백엔드
  "@langchain/community": "^1.0.3",       // Langchain 통합
  "@langchain/core": "^1.0.5",
  "@langchain/ollama": "^1.0.1",
  "@langchain/textsplitters": "^x.x.x",   // 문서 청킹
  "hwp.js": "^0.0.3",                     // 한글 파일 파싱
  "node-hwp": "^0.1.0-alpha"
}
```

**특징**:
- ✅ 브라우저에서 실행
- ✅ better-sqlite3 없음 (Node.js 전용이므로)

### 3.2 devDependencies (빌드/개발)

```json
{
  "better-sqlite3": "^12.4.1",  // Node.js 스크립트 전용
  "@types/sql.js": "^1.4.9"
}
```

**특징**:
- ✅ Node.js에서만 실행
- ✅ 빌드 타임에만 필요

---

## 4. 의존성 충돌 해결

### 4.1 발생한 충돌 (2025-11-18)

**문제**:
```
@langchain/community@1.0.3 요구사항:
  peerOptional better-sqlite3@">=9.4.0 <12.0.0"

현재 설치:
  better-sqlite3@12.4.1

충돌: 12.4.1은 범위 밖!
```

### 4.2 해결 방법

**선택**: `--legacy-peer-deps` 사용

```bash
npm install @langchain/textsplitters --legacy-peer-deps
```

**안전한 이유**:

1. **peerOptional** (선택적 의존성)
   - @langchain/community는 better-sqlite3 없어도 작동
   - Node.js 환경에서만 선택적으로 사용

2. **런타임 분리**
   - 브라우저: sql.js 사용 (better-sqlite3 무관)
   - Node.js 스크립트: better-sqlite3@12.4.1 직접 사용

3. **실제 동작 검증**
   - ✅ TypeScript 컴파일: 0 errors
   - ✅ 빌드 성공: `npm run build`
   - ✅ 메타데이터 생성: `generate-metadata.js` 정상
   - ✅ 런타임: Vector Store 검색 정상

### 4.3 대안 (미사용)

#### 옵션 1: better-sqlite3 다운그레이드
```bash
npm install better-sqlite3@11.10.0
npm install @langchain/textsplitters
```
- ✅ 충돌 완전 해결
- 🟡 12.x 신기능 사용 불가
- 🟡 빌드 스크립트 영향 가능

#### 옵션 2: --force (비권장)
```bash
npm install @langchain/textsplitters --force
```
- ❌ 기존 패키지 강제 변경
- ❌ 다른 패키지 깨질 위험

---

## 5. FAQ

### Q1. 왜 sql.js와 better-sqlite3 둘 다 필요한가?

**A**: 실행 환경이 다르기 때문입니다.

```
sql.js          →  브라우저 (WASM)    →  Vector Store 검색
better-sqlite3  →  Node.js (네이티브)  →  메타데이터 생성
```

브라우저는 네이티브 바인딩을 못 쓰고, Node.js는 WASM이 불필요합니다.

---

### Q2. absurd-sql의 역할은?

**A**: sql.js가 생성한 SQLite DB를 IndexedDB에 영구 저장합니다.

```
sql.js (메모리)
    ↓
absurd-sql (IndexedDB 백엔드)
    ↓
브라우저 새로고침 후에도 데이터 유지
```

absurd-sql 없으면 새로고침마다 DB 다운로드 필요.

---

### Q3. better-sqlite3 버전 충돌이 문제가 안 되는 이유?

**A**: 런타임에서 사용하지 않기 때문입니다.

```
브라우저 런타임:
  sql.js 사용       ✅
  better-sqlite3    ❌ (번들에 포함 안 됨)

Node.js 스크립트:
  better-sqlite3    ✅ (12.4.1 직접 사용)
  @langchain 무관   ✅ (브라우저 코드만 @langchain 사용)
```

---

### Q4. @langchain/community는 better-sqlite3를 어떻게 사용?

**A**: Node.js 환경에서만 선택적으로 사용합니다.

```typescript
// @langchain/community 내부 (추정)
export class SqliteSaver {
  constructor() {
    if (typeof window === 'undefined') {
      // Node.js 환경
      const Database = require('better-sqlite3')  // ← 여기서만 사용
    } else {
      // 브라우저 환경
      throw new Error('Use sql.js instead')
    }
  }
}
```

우리는 브라우저에서만 RAG 사용 → better-sqlite3 로드 안 됨.

---

### Q5. 향후 @langchain/community 업데이트 시 대응?

**A**: better-sqlite3가 필수로 변경되면 다운그레이드합니다.

```bash
# 만약 peerOptional → peer로 변경되면
npm install better-sqlite3@11.10.0
```

현재는 **peerOptional**이므로 경고만 뜨고 정상 작동합니다.

---

## 📚 관련 파일

### 핵심 파일

```
stats/
├── lib/rag/
│   ├── utils/sql-indexeddb.ts          # ✅ sql.js 초기화
│   ├── providers/ollama-provider.ts    # ✅ RAG 서비스
│   └── rag-service.ts                  # ✅ RAG 진입점
│
├── scripts/rag/
│   ├── generate-metadata.js            # ✅ better-sqlite3 사용
│   └── verify-stores.js                # ✅ better-sqlite3 사용
│
└── public/
    ├── sql-wasm/
    │   ├── sql-wasm.wasm               # ✅ SQLite WASM
    │   └── sql-wasm.js
    └── rag-data/
        ├── vector-*.db                 # ✅ Vector Store DB
        └── vector-stores.json          # ✅ 메타데이터
```

### 의존성 설정

```
package.json
├── dependencies
│   ├── @jlongster/sql.js               # 브라우저 SQLite
│   ├── absurd-sql                      # IndexedDB 백엔드
│   ├── @langchain/community            # Langchain (peerOptional)
│   └── @langchain/textsplitters        # 문서 청킹
│
└── devDependencies
    └── better-sqlite3                  # Node.js 스크립트
```

---

## 🔄 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|----------|--------|
| 2025-11-18 | 초기 작성 (better-sqlite3 충돌 해결 기록) | Claude Code |

---

## 📌 참고 문서

- [DEPLOYMENT_SCENARIOS.md](DEPLOYMENT_SCENARIOS.md) - 배포 시나리오 (오프라인/온라인)
- [RAG_ENDPOINT_LOGIC_VALIDATION.md](RAG_ENDPOINT_LOGIC_VALIDATION.md) - RAG 엔드포인트 검증
- [sql.js 공식 문서](https://sql.js.org/)
- [absurd-sql GitHub](https://github.com/jlongster/absurd-sql)
- [better-sqlite3 문서](https://github.com/WiseLibs/better-sqlite3)
