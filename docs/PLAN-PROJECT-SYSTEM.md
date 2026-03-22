# 프로젝트 시스템 & 앱 아키텍처 계획

**작성일**: 2026-03-22
**목적**: BioHub 다중 앱(통계/유전/그래프) 간 프로젝트 공유 아키텍처 설계
**핵심 결정**: Turso DB 중심, 독립 앱 가능

---

## 1. 현황

### 현재 구조

```
BioHub/
└── stats/          ← 하나의 Next.js 앱에 모든 기능
    ├── 통계 분석 (43개 메서드)
    ├── Graph Studio
    ├── Bio-Tools (12개)
    ├── Hub (메인 화면)
    └── 프로젝트 시스템 (localStorage)
```

### 현재 프로젝트 시스템 (localStorage)

| 저장소 | 키 | 내용 |
|--------|-----|------|
| `research_projects` | ResearchProject[] | 프로젝트 메타데이터 |
| `research_project_entity_refs` | ProjectEntityRef[] | 프로젝트-엔티티 연결 |
| `graph_studio_projects` | GraphProject[] | 그래프 차트 스펙 |
| history store | HistoryRecord[] | 분석 결과 |
| chat storage | ChatProject[] | 대화 세션 |

**문제점**:
- 브라우저 하나에서만 접근 (동기화 불가)
- 용량 제한 (~5-10MB)
- 앱 분리 시 공유 불가 (same-origin 제약)
- 사용자 인증/데이터 보호 없음

---

## 2. 목표 아키텍처

### 앱 구조

```
BioHub/
├── apps/
│   ├── stats/          ← 통계 분석 + Bio-Tools
│   ├── genetics/       ← 유전적 종 판별 (신규)
│   ├── graph-studio/   ← 데이터 시각화 (stats에서 분리)
│   └── hub/            ← 프로젝트 허브 + 메인 (미래)
├── packages/
│   ├── ui/             ← 공유 shadcn/ui 컴포넌트
│   ├── db/             ← 공유 Turso 스키마 + 클라이언트
│   └── types/          ← 공유 타입 (프로젝트, 엔티티)
├── workers/            ← Cloudflare Workers API
├── docs/
├── pnpm-workspace.yaml
└── turbo.json
```

### 데이터 흐름

```
stats ──┐                          ┌── 프로젝트 목록
genetics ┼── Workers API ── Turso ──┼── 분석 결과
graph   ──┘    (공유)      (공유)   ├── 그래프
hub ──────┘                        └── 사용자 데이터
```

모든 앱이 같은 Turso DB에 접근 → 앱 분리 여부와 무관하게 프로젝트 공유 가능.

### 파일 저장

```
Turso/D1: 구조화 데이터 (프로젝트, 결과, 메타데이터)
R2: 대용량 파일 (FASTA, CSV, 이미지, PDF 보고서)
KV: 세션 상태, 캐시
```

> 상세: [PLAN-CLOUDFLARE-BACKEND.md](PLAN-CLOUDFLARE-BACKEND.md) — R2/KV 활용 계획

---

## 3. Turso DB 스키마

### 참고: DB 선택 — Turso vs D1

| | Turso (현재 선택) | D1 (Cloudflare 네이티브) |
|---|---|---|
| Workers 연동 | 외부 HTTP 호출 | 네이티브 바인딩 (더 빠름) |
| 기존 프로젝트 | Kemi에서 사용 중 | PLAN-CLOUDFLARE-BACKEND.md |
| Drizzle 지원 | O | O |
| 무료 | 500 DB, 9GB | 5GB |

> **미결정**: 둘 다 SQLite 기반이라 스키마 동일. Drizzle 어댑터만 교체하면 전환 가능.
> 구현 시 결정하되, 어댑터 패턴([PLAN-CLOUDFLARE-BACKEND.md](PLAN-CLOUDFLARE-BACKEND.md) StorageAdapter)으로 추상화.

### 3-1. 사용자

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- 'user_' prefix
  email TEXT UNIQUE,             -- NULL 허용 (MVP: UUID만, 이후 OAuth 연결)
  name TEXT,
  auth_provider TEXT,            -- NULL | 'kakao' | 'naver' | 'google'
  created_at INTEGER NOT NULL,   -- unix ms
  updated_at INTEGER NOT NULL
);
```

### 3-2. 프로젝트

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,            -- 'proj_' prefix
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'archived'
  primary_domain TEXT,            -- 'general' | 'biology' | 'marine' | ...
  tags TEXT,                      -- JSON array
  paper_config TEXT,              -- JSON (title, authors, language, journal)
  presentation TEXT,              -- JSON (emoji, color)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
```

### 3-3. 프로젝트 엔티티 참조 (기존 ProjectEntityRef 확장)

```sql
CREATE TABLE project_entity_refs (
  id TEXT PRIMARY KEY,            -- 'pref_' prefix
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_kind TEXT NOT NULL,      -- 'analysis' | 'figure' | 'blast-result' | 'draft' | ...
  entity_id TEXT NOT NULL,
  label TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  UNIQUE(project_id, entity_kind, entity_id)
);

CREATE INDEX idx_pref_project ON project_entity_refs(project_id);
```

