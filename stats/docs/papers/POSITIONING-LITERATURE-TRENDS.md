# 문헌검색 · 연구동향 — 포지셔닝 및 구현 계획

**Status**: 확정
**Last updated**: 2026-03-27
**Source**: FisheryON → BioHub 이전 ([PLAN-FISHERY-MIGRATION.md](../../docs/PLAN-FISHERY-MIGRATION.md))

---

## 1. 포지셔닝: NotebookLM과 보완 관계

### BioHub ≠ NotebookLM

| | NotebookLM | BioHub |
|---|-----------|--------|
| **핵심** | 있는 문서 → 이해/정리 | 데이터 → 분석 → 논문 생산 |
| 문서 요약/Q&A | ✅ 핵심 | ❌ 안 함 |
| 이미지/다이어그램 생성 | ✅ 잘 함 | ❌ 안 함 |
| RAG (문서 기반 AI) | ✅ 핵심 | ❌ 안 함 |
| **학술 DB 검색** | ❌ 못 함 | ✅ 해야 함 |
| **신규 논문 모니터링** | ❌ 못 함 | ✅ 해야 함 |
| **통계 분석** | ❌ 못 함 | ✅ 핵심 |
| **분석→논문 텍스트** | ❌ 못 함 | ✅ 핵심 |

### 핵심 원칙

1. **BioHub는 "발견 + 생산 + 작성" 도구** — NotebookLM은 "이해 + 정리" 도구
2. **RAG 기능을 중점으로 가져가지 않음** — 문서 기반 Q&A는 NotebookLM이 더 잘함
3. **문헌검색 = "검색 도구"** (5개 학술 DB 어그리게이터) — "정리 도구"가 아님
4. **연구동향 = "모니터링 도구"** (키워드별 신규 논문 추적) — "요약 도구"가 아님

### 연구 워크플로우에서의 위치

```
  [문헌 발견]  →  [이해/정리]  →  [실험/데이터]  →  [분석]  →  [논문 작성]
       ↓               ↓                              ↓            ↓
   BioHub          NotebookLM                      BioHub       BioHub
  문헌·동향       (보완 관계)                     통계분석      논문 작성
  5개 DB 검색    PDF 읽기/요약                   Bio-Tools    결과 정리
  키워드 추적     이미지 생성                   유전적 분석     초안 생성
```

연구자는 두 도구를 **함께** 사용한다:
1. **BioHub 문헌검색**으로 관련 논문 목록 발견
2. **NotebookLM**에 논문 PDF 넣고 내용 이해/정리
3. **NotebookLM 정리 결과를 BioHub로 가져오기** (복사/붙여넣기 또는 내보내기)
4. **BioHub 통계분석**으로 자기 데이터 분석
5. **BioHub 논문 작성**으로 모든 자료 취합 → 논문 초안 완성

### NotebookLM 연동 — "가져와서 로컬에서 작업"

BioHub의 핵심 철학: **서버 비용 없이 연구자 PC에서 작업**.
NotebookLM이 잘하는 것(정리/이미지)은 NotebookLM에서 하고, 그 결과를 BioHub로 가져와서 취합한다.

```
NotebookLM (Google 서버)              BioHub (연구자 PC)
┌────────────────────────┐           ┌──────────────────────────┐
│ PDF 업로드              │           │                          │
│ AI 요약/정리            │           │ 📥 NotebookLM 정리 결과   │
│ 이미지/다이어그램 생성   │ ──내보내기──→ │    Introduction 초안     │
│ 선행연구 Q&A            │           │    문헌 요약 메모          │
│                        │           │    다이어그램 이미지       │
└────────────────────────┘           │         ↓                │
                                     │ 📊 BioHub 자체 분석 결과   │
                                     │    Methods (자동 생성)    │
                                     │    Results (자동 생성)    │
                                     │    통계 표/그래프          │
                                     │         ↓                │
                                     │ 📝 논문 취합              │
                                     │    Introduction (가져온것) │
                                     │    Methods (자동 생성)    │
                                     │    Results (자동 생성)     │
                                     │    Discussion (AI 보조)   │
                                     │    References (자동 생성)  │
                                     │         ↓                │
                                     │ 📄 .docx 내보내기         │
                                     └──────────────────────────┘
                                     모든 작업이 브라우저 + 로컬
                                     서버 비용 = 0
```

