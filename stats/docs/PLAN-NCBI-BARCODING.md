# NCBI BLAST + DNA Barcoding + 학명 검증 통합 계획

**작성일**: 2026-03-20
**상태**: 계획 수립
**상위 문서**: [PLAN-BIO-TOOLS-ARCHITECTURE.md](PLAN-BIO-TOOLS-ARCHITECTURE.md) (S2 단계)
**관련**: Bio-Tools Phase, 결과 정리, 학명 유효성 검증

---

## 목표

서열 입력 → 종 동정 → 학명 검증 → 계통수 → 결과 정리(문서 편집)까지 **한 곳에서 완결**되는 워크플로우.
현재 연구자가 NCBI 웹 → MEGA → 엑셀 → 워드를 왔다 갔다 하는 과정을 BioHub 안에서 해결.

---

## 핵심 워크플로우

```
[1] 서열 입력 (FASTA 붙여넣기 / 파일)
     ↓
[2] 종 동정 실행 — 사용자가 선택 (NCBI / BOLD / 둘 다)
     ├─ NCBI BLAST (범용 서열 DB, 모든 생물)
     └─ BOLD Systems v5 (바코딩 특화 DB, COI 등 표준 마커)
     ※ "둘 다" 선택 시 병행 실행 → 결과 통합 표시
     ※ 응답 시간: 수십 초~수 분 → 진행 상태 표시 + 폴링
     ↓
[3] 결과 표시
     ├─ 매칭 종 리스트 (유사도 %, E-value, 학명)
     ├─ 분류 체계 (계→문→강→목→과→속→종)
     └─ 참조 서열 (계통수용)
     ↓
[4] 학명 검증 (자동 실행)
     ├─ species-checker API 호출 (캐시 → WoRMS → CoL → NCBI Taxonomy)
     ├─ 틀린 학명 → 유효 학명 자동 교정
     └─ 국명(한국명) 매핑 (species-checker DB: nibr_species, mbris_species)
     ↓
[5] AI 해석 (OpenRouter — 개발 중 무료, 배포 시 유료 티어)
     ├─ BLAST/BOLD 결과 요약 + 종 동정 신뢰도 해석
     ├─ 유전적 거리 기반 종/아종 판단
     └─ 연구 맥락에 맞는 해석 (수산/생태)
     ↓
[6] 시각화 (선택)
     ├─ 계통수 (매칭된 종들 간 관계)
     ├─ 유사도 히트맵
     └─ 분류 체계 트리
     ↓
[7] 결과 정리 → 문서 편집에 바로 삽입
     ├─ BLAST/BOLD 결과 표 (종명, 유사도, E-value, Accession)
     ├─ 학명 검증 표 (입력 학명 → 유효 학명 → 국명)
     ├─ 계통수 이미지
     ├─ AI 해석 텍스트
     └─ 전체 복사 / DOCX 다운로드
```

### 국명(한국명) 데이터 소스

**기존 `scientific-name-validator` 프로젝트의 Turso DB 활용**:
- `nibr_species` (~30만 rows) — 국립생물자원관 국명 DB
- `mbris_species` (~1.6만 rows) — 해양생물 DB
- BLAST/BOLD 결과의 학명 → DB 조회 → 국명 자동 매핑
- 법적 보호종 여부도 자동 확인 (멸종위기, CITES, 생태계교란 등)

---

## Phase 구분

### Phase 1: NCBI BLAST + BOLD Systems 종 동정 (핵심)

**라우트**: `/bio-tools/barcoding`

#### 1-1. Worker 프록시 추가

**파일**: `src/worker.ts`

기존 `/api/ai/*` 패턴을 확장하여 `/api/bio/*` 추가:

```
/api/bio/blast/submit   → NCBI BLAST 제출 (RID 발급)
/api/bio/blast/status   → 결과 상태 확인 (폴링)
/api/bio/blast/results  → 결과 파싱 (XML → JSON)
/api/bio/bold/validate  → BOLD 서열 검증
/api/bio/bold/query     → BOLD 검색 제출
/api/bio/bold/download  → BOLD 결과 다운로드
/api/bio/entrez         → 서열 다운로드 (GenBank)
/api/bio/taxonomy       → 분류 체계 조회
```

**보안**: 기존 패턴 재사용 (Origin 검증, rate limit, body size 제한)

