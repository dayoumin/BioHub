# 논문 패키지 조립 (Paper Package Assembly) 설계

**Last updated**: 2026-04-03
**References**: [AI Export Strategy](AI-EXPORT-STRATEGY.md), [Product Strategy](PRODUCT_STRATEGY.md)
**상위 전략**: BioHub → SOTA AI → 사람(DOCX/HWPX) 3단계 모델의 **1차→2차 전달 구간**
**검토 이력**: 2026-04-03 — UX/기술/AI포맷 3개 관점 병렬 검토 반영

---

## 1. 목적

BioHub에서 수행한 모든 분석 결과를 **하나의 구조화된 패키지**로 조립하여,
사용자가 SOTA AI(Claude/GPT/Gemini)에 붙여넣으면 **논문 전체가 처음부터 끝까지 생성**되도록 한다.

핵심 원칙:
- **한 번 붙여넣기 = 논문 전체 초고** (사용자가 섹션별로 반복 요청하지 않아야 함)
- AI가 빠뜨리거나 지어내지 않도록 **모든 데이터를 명시적으로 포함**
- 사람이 읽어도 이해 가능한 포맷 (디버깅/확인 용이)
- **하이브리드 포맷**: 지시사항/맥락 = Markdown, 분석 결과 = JSON 블록

---

## 2. Export 패키지 구조 (하이브리드 Markdown + JSON)

