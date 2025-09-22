# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 프로젝트 개요

**전문가급 통계 분석 플랫폼** (PC웹 + 데스크탑 앱)
- **목표**: SPSS/R Studio 급 고급 통계 소프트웨어
- **대상**: 수산과학 연구자, 통계 전문가, 데이터 분석가
- **기술**: Next.js 15 + TypeScript + shadcn/ui + Pyodide + Tauri

**핵심 기능**:
- **기본 통계**: t-test, ANOVA, 회귀분석, 상관분석
- **사후분석**: Tukey HSD, Games-Howell, Dunn's test
- **고급 분석**: 검정력 분석, 효과크기, 다중비교 보정

## 🏗️ 프로젝트 구조 (Next.js 15)

### 🎯 핵심 개발 방향
> **"단일 페이지 통합 분석 인터페이스" - 한 화면에서 모든 분석 완성**

```
D:\Projects\Statics\
├── app/                          # Next.js App Router
│   ├── globals.css               # 전역 스타일
│   ├── layout.tsx                # 루트 레이아웃
│   ├── page.tsx                  # 홈페이지
│   ├── (dashboard)/              # 라우트 그룹
│   │   ├── layout.tsx            # 대시보드 레이아웃  
│   │   ├── dashboard/page.tsx    # 메인 대시보드
│   │   ├── analysis/             # 통계 분석 페이지들
│   │   ├── data/                 # 데이터 관리
│   │   └── settings/             # 설정
│   └── api/                      # API Routes
├── components/                   # React 컴포넌트
│   ├── ui/                       # shadcn/ui 기본 컴포넌트
│   ├── layout/                   # 레이아웃 컴포넌트
│   ├── charts/                   # 시각화 컴포넌트
│   ├── forms/                    # 폼 컴포넌트
│   └── smart-flow/               # 스마트 플로우 컴포넌트
│       └── steps/                # 단계별 컴포넌트
│           └── validation/       # 🆕 데이터 검증 리팩토링
│               ├── charts/       # 차트 컴포넌트
│               ├── summary/       # 요약 컴포넌트
│               ├── utils/         # 유틸리티 함수
│               └── constants/     # 상수 및 타입
├── lib/                          # 유틸리티 라이브러리
│   ├── utils.ts                  # 공통 유틸
│   ├── stores/                   # 상태 관리
│   ├── services/                 # 서비스 로직
│   │   └── pyodide-statistics.ts # Pyodide 통계 엔진
│   └── statistics/               # 통계 분석 모듈
├── public/                       # 정적 파일
├── test-data/                    # 테스트용 CSV 파일들
└── 계획 문서들/                   # 프로젝트 계획서들
```

### 🔴 현재 개발 상태
**Phase 1 Week 4 진행 중** (2025-09-18)

#### ✅ Week 1 완료 (2025-09-11)
- 5개 계획 문서 작성 완료 (A급 품질)
- 기술 스택 확정: Next.js 15 + shadcn/ui + Pyodide + Tauri
- 13주 개발 로드맵 완성
- **Next.js 15.5.2 프로젝트 생성 완료!** (`statistical-platform`)
- **모든 기본 페이지 구현 완료** (9개 페이지)
- **통계 분석 엔진 구현** (Pyodide + SciPy)
- **코드 품질 A급 달성** (컴포넌트 모듈화, Error Boundary, 상수 시스템)

#### ✅ Week 2 완료 (2025-09-12)
- ✅ **29개 통계 함수 모듈화 완료** (6개 카테고리로 체계적 정리)
- ✅ **프로페셔널 랜딩 페이지 구현** ("스마트한 모두의 통계처리")
- ✅ **통계 시나리오 엔진 구현** (데이터 특성 기반 자동 추천)
- ✅ **스마트 분석 플로우 완성** (파일 업로드 → 검증 → 분석 목적 → 방법 추천)
- ✅ **Perplexity 스타일 디자인 시스템 적용**
- ✅ **단일 페이지 분석 플로우 설계 완료** (SINGLE_PAGE_ANALYSIS_FLOW.md)

#### ✅ Week 3 완료 (2025-09-16) - 통합 분석 인터페이스
**성과: 한 화면에서 모든 분석이 완성되는 가이드형 인터페이스 구현 완료**