#### 1-2. BLAST 서비스

**파일**: `stats/lib/services/bio/ncbi-blast-service.ts`

```typescript
interface BlastRequest {
  sequence: string          // FASTA 서열
  database: 'nt' | 'nr'    // nucleotide or protein
  program: 'blastn' | 'blastx'
  maxHits?: number          // 기본 10
}

interface BlastResult {
  rid: string               // NCBI Request ID
  hits: BlastHit[]
  queryLength: number
  database: string
}

interface BlastHit {
  accession: string         // GenBank Accession
  identity: number          // 유사도 %
  eValue: string            // 과학적 표기법 (예: "2e-15")
  bitScore: number
  coverage: number          // Query coverage %
  taxId: number             // NCBI Taxonomy ID (BLAST XML에서 추출)
  // 아래 필드는 BLAST 직접 반환이 아님 → taxId로 E-utilities Taxonomy 조회 후 채움
  scientificName?: string   // efetch taxonomy → ScientificName
  commonName?: string       // efetch taxonomy → CommonName
}
```

**비동기 폴링** (BLAST는 수십 초~수 분 소요):
1. `submitBlast(request)` → RID 반환 (1-2초)
2. `checkStatus(rid)` → 'WAITING' | 'READY' (폴링: 10s→20s→40s→60s cap, 최대 20회 ≈ 최대 ~15분)
3. `getResults(rid)` → BlastResult (XML 파싱, `fast-xml-parser` 사용)

**BLAST + BOLD 병행 실행** ("둘 다" 선택 시):
```typescript
const [blastResults, boldResults] = await Promise.all([
  submitAndPollBlast(sequence),
  validateAndQueryBold(sequence)
])
// 결과 통합: 동일 종은 merge, 고유 hit은 출처 표시
```

> **다중 서열 배치 처리는 Phase 1 범위 밖** — 유료 기능으로 분리 (하단 유료/무료 구분 참조).
> Phase 1은 단일 서열 입력에 집중.

#### 1-3. UI 컴포넌트

**파일**: `stats/app/bio-tools/barcoding/page.tsx`

```
┌─────────────────────────────────────────┐
│  DNA Barcoding — 종 동정                │
├─────────────────────────────────────────┤
│                                         │
│  [서열 입력]                            │
│  ┌─────────────────────────────────┐   │
│  │ >Sample_01                      │   │
│  │ ATGCTAGCTAGCTAGC...             │   │
│  └─────────────────────────────────┘   │
│  DB: [nt ▼]  Program: [blastn ▼]       │
│                    [BLAST 실행]          │
│                                         │
│  ── 결과 ──────────────────────────────│
│  # │ 종명              │ 유사도 │ E-val │
│  1 │ Paralichthys ...  │ 99.8%  │ 0.0   │
│  2 │ Paralichthys ...  │ 97.2%  │ 2e-15 │
│                                         │
│  [계통수 보기] [결과 정리] [AI 해석]    │
└─────────────────────────────────────────┘
```

---

### Phase 2: 학명 검증 + 국명 매핑

#### 기존 프로젝트 활용: `scientific-name-validator`

**경로**: `D:\Projects\scientific-name-validator`
**기술**: Next.js 15 + Turso (libSQL) + Drizzle ORM + WoRMS/CoL API
**배포**: Vercel(fishery) + CF Workers(`species-checker.ecomarin.workers.dev`)

이미 완성된 학명 검증 시스템을 BioHub에서 활용:

| DB 테이블 | 내용 | 규모 |
|-----------|------|------|
| `nibr_species` | 국립생물자원관 국명 DB | ~30만 rows |
| `mbris_species` | 해양생물 DB | ~1.6만 rows |
| `lpsn_names` | 원핵생물 (LPSN) | ~10만 rows |
| `worms_cache` | WoRMS API 캐시 (TTL 7일) | 동적 |
| `legal_protected_species` | 법적 관리종 (11개 카테고리) | 동적 |

**검증 서비스** (`app/services/validators/`):
- WoRMS 검증 (해양 종)
- CoL (Catalogue of Life) 검증 (범용)
- NIBR 국명 매핑
- 법적 보호종 확인 (멸종위기, CITES, 생태계교란 등)

#### 2-1. BioHub 연동 방법