```markdown
# 연구 논문 작성 요청

## 역할
당신은 {분야} 분야의 학술 논문 작성 전문가입니다.
아래 제공된 통계 분석 결과와 문헌을 기반으로 완전한 논문 초고를 작성하십시오.

## 핵심 규칙
1. 아래 제시된 통계 수치를 **정확히 그대로** 인용하십시오. 반올림하거나 변경 금지.
2. 제시되지 않은 데이터, 분석, 문헌을 **절대 지어내지(hallucinate) 마십시오**.
3. 참고문헌은 아래 "참고문헌 목록"에 있는 것만 사용하십시오.
4. 모든 Table/Figure 번호는 지정된 번호를 그대로 따르십시오.
5. 상관관계를 인과관계로 서술하지 마십시오.
6. 유의하지 않은 결과(p >= α)도 반드시 보고하십시오.
7. 효과크기 해석은 제공된 해석을 따르십시오.

## 출력 형식
- Markdown 형식으로 작성
- 각 섹션은 ## 헤더로 구분
- 통계 기호: 이탤릭 (*F*, *p*, *t*, *M*, *SD*)
- Table은 Markdown 표 형식
- 전체 분량: 약 {n}000자 (or {n}000 words)

## 저널 설정
- 저널: {저널명}
- 스타일: {APA 7th / Vancouver / 한국수산과학회 등}
- 언어: {한국어 / English}
- 구조: {서론 → 재료 및 방법 → 결과 → 고찰 → 참고문헌}

{한국어인 경우}
## 한국어 작성 규칙
- 문체: 학술 논문체 (~하였다, ~이다, ~나타났다)
- 능동태 선호 (수동태 최소화)
- 통계 기호는 영문 이탤릭 유지 (*F*, *p*, *t*)
- 학술 용어 첫 등장 시 영문 병기: 종 다양성(species diversity)
{/한국어}

## 섹션별 지침
### 서론 작성 지침
- [배경 이론] 태그 문헌으로 연구 배경 서술
- [비교 데이터] 태그 문헌으로 선행연구 검토
- 연구 목적과 가설(또는 연구 질문)을 마지막 단락에 명시

### 재료 및 방법 작성 지침
- 데이터 수집 과정: "연구 개요"의 데이터 설명 기반
- 통계 방법: 각 분석의 "method" 필드를 순서대로 기술
- 가정 검정 결과를 방법 서술에 포함
- 소프트웨어 인용: "BioHub (SciPy 기반)"

### 결과 작성 지침
- Table/Figure 번호를 본문에서 반드시 참조 (예: "Table 1에 제시된 바와 같이")
- 해석 없이 사실만 서술
- 통계량 보고 형식: F(df1, df2) = 값, p = 값, 효과크기

### 고찰 작성 지침
- 주요 발견 요약 → 선행연구와 비교 → 시사점 → 한계 → 결론
- "추가 맥락"의 내용을 반영
- [방법론 근거] 태그 문헌으로 방법론 정당화

### 통계 보고 형식 예시
- t검정: "*t*(28) = 2.45, *p* = .021, Cohen's *d* = 0.89"
- ANOVA: "*F*(2, 117) = 4.23, *p* = .017, η² = .067"
- 상관: "*r*(58) = .42, *p* < .001"

---

## 1. 연구 개요
- 제목: {제목}
- 목적: {연구 목적}
- 연구 질문 또는 가설: {선택 — 탐색적 연구는 연구 질문만}
- 데이터: {자동 생성 초안 — 기간, 지역, 샘플 수, 데이터 파일 정보}

---

## 2. 분석 결과 (구조화 데이터)

```json
{
  "analyses": [
    {
      "id": "ANAL-01",
      "method": "One-way ANOVA",
      "label": "Table 2",
      "section": "results",
      "dependent": "Shannon 다양성 지수 (H')",
      "independent": "해역",
      "groups": ["A", "B", "C"],
      "assumptions": {
        "normality": {"test": "Shapiro-Wilk", "W": 0.983, "p": 0.23, "met": true},
        "homogeneity": {"test": "Levene", "F": 0.91, "p": 0.41, "met": true}
      },
      "result": {"F": 4.23, "df": [2, 117], "p": 0.017},
      "effectSize": {"type": "eta-squared", "value": 0.067, "interpretation": "medium"},
      "groupStats": [
        {"group": "A", "mean": 2.1, "sd": 0.45, "n": 40},
        {"group": "B", "mean": 2.8, "sd": 0.52, "n": 40},
        {"group": "C", "mean": 2.3, "sd": 0.41, "n": 40}
      ],
      "interpretation": "해역 간 종 다양성에 유의한 차이가 있음",
      "paperMapping": "Methods 2.3, Results 3.2"
    }
  ]
}
```

---

## 3. 그래프

### [Figure 1] 해역별 종 다양성 비교
- **유형**: 박스플롯
- **X축**: 해역 (A, B, C)
- **Y축**: Shannon 다양성 지수 (H')
- **패턴 요약**: 해역 B의 중앙값(2.8)이 A(2.1), C(2.3)보다 높음. A에서 이상치 2개. IQR은 B가 가장 넓음(0.9).
- **관련 분석**: ANAL-01 (ANOVA), ANAL-02 (Tukey HSD)
- **캡션 제안**: 남해 3개 해역의 Shannon 다양성 지수 분포. 중앙선은 중앙값, 박스는 IQR.
- **이미지**: 별도 첨부 파일 참조 (Figure_1.png)

---

## 4. 참고문헌 목록
- Kim J, Park S (2024). Marine biodiversity in Korean waters. J Marine Sci, 45(2), 123-135. — [방법론 근거]
  - 요약: 남해 저서생물 군집에 Shannon 다양성 지수 적용, 계절별 변동 확인. H' 범위 1.2-3.4.
- Park H, Lee Y (2025). Seasonal variation of species diversity. Ocean Res, 12(1), 45-58. — [비교 데이터]
  - 요약: 동해 연안 종 다양성 조사, 여름철 최고치 보고.
- Shannon CE (1948). A mathematical theory of communication. Bell Syst Tech J, 27, 379-423. — [배경 이론]
  - 요약: Shannon 다양성 지수(H')의 원론적 정의.

---

## 5. 추가 맥락 (선택)
- 선행연구와 차이점: {사용자 입력}
- 연구의 한계: {사용자 입력}
- 강조할 발견: {사용자 입력}
- 이론적 시사점: {사용자 입력}
- 실무적/정책적 시사점: {사용자 입력}
- 후속 연구 제안: {사용자 입력}

---

## 검증 체크리스트 (논문 완성 후 대조용)
| 분석 ID | 핵심 수치 | 확인 |
|---------|----------|------|
| ANAL-01 | F(2,117) = 4.23, p = .017, η² = .067 | [ ] |
| ANAL-02 | A-B: p = .012 | [ ] |
```

