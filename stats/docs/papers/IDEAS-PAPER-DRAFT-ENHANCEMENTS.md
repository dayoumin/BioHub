# 연구 워크플로우 통합 — 통계 → 시각화 → 논문

**출처**: [Orchestra-Research/AI-Research-SKILLs](https://github.com/Orchestra-Research/AI-Research-SKILLs) 85개 스킬에서 영감
**작성일**: 2026-03-12
**상태**: 아이디어 정리 — 설계 전

> 기존 계획: [PLAN-PAPER-DRAFT-GENERATION.md](PLAN-PAPER-DRAFT-GENERATION.md) (단일 분석 → 논문 초안)
> UI 디자인: [ui-ux-paper-draft-design-brief.md](ui-ux-paper-draft-design-brief.md)

---

## 핵심 비전: "연구 워크벤치"

현재 BioHub는 **각 단계가 독립적**:

```
Smart Flow (통계)     Graph Studio (시각화)     (논문 작성 = 미구현)
     ↓                      ↓                        ↓
  결과 보기               차트 보기                  없음
     ↓                      ↓
  복사/저장               이미지 저장
     끝                     끝
```

목표는 **세 단계가 하나의 프로젝트로 연결**되는 것:

```
┌─ 프로젝트: "양식 어류 성장 비교 연구" ──────────────────────────┐
│                                                              │
│  [분석 1] 독립표본 t-검정 ──→ Box Plot ──→ Methods/Results    │
│  [분석 2] 피어슨 상관     ──→ Scatter  ──→ Methods/Results    │
│  [분석 3] 다중회귀        ──→ (없음)   ──→ Methods/Results    │
│                                                              │
│  ───────────────────────────────────────────────────────────  │
│  📄 논문 조립                                                 │
│  → 분석 1~3의 Methods 병합 (중복 제거)                         │
│  → Results 순서 배치                                          │
│  → Table 1, 2, 3... 자동 번호                                 │
│  → Figure 1, 2... 자동 번호 (Graph Studio 차트 연결)           │
│  → Discussion: 전체 결과 종합 AI 생성                          │
└──────────────────────────────────────────────────────────────┘
```

---

## 현재 → 목표: 단계별 연결점

### Step 1. 통계 분석 (Smart Flow) — 현재 존재

**이미 있는 것**:
- `AnalysisResult` — 모든 수치 (statistic, pValue, df, effectSize, groupStats, assumptions...)
- `AnalysisHistory` — IndexedDB + Turso 하이브리드 저장
- AI 해석 — LLM 스트리밍
- `[Graph Studio]` 버튼 — 결과에서 시각화로 이동

**추가해야 할 것**:
- `projectId` — 분석을 프로젝트에 소속시키는 키
- `PaperDraft` — 이 분석의 논문 초안 (기존 PLAN의 Phase A)

### Step 2. 시각화 (Graph Studio) — 현재 존재

**이미 있는 것**:
- 차트 생성/커스터마이즈
- 이미지 내보내기

**추가해야 할 것**:
- `projectId` + `analysisId` — 어떤 분석의 차트인지 연결
- 차트 저장 UI 노출 (스토어 액션 + localStorage 저장은 구현됨, **UI 버튼만 미노출**)
- `handleOpenInGraphStudio`에서 `analysisResultId` 실제 값 채우기 (타입만 정의됨, 미사용)
- 저장된 차트 → 논문 Figure로 연결

### Step 3. 논문 작성 — 신규

**기존 PLAN 범위 (단일 분석)**:
- 하나의 `AnalysisResult` → Methods/Results/Captions/Discussion

**확장 범위 (프로젝트)**:
- 여러 분석의 초안을 조립하는 "논문 조립" 뷰
- Table/Figure 자동 채번
- Discussion은 전체 결과를 종합

---

## 아이디어 목록

### 0. Research Project — 프로젝트 저장 단위 (기반)

**이 아이디어가 다른 모든 것의 기반**

```typescript
interface ResearchProject {
  id: string
  name: string                    // "양식 어류 성장 비교 연구"
  createdAt: string
  updatedAt: string

  // 분석 목록 (순서 = 논문에서의 배치 순서)
  analyses: ProjectAnalysis[]

  // 프로젝트 수준 논문 설정
  paperConfig?: {
    title?: string                // 논문 제목
    authors?: string              // 저자
    language: 'ko' | 'en'
    researchContext?: string      // 전체 연구 맥락
  }
}

interface ProjectAnalysis {
  analysisId: string              // AnalysisHistory의 id 참조
  order: number                   // 논문 내 순서
  chartIds?: string[]             // Graph Studio 저장 차트 id (→ Layer 3 제약: GraphProject Turso 동기화 필요, 현재 localStorage만)
  // paperDraft는 HistoryRecord.paperDraft가 유일한 source of truth
  // ProjectAnalysis는 analysisId로 참조만 (이중 저장 금지)
}
```

**저장소**: 기존 하이브리드 저장소 (IndexedDB + Turso) 확장. 단, GraphProject는 현재 localStorage 전용 → 다기기 Figure 연결을 위해 Turso 동기화 선행 필요
**UI**: 홈 또는 사이드바에 "내 프로젝트" 목록

#### 구현 순서 고려

```
방법 A: 프로젝트 먼저 → 논문 초안
  프로젝트 CRUD → 분석을 프로젝트에 추가 → 논문 초안 → 조립
  (장점: 깔끔한 구조, 단점: 초기 작업량 큼)

방법 B: 논문 초안 먼저 → 프로젝트 나중에 (권장)
  단일 분석 논문 초안 (기존 PLAN) → 프로젝트 개념 추가 → 조립 뷰
  (장점: 빠른 가치 전달, 프로젝트는 점진 확장)
```

**권장: 방법 B** — 기존 PLAN(단일 분석)을 먼저 완성하고, 프로젝트 레이어를 위에 얹기

**핵심 원칙: 프로젝트는 opt-in**
- 프로젝트 없이도 단일 분석→논문 초안이 **완전히 동작**해야 함
- 프로젝트 생성은 "여러 분석을 묶고 싶을 때" 선택하는 것
- 초보 사용자에게 "프로젝트를 먼저 만들어야 분석할 수 있나?"라는 오해를 유발하면 안 됨

---

### 1. Citation Verification — 인용 검증 시스템

**영감**: `20-ml-paper-writing` (Citation Verification 워크플로우)

AI가 Discussion에서 "Smith et al. (2023)에 따르면..."이라고 쓰면:

```
[생성] → [인용 추출] → [Semantic Scholar API 검증] → [결과 마킹]
                                                      ├─ ✓ 검증됨 (DOI 링크)
                                                      └─ ⚠ 미검증 (플레이스홀더)
```

- Semantic Scholar API (무료, 100req/5min) + CrossRef API (무료)
- 검증된 인용: DOI 링크 + BibTeX 자동 생성
- 미검증: `[검증 필요]` 마킹 → 연구자가 직접 확인
- **프로젝트 수준**: 여러 분석의 Discussion에서 참고문헌 중복 제거 + 통합 참고문헌 목록

---

### 2. Analysis Quality Checklist — 분석 품질 자동 평가

**영감**: `11-evaluation` (체계적 평가 하네스)

`AnalysisResult` 객체를 **규칙 기반**으로 스캔 (LLM 불필요):

```
APA 보고 완전성                 가정 검정 완전성
├─ ✓ 검정통계량 있음             ├─ ✓ 정규성 검정됨
├─ ✓ 자유도 있음                ├─ ✓ 등분산성 검정됨
├─ ✓ p값 있음                   └─ ⚠ 표본 크기 < 30
├─ ⚠ 효과크기 없음
└─ ✓ 신뢰구간 있음              → 점수: ★★★★☆ (4/5)
```

- Hero 영역에 품질 배지 표시
- 클릭 시 체크리스트 펼침 + 개선 안내
- **안내 목적**: 정보 제공 + 보고 완전성 인식 (재분석 유도 아님). 엔진이 효과크기를 미제공하는 메서드는 "해당 없음" 표시 (사용자가 해결할 수 없는 항목은 경고가 아닌 참고로)
- **프로젝트 수준**: 전체 분석의 품질 대시보드

---

### 3. Research Ideation — "다음 분석 추천"

**영감**: `21-research-ideation` (10가지 사고 프레임워크)

현재 분석 결과를 보고 AI가 후속 분석 3가지 제안:

```
[독립표본 t-검정 완료]
  → "이 데이터로 이원ANOVA도 해보세요 (연령 × 성별 교호작용)"
  → "회귀분석으로 체장-체중 관계를 모델링하세요"
  → "비모수 검정(Mann-Whitney)으로 로버스트니스 확인"

  각 제안에 [이 분석 시작] → Smart Flow 재진입 (데이터 유지, 변수 재선택)
```

- 기존 AI 인프라 재활용 (OpenRouter)
- **재진입 흐름**: 업로드된 데이터(`uploadedData`)는 스토어에 유지됨 → Step 1(데이터) 스킵, Step 2(변수 선택)부터 시작. 다른 분석이므로 변수 매핑은 리셋
- **프로젝트 수준**: 추천된 분석을 바로 같은 프로젝트에 추가

---

### 4. Structured AI Output — AI 해석 품질 보증

**영감**: `16-prompt-engineering/instructor` (Pydantic validation)

LLM 응답을 구조화 JSON으로 받아 통계 수치와 교차 검증:

```
AI 응답: "유의하지 않다"  +  실제: p=0.03, α=0.05  →  ⚠ 불일치! 자동 보정
AI 응답: "큰 효과"       +  실제: d=0.2           →  ⚠ small이 맞음
```

- OpenRouter JSON mode 활용
- 해석 정확도 배지 표시

---

### 5. Conference Template Export — 학회별 포맷 내보내기

**영감**: `20-ml-paper-writing` (Format Conversion)

```
논문 초안 → [내보내기]
            ├─ 클립보드 복사       ← 섹션별 + 전체
            └─ APA 7th Word (.docx)
```

- **단일 분석**: 해당 분석의 섹션만 내보내기
- **프로젝트 수준**: 전체 논문 조립 → 완성된 원고 파일 내보내기
- docx.js (브라우저 내 .docx 생성)
- ~~LaTeX (.tex)~~: 타겟 사용자(생물학/수산학)가 LaTeX를 거의 사용하지 않으므로 제외
- ~~전체 참고문헌 (.bib)~~: Citation 검증(#1)이 Layer 4 의존이므로 제외. #7 소프트웨어 인용은 Methods 텍스트에 포함

---

### 6. Prompt Optimization — 메서드별 프롬프트 최적화

**영감**: `16-prompt-engineering/dspy` (선언적 프롬프트)

51개 메서드 × 2개 언어 = 102개 프롬프트 체계적 관리:
- 사용자 피드백(👍/👎) 수집 → 프롬프트 점진 개선
- 메서드별 few-shot 예시 자동 선택
- 장기 프로젝트 (데이터 축적 필요)

---

### 7. Software Citation BibTeX — 소프트웨어 인용 자동 생성

**영감**: 기존 논문 도구 비교 조사 (2026-03-12)

학술 논문 Methods에 분석 소프트웨어 인용은 **필수 관행**. BioHub에서 사용한 라이브러리를 자동으로 BibTeX 엔트리로 생성:

```
[분석 완료] → Methods 템플릿에 소프트웨어 인용 문장 포함
             → BibTeX 파일(.bib) 다운로드 버튼
```

**메서드별 라이브러리 매핑** (이미 코드에서 알고 있는 정보):

| 분석 카테고리 | 사용 라이브러리 | 공식 인용 |
|---|---|---|
| t-검정, ANOVA, 비모수 | SciPy | Virtanen et al. (2020), Nature Methods |
| 회귀분석, GLM | statsmodels | Seabold & Perktold (2010) |
| 반복측정, 혼합효과 | pingouin | Vallat (2018), JOSS |
| 상관분석, 효과크기 | pingouin / SciPy | 동일 |

**Methods 템플릿 예시**:
```
"통계 분석은 BioHub 플랫폼에서 수행되었으며,
 독립표본 t-검정은 SciPy 1.14 (Virtanen et al., 2020)를 사용하였다."
```

**BibTeX 출력 예시**:
```bibtex
@article{scipy2020,
  title   = {SciPy 1.0: fundamental algorithms for scientific computing in Python},
  author  = {Virtanen, Pauli and Gommers, Ralf and others},
  journal = {Nature Methods},
  volume  = {17},
  pages   = {261--272},
  year    = {2020},
  doi     = {10.1038/s41592-019-0686-2}
}

@article{pingouin2018,
  title   = {Pingouin: statistics in Python},
  author  = {Vallat, Raphael},
  journal = {Journal of Open Source Software},
  volume  = {3},
  number  = {31},
  pages   = {1026},
  year    = {2018},
  doi     = {10.21105/joss.01026}
}
```

- 구현 단순: 정적 BibTeX 템플릿 + 메서드→라이브러리 매핑 (이미 존재)
- **Layer 0 독립 구현 가능** (Paper Draft 무관) — 외부 API 불필요
- Zotero/Mendeley/EndNote 모두 `.bib` 임포트 지원

---

### 8. APA 테이블 서식 복사 — 결과 테이블 Word 붙여넣기

**영감**: JASP의 "Copy → Word" 워크플로우

JASP는 결과 테이블을 우클릭 → Copy → Word에 붙이면 **APA 서식 테이블**이 바로 완성됨.
현재 BioHub는 텍스트 복사만 지원 — HTML 서식 복사를 추가하면 동일 경험 제공:

```
[결과 테이블] → [복사] → Word/Google Docs 붙여넣기
                        → APA 서식 유지 (이탤릭, 테두리, 정렬)
```

**구현**:
```typescript
// navigator.clipboard.write()로 HTML + plaintext 동시 복사
// (ResultsActionStep에 이미 이 패턴 존재 — AI 해석 복사에서 사용)
const htmlBlob = new Blob([apaTableHtml], { type: 'text/html' })
const textBlob = new Blob([plainText], { type: 'text/plain' })
await navigator.clipboard.write([
  new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })
])
```

- 기존 `clipboard.write` 패턴 재사용 (ResultsActionStep에 구현됨)
- `StatisticsTable` 컴포넌트에서 APA HTML 생성 함수 추가
- **Layer 0 독립 구현 가능** (Paper Draft 무관)

---

## 경쟁력 분석

> 상세: [COMPETITIVE-ANALYSIS.md](COMPETITIVE-ANALYSIS.md)

**핵심**: 코딩 불필요 + APA 텍스트 생성 사분면에 BioHub만 존재. JASP/jamovi는 표만, R papaja는 코딩 필수, AI 도구는 수치 환각 위험. 템플릿 기반이므로 Methods/Results 수치 정확도 100%.

---

## 전체 흐름도: 현재 → 최종

```
                        현재                              최종
                  ┌──────────────┐                 ┌──────────────┐
                  │   데이터     │                 │   데이터     │
                  │   업로드     │                 │   업로드     │
                  └──────┬───────┘                 └──────┬───────┘
                         ▼                                ▼
                  ┌──────────────┐                 ┌──────────────┐
                  │  Smart Flow  │                 │  Smart Flow  │
                  │  (통계 분석)  │                 │  (통계 분석)  │
                  └──────┬───────┘                 │              │
                         │                         │  + APA테이블  │ ← [아이디어 #8, 독립]
                         │                         │  + 품질체크   │ ← [아이디어 #2]
                         │                         │  + 다음추천   │ ← [아이디어 #3]
                         │                         │  + AI검증     │ ← [아이디어 #4]
                         ▼                         └──────┬───────┘
                  ┌──────────────┐                        │
                  │ Graph Studio │                        ├──→ 프로젝트에 저장 ← [아이디어 #0]
                  │  (시각화)    │                        │
                  └──────┬───────┘                        ▼
                         │                         ┌──────────────┐
                         ▼                         │ Graph Studio │
                    이미지 저장                     │  (시각화)    │
                         │                         │  + 차트 저장  │
                         ▼                         └──────┬───────┘
                        끝                                │
                                                         ├──→ 프로젝트에 저장
                                                         │
                                                         ▼
                                                  ┌──────────────┐
                                                  │  논문 초안    │ ← [기존 PLAN]
                                                  │  (단일 분석)  │
                                                  │  + SW인용.bib │ ← [아이디어 #7]
                                                  │  + Citation   │ ← [아이디어 #1]
                                                  └──────┬───────┘
                                                         │
                                                         ├──→ 프로젝트에 저장
                                                         │
                                                         ▼
                                                  ┌──────────────┐
                                                  │  논문 조립    │ ← [프로젝트 확장]
                                                  │  (여러 분석)  │
                                                  │              │
                                                  │  Methods 병합 │
                                                  │  Results 배치 │
                                                  │  Table 채번   │
                                                  │  Figure 채번  │
                                                  │  Discussion   │
                                                  │  참고문헌     │
                                                  └──────┬───────┘
                                                         │
                                                         ▼
                                                  ┌──────────────┐
                                                  │  내보내기     │ ← [아이디어 #5]
                                                  │  복사 / .docx  │
                                                  └──────────────┘
```

---

## 구현 로드맵

### Layer 0: 독립 개선 (Paper Draft 무관, 즉시 가능) ✅ 완료

```
#8 APA 테이블 서식 복사 — ✅ 구현 완료 (2026-03-12)
   StatisticsTable 복사 드롭다운: Excel 복사 | APA 서식 복사 (Word용) | CSV 다운로드
   lib/utils/apa-table-formatter.ts: APA 7th 3-line HTML + 이탤릭 기호 + p-value 선행0 제거
   테스트: __tests__/utils/apa-table-formatter.test.ts (26 tests)
```

### Layer 1: 단일 분석 논문 초안 (기존 PLAN + 신규)

```
Phase 0: 데이터 계약 정리 (flattenAssumptions, methodId)
Phase A: 템플릿 엔진 + UI + 저장 (읽기 전용 + 복사. 인라인 편집은 Phase C-4로 연기)
Phase B: Discussion LLM + 클립보드 복사
+  #7 소프트웨어 인용 BibTeX — Methods 템플릿에 포함, .bib 다운로드
```

→ **이것만으로 "분석 → 논문 초안 + 인용" 가치 전달 가능**

**초안 편집 단계**:
- Phase A/B: **읽기 전용 + 복사** → 외부(Word/Google Docs)에서 편집 (PLAN 기준)
- Phase C-4: 인라인 편집 + "초기화" 버튼으로 원본 복원

**초안 저장 방식**:
- `HistoryRecord.paperDraft`에 단일 필드로 저장 (덮어쓰기, 버전 관리 없음)
- 템플릿 섹션(Methods/Results/Captions)은 동일 입력=동일 출력이므로 재생성해도 동일
- Discussion(LLM)만 재생성 시 다른 결과 → 현 단계에서는 허용. 버전 관리는 과잉

### Layer 2: 품질 + 추천 (독립, Layer 1과 병행 가능)

```
#2 분석 품질 체크리스트 — 규칙 기반, LLM 없음
#3 다음 분석 추천 — AI, 기존 인프라 재활용
#4 Structured Output — AI 해석 품질 보증
```

### Layer 3: 프로젝트 단위 연결

```
#0 ResearchProject 저장 구조
   - 프로젝트 CRUD
   - 분석을 프로젝트에 추가/제거
   - 차트를 분석에 연결

논문 조립 뷰
   - 여러 분석의 초안 병합
   - Table/Figure 자동 채번
   - 통합 Discussion AI 생성
```

### Layer 4: 내보내기 + 고급 기능

```
#1 Citation 검증 (Semantic Scholar/CrossRef)
#5 Conference Export (복사 + .docx만. ~~.tex, .bib~~ 제외 확정)
#6 프롬프트 최적화 (장기)
```

---

## 각 Layer의 의존성

```
Layer 0 (#8 APA 테이블 복사)        ← 완전 독립, 언제든 가능
    ↓
Layer 1 (단일 논문 초안 + #7)       ← 의존 없음, 바로 시작
    ↓
Layer 2 (품질/추천)                ← 의존 없음, Layer 1과 병행
    ↓
Layer 3 (프로젝트 연결)             ← Layer 1 완료 필요 (PaperDraft 저장 구조)
    ↓
Layer 4 (내보내기/고급)             ← Layer 1 + 3 완료 필요 (조립된 논문 대상)
```

Layer 0/1/2는 **독립 병행 가능**. Layer 3부터 "프로젝트" 개념이 들어가므로 저장 구조 설계 필요.

### 아이디어별 온/오프라인 가용성

| 아이디어 | 오프라인 | 온라인 필수 | 비고 |
|---|---|---|---|
| #0 프로젝트 저장 | ✅ (IndexedDB) | 동기화만 | |
| #1 Citation 검증 | ❌ | ✅ | Semantic Scholar / CrossRef API |
| #2 품질 체크리스트 | ✅ | ❌ | 규칙 기반, LLM 불필요 |
| #3 다음 분석 추천 | ❌ | ✅ | LLM 호출 필요 |
| #4 AI 해석 검증 | ❌ | ✅ | LLM JSON mode |
| #5 내보내기 | ✅ | ❌ | 브라우저 내 docx.js |
| #6 프롬프트 최적화 | ❌ | ✅ | LLM + 피드백 수집 |
| #7 SW 인용 BibTeX | ✅ | ❌ | 정적 템플릿 |
| #8 APA 테이블 복사 | ✅ | ❌ | clipboard API |

---

## 핵심 결정 사항

### 확정 (2026-03-12)

| # | 항목 | 확정안 | 근거 |
|---|------|--------|------|
| 3 | Discussion 범위 | **단일 분석 한정** | 토큰 한계 + 환각 위험. 프로젝트 종합은 Layer 3+ |
| 5 | 논문 초안 진입 UX | **Export 드롭다운에 항목 추가** (옵션 A) | 기존 DOCX/XLSX/HTML과 논리적 그룹화, 액션바 깔끔 유지 |
| 5' | 내보내기 포맷 | **복사(클립보드) + .docx만** | .tex(타겟 사용자 LaTeX 안 씀), .bib 전체(Layer 4 의존), .md(복사로 대체) 제외 |
| 6 | Discussion 미입력 | **차단 없이 일반 해석 제공** + 힌트 | `researchContext` optional. 미입력 시 통계 결과 기반 일반 해석 |

### 미결 (Layer 3+ 시작 전에 결정)

1. **프로젝트 UI 진입점**: 사이드바 "My Menu" 활성화 유력 (이미 예약 공간 있음, `app-sidebar.tsx:200`)
2. **논문 조립 뷰 UI**: Dialog 2단계(확인→보기) 유력 (기존 모달 패턴과 동일)
3. **색상 팔레트 확정**: Layer 2(품질 체크 #2, 다음 추천 #3) 시작 전에 결정. 기존 OKLCH semantic 색상 활용 예정

---

## 사전 조사 결과 (2026-03-12)

> 구현 시작 전에 현재 코드베이스의 공유 가능 자산과 갭을 정리해둔 것.

### A. 공유 컴포넌트 현황

#### 복사 버튼 (Copy → Check 전환)

**현재**: 복사 로직이 **3곳에 인라인 중복 구현** (공통 컴포넌트 없음)
- `ResultsActionStep.tsx` — `isCopied` + clipboard.write (plain+HTML)
- `rag-chat-interface.tsx` — `copiedMessageId` + clipboard.writeText
- `ResultActionButtons.tsx` (레거시) — `handleCopyToClipboard` (콜백 위임)

**갭**: Paper Draft는 **섹션별 개별 복사** 필요 (Methods, Results, Captions 각각 + 전체 복사)

**필요 작업**: `CopyButton` 공통 컴포넌트 분리
```typescript
// 제안: stats/components/common/CopyButton.tsx
interface CopyButtonProps {
  getText: () => string          // 복사할 텍스트 반환
  getHtml?: () => string         // HTML 버전 (서식 복사)
  variant?: 'ghost' | 'outline'
  size?: 'sm' | 'default'
  label?: string                 // "복사" / "전체 복사"
}
```

#### 마크다운 렌더링

**현재**: `react-markdown` + `prose` 패턴이 **4곳에 인라인 중복**
- `ResultsActionStep.tsx` — AI 해석 (remark 플러그인 없음)
- `rag-assistant.tsx` — RAG 답변 (remark-math + rehype-katex 사용)
- `rag-chat-interface.tsx` — RAG 채팅 (동일)
- `rag-assistant-compact.tsx` — 3곳에서 동일 패턴 반복

```tsx
// 공통 패턴 (4곳 모두 동일)
<div className="prose prose-sm max-w-none dark:prose-invert">
  <ReactMarkdown>{text}</ReactMarkdown>
</div>
```
- RAG 컴포넌트는 KaTeX 수식 렌더링 추가 (`remark-math` + `rehype-katex`)
- `splitInterpretation(text)` 함수: `export-data-builder.ts:20`에 정의

**재사용 가능**: Paper Draft 각 섹션에서 동일 패턴 사용 가능. 공통 래퍼 추천:
```typescript
// 제안: stats/components/common/MarkdownRenderer.tsx
interface MarkdownRendererProps {
  content: string
  className?: string
  isStreaming?: boolean  // 타이핑 커서 표시
}
```

#### 스트리밍 상태 관리

**현재**: 2계층 분리
- **서비스**: `requestInterpretation()`, `streamFollowUp()` → `result-interpreter.ts` (재사용 가능)
- **UI 상태**: Phase 머신, `isInterpreting`, `interpretError` → ResultsActionStep에 직접 구현

**재사용 가능**: `requestInterpretation()` 함수 자체는 Discussion 생성에 재사용 가능
**필요 작업**: Discussion용 별도 프롬프트 + `DiscussionState` 상태 머신은 PaperDraftPanel에서 자체 관리

#### 언어 토글

**현재**: **앱 전체에 미구현**
- HTML `lang="ko"` 하드코드 (`layout.tsx`)
- `useTerminology()` 훅은 domain(aquaculture/generic) 기반, locale(ko/en) 기반 아님
- 영문 UI 없음

**필요 작업**: Paper Draft 전용 언어 선택 (앱 전역 i18n 아님)
- `DraftContextEditor`에서 `language: 'ko' | 'en'` 선택
- 템플릿 함수에 `lang` 파라미터 전달
- 앱 전역 언어 전환은 scope out (Paper Draft 내부에서만)

---

### B. Graph Studio 차트 저장 구조

#### 상태 관리: Zustand

**파일**: `lib/stores/graph-studio-store.ts` (`useGraphStudioStore`)

```
GraphStudioState
  ├─ currentProject: GraphProject | null    ← 저장/로드 대상
  ├─ dataPackage: DataPackage | null        ← 메모리 전용 (영구 저장 안 됨)
  ├─ chartSpec: ChartSpec | null            ← 렌더링 대상
  ├─ specHistory: ChartSpec[]               ← Undo/Redo 스택 (MAX 50)
  └─ aiPanelOpen / aiPanelDock              ← UI 상태
```

#### 영구 저장: localStorage

**파일**: `lib/graph-studio/project-storage.ts`

```typescript
interface GraphProject {
  id: string                      // 'proj_{timestamp}_{random}'
  name: string
  chartSpec: ChartSpec             // 완전한 차트 설정 (렌더 가능)
  dataPackageId: string            // DataPackage 참조 (복원 시 재업로드 필요)
  editHistory: AiEditResponse[]    // AI 편집 이력
  createdAt: string
  updatedAt: string
}
```

- **저장**: `localStorage['graph_studio_projects']` (JSON 배열)
- **DataPackage는 저장 안 됨** (용량 절감, 의도적 설계)
- 프로젝트 로드 시 데이터 재업로드 필요

#### Smart Flow → Graph Studio 연결

**파일**: ResultsActionStep.tsx L530-602 (`handleOpenInGraphStudio`)

```
[Graph Studio] 버튼 클릭
  ↓
AnalysisResult → DataPackage 변환
  ├─ id: crypto.randomUUID()
  ├─ source: 'smart-flow'
  ├─ analysisContext: toAnalysisContext(results)  ← 유의성 마크용
  └─ columns/data: uploadedData에서 추출
  ↓
suggestChartType() → createDefaultChartSpec() → applyAnalysisContext()
  ↓
loadDataPackageWithSpec(pkg, spec)  ← Zustand 원자적 업데이트
  ↓
router.push('/graph-studio')
```

#### 현재 갭

| 항목 | 상태 | Paper Draft 연결에 필요한 것 |
|------|------|---------------------------|
| 차트 저장 UI | **미노출** (스토어 액션만 존재) | 저장 버튼 + 이름 입력 다이얼로그 |
| 프로젝트 목록 | **미구현** | 저장된 차트 목록 조회 UI |
| 분석↔차트 역참조 | `DataPackage.analysisResultId` 타입+스키마 정의됨, **but handleOpenInGraphStudio에서 값 미할당** | analysisId 값 채우기 + 역참조 조회 |
| 차트→논문 Figure | **미구현** | chartSpec + exportConfig → Figure 이미지 + 캡션 |

---

### C. 저장소 & ID 체계

#### 현재 ID 패턴

| 항목 | 패턴 | 생성 방식 |
|------|------|---------|
| 분석 히스토리 | `analysis-{timestamp}` | `Date.now()` |
| 채팅 세션 | `session-{timestamp}-{random7}` | `Date.now()` + `Math.random().toString(36)` |
| 분석 템플릿 | `template-{timestamp}-{random7}` | 동일 |
| Graph 프로젝트 | `proj_{timestamp}_{random}` | 동일 |
| 기기 ID | `device-{timestamp}-{random7}` | 동일 |

**UUID 라이브러리 미사용** — `crypto.randomUUID()`은 Graph Studio DataPackage에서만 사용

#### 저장소 구조

```
IndexedDB: 'smart-flow-history' (v2)
  ├─ analyses    (keyPath: 'id')     ← HistoryRecord, 최대 100개
  ├─ sync_queue  (keyPath: 'id')     ← 오프라인 동기화 큐
  └─ favorites   (keyPath: 'id')     ← 즐겨찾기 메서드 ID 배열

IndexedDB: 'StatisticalPlatformDB' (v1)
  ├─ sessions    (keyPath: 'id')     ← 채팅 세션
  ├─ projects    (keyPath: 'id')     ← 채팅 프로젝트
  └─ settings    (keyPath: 'key')    ← 설정

localStorage: 'graph_studio_projects'
  └─ GraphProject[]                  ← 차트 프로젝트

Turso (선택, 클라우드)
  ├─ history 테이블                   ← HistoryRecord 동기화
  └─ favorites 테이블                 ← 즐겨찾기 동기화
```

#### HistoryRecord 핵심 필드

```typescript
interface HistoryRecord {
  id: string                    // 'analysis-{timestamp}'
  timestamp: number
  name: string
  method: { id, name, category } | null
  variableMapping?: VariableMapping
  analysisOptions?: { confidenceLevel, alternative, postHocMethod, ... }
  dataFileName: string
  dataRowCount: number
  columnInfo?: Array<{ name, type, uniqueValues }>
  results: Record<string, unknown> | null
  aiInterpretation?: string | null
  apaFormat?: string | null
  aiRecommendation?: AiRecommendationContext | null
  interpretationChat?: ChatMessage[]
  // 동기화
  deviceId?: string
  syncedAt?: number
  updatedAt?: number
  // ⚠️ paperDraft 필드 아직 없음 (기존 PLAN Phase A-6에서 추가 예정)
}
```

#### HybridAdapter 동기화 흐름

```
저장 요청
  ├─ IndexedDB 저장 (항상, 로컬 우선)
  ├─ 온라인? → Turso 저장 시도
  │    ├─ 성공 → syncedAt 표시
  │    └─ 실패 → sync_queue에 추가
  └─ 30초마다 syncPendingItems() 자동 실행

오프라인 → 온라인 전환 시
  └─ 큐의 미동기화 항목 일괄 푸시 (최대 3회 재시도)
```

---

### D. 프로젝트 통합 시 저장 구조 제안

현재 3개 저장소가 분리되어 있음. 프로젝트로 묶으려면:

```
방법 1: ResearchProject를 별도 IndexedDB store로 추가
  smart-flow-history (v3)
    ├─ analyses       ← 기존 유지
    ├─ sync_queue     ← 기존 유지
    ├─ favorites      ← 기존 유지
    └─ projects (NEW) ← ResearchProject 저장

  장점: 기존 저장소 스키마 변경 최소
  단점: GraphProject(localStorage)와 별도 관리

방법 2: HistoryRecord에 projectId optional 추가
  interface HistoryRecord {
    ...기존 필드
    projectId?: string           // 프로젝트 소속 (optional → 하위호환)
    paperDraft?: PaperDraft      // 이미 PLAN에 설계됨
    chartProjectIds?: string[]   // Graph Studio 프로젝트 참조
  }

  장점: 기존 동기화 인프라 그대로 활용
  단점: HistoryRecord 비대화

방법 3: 하이브리드 (권장)
  - ResearchProject는 별도 store (v3 마이그레이션)
  - HistoryRecord에 projectId만 추가 (경량)
  - GraphProject에 analysisId만 추가 (이미 dataPackageId 패턴 존재)

  연결:
    ResearchProject.id
      ├─→ HistoryRecord.projectId (분석 소속)
      └─→ GraphProject.analysisId (차트-분석 연결)
```

---

### E. 사전 준비 체크리스트

Layer 1(Paper Draft) 시작 전:

- [ ] `CopyButton` 공통 컴포넌트 분리 (3곳 중복: ResultsActionStep, rag-chat-interface, ResultActionButtons)
- [ ] `MarkdownRenderer` 공통 컴포넌트 분리 (4곳 중복: ResultsActionStep + RAG 3개. KaTeX 옵션 필요)
- [ ] 색상 팔레트 확정: 논문 초안(blue 확정), 품질 체크(#2), 다음 추천(#3) 카드 테마

Layer 3(프로젝트) 시작 전:

- [ ] Graph Studio 차트 저장 UI 노출 (`saveCurrentProject` 액션 존재, 버튼만 추가)
- [ ] `handleOpenInGraphStudio`에서 `analysisResultId` 값 실제 할당 (타입만 정의, 값 미할당)
- [ ] `HistoryRecord.projectId` optional 필드 추가
- [ ] `GraphProject.analysisId` 역참조 필드 추가 (현재 `dataPackageId`만 있음)
- [ ] IndexedDB v3 마이그레이션: `projects` store 추가
- [ ] `ResearchProject` 타입 정의 + CRUD 서비스
- [ ] Turso 스키마에 `projects` 테이블 추가

### F. 검증 로그

#### 1차 검증 (2026-03-12) — 코드 대조

| 항목 | 문서 기술 | 실제 코드 | 판정 |
|------|---------|---------|------|
| `splitInterpretation` 위치 | `export-data-builder.ts` | `export-data-builder.ts:20` | ✅ 정확 |
| `react-markdown` 사용처 | ResultsActionStep만 언급 | **4곳** (+ RAG 3개) | ⚠️ 수정됨 |
| 복사 인라인 중복 | ResultsActionStep만 언급 | **3곳** (+ rag-chat, ResultActionButtons) | ⚠️ 수정됨 |
| `analysisResultId` | "존재하나 미활용" | 타입+스키마 정의됨, **값 미할당** (handleOpenInGraphStudio에 없음) | ⚠️ 수정됨 |
| Graph Studio 차트 저장 | "세션 내에서만?" | localStorage 영구 저장 구현됨, **UI 미노출** | ⚠️ 수정됨 |
| `requestInterpretation` 위치 | `result-interpreter.ts` | `result-interpreter.ts` | ✅ 정확 |
| RAG의 KaTeX 사용 | 미언급 | `remark-math` + `rehype-katex` 사용 | ⚠️ 추가됨 |
| `prose` CSS 패턴 | ResultsActionStep만 | 4곳 동일 패턴 | ⚠️ 수정됨 |
| HistoryRecord 필드 | 문서 기술대로 | `storage-types.ts` 일치 | ✅ 정확 |
| HybridAdapter 흐름 | 문서 기술대로 | `hybrid-adapter.ts` 일치 | ✅ 정확 |
| ID 패턴 (analysis-{ts}) | 문서 기술대로 | `smart-flow-store.ts:394` | ✅ 정확 |
| GraphProject 구조 | 문서 기술대로 | `project-storage.ts` 일치 | ✅ 정확 |

#### 2차 검증 (2026-03-12) — 완전성 + 사용자 관점

| 항목 | 문제 | 반영 |
|------|------|------|
| 메서드 수 "43개" | 실제 51개 (PLAN도 52로 기재, 실제 51) | ⚠️ 51로 정정 |
| 초안 편집 가능 여부 미언급 | PLAN Phase C-4로 후기 구현. 초기는 읽기전용+복사 | ⚠️ 로드맵에 편집 단계 명시 |
| 초안 버전 관리 없음 | 덮어쓰기 설계. 템플릿=결정론적이라 실질 문제 없음 | ⚠️ 한계 명시 |
| #5와 #7 BibTeX 범위 겹침 | #7=소프트웨어 인용(Layer 1), #5=전체 참고문헌(Layer 4) | ⚠️ 구분 명시 |
| #8 Layer 배치 | Paper Draft 무관하게 독립 가능 → Layer 0 | ⚠️ 재배치 |
| 프로젝트 opt-in 미명시 | 프로젝트 없이도 단일 분석→초안 완전 동작 | ⚠️ 원칙 추가 |
| 온/오프라인 가용성 미정리 | 아이디어별 표 추가 | ⚠️ 표 추가 |
| 논문 초안 진입 UX 미결정 | 핵심 결정 사항 #5 추가 | ⚠️ 추가 |
| Discussion 맥락 미입력 기본 동작 | 핵심 결정 사항 #6 추가 (필수 입력 아님) | ⚠️ 추가 |
| #3 추천→재진입 흐름 불명확 | 데이터 유지, 변수 매핑 리셋 명시 | ⚠️ 명시 |
| #2 품질 체크 개선 안내 실행 가능성 | 미제공 항목은 "참고" 표시, 재분석 유도 아님 | ⚠️ 명시 |

#### 3차 검증 (2026-03-12) — Layer 0 구현 후 자체 리뷰

| # | 문제 | 원인 | 수정 |
|---|------|------|------|
| 1 | 복사 드롭다운이 `actions` prop 있을 때만 노출 | `{actions && (...)}` 조건으로 감싸져 있어 title만 있는 테이블에서 APA 복사 불가 | ⚠️ `actions` 조건 제거 → title/actions 어느 하나라도 있으면 복사 드롭다운 표시 |
| 2 | `formatCellHtml` 함수가 사실상 no-op | pvalue 분기든 아니든 `formatCellPlain` 반환만 함 (미래 확장 의도였으나 dead code) | ⚠️ 삭제, `formatCellValue`로 통합 |
| 3 | 정수값(n=30)이 `30.000`으로 표시 | `number` 타입 일괄 `.toFixed(3)` | ⚠️ `Number.isInteger` 판별 → 정수는 소수점 없이, 실수는 3자리 |
| 4 | 그리스 기호 이탤릭 미적용 (η², χ² 등) | `\b`가 Unicode 문자 경계를 인식 못함 | ⚠️ 단일 패스 regex로 통합 (그리스 기호를 ASCII 기호보다 먼저 배치) |
| 4' | `ηp²` 이탤릭 시 내부 `p`가 이중 래핑 | 2-pass 방식에서 1차 Greek 매칭 후 2차 ASCII `\bp\b`가 내부 p 재매칭 | ⚠️ 단일 패스 regex로 해결 (ηp²가 p보다 먼저 매칭) |

#### 4차 검증 (2026-03-12) — 2차 비판적 검토 (보안 + APA 규칙 정합성)

| # | 문제 | 원인 | 수정 |
|---|------|------|------|
| A | XSS — title/header/셀값 이스케이프 없음 | `${title}`, `String(value)` raw 삽입 | ⚠️ 기존 `escapeHtml()` 유틸 적용 (title, header, 셀 default/NaN 분기) |
| B | 이중 이탤릭 — APA 규칙 위반 | `<th style="font-style:italic">` + `<em>` 중복 | ⚠️ th에서 `font-style:italic` 제거. APA: 통계 기호만 이탤릭 |
| C | `column.align` 무시 | 정렬을 `col.type` 기반 하드코딩 | ⚠️ `resolveAlign()` 헬퍼 — `col.align` 우선, 미설정 시 type 기본값 |
| D | `type` undefined 시 동작 불일치 | ResultsActionStep에서 type 미지정 | ⚠️ `resolveAlign()` + default 분기로 해결 |