### 3-4. 분석 결과 (통계)

```sql
CREATE TABLE analysis_results (
  id TEXT PRIMARY KEY,            -- 'ar_' prefix
  user_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  method_id TEXT NOT NULL,        -- statistical-methods.ts ID
  method_name TEXT,
  result_json TEXT NOT NULL,      -- 전체 AnalysisResult JSON
  summary TEXT,                   -- 한줄 요약
  ai_interpretation TEXT,
  apa_format TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_ar_user ON analysis_results(user_id);
CREATE INDEX idx_ar_project ON analysis_results(project_id);
```

### 3-5. BLAST 결과 (유전 분석)

```sql
CREATE TABLE blast_results (
  id TEXT PRIMARY KEY,            -- 'br_' prefix
  user_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  sequence_hash TEXT NOT NULL,    -- md5(sequence) — 캐시 조회 키
  sequence TEXT,                  -- 원본 서열 (재확인용, 대형 서열은 R2에 저장)
  marker TEXT NOT NULL,           -- 'COI' | 'CytB' | '16S' | ...
  sequence_length INTEGER,
  gc_content REAL,
  ambiguous_count INTEGER,
  api_source TEXT NOT NULL,       -- 'ncbi' | 'ebi'
  status TEXT NOT NULL,           -- 'high' | 'ambiguous' | 'low' | 'failed' | 'no_hit'
  top_hits TEXT NOT NULL,         -- JSON array [{species, identity, accession, evalue}]
  decision_reason TEXT,           -- Decision Engine 설명
  recommended_markers TEXT,       -- JSON array ["D-loop", "ITS1"]
  taxon_alert TEXT,               -- 분류군 맞춤 안내 (참치, 양서류 등)
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_br_user ON blast_results(user_id);
CREATE INDEX idx_br_project ON blast_results(project_id);
CREATE INDEX idx_br_cache ON blast_results(sequence_hash, marker);
CREATE INDEX idx_br_expires ON blast_results(expires_at);
```

### 3-6. 그래프/차트

```sql
CREATE TABLE graph_projects (
  id TEXT PRIMARY KEY,            -- 'gp_' prefix
  user_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  analysis_id TEXT,               -- 연결된 분석 결과 ID (ar_ 또는 br_)
  name TEXT NOT NULL,
  chart_spec TEXT NOT NULL,       -- ECharts ChartSpec JSON
  edit_history TEXT,              -- JSON array of AiEditResponse
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_gp_user ON graph_projects(user_id);
CREATE INDEX idx_gp_project ON graph_projects(project_id);
```

### 3-7. BLAST 캐시 (사용자 무관, 전역)

```sql
CREATE TABLE blast_cache (
  sequence_hash TEXT NOT NULL,    -- md5(sequence)
  marker TEXT NOT NULL,
  api_source TEXT NOT NULL,       -- 'ncbi' | 'ebi'
  result_json TEXT NOT NULL,      -- API 응답 원본
  cached_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (sequence_hash, marker, api_source)
);

CREATE INDEX idx_bc_expires ON blast_cache(expires_at);
```

> **blast_results vs blast_cache**:
> - `blast_cache`: 전역 캐시. 같은 서열+마커 조합이면 누구든 재사용. 만료 시 삭제.
> - `blast_results`: 사용자별 분석 기록. 프로젝트에 연결. 영구 보관.

---

## 4. Workers API 엔드포인트

### 4-1. 프로젝트

```
GET    /api/projects              ← 내 프로젝트 목록
POST   /api/projects              ← 프로젝트 생성
GET    /api/projects/:id          ← 프로젝트 상세 (엔티티 포함)
PATCH  /api/projects/:id          ← 프로젝트 수정
DELETE /api/projects/:id          ← 프로젝트 삭제 (CASCADE)
```

### 4-2. 유전 분석

```
POST   /api/blast/analyze         ← 서열 제출 (캐시 체크 → BLAST → Decision Engine)
GET    /api/blast/status/:rid     ← BLAST 폴링 (RID 상태 확인)
GET    /api/blast/results/:id     ← 저장된 결과 조회
```

### 4-3. 통계 분석

```
POST   /api/analysis/save         ← 분석 결과 저장
GET    /api/analysis/history      ← 내 분석 이력
```

### 4-4. 그래프

```
POST   /api/graphs                ← 그래프 저장
GET    /api/graphs/:id            ← 그래프 조회
PATCH  /api/graphs/:id            ← 그래프 수정
```

---

## 5. 기존 localStorage → Turso 마이그레이션

### 전략: 점진적 전환

```
Phase A: Turso 스키마 생성 + Workers API
Phase B: genetics는 처음부터 Turso 사용
Phase C: stats 신규 저장은 Turso, 기존은 localStorage 유지
Phase D: 기존 localStorage 데이터 → Turso 일괄 마이그레이션
Phase E: localStorage 코드 제거
```

### 기존 타입 → Turso 매핑

