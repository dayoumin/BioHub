# 사회과학 도메인 확장 계획 — 검증 보고서

**작성일**: 2026-03-13
**목적**: 기존 통계 플랫폼을 사회과학 분야로 확장 가능한지 점검 + 구현 계획 수립
**비교 대상**: Bio-Tools 12개 (PLAN-BIO-STATISTICS-AUDIT.md)

---

## 1. Bio-Tools vs 사회과학: 근본적 차이

### Bio-Tools = 완전 신규 구현 (12개 전부)

Bio-Tools 12개는 기존 51개 통계 메서드와 **하나도 겹치지 않는다**.
모두 생태학/수산학/집단유전학 전용 알고리즘이므로 별도 Worker + 별도 UI 필요.

| Bio-Tools | 기존 메서드 재사용 | 비고 |
|-----------|:-:|------|
| Alpha Diversity (Shannon, Simpson 등) | ✗ | 생태학 전용 수식 |
| Rarefaction Curve | ✗ | 종 누적 곡선 |
| Beta Diversity (Bray-Curtis, Jaccard) | ✗ | 거리 행렬 |
| NMDS | ✗ | 비계량 다차원 척도 |
| PERMANOVA | ✗ | 순열 기반 검정 |
| Mantel Test | ✗ | 거리행렬 상관 |
| von Bertalanffy Growth | ✗ | 어류 성장 모델 |
| Length-Weight Relationship | ✗ | W = aL^b |
| Meta-Analysis | ✗ | Forest plot + I² |
| ROC/AUC | △ | Smart Flow에도 있으나 Bio-Tools는 SDM 특화 |
| ICC | ✗ | Smart Flow 미구현 |
| Hardy-Weinberg | ✗ | 집단유전학 QC |

### 사회과학 = 기존 메서드의 80%+ 재사용 가능

사회과학 연구에서 가장 많이 쓰이는 통계 기법은 이미 구현되어 있다.
**용어(terminology) 도메인만 추가하면 즉시 사회과학 UI로 전환 가능.**

---

## 2. 기존 메서드의 사회과학 활용도 분류

### Tier 1: 사회과학 핵심 (이미 구현, 그대로 사용) — 18개

| 메서드 ID | 사회과학 활용 | 분야 |
|----------|------------|------|
| `t-test` | 실험군/통제군 비교 | 심리, 교육, 경영 |
| `welch-t` | 등분산 미충족 시 | 전 분야 |
| `one-sample-t` | 모집단 평균 검증 | 전 분야 |
| `paired-t` | 사전-사후 비교 | 교육, 심리 |
| `anova` | 3+ 집단 비교 | 전 분야 |
| `repeated-measures-anova` | 종단 연구, 반복 실험 | 심리, 교육 |
| `ancova` | 공변량 통제 비교 | 교육, 심리 |
| `mann-whitney` | 비정규 2그룹 비교 | 전 분야 |
| `kruskal-wallis` | 비정규 3+ 그룹 | 전 분야 |
| `wilcoxon` | 비정규 사전-사후 | 전 분야 |
| `correlation` | 변수 간 관계 | 전 분야 |
| `partial-correlation` | 통제 후 관계 | 전 분야 |
| `regression` | 예측 모형 | 경제, 마케팅, 정책 |
| `logistic-regression` | 이진 결과 예측 | 정치, 마케팅 |
| `ordinal-regression` | 순서형 종속변수 (만족도, 동의수준) | 설문조사 |
| `chi-square-independence` | 범주형 변수 관련성 | 설문 교차분석 |
| `reliability` | Cronbach α 척도 신뢰도 | 심리, 교육 필수 |
| `power-analysis` | 표본 크기 산출 | 연구 설계 |

### Tier 2: 유용하지만 빈도 낮음 (이미 구현) — 14개

