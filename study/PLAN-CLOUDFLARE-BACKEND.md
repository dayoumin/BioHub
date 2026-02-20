# Cloudflare Workers Backend 계획 (KV / R2 / D1)

**작성일**: 2026-02-06
**상태**: 계획 수립 (미착수)
**브랜치**: `feature/cloudflare-backend` (별도 생성 예정)
**의존성**: Phase 10-0 (Cloudflare Pages 배포) 완료 후

---

## 개요

### 현재 아키텍처 (순수 클라이언트)

```
브라우저 → Next.js (정적) → Pyodide (브라우저 내 Python) → 결과 표시
                                                           ↓
                                                        (소멸)
```

**문제점**:
- 분석 결과가 브라우저 닫으면 사라짐
- CSV 파일을 매번 재업로드
- Smart Flow 진행 상태 휘발
- 사용자별 설정/히스토리 없음

### 개선 아키텍처 (Workers 백엔드 추가)

```
브라우저 → Cloudflare Pages (정적 파일)
        → Cloudflare Workers (/api/*)
           ├── D1: 분석 히스토리, 사용자 설정
           ├── R2: CSV/데이터 파일 보관
           ├── KV: 세션 상태, LLM 응답 캐시
           └── 기존: /api/llm (OpenRouter 프록시)
```

---

## 배포 시나리오별 아키텍처

### 시나리오 1: Cloudflare 클라우드 (일반 사용자)

| 구성 요소 | 서비스 | 비용 ($5 플랜) |
|-----------|--------|---------------|
| 정적 파일 | Cloudflare Pages | 무료 (포함) |
| API 서버 | Cloudflare Workers | $5/월 (포함) |
| 관계형 DB | D1 (SQLite) | 무료 (5GB) |
| 파일 저장 | R2 (S3 호환) | 무료 (10GB) |
| 캐시/세션 | KV | 무료 (포함) |

### 시나리오 2: 내부망/폐쇄망 (오프라인 환경)

Cloudflare 서비스를 오픈소스 대체재로 교체:

| Cloudflare | 내부망 대체 | 비고 |
|------------|-----------|------|
| Pages | Nginx / Caddy | 정적 파일 서빙 |
| Workers | Node.js / Bun | Hono 프레임워크 (Workers 호환) |
| D1 | SQLite (better-sqlite3) | 동일 SQL, 마이그레이션 공유 |
| R2 | MinIO (S3 호환) | 또는 로컬 파일시스템 |
| KV | Redis / Map (인메모리) | 또는 SQLite 테이블 |

**핵심 전략: 어댑터 패턴**

```typescript
// 공통 인터페이스
interface StorageAdapter {
  // D1 대체
  db: {
    query<T>(sql: string, params?: unknown[]): Promise<T[]>
    execute(sql: string, params?: unknown[]): Promise<void>
  }
  // R2 대체
  files: {
    put(key: string, data: ArrayBuffer): Promise<void>
    get(key: string): Promise<ArrayBuffer | null>
    delete(key: string): Promise<void>
    list(prefix?: string): Promise<string[]>
  }
  // KV 대체
  cache: {
    get(key: string): Promise<string | null>
    put(key: string, value: string, ttl?: number): Promise<void>
    delete(key: string): Promise<void>
  }
}

// Cloudflare 구현
class CloudflareAdapter implements StorageAdapter { ... }

// 내부망 구현
class LocalAdapter implements StorageAdapter { ... }
```

이렇게 하면 Workers 코드를 내부망에서도 그대로 사용 가능.

---

## 서비스별 상세 계획

### 1. D1 (분석 히스토리 + 사용자 설정)

**우선순위**: High (가장 큰 사용성 개선)

#### 스키마

```sql
-- 분석 히스토리
CREATE TABLE analysis_history (
  id TEXT PRIMARY KEY,          -- UUID
  created_at TEXT NOT NULL,     -- ISO 8601
  method_id TEXT NOT NULL,      -- 'anova', 'correlation' 등
  method_name TEXT NOT NULL,    -- '일원분산분석'
  purpose TEXT,                 -- 사용자 입력 목적
  dataset_name TEXT,            -- 'fish_growth.csv'
  dataset_id TEXT,              -- R2 파일 키 (연결)
  variable_config TEXT,         -- JSON: { dependent, factors, ... }
  result_summary TEXT,          -- JSON: { pValue, fStatistic, ... }
  llm_interpretation TEXT,      -- LLM 해석 텍스트
  tags TEXT,                    -- JSON: ['넙치', '사료실험']
  is_starred INTEGER DEFAULT 0  -- 즐겨찾기
);

-- 사용자 설정
CREATE TABLE user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 분석 템플릿 (자주 쓰는 설정 저장)
CREATE TABLE analysis_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  method_id TEXT NOT NULL,
  variable_config TEXT,         -- JSON
  settings TEXT,                -- JSON: { alpha, postHoc, ... }
  created_at TEXT NOT NULL
);
```