**확정: API 호출 방식**
- BioHub → `species-checker.ecomarin.workers.dev` API 호출
- 이미 배포된 서비스 그대로 사용, 추가 개발 최소
- Worker에 별도 `/api/bio/species/*` 프록시 불필요 — 클라이언트에서 species-checker 직접 호출
- species-checker 다운 시 학명 검증만 "검증 불가" 표시, BLAST 결과는 정상 표시

> **DB 직접 접근은 보류** — 같은 Turso DB를 BioHub Worker에서도 읽으면 더 빠르지만 DB 결합도 증가.
> 속도 이슈 발생 시에만 재검토.

#### 2-2. BLAST 결과와 자동 연결

BLAST/BOLD 결과의 `scientificName` → 학명 검증 자동 실행:
- 학명 유효성 확인 (accepted / synonym / unaccepted)
- 틀린 학명 → 유효 학명으로 자동 교정
- 국명(한국명) 자동 매핑 (`nibr_species` 조회)
- 법적 보호종 여부 — **해당 종만 경고 표시** (평소 숨김, 해당 시에만 ⚠️ 배지)
  - 멸종위기, CITES, 해양보호, 생태계교란, 수산 수출입 제한 등
- 검증 결과를 BLAST 결과 표에 컬럼 추가

---

### Phase 3: AI 해석

**기존 패턴 재사용**: `openrouter-recommender.ts` + Worker 프록시

```typescript
// System prompt (BLAST 해석용)
const BLAST_INTERPRETATION_PROMPT = `
당신은 분자생태학 전문가입니다. BLAST 결과를 해석해주세요.

분석 항목:
1. 종 동정 신뢰도 (유사도 99%+ = 확실, 97-99% = 종 수준, 95-97% = 속 수준)
2. Top hit과 차순위 hit의 유사도 차이 → 동정 명확성
3. 학명 유효성 + 국명 제공
4. 연구 맥락에 맞는 해석 (수산/양식/생태)
`
```

**비용 정책**:
- 개발/테스트: 무료 (현재)
- 배포 후: 유료 사용자만 AI 해석 제공
- 무료 사용자: BLAST 결과 + 학명 검증까지만 (AI 해석 없이)

---

### Phase 4: 결과 정리 연동

#### BLAST 결과 → PaperDraft 확장

ARCHITECTURE.md의 `BioToolResult` 제네릭 인터페이스를 사용:

```typescript
// ARCHITECTURE.md에서 정의된 공통 인터페이스 (Barcoding도 이 패턴 사용)
interface BioToolResult {
  toolId: string              // 'barcoding'
  toolName: string            // 'DNA Barcoding'
  tables: PaperTable[]        // [BLAST 결과 표, 학명 검증 표]
  chartImageUrl?: string      // 계통수 이미지 (data URL)
  interpretation?: string     // AI 해석 텍스트
  timestamp: string
}

// PaperDraft에 bioToolResults 배열로 추가 (Barcoding 전용 필드 아님)
interface PaperDraft {
  // 기존 필드...
  bioToolResults?: BioToolResult[]   // 모든 Bio-Tool 결과 공통
}
```

#### 결과 정리 패널에 표시

```
┌─ 결과 정리 패널 ─────────────────┐
│                                   │
│  ■ BLAST 결과                     │
│  ┌────────────────────────────┐  │
│  │ 종명 │ 유사도 │ E-value    │  │
│  │ ...  │ 99.8%  │ 0.0       │  │
│  └────────────────────────────┘  │
│  [복사] [저장]                    │
│                                   │
│  ■ 학명 검증                      │
│  ┌────────────────────────────┐  │
│  │ 입력 → 유효 학명 → 국명    │  │
│  └────────────────────────────┘  │
│  [복사] [저장]                    │
│                                   │
│  ■ 계통수                        │
│  [계통수 이미지]                  │
│  [PNG 저장] [복사]                │
│                                   │
│  ■ AI 해석                       │
│  "BLAST 결과 분석..."             │
│  [복사]                           │
│                                   │
│  ─────────────────────────────   │
│  [전체 복사] [전체 저장] [DOCX]   │
└───────────────────────────────────┘
```

---

## 기술 스택 + 재사용 가능 패키지

### npm 패키지 (검증 완료, 바로 사용 가능)