---

## 3. 조립 페이지 UX 설계

### 3-1. 페이지 흐름 (5단계)

진입: 프로젝트 상세 페이지 탭 또는 `/papers/package?projectId=xxx`

```
┌──────────────────────────────────────────────────────┐
│  Step 1: 연구 개요                                    │
│  ┌────────────────────────────────────────────┐      │
│  │ 제목: [___________] (paperConfig에서 자동채움)│      │
│  │ 목적: [___________]                         │      │
│  │ 연구 질문 또는 가설: [___________] (선택)     │      │
│  │ 데이터 설명: [자동 생성 초안___] (편집 가능)   │      │
│  │                                             │      │
│  │ (비워둬도 AI가 처리합니다) 안내 표시          │      │
│  └────────────────────────────────────────────┘      │
├──────────────────────────────────────────────────────┤
│  Step 2: 결과 배치 + 태깅                              │
│  ┌────────────────────────────────────────────┐      │
│  │ [↑][↓] 기술통계 (descriptive)  [Table 1▼] [Results▼] │
│  │ [↑][↓] One-way ANOVA          [Table 2▼] [Results▼] │
│  │ [↑][↓] Post-hoc Tukey         [분석 3 ▼] [Results▼] │
│  │ [↑][↓] 박스플롯               [Fig. 1 ▼] [Results▼] │
│  │ [↑][↓] 라인 그래프            [Fig. 2 ▼] [Results▼] │
│  │                                             │      │
│  │ 자동 추론: 기술통계→Table 1, 가정검정→Methods  │      │
│  │ 위/아래 화살표로 순서 변경, 체크박스로 제외     │      │
│  └────────────────────────────────────────────┘      │
├──────────────────────────────────────────────────────┤
│  Step 3: 문헌                                         │
│  ┌────────────────────────────────────────────┐      │
│  │ 입력 방식: [Citation Store ▼] / [BibTeX 업로드] / [수동 입력] │
│  │                                             │      │
│  │ ☑ Kim et al. (2024) [방법론 근거▼] [요약 편집]│      │
│  │ ☑ Park & Lee (2025) [비교 데이터▼] [요약 편집]│      │
│  │ ☑ Shannon (1948)    [배경 이론 ▼] [요약 편집]│      │
│  │ ☐ Lee et al. (2023) (미선택)                │      │
│  │                                             │      │
│  │ 역할 태깅: Flash Lite 자동 제안 → 사용자 확인  │      │
│  │ [역할 태깅 건너뛰기] 옵션 있음                │      │
│  └────────────────────────────────────────────┘      │
├──────────────────────────────────────────────────────┤
│  Step 4: 저널 설정 + 추가 맥락                         │
│  ┌────────────────────────────────────────────┐      │
│  │ 저널: [한국수산과학회지   ▼] (paperConfig 자동)│      │
│  │ 스타일: [APA 7th        ▼]                  │      │
│  │ 언어: [한국어            ▼]                  │      │
│  │ ─────────────────────────────────────       │      │
│  │ 선행연구와 차이점: [___________] (선택)       │      │
│  │ 연구의 한계: [___________] (선택)            │      │
│  │ 강조할 발견: [___________] (선택)            │      │
│  │ 이론적 시사점: [___________] (선택)          │      │
│  │ 실무적/정책적 시사점: [___________] (선택)    │      │
│  │ 후속 연구 제안: [___________] (선택)          │      │
│  └────────────────────────────────────────────┘      │
├──────────────────────────────────────────────────────┤
│  Step 5: 미리보기 + Export                             │
│  ┌────────────────────────────────────────────┐      │
│  │ [미리보기]  [클립보드 복사]  [.md 다운로드]   │      │
│  │                                             │      │
│  │ 그래프 이미지: [이미지 zip 다운로드] (선택)   │      │
│  │                                             │      │
│  │ ## AI에게 보내는 법                          │      │
│  │ 1. [클립보드 복사] 클릭                      │      │
│  │ 2. Claude/ChatGPT/Gemini 채팅에 붙여넣기     │      │
│  │ 3. (선택) 이미지 zip의 Figure 파일 함께 첨부  │      │
│  │                                             │      │
│  │ (미리보기: 조립된 패키지 전체 표시)            │      │
│  │ ───────────────────────────────────         │      │
│  │ [빠른 재export] — 이전 설정 유지, 변경 분석만 │      │
│  │                   업데이트 (저장된 패키지용)   │      │
│  └────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────┘

최초 사용 시: 예제 패키지("남해 어류 다양성 연구")가
채워진 상태로 표시 → 사용자가 구조를 이해한 후 자기 데이터로 교체
```