| 메서드 ID | 사회과학 활용 | 비고 |
|----------|------------|------|
| `manova` | 다변량 종속변수 비교 | 교육, 심리 |
| `mixed-model` | 다수준/패널 데이터 | HLM 대용 가능 |
| `factor-analysis` | EFA 구인 타당도 | 척도 개발 필수 |
| `pca` | 차원 축소 | 다수 문항 축약 |
| `cluster` | 유형 분류/세분화 | 시장, 사회계층 |
| `discriminant` | 그룹 분류 | 마케팅 |
| `stepwise` | 자동 변수 선택 | 탐색적 회귀 |
| `friedman` | 비정규 반복측정 | 리커트 척도 |
| `mcnemar` | 대응 이진 변화 | 개입 효과 |
| `cochran-q` | 다중 대응 이진 | 다시점 이진 |
| `sign-test` | 방향성 검정 | 보조적 |
| `binomial-test` | 비율 검정 | 보조적 |
| `proportion-test` | 비율 비교 | 설문 분석 |
| `chi-square-goodness` | 분포 적합도 | 보조적 |

### Tier 3: 사회과학에서 드물게 사용 (이미 구현) — 13개

| 메서드 ID | 비고 |
|----------|------|
| `poisson` | 사건 빈도 (범죄학, 의료경제) |
| `arima`, `seasonal-decompose`, `stationarity-test`, `mann-kendall` | 시계열 (경제학) |
| `kaplan-meier`, `cox-regression` | 생존분석 (사회역학, 이직연구) |
| `roc-curve` | 진단/분류 성능 |
| `dose-response`, `response-surface` | 실험 최적화 (거의 미사용) |
| `runs-test`, `ks-test`, `mood-median` | 비모수 보조 |

### Tier 4: 추가 필요한 사회과학 전용 메서드 — 6~8개

| 메서드 | 필요도 | Pyodide 구현 가능성 | 비고 |
|--------|:---:|:---:|------|
| **ICC** (급내상관) | 높음 | ✅ `pingouin` | Bio-Tools와 공유 가능. Worker 설계 시 공용 모듈 필요 |
| **Cohen's Kappa** | 높음 | ✅ `sklearn.metrics` | 평가자 간 일치도. 소규모 구현 |
| **Mediation/Moderation** | 높음 | ✅ `statsmodels` + bootstrap | 매개/조절 효과. regression 확장 or 별도 |
| **Multilevel/HLM** | 중간 | ✅ `statsmodels.mixedlm` | 기존 `mixed-model` 확장 가능 |
| **CFA (확인적 요인분석)** | 높음 | ❌ `semopy` Pyodide 미지원 | **현재 구현 불가** — 순수 구현은 CLAUDE.md 규칙 위반 |
| **SEM (구조방정식)** | 높음 | ❌ `semopy` Pyodide 미지원 | **현재 구현 불가** — 동일 사유 |
| **IRT (문항반응이론)** | 중간 | ❌ R only (`mirt`) | JS/Python 검증 라이브러리 없음 |
| **Bland-Altman** | 낮음 | ✅ 수식 단순 | Bio audit에서 제외됨 (추론 통계 부족 비판) |

---

## 3. 기존 아키텍처 검증 (Terminology System)

### 현재 구조

```
stats/lib/terminology/
├── index.ts                    # Public API
├── terminology-types.ts        # 타입 정의 (2153줄, 도메인 확장 완전 준비됨)
├── terminology-context.tsx     # React Context + Registry
└── domains/
    ├── aquaculture.ts          # 수산과학 (기본값)
    └── generic.ts              # 범용 통계 (영어)
```

### 검증 결과

| 항목 | 상태 | 비고 |
|------|:---:|------|
| `TerminologyDictionary` 인터페이스 | ✅ | 10개 변수 타입 + 검증메시지 + UI텍스트 + SmartFlow + DecisionTree 완비 |
| `registerTerminology()` 함수 | ✅ | 존재하나 **수동 호출 필요** (자동 등록 아님) |
| `DomainSwitcher` UI 컴포넌트 | ✅ | 이미 존재. `medical`, `agriculture`까지 UI 매핑 있음 |
| `localStorage` 지속성 | ✅ | 사용자 선택 저장 |
| DecisionTree 도메인 대응 | ✅ | `DecisionTreeText` 용어사전 사용. 통계 로직은 도메인 무관 |
| 도메인별 메서드 필터링 | ❌ | 모든 도메인에서 51개 전체 노출 (필터링 미구현) |

