# BioHub 플랫폼 비전

**문서 작성일**: 2026-02-27
**상태**: 전략 수립 완료, 구현 시작 전

---

## 1. 플랫폼 한 줄 정의

**연구자를 위한 올인원 생물학 연구 플랫폼**
— 통계 분석, 데이터 시각화, 생물학 도구, 학명 검증, 논문 조사를 하나의 플랫폼에서.

---

## 2. 플랫폼 구조

```
BioHub 플랫폼
│
├── 통계 분석 (Smart Flow)          ✅ 완성 (43개 메서드)
│   └── /                           메인 진입점
│
├── 생물학 도구 (Bio-Tools)          🔜 Phase 15 진행 중
│   └── /bio-tools/*                12개 분석, 5페이지
│
├── 데이터 시각화 (Graph Studio)     📋 이번 설계 대상
│   └── /graph-studio/*             논문용 학술 그래프
│
├── 학명 검증 (Species Checker)      📋 통합 예정
│   └── /species-checker/*          별도 레포: dayoumin/species_checker
│
└── 논문 조사 (Literature)           📋 향후 추가
    └── /literature/*               논문 검색·관리
```

### 2-1. 각 모듈의 독립성

각 모듈은 **독립 실행 가능**해야 한다.

- 통계 분석만 쓰는 사용자 → Smart Flow만 사용
- 그래프만 필요한 사용자 → Graph Studio에 CSV 직접 업로드
- 학명만 확인하는 사용자 → Species Checker만 사용
- 전체 워크플로우 → 통계 분석 → 결과를 Graph Studio로 전달 → 논문 그래프 생성

### 2-2. 모듈 간 데이터 흐름

모듈은 독립적이되, **데이터를 주고받을 수 있다**.

```
┌─────────────────┐
│   Smart Flow    │──── 분석 결과 (평균, CI, p값) ────┐
│   통계 분석      │                                   ▼
└─────────────────┘                           ┌──────────────┐
                                              │ Graph Studio │
┌─────────────────┐                           │ 데이터 시각화  │
│   Bio-Tools     │──── 생물 데이터 ──────────→│              │
│   생물학 도구    │    (종 분포, 계통수 등)     └──────┬───────┘
└─────────────────┘                                   │
                                                      ▼
┌─────────────────┐                           ┌──────────────┐
│ Species Checker │  (독립)                   │    Export     │
│   학명 검증      │                           │  PDF/SVG/PNG │
└─────────────────┘                           └──────────────┘

┌─────────────────┐
│   Literature    │  (독립, 향후 추가)
│   논문 조사      │
└─────────────────┘
```

### 2-3. 공유 데이터 레이어

```typescript
// 모듈 간 데이터 전달 계약
interface DataPackage {
  id: string;
  source: 'smart-flow' | 'bio-tools' | 'upload' | 'species-checker';
  label: string;
  columns: ColumnMeta[];
  data: Record<string, unknown[]>;
  context?: {
    method?: string;
    summary?: Record<string, unknown>;
  };
}
```

| 저장소 | 용도 | 단계 |
|--------|------|------|
| IndexedDB (브라우저) | 원본 데이터, 분석 결과, 임시 chartSpec | MVP |
| Turso (클라우드) | 프로젝트 메타데이터, 확정 chartSpec, 프리셋, 사용자 설정 | MVP 이후 |
| R2/KV (Cloudflare) | 정적 자산, 캐시 | 향후 |

---

## 3. 기술 스택

### 3-1. 공통 (현행 유지)

| 항목 | 기술 | 비고 |
|------|------|------|
| 프레임워크 | Next.js 15 (App Router) | React 19 |
| 언어 | TypeScript 5 (strict) | `any` 금지 |
| UI | shadcn/ui + Tailwind CSS 4 | Radix 기반 |
| 상태 관리 | Zustand | 모듈별 독립 store |
| 통계 계산 | Pyodide + SciPy/statsmodels | Web Worker |
| AI | OpenRouter (주) + Ollama (로컬) | adapter 구조 |
| 배포 (웹) | Cloudflare Pages | 정적 export |
| 배포 (데스크탑) | Tauri | 향후 |

### 3-2. Graph Studio 전용