### 3-2. 데이터 소스 매핑

| Step | 데이터 소스 | 자동/수동 |
|------|-----------|----------|
| 1. 연구 개요 | `paperConfig`에서 자동 채움 + 분석 히스토리 메타데이터 | 자동 초안 + 수동 편집 |
| 2. 결과 배치 | 분석 히스토리 + Graph Studio (ProjectEntityRef 기반) | 자동 수집 + 자동 추론 + 수동 조정 |
| 3. 문헌 | Citation Store / BibTeX 업로드 / 수동 입력 | 역할 = AI 자동 제안 + 수동 확인 |
| 4. 저널+맥락 | `paperConfig` + 신규 입력 | 자동 채움 + 수동 입력 |
| 5. Export | 조립 엔진 | 자동 생성 |

### 3-3. 분석 결과의 export 포맷 (JSON)

분석 결과는 JSON으로 직렬화하여 AI가 구조적으로 소비:

```json
{
  "id": "ANAL-01",
  "method": "One-way ANOVA",
  "label": "Table 2",
  "section": "results",
  "dependent": "Shannon 다양성 지수 (H')",
  "independent": "해역",
  "groups": ["A", "B", "C"],
  "assumptions": {
    "normality": {"test": "Shapiro-Wilk", "W": 0.983, "p": 0.23, "met": true},
    "homogeneity": {"test": "Levene", "F": 0.91, "p": 0.41, "met": true}
  },
  "result": {"F": 4.23, "df": [2, 117], "p": 0.017},
  "effectSize": {"type": "eta-squared", "value": 0.067, "interpretation": "medium"},
  "groupStats": [
    {"group": "A", "mean": 2.1, "sd": 0.45, "n": 40},
    {"group": "B", "mean": 2.8, "sd": 0.52, "n": 40},
    {"group": "C", "mean": 2.3, "sd": 0.41, "n": 40}
  ],
  "interpretation": "해역 간 종 다양성에 유의한 차이가 있음",
  "paperMapping": "Methods 2.3, Results 3.2"
}
```

이점: 숫자 정밀도 보존, 구조적 일관성, AI hallucination 감소. `AnalysisResult` 타입을 거의 그대로 직렬화 가능.

### 3-4. 그래프의 export 포맷

```markdown
### [Figure 1] 해역별 종 다양성 비교 (ANAL-01 참조)

- **유형**: 박스플롯
- **X축**: 해역 (A, B, C)
- **Y축**: Shannon 다양성 지수 (H')
- **패턴 요약**: 해역 B의 중앙값(2.8)이 A(2.1), C(2.3)보다 높음.
  A에서 이상치 2개 관찰. IQR은 B가 가장 넓음(0.9).
- **관련 분석**: ANAL-01 (ANOVA, p = 0.017), ANAL-02 (Tukey HSD)
- **캡션 제안**: 남해 3개 해역의 Shannon 다양성 지수 분포. 중앙선은 중앙값, 박스는 IQR.
- **이미지**: 별도 첨부 파일 (Figure_1.png) — 선택사항
```