### 주의사항

1. **`registerTerminology()`는 자동 등록이 아님**
   - `TERMINOLOGY_REGISTRY`는 모듈 스코프 객체
   - 새 도메인은 `terminology-context.tsx`에서 import + 레지스트리에 추가 필요
   - 또는 앱 초기화 시 `registerTerminology()` 호출

2. **generic 도메인은 영어**
   - `generic.ts`의 변수명: `Group Variable`, `Dependent Variable` 등
   - 사회과학 도메인은 한글로 새로 작성해야 함

3. **DomainSwitcher에 이미 미래 도메인 매핑 존재**
   ```typescript
   const DOMAIN_DISPLAY_NAMES = {
     aquaculture: { label: '수산과학', badge: '현재' },
     generic: { label: '범용 통계' },
     medical: { label: '의학 연구' },    // ← 미구현이지만 UI 준비됨
     agriculture: { label: '농업 과학' }  // ← 미구현이지만 UI 준비됨
   }
   ```
   → `social-science` 추가 시 여기에도 매핑 추가 필요

---

## 4. 이전 분석에서 발견된 오류 정정

| # | 이전 분석 | 실제 | 정정 |
|---|----------|------|------|
| 1 | "registerTerminology로 런타임 자동 등록" | 수동 호출 필요 | import + registry 추가 or registerTerminology() 호출 |
| 2 | "semopy wheel 미확인" → CFA/SEM 가능할 수도 | Bio audit에서 **semopy Pyodide 미지원 확인됨** | CFA/SEM은 현재 구현 불가 |
| 3 | "CFA를 factor-analysis 탭으로 추가" | 라이브러리 없으므로 불가 | CFA는 semopy 해결 전까지 보류 |
| 4 | "도메인별 DecisionTree 필요" | DecisionTreeText 용어사전으로 이미 대응. 추천 로직은 통계적이므로 도메인별 분리 불필요 | 용어만 바꾸면 됨 |
| 5 | "ICC를 Bio-Tools와 공유 가능" (단순 언급) | Bio-Tools ICC는 Worker 5/6에서 pingouin 직접 구현 계획. 공유하려면 Worker 설계 시 공용 모듈 설계 필요 | 단순 공유 아님, 설계 필요 |
| 6 | DomainSwitcher 미언급 | 이미 존재 + medical/agriculture UI 매핑까지 있음 | 사회과학 추가 시 이 컴포넌트만 업데이트 |
| 7 | generic 도메인 "한글" | 실제로는 영어 (Group Variable 등) | 사회과학용 한글 사전 별도 작성 필요 |

---

## 5. 구현 계획

### Phase S1: 도메인 추가 (1~2일)

**작업 범위**: 파일 1개 생성 + 기존 파일 2개 수정

1. **`stats/lib/terminology/domains/social-science.ts` 생성**
   - `TerminologyDictionary` 인터페이스 구현
   - 한글 사회과학 용어 (집단변수, 종속변수, 예측변수 등)
   - 분석 목적 예시를 사회과학 맥락으로 (설문, 실험, 척도 등)

2. **`stats/lib/terminology/terminology-context.tsx` 수정**
   - `import { socialScience } from './domains/social-science'`
   - `TERMINOLOGY_REGISTRY`에 추가

3. **`stats/lib/terminology/index.ts` 수정**
   - `export { socialScience } from './domains/social-science'`

4. **`stats/components/terminology/DomainSwitcher.tsx` 수정**
   - `DOMAIN_DISPLAY_NAMES`에 `'social-science': { label: '사회과학' }` 추가

**결과**: 기존 51개 메서드가 사회과학 용어로 즉시 사용 가능

