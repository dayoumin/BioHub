# NCBI BLAST + DNA Barcoding + 학명 검증 통합 계획

**작성일**: 2026-03-20
**상태**: 계획 수립
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
[2] NCBI BLAST 실행 (Cloudflare Worker 프록시)
     ↓
[3] 결과 표시
     ├─ 매칭 종 리스트 (유사도 %, E-value, 학명)
     ├─ 분류 체계 (계→문→강→목→과→속→종)
     └─ 참조 서열 (계통수용)
     ↓
[4] 학명 검증 (Turso DB 학명 캐시 + WoRMS/GBIF API)
     ├─ 학명 유효성 확인 (accepted / synonym / unaccepted)
     ├─ 틀린 학명 → 유효 학명 자동 교정
     └─ 국명(한국명) 매핑
     ↓
[5] AI 해석 (OpenRouter — 개발 중 무료, 배포 시 유료 티어)
     ├─ BLAST 결과 요약 + 종 동정 신뢰도 해석
     ├─ 유전적 거리 기반 종/아종 판단
     └─ 연구 맥락에 맞는 해석 (수산/생태)
     ↓
[6] 시각화 (선택)
     ├─ 계통수 (매칭된 종들 간 관계)
     ├─ 유사도 히트맵
     └─ 분류 체계 트리
     ↓
[7] 결과 정리 → 문서 편집에 바로 삽입
     ├─ BLAST 결과 표 (종명, 유사도, E-value, Accession)
     ├─ 학명 검증 표 (입력 학명 → 유효 학명 → 국명)
     ├─ 계통수 이미지
     ├─ AI 해석 텍스트
     └─ 전체 복사 / DOCX 다운로드
```

---

## Phase 구분

### Phase 1: NCBI BLAST 종 동정 (핵심)

**라우트**: `/bio-tools/barcoding`

#### 1-1. Worker 프록시 추가

**파일**: `src/worker.ts`

기존 `/api/ai/*` 패턴을 확장하여 `/api/bio/*` 추가:

```
/api/bio/blast/submit   → NCBI BLAST 제출 (RID 발급)
/api/bio/blast/status   → 결과 상태 확인 (폴링)
/api/bio/blast/results  → 결과 파싱 (XML → JSON)
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
  scientificName: string    // 학명
  commonName?: string       // 일반명
  identity: number          // 유사도 %
  eValue: number
  bitScore: number
  coverage: number          // Query coverage %
  taxId: number             // NCBI Taxonomy ID
}
```

**비동기 폴링**:
1. `submitBlast(request)` → RID 반환 (1-2초)
2. `checkStatus(rid)` → 'WAITING' | 'READY' (10초 간격 폴링)
3. `getResults(rid)` → BlastResult (XML 파싱)

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

#### 2-1. Turso DB 학명 테이블

```sql
-- 학명 캐시 (API 응답 캐싱, 반복 호출 방지)
CREATE TABLE species_names (
  id TEXT PRIMARY KEY,
  input_name TEXT NOT NULL,         -- 사용자 입력 학명
  valid_name TEXT,                  -- 유효 학명 (WoRMS/GBIF)
  korean_name TEXT,                 -- 국명
  status TEXT,                      -- 'accepted' | 'synonym' | 'unaccepted' | 'unknown'
  taxonomy_kingdom TEXT,
  taxonomy_phylum TEXT,
  taxonomy_class TEXT,
  taxonomy_order TEXT,
  taxonomy_family TEXT,
  taxonomy_genus TEXT,
  source TEXT,                      -- 'worms' | 'gbif' | 'ncbi'
  ncbi_tax_id INTEGER,
  cached_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### 2-2. 학명 검증 서비스

**파일**: `stats/lib/services/bio/species-validation-service.ts`

```typescript
interface SpeciesValidation {
  inputName: string
  validName: string | null
  koreanName: string | null
  status: 'accepted' | 'synonym' | 'unaccepted' | 'unknown'
  taxonomy: TaxonomyTree
  source: 'worms' | 'gbif' | 'ncbi'
  confidence: number
}
```

**조회 순서**:
1. Turso 캐시 확인 → 있으면 즉시 반환
2. WoRMS API (해양 종) → 결과 있으면 Turso에 캐시
3. GBIF API (범용) → fallback
4. NCBI Taxonomy → 최종 fallback

#### 2-3. BLAST 결과와 자동 연결

BLAST 결과의 `scientificName` → 학명 검증 자동 실행:
- 틀린 학명 → 유효 학명으로 자동 교정
- 국명(한국명) 자동 매핑
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

**파일**: `stats/lib/services/paper-draft/paper-types.ts`

```typescript
interface PaperDraft {
  // 기존 필드...
  blastResults?: BlastPaperSection   // 신규
}

interface BlastPaperSection {
  hitsTable: PaperTable              // BLAST 결과 표
  validationTable: PaperTable        // 학명 검증 표
  taxonomyText: string               // 분류 체계 텍스트
  interpretationText?: string        // AI 해석
  phylogenyImageUrl?: string         // 계통수 이미지
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

## 기술 아키텍처

```
[브라우저]
   ├─ /bio-tools/barcoding (UI)
   ├─ ncbi-blast-service.ts (클라이언트 로직)
   └─ species-validation-service.ts (학명 검증)
        ↓ fetch
[Cloudflare Worker] ($5/월)
   ├─ /api/bio/blast/*     → NCBI BLAST API 프록시
   ├─ /api/bio/taxonomy/*  → NCBI Taxonomy API 프록시
   ├─ /api/bio/species/*   → WoRMS / GBIF API 프록시
   ├─ /api/ai/*            → OpenRouter (AI 해석) — 기존
   └─ Turso DB 연결         → 학명 캐시 읽기/쓰기
```

---

## 구현 순서 (권장)

| 단계 | 내용 | 예상 기간 |
|------|------|----------|
| **P1** | Worker 프록시 (`/api/bio/blast/*`) + BLAST 서비스 | 2일 |
| **P2** | Barcoding 페이지 UI (서열 입력 → 결과 표) | 2일 |
| **P3** | 학명 검증 (WoRMS/GBIF API + Turso 캐시) | 2일 |
| **P4** | BLAST 결과 + 학명 → 자동 연결 | 1일 |
| **P5** | 결과 정리 연동 (PaperDraft 확장) | 1일 |
| **P6** | AI 해석 (기존 OpenRouter 패턴 재사용) | 1일 |
| **P7** | 계통수 시각화 (D3/ECharts tree) | 2일 |
| **합계** | | **~11일** |

---

## 사이드바 변경

```typescript
// 현재
{ href: '/bio-tools', label: 'Bio-Tools', icon: Dna, disabled: true, badge: '예정' }
{ href: '/species-validation', label: '학명 유효성 검증', icon: Microscope, disabled: true, badge: '준비 중' }

// 변경 → 학명 검증을 Bio-Tools 하위로 통합
{ href: '/bio-tools', label: 'Bio-Tools', icon: Dna, prefix: '/bio-tools' }
// 학명 검증은 /bio-tools/barcoding 내부 기능으로 포함 (별도 사이드바 항목 불필요)
```

---

## 유료/무료 구분 (배포 시)

| 기능 | 무료 | 유료 |
|------|------|------|
| BLAST 실행 | 일 5회 제한 | 무제한 |
| 학명 검증 | O | O |
| 결과 표 복사 | O | O |
| AI 해석 | X | O |
| DOCX 다운로드 | X | O |
| 계통수 시각화 | 기본 | 고해상도 PNG/SVG |

**테스트 기간**: 전체 무료 공개 → 피드백 수집 → 유료 전환