**구현 완료 사항**:
- ✅ `/smart-flow` 페이지 및 모든 단계별 컴포넌트
- ✅ ProgressStepper 컴포넌트 (5단계 진행 표시)
- ✅ Zustand 기반 상태 관리 시스템 (세션 스토리지 연동)
- ✅ 데이터 업로드/검증/분석/결과 전체 플로우
- ✅ **분석 히스토리 패널** (AnalysisHistoryPanel.tsx)
- ✅ **데이터 검증 서비스** (data-validation-service.ts)
- ✅ **대용량 파일 처리** (large-file-processor.ts)
- ✅ **PDF 보고서 생성** (pdf-report-service.ts)
- ✅ **결과 시각화 컴포넌트** (ResultsVisualization.tsx)
- ✅ About 페이지 추가 (플랫폼 소개)

#### ✅ Week 4 완료 (2025-09-17 ~ 22) - 41개 통계 메서드 완성

**완료된 작업:**
- ✅ **41개 통계 메서드 구현 완료** (39→41개 확장)
- ✅ **8개 카테고리로 재구성** (SPSS 구조 참고)
- ✅ **oneSampleProportionTest 추가** (Wilson Score Interval)
- ✅ **welchTTest 추가** (등분산 가정 불필요)
- ✅ **UI 개선** (8개 탭 한 줄 표시)
- ✅ **코드 품질 개선** (constants.ts, formatters.ts)
- ✅ **문서화 완료** (STATISTICAL_METHODS_COMPLETE_GUIDE.md)

#### 🔧 Week 5 계획 (2025-09-23~) - 변수 선택 시스템

**핵심 작업:**
- [ ] **지능형 변수 선택 시스템** 구현
- [ ] 41개 메서드별 변수 요구사항 정의
- [ ] 독립/종속 변수 구분 UI
- [ ] 변수 타입 자동 감지 (연속형/범주형/이진형)
- [ ] 드래그 앤 드롭 변수 할당

**📚 상세 문서**: `docs/development/VARIABLE_SELECTION_SYSTEM.md`

## 🚀 통계분석 프로세스

### 5단계 지능형 프로세스
1. **스마트 데이터 업로드**: 자동 형식 감지, 품질 평가
2. **지능형 데이터 검증**: 3탭 체계 (기초통계, 가정검정, 시각화)
3. **자동 분석 추천**: 데이터 특성 기반 방법 제안
4. **지능형 분석 실행**: 가정 위반 시 대안 자동 실행
5. **스마트 결과 해석**: 자동 해석 및 액션 제안


## 📋 개발 가이드라인

### 🛠️ 기술 스택
```
Frontend:
├── Next.js 15 (App Router)
├── TypeScript (완전한 타입 안전성)  
├── shadcn/ui (전문가급 UI)
└── Tailwind CSS (스타일링)

통계 엔진:
├── Pyodide (WebAssembly Python)
├── scipy.stats (핵심 통계)
├── numpy (수치 계산)
└── pandas (데이터 처리)

상태 관리:
├── Zustand (글로벌 상태)
└── TanStack Query (서버 상태)

데스크탑:
└── Tauri (Rust + Web)
```



## ⚠️ 극히 중요: 통계 분석 구현 원칙

### 🔴 필수 준수 사항 - 절대 어기지 마세요!
**모든 통계 계산은 반드시 Pyodide를 통해 Python의 과학 계산 라이브러리를 사용해야 합니다.**

**⚠️ 이 규칙을 어기면 소프트웨어를 사용할 수 없습니다!**
- 통계 분석의 신뢰성이 가장 중요합니다
- JavaScript/TypeScript로 통계를 구현하면 정확도를 보장할 수 없습니다
- 연구자들이 논문에 사용할 수 있는 신뢰할 수 있는 결과가 필요합니다
- SciPy는 수십 년간 전 세계 과학자들이 검증한 라이브러리입니다

#### ❌ 절대 하지 말아야 할 것
1. **직접 구현 금지**: JavaScript/TypeScript로 통계 함수를 절대 직접 구현하지 마세요
2. **lib/statistics.ts 같은 파일 생성 금지**: 통계 계산을 JS로 구현하는 파일을 만들지 마세요
3. **수학 공식 직접 코딩 금지**: t-test, ANOVA 등의 수식을 직접 코딩하지 마세요