### Phase S2: 저비용 메서드 추가 (3~5일)

**ICC, Cohen's Kappa, Mediation — Smart Flow에 추가**

| 메서드 | 구현 방식 | Worker | 예상 공수 |
|--------|----------|--------|----------|
| ICC (6가지 유형) | 신규 메서드 | 기존 Worker or Worker 5 공유 | 1일 |
| Cohen's Kappa | 신규 메서드 | `sklearn.metrics.cohen_kappa_score` | 0.5일 |
| Mediation | regression 확장 or 신규 | `statsmodels` + bootstrap | 1.5일 |
| Multilevel/HLM | `mixed-model` 확장 | `statsmodels.mixedlm` 이미 사용 | 1일 |

**ICC 공유 설계**: Bio-Tools Worker 5/6과 Smart Flow Worker 간 공용 Python 함수 모듈화

### Phase S3: CFA/SEM 해결 (미정 — 기술 블로커)

**현재 블로커**: `semopy`가 Pyodide에서 동작하지 않음

**해결 옵션 (추후 조사 필요)**:
1. semopy Pyodide wheel 빌드 시도
2. factor_analyzer 패키지 CFA 지원 확인
3. R.js (WebR) 통합으로 lavaan 사용
4. 서버사이드 Python (Cloudflare Workers Python runtime) 검토
5. WASM 기반 R 런타임 (WebR) 평가

**원칙**: 검증된 라이브러리 없이 직접 구현 금지 (CLAUDE.md 규칙)

---

## 6. QDA (질적 분석) 도구 — Atlas.ti / Taguette 류

### 결론: 현재 플랫폼과 성격이 매우 다름 — 별도 프로젝트 권장

| 항목 | 현재 플랫폼 | QDA 도구 |
|------|-----------|----------|
| 데이터 | 숫자 CSV/테이블 | 텍스트, 인터뷰 전사, 문서 |
| 핵심 기능 | p-value, 효과크기, 차트 | 코드 부여, 테마 추출, 네트워크 |
| UX | 변수 선택 → 분석 실행 → 결과 | 문서 뷰어 + 하이라이트 + 코드 트리 |
| 기존 재사용 | - | Smart Flow와 전혀 다른 UI 패러다임 |

**만약 추가한다면**:
- `/qualitative/` 별도 섹션 (Bio-Tools 방식)
- 최소 구현 범위: 문서 업로드 + 텍스트 하이라이트 + 코드 체계 + 빈도 분석
- Taguette (오픈소스, Python/Flask) 코어 로직 참고 가능
- 예상 공수: 2~3개월 단독 프로젝트

---

## 7. 도메인별 세분화 옵션 (향후)

Phase S1에서 `social-science`를 범용으로 만든 뒤, 수요에 따라 세분화 가능:

| 도메인 키 | 표시명 | 특화 용어 | 메서드 강조 |
|----------|--------|----------|-----------|
| `psychology` | 심리학 | 척도, 구인, 피험자 | reliability, factor-analysis, mediation |
| `education` | 교육학 | 학생, 학업성취, 교수법 | ANOVA, ANCOVA, HLM |
| `sociology` | 사회학 | 사회계층, 집단, 현상 | chi-square, cluster, regression |
| `economics` | 경제학 | 경제지표, 수요, 탄력성 | regression, time-series |
| `marketing` | 마케팅 | 소비자, 구매의도, 세분화 | logistic, cluster, factor-analysis |

---

## 8. 우선순위 요약

```
Phase S1 (1~2일) → 도메인 용어 추가만으로 기존 51개 메서드 사회과학 활용
Phase S2 (3~5일) → ICC, Kappa, Mediation, HLM 4개 메서드 추가
Phase S3 (미정)  → CFA/SEM (기술 블로커 해결 후)
QDA (별도)       → 완전히 다른 프로젝트 (2~3개월)
```

**핵심**: Bio-Tools와 달리 사회과학은 **기존 인프라 위에서 최소 비용으로 확장 가능**.