#### API 엔드포인트

```
GET    /api/history              → 분석 히스토리 목록 (페이징, 검색)
GET    /api/history/:id          → 특정 분석 상세
POST   /api/history              → 분석 결과 저장
DELETE /api/history/:id          → 분석 삭제
PATCH  /api/history/:id/star     → 즐겨찾기 토글

GET    /api/settings             → 사용자 설정 조회
PUT    /api/settings             → 사용자 설정 저장

GET    /api/templates            → 템플릿 목록
POST   /api/templates            → 템플릿 저장
DELETE /api/templates/:id        → 템플릿 삭제
```

#### 프론트엔드 연동

```typescript
// lib/services/history-client.ts
export async function saveAnalysis(data: AnalysisRecord): Promise<void> {
  // 온라인: Workers API 호출
  // 오프라인: IndexedDB 저장 (폴백)
  if (navigator.onLine && API_BASE) {
    await fetch(`${API_BASE}/api/history`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  } else {
    await idb.put('history', data)
  }
}
```

### 2. R2 (데이터 파일 보관)

**우선순위**: Medium

#### 기능

| 기능 | 설명 |
|------|------|
| 파일 업로드 | CSV 업로드 시 R2에 자동 저장 |
| 파일 목록 | "이전 데이터셋" 드롭다운 |
| 파일 다운로드 | 이전 데이터셋 재사용 |
| 파일 삭제 | 사용자 수동 삭제 |
| 용량 제한 | 개인당 1GB (R2 무료 10GB 내) |

#### API 엔드포인트

```
GET    /api/datasets             → 데이터셋 목록
POST   /api/datasets             → 파일 업로드
GET    /api/datasets/:id         → 파일 다운로드
DELETE /api/datasets/:id         → 파일 삭제
```

#### 저장 구조

```
R2 Bucket: stat-datasets
├── {user-id}/
│   ├── fish_growth_2026-02-06.csv
│   ├── water_quality_2026-02-05.csv
│   └── metadata.json  ← 파일 목록 + 메타정보
```

### 3. KV (세션 캐시)

**우선순위**: Low (D1/R2보다 후순위)

#### 용도

| 키 패턴 | 값 | TTL | 용도 |
|---------|-----|-----|------|
| `session:{id}` | Smart Flow 상태 JSON | 24h | 진행 상태 복원 |
| `llm-cache:{hash}` | LLM 응답 JSON | 7d | 동일 질문 캐시 |
| `config:{key}` | 설정값 | 없음 | 전역 설정 |

---

## 구현 로드맵

### Phase A: 프로젝트 구조 설정 (0.5일)

```
Statics/
├── stats/     ← 기존 프론트엔드
└── workers/                  ← 신규 Workers 프로젝트
    ├── wrangler.toml         ← D1, R2, KV 바인딩
    ├── src/
    │   ├── index.ts          ← Hono 라우터
    │   ├── routes/
    │   │   ├── history.ts    ← 분석 히스토리 API
    │   │   ├── datasets.ts   ← 데이터셋 API
    │   │   └── settings.ts   ← 설정 API
    │   ├── adapters/
    │   │   ├── cloudflare.ts ← CF 바인딩 어댑터
    │   │   └── local.ts      ← 내부망 어댑터
    │   └── schema/
    │       └── migrations/   ← D1 마이그레이션
    ├── package.json
    └── tsconfig.json
```