**구현 방향** (향후):
- NotebookLM 정리 결과를 **텍스트/마크다운으로 붙여넣기** → BioHub 프로젝트에 저장
- NotebookLM 생성 이미지를 **드래그&드롭으로 삽입** → 논문 Figure로 활용
- BioHub의 DocumentBlueprint에서 **외부 텍스트 섹션**(Introduction, Discussion 등)을 수동 입력/붙여넣기 영역으로 제공
- 자동 생성 섹션(Methods, Results, References)과 수동 섹션을 **하나의 논문으로 병합**

---

## 2. 사이드바 구조

### 확정

```
사이드바:
├── 통계분석           (/)               ← 핵심: 데이터 → 분석
├── Bio-Tools          (/bio-tools)      ← 생물학 특화 계산
├── 유전적 분석        (/genetics)       ← DNA 서열/BLAST
├── Graph Studio       (/graph-studio)   ← 시각화
├── ──────────────     (구분선)
├── 문헌·동향          (/literature)     ← NEW: 논문/표본 검색 + 동향
├── 논문 작성          (/papers)         ← 기존 결과 정리 + 향후 초안
├── 학명 유효성 검증    (/species)       ← 준비 중
└── 설정
```

### "문헌·동향"과 "논문 작성"을 분리하는 이유

| | 문헌·동향 (/literature) | 논문 작성 (/papers) |
|---|----------------------|-------------------|
| **시점** | 연구 초기 (뭘 연구할지) | 연구 후기 (결과 정리) |
| **입력** | 키워드, 학명 | 분석 결과(AnalysisResult) |
| **출력** | 논문/표본 목록, 동향 피드 | APA 텍스트, 표, 논문 초안 |
| **사용 빈도** | 매일/매주 (모니터링) | 분석 완료 시 |
| **서버 의존** | Worker API (외부 DB 접근) | 로컬 (Pyodide 결과) |
| **프로젝트 연결** | 선택적 | 분석에 반드시 연결 |

---

## 3. /literature 페이지 내부 구조

### 탭 구성

```
/literature
├── 탭1: 통합검색
│   ├── 학명/키워드 입력
│   ├── 소스 선택 (OpenAlex, GBIF, OBIS, NANET, PubMed)
│   ├── 키워드 필터 (AND/OR, 제외, Korea 28개)
│   ├── 검색 진행 상황 (소스별 상태)
│   ├── 결과 목록 (정렬: 연도/인용수/소스)
│   └── 내보내기 (JSON/Excel)
│
├── 탭2: 연구동향
│   ├── 키워드 관리 (개인 + 조직)
│   ├── 위클리 브리핑 (수집된 논문 피드)
│   ├── 팔로잉 키워드 목록
│   └── (향후) 이메일 구독 설정
│
└── (향후) 탭3: 최초기록
    ├── 학명 → WoRMS 이명 검색
    ├── 이명 포함 문헌 검색
    └── AI 최초기록 후보 판별
```

### 5개 데이터 소스

| 소스 | 용도 | API | CORS | Worker 필요 |
|------|------|-----|------|------------|
| **OpenAlex** | 국제 학술 논문 | REST (무료, 키 불필요) | ✅ | 선택 |
| **GBIF** | 생물 표본 출현 기록 | REST (무료) | ✅ | 선택 |
| **OBIS** | 해양 생물 출현 기록 | REST (무료) | ✅ | 선택 |
| **NANET** | 국내 논문 (국회도서관) | REST (키 필요) | ❌ | **필수** (HTTP only — HTTPS 404, Workers outbound는 HTTP 지원) |
| **PubMed** | 생명과학/의학 논문 | REST (키 권장) | ✅ | 키 보호용 |

> **참고**: GBIF/OBIS는 "논문"이 아니라 "표본 기록". BioHub의 생물학 도메인 특성상 함께 검색하면 가치가 높다
> (예: "이 종이 한국에서 최초 보고된 기록은?").

---

## 4. 안 하는 것 vs 하는 것 (경계 설정)

### ❌ 안 하는 것