| 기존 (localStorage) | Turso 테이블 | 변환 |
|---------------------|-------------|------|
| `ResearchProject` | `projects` | 거의 동일, user_id 추가 |
| `ProjectEntityRef` | `project_entity_refs` | 동일 |
| `GraphProject` | `graph_projects` | chartSpec만 저장 (DataPackage 제외는 동일) |
| `HistoryRecord` | `analysis_results` | result → result_json |
| `ChatProject` + `ChatSession` | 미정 (chat 테이블) | 구현 시 설계 |
| 신규 | `blast_results` | genetics 전용 |
| 신규 | `blast_cache` | 전역 캐시 |

### entityKind 확장

기존:
```typescript
type ProjectEntityKind =
  | 'analysis' | 'figure' | 'draft' | 'chat-session'
  | 'species-validation' | 'legal-status' | 'review-report' | 'data-asset'
```

추가:
```typescript
type ProjectEntityKind =
  | ... 기존 ...
  | 'blast-result'       // 유전 분석 BLAST 결과
  | 'sequence-data'      // FASTA 서열 데이터
```

---

## 6. 사용자 시나리오

### "동해 참치 종 판별 연구" 프로젝트

```
1. hub에서 프로젝트 생성: "동해 참치 종 판별 연구"
   → Turso: projects 테이블에 저장

2. genetics에서 시료1 COI 분석
   → Workers: /api/blast/analyze
   → Turso: blast_cache (전역) + blast_results (사용자)
   → Turso: project_entity_refs (blast-result 연결)

3. genetics에서 시료1 D-loop 추가 분석 (COI 모호 결과 후)
   → 동일 플로우, 같은 프로젝트에 연결

4. stats에서 유전 거리 통계
   → blast_results에서 데이터 로드
   → Turso: analysis_results에 저장
   → project_entity_refs (analysis 연결)

5. graph-studio에서 계통수 그래프
   → blast_results + analysis_results에서 데이터 로드
   → Turso: graph_projects에 저장
   → project_entity_refs (figure 연결)

6. hub에서 프로젝트 열기 → 모든 결과 한눈에
   → project_entity_refs로 모든 엔티티 조회
   → 보고서 자동 생성
```

---

## 7. 모노레포 전환 단계

### 현실적 순서

```
지금:
BioHub/
├── stats/              ← 기존 앱 (그대로 유지)
├── genetics/           ← TODO + 문서만
└── docs/

Phase A (genetics MVP):
BioHub/
├── stats/              ← 기존 유지
├── genetics/           ← 독립 Next.js 앱 생성
├── workers/            ← Cloudflare Workers (공유 API)
├── packages/
│   ├── db/             ← Turso 스키마 + Drizzle
│   └── types/          ← 공유 타입 (ProjectEntityKind 등)
├── docs/
├── pnpm-workspace.yaml
└── turbo.json

Phase B (통합):
BioHub/
├── apps/
│   ├── stats/          ← stats → apps/stats로 이동
│   ├── genetics/
│   ├── graph-studio/   ← stats에서 분리
│   └── hub/            ← 프로젝트 허브
├── packages/
│   ├── ui/             ← 공유 UI 추출
│   ├── db/
│   └── types/
├── workers/
└── docs/
```

### Phase A에서 최소 필요 작업

1. `pnpm-workspace.yaml` 생성
2. `packages/types/` — 공유 타입 (ProjectEntityKind, ResearchProject 등)
3. `packages/db/` — Turso 스키마 (Drizzle ORM)
4. `workers/` — API 엔드포인트 (blast/analyze, projects CRUD)
5. `genetics/` — Next.js 앱 (서열 입력 → BLAST → Decision Engine)

---

## 8. 인증

### MVP (단순)

```
사용자 구분 없이 브라우저 세션 기반
└── 로컬 UUID 생성 → localStorage에 저장
└── API 요청 시 헤더에 포함
└── Turso에 user 레코드 자동 생성
```

### 이후 (카카오/네이버/구글)

```
기존 스택 레퍼런스: d:\Projects\dev-playbook\stack\auth.md
└── OAuth 2.0 (카카오/네이버/구글)
└── Cloudflare Workers에서 세션 관리
└── 기존 UUID 사용자 → 계정 연결 마이그레이션
```

---

## 9. 미결정 사항

| # | 항목 | 선택지 | 결정 시점 |
|---|------|--------|----------|
| 1 | **DB 선택: Turso vs D1** | Turso (기존) vs D1 (Workers 네이티브) | Phase A 시작 시. 어댑터 패턴으로 추상화 |
| 2 | Graph Studio 분리 시기 | Phase A에서 같이 vs Phase B | Phase A 완료 후 |
| 3 | 인증 도입 시기 | genetics MVP vs 이후 | MVP에서는 UUID |
| 4 | DataPackage (원시 데이터) 저장 | DB에 저장 vs R2 vs 사용자 재업로드 | 용량/비용 고려 후 |
| 5 | 오프라인 지원 (Tauri) | IndexedDB 동기화 vs DB 직접 | Tauri 구현 시 |