패턴 요약은 BioHub의 기술통계 데이터에서 **자동 생성**. 이미지 없이도 AI가 Figure를 참조하는 문장 작성 가능.

### 3-5. 문헌의 export 포맷

```markdown
- Kim J, Park S (2024). Marine biodiversity in Korean waters. J Marine Sci, 45(2), 123-135.
  - **역할**: [방법론 근거]
  - **요약**: 남해 저서생물 군집에 Shannon 다양성 지수 적용, 계절별 변동 확인. H' 범위 1.2-3.4.
```

**요약 필드 필수** — 요약 없이는 AI가 서론의 선행연구 검토를 hallucination으로 채움.

---

## 4. 기술 구현 방향

### 4-1. 라우트

```
/papers/package          — 패키지 조립 페이지
/papers/package/[id]     — 저장된 패키지 편집
```

또는 프로젝트 상세 페이지 내 탭으로 통합 (UX 검토 후 결정).

### 4-2. 핵심 타입

```typescript
interface PaperPackage {
  id: string;
  projectId: string;
  version: number;                    // 1차 제출, 수정본 등

  // Step 1: 연구 개요 (paperConfig에서 자동 채움 + 추가 필드)
  overview: {
    title: string;                    // paperConfig.title 기본값
    purpose: string;
    researchQuestion?: string;        // 탐색적 연구용
    hypothesis?: string;              // 가설 기반 연구용 (선택)
    dataDescription: string;          // 자동 생성 초안 + 편집
  };

  // Step 2: 결과 배치
  items: PackageItem[];               // 순서 있는 배열

  // Step 3: 문헌
  references: PackageReference[];

  // Step 4: 저널 설정 + 추가 맥락
  journal: JournalPreset;

  context: {
    priorWorkDiff?: string;
    limitations?: string;
    highlights?: string;
    theoreticalImplications?: string;
    practicalImplications?: string;
    futureResearch?: string;
  };

  createdAt: string;
  updatedAt: string;
}

interface PackageItem {
  id: string;
  type: 'analysis' | 'figure' | 'table';
  sourceId: string;                   // analysisHistoryId 또는 graphId
  // ProjectEntityRef.entityId와 호환
  analysisId: string;                 // 분석 간 cross-reference용 ("ANAL-01")
  label: string;                      // "Table 1", "Figure 2"
  section: 'results' | 'methods' | 'discussion';
  order: number;
  included: boolean;                  // 체크박스로 제외 가능
}

interface PackageReference {
  id: string;
  // Citation store 연결 (있으면)
  citationId?: string;
  // Citation store 없이도 작동 (BibTeX/수동 입력)
  manualEntry?: {
    authors: string;
    year: number;
    title: string;
    journal: string;
    volume?: string;
    issue?: string;
    pages?: string;
    doi?: string;
  };
  role: 'methodology' | 'comparison' | 'background' | 'theory' | 'other';
  summary?: string;                   // 1-2문장 핵심 내용 (서론 hallucination 방지 필수)
  included: boolean;
}

interface JournalPreset {
  name: string;
  style: string;                      // 'apa7' | 'vancouver' | 'custom'
  sections: string[];                 // ['서론', '재료 및 방법', '결과', '고찰', '참고문헌']
  language: 'ko' | 'en';
  referenceFormat: string;            // 형식 규칙 설명
  referenceExample: string;           // 예시 1개
  writingStyle?: string;              // "하다체, 능동태, 영문 병기"
}
```

### 4-3. 조립 엔진

```typescript
function assemblePaperPackage(pkg: PaperPackage): AssemblyResult {
  // 1. 역할 + 핵심 규칙 + 출력 형식 (Markdown)
  // 2. 저널 설정 + 한국어 규칙 (해당 시) (Markdown)
  // 3. 섹션별 지침 + 통계 보고 예시 (Markdown)
  // 4. 연구 개요 (Markdown)
  // 5. 분석 결과 (JSON 블록)
  // 6. 그래프 (Markdown — 패턴 요약 자동 생성)
  // 7. 참고문헌 (Markdown — 요약 포함)
  // 8. 추가 맥락 (Markdown)
  // 9. 검증 체크리스트 (자동 생성 — 핵심 수치 대조표)
  // → { markdown: string, images: ImageFile[] }
}

interface AssemblyResult {
  markdown: string;                   // 전체 패키지 텍스트
  images: ImageFile[];                // Figure 이미지 파일 목록
  tokenEstimate: number;              // 추정 토큰 수 (사용자 안내용)
}
```