#### ✅ 반드시 해야 할 것
1. **Python 과학 계산 라이브러리 사용**:
   - **SciPy**: 기본 통계 검정 및 분석
   - **statsmodels**: 고급 통계 모델 (ANOVA, 회귀분석, 시계열)
   - **scikit-learn**: 머신러닝 및 다변량 분석
   - **pingouin**: 효과크기, 검정력 분석
   - **scikit-posthocs**: 사후검정 (Dunn, Nemenyi 등)
2. **신뢰성 보장**: 검증된 라이브러리만 사용
3. **정확도 우선**: R/SPSS와 동일한 결과 보장
4. **빠른 개발**: 검증된 라이브러리로 개발 시간 단축

### 올바른 통계 엔진 사용 방법
```javascript
// ✅ 올바른 방법 - Pyodide + SciPy
const pyodide = await loadPyodide()
await pyodide.loadPackage(['scipy', 'numpy', 'pandas'])

// T-test 예시
const result = await pyodide.runPython(`
  from scipy import stats
  import numpy as np
  
  data1 = np.array([1, 2, 3, 4, 5])
  data2 = np.array([2, 3, 4, 5, 6])
  
  result = stats.ttest_ind(data1, data2)
  {
    'statistic': float(result.statistic),
    'pvalue': float(result.pvalue),
    'df': len(data1) + len(data2) - 2
  }
`)
```

### 📈 통계 계산 구현 현황 (2025-09-18 업데이트)

#### ✅ Pyodide 기반 구현 완료
**파일**: `lib/services/pyodide-statistics.ts`

구현된 통계 기능 (27개 메서드):

**기술통계 (5개)**
1. 기본 통계량: 평균, 중앙값, 표준편차, 왜도, 첨도
2. 백분위수 및 IQR
3. 변동계수 (CV)
4. 표준오차 (SEM)
5. 신뢰구간 계산

**가정 검정 (6개)**
1. 정규성: Shapiro-Wilk, Anderson-Darling, D'Agostino-Pearson
2. 등분산성: Levene, Bartlett, Fligner-Killeen
3. 이상치: IQR, Z-score, Grubbs test
4. 자기상관: Durbin-Watson

**가설 검정 (8개)**
1. T-tests: 일표본, 독립표본, 대응표본
2. ANOVA: 일원, 이원, 반복측정
3. 비모수: Mann-Whitney U, Wilcoxon, Kruskal-Wallis, Friedman
4. 카이제곱: 적합도, 독립성

**상관/회귀 (4개)**
1. 상관: Pearson, Spearman, Kendall
2. 편상관 분석
3. 회귀: 단순, 다중, 로지스틱
4. 회귀 진단: VIF, 잔차 분석

**사후검정 (4개)**
1. 모수적: Tukey HSD, Bonferroni, Scheffé
2. 비모수: Dunn, Nemenyi, Conover
3. Games-Howell (등분산 가정 위반)
4. 다중비교 보정: FDR, Bonferroni

#### 🎯 중요 원칙
- **신뢰성**: 모든 통계 계산은 SciPy를 통해 수행
- **검증**: R/SPSS와 0.0001 오차 이내 보장
- **성능**: Web Worker로 비동기 처리
- **오류 처리**: 결측값 자동 제거, 최소 데이터 요구사항 검증

### 사용 가능한 Python 통계 라이브러리들
```python
# SciPy (scipy.stats)
- 기본 통계 검정: t-test, ANOVA, 상관분석
- 정규성/등분산성 검정
- 비모수 검정: Mann-Whitney, Wilcoxon, Kruskal-Wallis

# statsmodels
- 고급 ANOVA: 이원, 반복측정, 혼합 모델
- 회귀분석: OLS, GLM, 로지스틱
- 시계열 분석: ARIMA, SARIMA
- 사후검정: Tukey HSD, 다중비교

# pingouin
- 효과크기: Cohen's d, eta-squared, omega-squared
- 검정력 분석: 사전/사후 검정력
- 편상관, 부분상관
- Bayesian 통계

# scikit-posthocs
- 사후검정: Dunn, Nemenyi, Conover, Games-Howell
- 다중비교 보정: Bonferroni, FDR, Holm

# scikit-learn
- 머신러닝 모델
- 차원축소: PCA, LDA
- 클러스터링: K-means, 계층적
- 교차검증 및 모델 평가
```

## 🔧 개발 명령어