**기술 스택**:
- [Hono](https://hono.dev/) — 경량 웹 프레임워크 (CF Workers + Node.js 양쪽 실행 가능)
- Wrangler — CF Workers CLI
- better-sqlite3 — 내부망 D1 대체

### Phase B: D1 분석 히스토리 (2일)

1. D1 스키마 생성 + 마이그레이션
2. CRUD API 구현 (Hono)
3. 프론트엔드 `history-client.ts` 작성
4. ResultsActionStep에 "분석 저장" 버튼 추가
5. Smart Flow에 "이전 분석" 목록 UI 추가

### Phase C: R2 데이터셋 보관 (1.5일)

1. R2 버킷 생성
2. 파일 업로드/다운로드 API
3. 프론트엔드 데이터셋 선택 UI
4. 기존 파일 업로드 플로우에 R2 저장 통합

### Phase D: KV 세션 캐시 (1일)

1. Smart Flow 상태 저장/복원
2. LLM 응답 캐시
3. 오프라인 폴백 (IndexedDB)

### Phase E: 내부망 어댑터 (1일)

1. `LocalAdapter` 구현 (SQLite + 로컬 파일 + Map)
2. Docker Compose 구성 (Nginx + Node.js + SQLite)
3. 배포 스크립트

### Phase F: 테스트 + 문서 (1일)

1. Workers API 테스트
2. 프론트엔드 통합 테스트
3. 배포 가이드 (클라우드 / 내부망)

**총 예상 시간: 7일**

---

## 내부망 배포 구성

### Docker Compose (폐쇄망)

```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    image: nginx:alpine
    volumes:
      - ./out:/usr/share/nginx/html    # Next.js 정적 빌드
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    ports:
      - "80:80"

  api:
    build: ./workers
    environment:
      - STORAGE_MODE=local             # local | cloudflare
      - SQLITE_PATH=/data/stats.db
      - FILES_PATH=/data/files
    volumes:
      - ./data:/data                   # 영구 저장
    ports:
      - "8787:8787"
```

### Nginx 설정

```nginx
server {
    listen 80;

    # 정적 파일
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # API 프록시
    location /api/ {
        proxy_pass http://api:8787;
    }
}
```

---

## 비용 분석

### Cloudflare $5/월 플랜

| 서비스 | 무료 한도 | 개인 예상 사용 | 추가 비용 |
|--------|----------|---------------|----------|
| Workers | 10M 요청/월 | ~1만 | $0 |
| D1 읽기 | 25B/월 | ~10만 | $0 |
| D1 쓰기 | 50M/월 | ~1만 | $0 |
| D1 저장 | 5GB | ~100MB | $0 |
| R2 저장 | 10GB | ~2GB | $0 |
| R2 읽기 | 10M/월 | ~5천 | $0 |
| KV 읽기 | 25M/월 | ~10만 | $0 |
| **합계** | | | **$0 (기본료만)** |

### 내부망 (자체 서버)

| 항목 | 사양 | 비고 |
|------|------|------|
| 서버 | 아무 Linux 서버 | 기존 서버 활용 가능 |
| Docker | 기본 설치 | 메모리 512MB 이상 |
| 디스크 | 1GB+ | SQLite + 파일 |
| 추가 비용 | **$0** | 오픈소스만 사용 |

---

## 기술 선택 근거

### Hono 프레임워크

- Cloudflare Workers에서 네이티브 실행
- Node.js/Bun에서도 동일 코드 실행 (내부망)
- Express 대비 10배 빠름, 번들 크기 14KB
- TypeScript 네이티브 지원

### 어댑터 패턴 (내부망 호환)

- 비즈니스 로직은 `StorageAdapter` 인터페이스에만 의존
- 배포 환경에 따라 `CloudflareAdapter` 또는 `LocalAdapter` 주입
- Workers 코드 변경 없이 내부망 배포 가능

### D1 (SQLite 기반)

- 내부망에서 better-sqlite3로 동일 스키마 사용
- SQL 마이그레이션 파일 공유 가능
- 복잡한 쿼리 지원 (JOIN, GROUP BY 등)

---

## 브랜치 전략

```
main
 └── feature/cloudflare-backend    ← Workers + 어댑터 + 프론트엔드 API 클라이언트
      ├── Phase A: 프로젝트 구조
      ├── Phase B: D1 히스토리
      ├── Phase C: R2 데이터셋
      ├── Phase D: KV 캐시
      ├── Phase E: 내부망 어댑터
      └── Phase F: 테스트
```

**현재 `feature/smart-flow-llm-input` 브랜치와 독립적**:
- LLM 기능은 프론트엔드 변경
- Workers 백엔드는 별도 프로젝트 (`workers/`)
- 충돌 가능성 낮음 (프론트엔드 API 클라이언트 추가만)
- LLM 브랜치 머지 후 `main`에서 분기 권장

---

## 참고 자료

- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [D1 문서](https://developers.cloudflare.com/d1/)
- [R2 문서](https://developers.cloudflare.com/r2/)
- [KV 문서](https://developers.cloudflare.com/kv/)
- [Hono 프레임워크](https://hono.dev/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