| 기능 | 이유 |
|------|------|
| **논문 PDF 업로드/파싱** | NotebookLM이 훨씬 잘함 |
| **논문 내용 요약** | NotebookLM이 훨씬 잘함 |
| **RAG (문서 기반 Q&A)** | NotebookLM이 핵심 기능으로 가지고 있음 |
| **논문 추천 (개인화)** | Semantic Scholar, ResearchRabbit 영역 |
| **풀텍스트 저장** | 저작권 이슈 + 저장 용량 |
| **독립형 레퍼런스 매니저** | Zotero/Mendeley의 폴더·태그·PDF 주석 관리까지 만들 필요 없음 |

### ✅ 하는 것

| 기능 | 이유 |
|------|------|
| **서지 데이터 수집** | 문헌검색 결과에서 DOI, 저자, 저널, 연도 등 메타데이터를 자동 수집 |
| **인용 목록 관리** | 검색 결과에서 "인용에 추가" → 프로젝트별 인용 목록 유지 |
| **인용 형식 생성** | APA 7th, Vancouver 등 형식으로 참고문헌 자동 생성 |
| **논문 초안에 인용 삽입** | 결과 작성 시 (Author, Year) 인라인 인용 + References 섹션 자동 생성 |
| **BibTeX/RIS 내보내기** | Zotero/Mendeley로 내보내기 지원 (호환) |

### 파이프라인

```
문헌검색 (/literature)          논문 작성 (/papers)
┌─────────────────────┐        ┌──────────────────────┐
│ OpenAlex에서 논문 발견 │        │ Methods/Results 생성   │
│         ↓            │        │         ↓              │
│ "인용에 추가" 클릭    │ ────→  │ (Kim et al., 2025)    │
│         ↓            │        │ 인라인 인용 자동 삽입   │
│ 프로젝트 인용 목록    │        │         ↓              │
│ DOI·저자·저널·연도    │        │ References 섹션 생성   │
└─────────────────────┘        └──────────────────────┘
                                        ↓
                               BibTeX로 내보내기 → Zotero
```

**핵심**: BioHub는 **"검색 → 수집 → 인용 삽입"** 파이프라인을 가진다.
독립 레퍼런스 매니저(Zotero)를 대체하는 게 아니라, **논문 작성에 필요한 만큼만** 관리한다.

---

## 5. 프로젝트 연결

문헌검색 결과를 연구과제(ResearchProject)에 연결하는 방식:

```typescript
// 검색 결과를 프로젝트에 저장 (선택적)
upsertProjectEntityRef({
  projectId: activeProjectId,
  entityKind: 'literature-search',
  entityId: searchSessionId,
  label: '키워드: "Sebastes schlegelii" + Korea',
  metadata: {
    sources: ['openalex', 'gbif', 'obis'],
    resultCount: 47,
    searchedAt: '2026-03-27T17:00:00Z',
  }
})
```

`ProjectEntityKind`에 추가:
- `'literature-search'` — 문헌 검색 세션
- `'trend-keyword'` — 모니터링 키워드

---

## 6. 구현 순서

### Phase A: 문헌 통합검색 (1~2일)

DB 불필요, 순수 API 프록시. 가장 빠르게 가치 제공.

1. Worker에 `/api/literature/search` 핸들러
2. `stats/app/literature/page.tsx` 생성
3. 사이드바에 "문헌·동향" 메뉴 추가

### Phase B: 연구동향 (2~3일)

D1 스키마 필요 (키워드, 수집 결과 저장).

1. D1 마이그레이션 (trend_keywords, trends 테이블)
2. Worker에 `/api/trends/*`, `/api/keywords/*` 핸들러
3. `/literature` 페이지에 "연구동향" 탭 추가

### 향후

- Phase C: 이메일 구독 (Cron + MailerSend)
- Phase D: 최초기록 검색 (WoRMS 이명 + AI 판별)
- Phase E: 프로젝트 연결 (literature-search entityKind)

---

## 7. 참고 자료

- FisheryON 이전 계획: [PLAN-FISHERY-MIGRATION.md](../../docs/PLAN-FISHERY-MIGRATION.md)
- FisheryON 연구동향 설계: `d:\Projects\fisheryON\apps\validator\app\trends\DESIGN.md`
- ~~논문 초안 생성 계획: PLAN-PAPER-DRAFT-GENERATION.md~~ (삭제됨)
- ~~문서 조립 계획: PLAN-DOCUMENT-ASSEMBLY.md~~ (삭제됨)
- 경쟁 분석: [COMPETITIVE-ANALYSIS.md](../COMPETITIVE-ANALYSIS.md) §9 (NotebookLM 비교)