| 항목 | 기술 | 선택 이유 |
|------|------|-----------|
| 미리보기 렌더링 | **Vega-Lite** | JSON 선언형 spec → AI patch 최적, 학술 커뮤니티 채택 |
| 학술 export | **Pyodide + Matplotlib** | 브라우저 내 로컬 실행, 서버 비용 0 |
| 학술 프리셋 | rcParams preset (SciencePlots 조건부) | LaTeX 미의존 fallback 포함 |
| 내부 명세 | **chartSpec** (Zod 스키마) | 모든 것의 기초: 미리보기, AI, export, 저장 |
| AI 역할 | chartSpec patch 엔진 | 코드 생성 X, spec 수정 O |

---

## 4. Graph Studio 상세 전략

### 4-1. 핵심 원칙

> **"Spec 중심 설계"**
> — chartSpec이 흔들리면 AI도 preview도 export도 흔들린다.
> — chartSpec만 잘 잡으면 모델·renderer·플랫폼 변화에도 흔들리지 않는다.

### 4-2. 아키텍처

```
사용자 요청                    AI (spec patch)
    │                              │
    ▼                              ▼
┌──────────┐   자연어    ┌──────────────┐   JSON patch
│  데이터   │──────────→│  AI Adapter  │──────────→┐
│  업로드   │            └──────────────┘           │
└──────────┘                                       ▼
    │                                        ┌──────────┐
    └──→ chartSpec 생성 ←────── patch 적용 ──│ chartSpec │
                │                             └──────────┘
                │                                  │
         ┌──────┴──────┐                    ┌──────┴──────┐
         ▼             ▼                    ▼             ▼
    ┌──────────┐  ┌──────────┐        ┌──────────┐  ┌──────────┐
    │ Vega-Lite│  │Matplotlib│        │   저장    │  │  히스토리  │
    │ Preview  │  │  Export  │        │ (DB/IDB) │  │  (undo)  │
    └──────────┘  └──────────┘        └──────────┘  └──────────┘
```

### 4-3. AI 전략

| 원칙 | 설명 |
|------|------|
| Spec patch 엔진 | AI는 코드를 생성하지 않고, chartSpec의 일부 필드만 patch |
| Zero-Data Retention | AI에 데이터 값 전송 X, 컬럼명 + spec만 전송 |
| Adapter 구조 | 특정 모델에 올인 X, provider 교체 가능 |
| 비용 분리 | 단순 수정 → 저가 모델, 복잡한 변환 → 상위 모델 |
| 기존 인프라 활용 | `llm-recommender.ts`의 fallback chain 확장 |

자연어 편집 예시:
```
"X축 라벨 45도 회전" → encoding.x.axis.labelAngle: -45
"에러바 추가"       → encoding.y에 errorband layer 추가
"IEEE 스타일로"     → style.preset: "ieee"
"범례 오른쪽 위로"   → legend.orient: "top-right"
```

### 4-4. Export 전략

| 포맷 | 엔진 | 우선순위 |
|------|------|----------|
| SVG | Vega-Lite 직접 export | MVP 1순위 |
| PNG | Vega-Lite canvas export 또는 Matplotlib | MVP 1순위 |
| PDF | Matplotlib (별도 Worker) | MVP 2순위 |
| TIFF | Matplotlib (300/600 DPI) | 향후 |

학술 프리셋:
- `default` — 깔끔한 기본 스타일
- `science` — Nature/Science 유사 (serif 폰트, 깔끔한 축)
- `ieee` — IEEE 흑백 (grayscale, 패턴 구분)
- `grayscale` — 흑백 전용 (인쇄 친화)

### 4-5. MVP 범위

**보장할 것:**
- CSV/Excel 업로드
- 기본 차트 7종: line, bar, scatter, boxplot, histogram, error bar, grouped bar
- 자연어 편집 5~8개 핵심 명령
- SVG/PNG export
- 학술 프리셋 3개
- chartSpec 저장/불러오기 (IndexedDB)

**보장하지 않을 것 (MVP 이후):**
- 모든 저널 형식 자동 대응
- CMYK/EPS 완전 보장
- LaTeX 완전 재현
- Smart Flow 결과 자동 연동
- Turso 클라우드 저장

### 4-6. Matplotlib Worker 격리

기존 통계 Worker(1-4)와 분리하여 성능 영향 방지:

```
기존 Pyodide Worker Pool
├── Worker 1: descriptive (유지)
├── Worker 2: hypothesis (유지)
├── Worker 3: nonparametric-anova (유지)
├── Worker 4: regression-advanced (유지)
│
신규 (Graph Studio 전용)
└── Worker 5: graph-export (matplotlib + rcParams)
    └── 지연 로딩: Graph Studio 진입 시에만 초기화
```