### 기본 개발 명령어
```bash
# 프로젝트 생성 (첫날만)
npx create-next-app@latest statistical-platform --typescript --tailwind --eslint --app

# 개발 서버 실행  
npm run dev

# 빌드
npm run build

# 프로덕션 서버
npm start

# 타입 체크
npm run type-check

# 린터 실행
npm run lint
```

### shadcn/ui 설치
```bash
# shadcn/ui 초기화
npx shadcn-ui@latest init

# 컴포넌트 설치
npx shadcn-ui@latest add button input card table dialog
```

## 📊 품질 기준

### 통계 정확성
- **정확도**: R/SPSS 결과와 0.0001 오차 이내
- **가정 검정**: 모든 통계 검정 전 가정 확인
- **효과크기**: Cohen's d, eta-squared 등 완전 구현
- **신뢰구간**: 95%, 99% 신뢰구간 제공

### 코드 품질
- **TypeScript**: 엄격한 타입 체크
- **ESLint**: 코딩 규칙 준수
- **Prettier**: 코드 포맷팅 일관성
- **테스트**: 주요 기능 단위/통합 테스트

### UI/UX 품질  
- **접근성**: WCAG 2.1 AA 준수
- **반응형**: 다양한 화면 크기 지원
- **다크모드**: 완전한 다크/라이트 테마
- **성능**: Core Web Vitals 기준 충족

## 📝 주요 참조 문서

### 프로젝트 계획서
- `PROJECT_MASTER_PLAN.md` - 전체 프로젝트 개요
- `TECHNICAL_ARCHITECTURE.md` - 기술 아키텍처 상세
- `UI_UX_DESIGN_GUIDELINES.md` - 디자인 시스템
- `STATISTICAL_ANALYSIS_SPECIFICATIONS.md` - 통계 기능 명세
- `DEVELOPMENT_PHASE_CHECKLIST.md` - 개발 체크리스트

### 현재 진행 문서
- `SINGLE_PAGE_ANALYSIS_FLOW.md` - 단일 페이지 분석 플로우 설계
- `NEXT_WEEK_TASKS.md` - Week 3 상세 계획
- `PROJECT_STATUS.md` - 프로젝트 현황 보고서

### 기술 문서
- Next.js 15: https://nextjs.org/docs
- shadcn/ui: https://ui.shadcn.com
- Tailwind CSS: https://tailwindcss.com
- Pyodide: https://pyodide.org

## ⚠️ 중요 주의사항

### 개발 원칙
1. **App Router 사용**: Pages Router 절대 사용 금지
2. **TypeScript 엄격 모드**: any 타입 사용 금지  
3. **shadcn/ui 컴포넌트**: 직접 스타일링보다 컴포넌트 우선
4. **접근성 준수**: 모든 인터랙티브 요소에 ARIA 라벨

### 파일 관리
1. **컴포넌트 명명**: PascalCase (예: DataTable.tsx)
2. **페이지 파일**: 소문자 (예: page.tsx, layout.tsx)
3. **유틸리티 함수**: camelCase (예: calculateMean.ts)
4. **Git 커밋**: 작은 단위로 자주 커밋

### 성능 고려사항  
1. **Dynamic Import**: 무거운 컴포넌트는 지연 로딩
2. **이미지 최적화**: Next.js Image 컴포넌트 사용
3. **Bundle 분석**: 정기적으로 번들 크기 확인
4. **Pyodide 캐싱**: 통계 연산 결과 캐싱


## 🤖 향후 AI 모델 통합 계획

**Phase 2+ (기본 기능 완성 후)**: Ollama 기반 로컬 AI 모델 통합
- **분석 방법 자동 추천**: 데이터 특성 분석 → 최적 통계 방법 제안  
- **자동 데이터 품질 검사**: 이상치, 결측값, 분포 이상 자동 탐지
- **지능적 결과 해석**: 맥락을 고려한 개인화된 해석 제공
- **동적 워크플로**: 분석 결과에 따른 다음 단계 자동 제안

**예상 효과**: 분석 시간 50-80% 단축, 초보자도 전문가급 분석 가능  
**기술 스택**: Ollama + gemma2:2b/llama3.2:1b (로컬 실행)
**구현 방식**: 기본 시스템과 분리된 AI 모듈 (선택적 활성화)

*자세한 계획: `AI_MODEL_INTEGRATION_PLAN.md` 참조*

---

---

*Last updated: 2025-09-18*
*Current focus: Pyodide 통계 엔진 및 워크플로우 통합*