| 패키지 | 용도 | 상태 | 라이선스 | 비고 |
|--------|------|------|---------|------|
| **seqviz** | DNA/RNA/단백질 서열 시각화 React 컴포넌트 | 활발 (2026-03, 306 stars) | MIT | 결과 서열 표시용 (원형/선형 뷰). 입력은 textarea로 별도 구현 |
| **node-ncbi** | NCBI E-utilities 래퍼 | 활발 (2025-11) | MIT | PubMed/서열 DB 조회. 브라우저 호환 테스트 필요 |

### 외부 API (직접 fetch 래퍼 작성)

기존 JS/TS 라이브러리가 없거나 폐기됨 → 얇은 래퍼 직접 작성 (API 자체가 단순)

| API | 용도 | 호출 방식 |
|-----|------|----------|
| **NCBI BLAST** | 서열 → 종 동정 | PUT(제출, RID 발급) → GET(폴링) → GET(결과 XML, `fast-xml-parser`로 파싱) |
| **BOLD Systems v5** | DNA 바코딩 전용 종 동정 | REST API (`portal.boldsystems.org/api/docs`) — NCBI보다 바코딩 정확도 높음 |
| **NCBI E-utilities** | Taxonomy 조회 (taxId→학명), 서열 다운로드 | GET (URL 파라미터 + XML/JSON) |
| ~~WoRMS / GBIF~~ | ~~학명 검증~~ | species-checker가 이미 처리 → BioHub에서 직접 호출 불필요 |

### BOLD Systems v5 (신규 추가)

DNA 바코딩 전문 데이터베이스 — NCBI BLAST와 **병행 사용** 권장:
- NCBI: 범용 서열 DB (모든 생물), 결과 넓음
- BOLD: 바코딩 특화 DB (COI 등 표준 마커), 종 동정 정확도 높음
- **워크플로우**: 사용자가 선택 (NCBI / BOLD / 둘 다) 또는 자동 병행

```typescript
// BOLD API 호출 예시 (⚠️ P0 Pre-phase에서 실제 엔드포인트 검증 필요)
// 아래는 portal.boldsystems.org/api/docs 기반 추정 — 실제 경로/파라미터 다를 수 있음

// 1단계: 서열 검증
POST https://portal.boldsystems.org/api/validate
  body: { sequences: [{ id: "sample1", marker: "COI-5P", sequence: "ATGC..." }] }

// 2단계: 검색 제출
POST https://portal.boldsystems.org/api/query
  body: { validated_query_id: "...", databases: ["COI_SPECIES"] }

// 3단계: 결과 다운로드
GET https://portal.boldsystems.org/api/download?query_id=...&format=json
```

> **P0 검증 항목**: 인증 토큰 필요 여부, rate limit, 지원 마커 종류 (COI-5P 외 ITS, rbcL 등), 응답 스키마

### 에러 처리 체크리스트

| 에러 케이스 | 대응 | 우선순위 |
|-------------|------|:--------:|
| **BLAST 폴링 타임아웃 (>15분)** | exponential backoff (10s→20s→40s→60s cap), 최대 20회 ≈ ~15분, 초과 시 "다시 시도" 안내 | P1 |
| **BOLD API 무응답/다운** | 30초 타임아웃, 2회 재시도, 실패 시 NCBI 결과만 표시 (graceful degradation) | P1 |
| **유효하지 않은 FASTA** | 클라이언트 사전 검증 (헤더 `>` 필수, 서열 ATCGN만 허용) + Worker 재검증 | P1 |
| **BLAST 결과 없음 (no hits)** | 빈 결과 UI + "서열 길이/DB 변경 제안" 안내 | P2 |
| **species-checker API 실패** | BLAST 결과 표시는 정상, 학명 검증 컬럼만 "검증 불가" 표시 | P3 |
| **NCBI rate limit (3req/s)** | Worker에서 큐잉 + 사용자 일 5회 제한으로 자연 방지 | P1 |
| **BOLD 인증 토큰 필요 시** | Pre-phase 조사에서 확인, 필요 시 Worker env에 추가 | P0 |

### 기존 오픈소스 (참고용, 직접 사용 안 함)

| 프로젝트 | 이유 |
|---------|------|
| SequenceServer (Ruby) | BLAST 웹 UI 참고 아키텍처, 서버 필요라 직접 사용 불가 |
| barcode-data-portal (Python) | BOLD 포털 구현체, 아키텍처 참고 |
| bionode-blast | 폐기 (2017), 미완성 |