---

## 5. 모듈별 로드맵

### Phase 15: Bio-Tools (현재 진행 중)

- 12개 생물학 분석 도구
- `/bio-tools/*` 5페이지
- 기존 Pyodide 인프라 활용

### Phase 17: Graph Studio

```
Stage 1: 아키텍처 PoC
├── chartSpec Zod 스키마 정의
├── CSV 업로드 → chartSpec 자동 생성
├── Vega-Lite preview 렌더링
└── Matplotlib PNG export (Worker 5)

Stage 2: AI 편집 UX
├── 자연어 명령 입력 UI
├── AI spec patch 엔진 (기존 LLM adapter 확장)
├── chartSpec diff/undo/redo
└── preview 실시간 반영

Stage 3: 학술 export
├── SVG/PNG export (고해상도)
├── PDF export (Matplotlib)
├── 학술 프리셋 3개 (science, ieee, grayscale)
└── DPI/크기 설정

Stage 4: 저장/복원
├── IndexedDB 프로젝트 저장
├── chartSpec 버전 관리
├── 불러오기/복원
└── (향후) Turso 클라우드 동기화

Stage 5: 모듈 연동
├── Smart Flow → Graph Studio 데이터 전달
├── Bio-Tools → Graph Studio 데이터 전달
└── DataPackage 표준 완성
```

### Phase 18: Species Checker 통합

- 기존 레포: `dayoumin/verified_species` (Python 데스크탑 앱, customtkinter)
- 보조 레포: `dayoumin/species-GPS` (Flutter 모바일 앱, 현장 데이터 수집)
- 핵심 기능: WoRMS(해양), LPSN(미생물), COL(일반) API 기반 학명 검증
- `/species-checker/*` 라우트로 웹 버전 구현
- 독립 모듈로 운영
- 참고: 외부 API 호출 필요 → 서버 사이드(Workers) 또는 클라이언트 직접 호출 검토

### Phase 19: Literature (논문 조사)

- 논문 검색/관리 도구
- `/literature/*` 라우트
- AI 기반 논문 요약/분석

---

## 6. 배포 전략

### 현행 (유지)

```toml
# wrangler.toml
[assets]
directory = "./stats/out"
not_found_handling = "single-page-application"
```

- `output: 'export'` (정적 HTML)
- 모든 계산은 클라이언트 (Pyodide)
- AI 호출은 클라이언트에서 직접

### 향후 필요 시

| 시나리오 | 대응 |
|----------|------|
| AI API 키 보호 필요 | Workers function 추가 |
| 서버 사이드 렌더링 필요 | Workers 전환 검토 |
| 사용자 인증 필요 | Workers + D1/KV |
| 파일 저장 필요 | R2 연동 |

기본 방침: **Pages 유지, 필요한 기능만 Workers로 점진적 추가**

---

## 7. 네비게이션 구조 (목표)

```
┌───────────────────────────────────────────────────────────┐
│  BioHub    통계분석    생물도구    그래프    학명검증    논문  │
│            (Smart     (Bio-     (Graph   (Species  (Lit-  │
│             Flow)     Tools)   Studio)  Checker) erature)│
└───────────────────────────────────────────────────────────┘
```

각 탭은 독립적인 SPA 영역. 공통 헤더/네비게이션만 공유.

---

## 8. 성공 기준

| 기준 | 측정 |
|------|------|
| chartSpec 안정성 | spec 변경 없이 renderer 교체 가능 |
| AI 편집 성공률 | 자연어 명령 → 올바른 patch 80%+ |
| Export 품질 | 300 DPI PNG가 저널 제출 기준 충족 |
| 초기 로딩 | Graph Studio 진입 후 10초 내 미리보기 |
| 모듈 독립성 | 각 모듈 단독 사용 시 다른 모듈 로딩 없음 |

---

## 9. 장기 전략

> **교체 가능한 구조를 먼저 만든다.**

| 교체 가능해야 하는 것 | 고정되어야 하는 것 |
|----------------------|-------------------|
| AI 모델/공급자 | chartSpec 스키마 |
| Preview renderer (Vega-Lite → 향후 대안) | DataPackage 인터페이스 |
| Export renderer (Matplotlib → 향후 대안) | 모듈 간 데이터 계약 |
| 배포 플랫폼 | 타입 시스템 (TypeScript strict) |
| 저장소 (IndexedDB → Turso → 기타) | 테스트 커버리지 |