### 4-4. Export 방식

| 방식 | 설명 | 우선순위 |
|------|------|---------|
| 클립보드 복사 | 패키지 텍스트 → AI 채팅에 붙여넣기 | **1순위** (MVP) |
| .md 파일 다운로드 | 파일로 저장 → AI에 파일 업로드 | 1순위 |
| 이미지 zip | Figure 파일 별도 다운로드 (선택) | 1순위 |
| .json 구조화 | 프로그래밍 가능한 포맷 (API 연동용) | 2순위 |

### 4-5. 그래프 전달 전략

| 방법 | 채택 | 이유 |
|------|------|------|
| **텍스트 패턴 요약** (기본) | **기본** | 기술통계에서 자동 생성, 토큰 효율적, 이미지 없이도 AI가 참조 가능 |
| 별도 이미지 파일 | **선택** | 사용자가 AI 채팅에 수동 첨부 |
| ~~base64 인라인~~ | **제거** | 8장 = 120K~480K 토큰, 실용적 이점 없음 |

### 4-6. 필요한 헬퍼 함수 (기존 코드베이스 보완)

```typescript
// 분석 히스토리 — projectId 필터링 (현재 getAllHistory()만 있음)
function getHistoryByProjectId(projectId: string): Promise<HistoryRecord[]>

// Graph Studio — projectId 필터링
function listProjectGraphs(projectId: string): GraphProject[]

// 그래프 패턴 요약 자동 생성 (기술통계 기반)
function generateFigurePatternSummary(graph: GraphProject): string
```

---

## 5. 저널 프리셋 (초기)

| 프리셋 | 스타일 | 구조 | 참고문헌 예시 | 비고 |
|--------|--------|------|-------------|------|
| 한국수산과학회지 | 자체 | 서론/재료 및 방법/결과/고찰/참고문헌 | 김철수, 박영희 (2024). 남해 저서동물 군집. 한국수산과학회지, 57(2), 123-135. | 한국어, HWP |
| 한국해양학회지 | 자체 | 서론/방법/결과/토의/참고문헌 | | 한국어 |
| APA 7th (범용) | APA | Introduction/Method/Results/Discussion/References | Kim, J., & Park, S. (2024). Marine biodiversity. *J Marine Sci*, *45*(2), 123-135. | 영어 |
| IMRAD (범용) | Vancouver | Intro/Methods/Results/Discussion | | 영어 |
| 사용자 정의 | 커스텀 | 섹션명 직접 입력 | | 저장 가능 |

---

## 6. 버전 관리

패키지는 프로젝트에 버전별로 저장:

```
프로젝트: 남해 종 다양성 연구
├── 패키지 v1 (2026-04-03) — 1차 투고용
├── 패키지 v2 (2026-06-15) — Reviewer 1차 수정 (분석 3 추가)
└── 패키지 v3 (2026-07-20) — Reviewer 2차 수정 (Figure 2 교체)
```

버전 간 diff:
- 추가된 분석/그래프
- 변경된 통계 결과
- 수정된 문헌 목록

빠른 재export: 저장된 패키지에서 이전 설정 유지, 변경된 분석만 업데이트.

---

## 7. 구현 단계

Stage 구분 = **"정교함 수준"** (MVP에서도 end-to-end 논문 생성 가능)

### Stage 1: MVP — 전체 흐름 최소 구현

5단계 전부 포함하되, 각 단계를 최소 구현:

- 연구 개요: paperConfig 자동 채움 + 간단 폼
- 결과 배치: 프로젝트 연결 분석/그래프 자동 수집 + 위/아래 버튼 순서 + **Table/Figure 태깅 + 섹션 자동 추론**
- 문헌: **Citation Store 없이도 작동** — BibTeX/RIS 업로드 또는 수동 텍스트 입력. 요약은 수동 입력
- 저널+맥락: 프리셋 3개 + 맥락 선택 필드
- Export: 하이브리드 Markdown+JSON 클립보드 복사 + .md 다운로드 + 이미지 zip
- 방어적 프롬프트 + 검증 체크리스트 자동 생성
- 예제 패키지 ("남해 어류 다양성 연구") 내장

### Stage 2: 자동화/정교화

- Citation Store 연동 (Phase 6 완료 후)
- Flash Lite 기반 문헌 역할 자동 제안
- 그래프 패턴 요약 자동 생성
- 섹션 자동 추론 고도화
- 빠른 재export 기능
- AI에게 보내는 법 가이드 (Claude/GPT/Gemini별)

### Stage 3: 고급 기능

- 분야별 프롬프트 템플릿
- 패키지 버전 관리 + diff
- 저널 프리셋 확장 (사용자 커스텀)
- 개별 분석 부분 export (Reviewer 코멘트 대응)
- 토큰 추정 표시

---

## 8. 선행 의존성

| 의존성 | 상태 | 필요 이유 | MVP 차단? |
|--------|------|----------|----------|
| ResearchProject 모델 | 있음 | 프로젝트별 결과 수집 | No |
| 분석 히스토리 | 있음 (필터 함수 추가 필요) | 통계 결과 가져오기 | No |
| Graph Studio | 있음 (필터 함수 추가 필요) | 그래프 가져오기 | No |
| Entity System | 있음 | 분석/그래프 연결 조회 | No |
| Citation store | **진행 중** (Phase 6) | 문헌 자동 수집 | **No** — BibTeX/수동 입력 대안으로 MVP 가능 |
| paperConfig | 있음 | 제목/저널/언어 자동 채움 | No |

**MVP는 Citation Store 없이 착수 가능.** BibTeX 업로드 + 수동 입력으로 문헌 기능 제공.

---

## 9. AI 소비 최적화 참고

### 토큰 추정 (일반적 생물학 논문 패키지)

| 섹션 | 추정 토큰 |
|------|----------|
| 지시사항 + 규칙 + 섹션별 지침 | ~800 |
| 연구 개요 | ~300 |
| 분석 결과 JSON (10개 분석) | ~3,000 |
| Markdown 표 (5개) | ~1,500 |
| 그래프 패턴 요약 (8개) | ~1,200 |
| 참고문헌 + 요약 (20개) | ~2,500 |
| 추가 맥락 | ~300 |
| 검증 체크리스트 | ~200 |
| **합계** | **~10K** |

128K 컨텍스트 모델에서 전체 용량의 8% — **매우 여유로움**.

### 주요 실패 모드와 대응

| 실패 모드 | 위험도 | 대응 |
|----------|--------|------|
| 숫자 환각 (수치 잘못 인용) | 높음 | 핵심 규칙 #1 + 검증 체크리스트 |
| 문헌 내용 날조 | 매우 높음 | 문헌 요약 필드 필수 |
| 인과관계 과잉 해석 | 중간 | 핵심 규칙 #5 |
| 섹션 간 불일치 | 중간 | 분석 고유 ID + cross-reference |
| 표본 크기 불일치 | 중간 | 각 분석의 유효 n 명시 (JSON) |

---

## 10. HWP 이관 안내 (export에 포함)

```markdown
## AI 출력물 → 한글(HWP) 이관 안내
1. Markdown 표 → 한글 [표 삽입] → 탭 구분 텍스트 붙여넣기
2. 이탤릭(*F*, *p*) → 한글에서 수동 이탤릭 적용
3. 참고문헌 → 한글 각주/참고문헌 스타일 적용
4. Figure → 한글 [그림 넣기]로 이미지 파일 삽입
```