---

## 기술 아키텍처

```
[브라우저]
   ├─ /bio-tools/barcoding (UI)
   ├─ seqviz (npm) — 서열 입력/표시 컴포넌트
   ├─ ncbi-blast-service.ts (BLAST 클라이언트)
   ├─ bold-service.ts (BOLD Systems 클라이언트)
   └─ species-validation-service.ts (학명 검증)
        ↓ fetch
[Cloudflare Worker — src/worker.ts 확장] ($5/월)
   ├─ /api/bio/blast/*     → NCBI BLAST API 프록시
   ├─ /api/bio/bold/*      → BOLD Systems v5 API 프록시
   ├─ /api/bio/taxonomy/*  → NCBI Taxonomy API 프록시 (taxId → 학명/분류)
   ├─ /api/ai/*            → OpenRouter (AI 해석) — 기존
   └─ Turso DB 연결         → 기존

[species-checker.ecomarin.workers.dev] (별도 서비스)
   └─ 학명 검증 + 국명 매핑 + 법적 보호종 확인
```

---

## 구현 순서 (권장)

| 단계 | 내용 | 예상 기간 |
|------|------|----------|
| **P0** | Pre-phase: NCBI BLAST API 실제 호출 테스트 + BOLD v5 엔드포인트 검증 + seqviz 설치 확인 | 0.5일 |
| **P1** | Worker 프록시 (`/api/bio/blast/*`, `/api/bio/bold/*`) + BLAST/BOLD 서비스 + 폴링 로직 | 2.5일 |
| **P2** | Barcoding 페이지 UI (서열 입력 textarea → 결과 표 + seqviz 결과 표시) | 2.5일 |
| **P3** | 학명 검증 (species-checker API 연동) | 2일 |
| **P4** | BLAST/BOLD 결과 + 학명 → 자동 연결 + 법적 보호종 배지 + 결과 표 컬럼 추가 | 1일 |
| **P5** | 결과 정리 연동 (BioToolResult 패턴) | 1일 |
| **P6** | AI 해석 (기존 OpenRouter 패턴 재사용 + 스트리밍) | 1.5일 |
| **P7a** | 계통수 MVP (정적 Newick → 트리 이미지 렌더링) | 1일 |
| **P7b** | 계통수 인터랙티브 (D3 기반, v2로 이관 가능) | 2일 |
| **버퍼** | 통합 테스트 + NCBI API 불안정 대응 | 2일 |
| **합계** | | **~16일** |

> **P6은 P3~P4와 병행 가능** (독립적) — 실제 일정은 ~14일로 단축 가능.
> **P7b는 v2로 이관 가능** — MVP 출시 시 P7a까지만 필요.

---

## Bio-Tools 아키텍처 연동

이 문서는 [PLAN-BIO-TOOLS-ARCHITECTURE.md](PLAN-BIO-TOOLS-ARCHITECTURE.md)의 S2 단계에 해당.

**전제 조건 (S1에서 구현)**:
- `bio-tool-registry.ts` — Barcoding 도구 등록 (`id: 'barcoding'`, `category: 'genetics'`, `computeType: 'api'`)
- `BioToolShell` — 공통 Shell (헤더 + 뒤로가기 + Export)
- `/bio-tools` 허브 페이지 — Barcoding 카드 노출
- `--section-accent-bio` 색상 적용

**사이드바 변경**: [PLAN-BIO-TOOLS-ARCHITECTURE.md](PLAN-BIO-TOOLS-ARCHITECTURE.md) S1에서 처리 (2개→1개 통합, species-validation 제거)

---

## 유료/무료 구분 (배포 시)

| 기능 | 무료 | 유료 |
|------|------|------|
| BLAST/BOLD 실행 | 일 5회 제한 | 무제한 |
| 학명 검증 | O | O |
| 결과 표 복사 | O | O |
| AI 해석 | X | O |
| DOCX 다운로드 | X | O |
| 계통수 시각화 | 기본 | 고해상도 PNG/SVG |
| 다중 서열 배치 | 최대 3개 | 최대 50개 |

**테스트 기간**: 전체 무료 공개 → 피드백 수집 → 유료 전환
