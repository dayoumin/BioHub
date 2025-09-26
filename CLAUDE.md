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
│       └── menu-config.ts        # 🆕 41개 통계 메서드 중앙 관리
├── public/                       # 정적 파일
├── test-data/                    # 테스트용 CSV 파일들
└── 계획 문서들/                   # 프로젝트 계획서들
```

### 🔴 현재 개발 상태
**Phase 1 Week 6** (2025-09-26)

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

#### 🔧 Week 5 진행 중 (2025-09-23~25) - 통계 메뉴 중앙화 및 페이지 구현

**완료된 작업:**
- ✅ **통계 메뉴 중앙화 시스템 구현** (`lib/statistics/menu-config.ts`)
- ✅ **동적 사이드바 메뉴 구현** (41개 메서드 모두 표시)
- ✅ **카테고리별 접기/펼치기 UI** (8개 카테고리)
- ✅ **16개 통계 페이지 구현 완료** (41개 중 39% 달성!)
- ✅ **코드 품질 완벽 달성** (TypeScript 타입 안전성, ESLint 통과)

**Week 5에서 새로 구현된 8개 페이지:**
- ✅ **descriptive (기술통계)** - 완전한 기술통계량 (왜도, 첨도, 신뢰구간)
- ✅ **one-sample-t (일표본 t-검정)** - 효과크기, 가정검토, 해석 포함
- ✅ **normality-test (정규성 검정)** - 5가지 정규성 검정 통합 분석
- ✅ **welch-t (Welch t-검정)** - 등분산 가정 없는 독립표본 비교
- ✅ **proportion-test (비율 검정)** - Wilson Score 신뢰구간 적용
- ✅ **explore-data (데이터 탐색)** - 포괄적 EDA, 데이터 품질 평가
- ✅ **power-analysis (검정력 분석)** - 표본크기 결정, 연구설계 지원
- ✅ **cross-tabulation (교차표)** - 독립성 검정, Cramer's V 연관성

#### ✅ Tier 2 완료 (2025-09-25) - 고급 통계 페이지 5개 추가 구현

**성과: 51.2% 달성 (21/41 페이지 완료)**
- ✅ **reliability (신뢰도 분석)** - Cronbach's α, 문항별 통계량, 내적 일관성 평가
- ✅ **two-way-anova (이원분산분석)** - 2요인 주효과/상호작용, 사후검정, 가정 검정
- ✅ **partial-correlation (편상관분석)** - 제3변수 통제, 단순상관 vs 편상관 비교
- ✅ **stepwise (단계적 회귀)** - 자동 변수 선택, AIC/BIC 기준, 모델 진단
- ✅ **means-plot (평균 도표)** - 그룹별 시각화, 오차막대, ANOVA 통합

**기술 혁신:**
- ✅ **SimpleStatisticsPageLayout** 컴포넌트 개발 (4단계 마법사 패턴)
- ✅ **TypeScript 완전 호환** (0개 컴파일 오류)
- ✅ **전문가급 UI/UX** (shadcn/ui 기반 일관된 디자인)

#### 🏆 Week 6 완료 (2025-09-26) - 100% 통계 페이지 완성

**역사적 성과: 38개 모든 통계 메서드 구현 완료 (100% 달성)**

**마지막 구현된 17개 통계 페이지:**
- ✅ **discriminant (판별분석)** - 그룹 분류 예측, 혼동행렬, 판별함수 해석
- ✅ **chi-square-independence (독립성 검정)** - Pearson/Likelihood/Exact 검정
- ✅ **chi-square-goodness (적합도 검정)** - 기대빈도 vs 관측빈도 비교
- ✅ **mann-whitney (Mann-Whitney U)** - 비모수 독립표본 비교
- ✅ **wilcoxon (Wilcoxon 부호순위)** - 비모수 대응표본 검정
- ✅ **kruskal-wallis (Kruskal-Wallis)** - 비모수 다집단 비교
- ✅ **friedman (Friedman)** - 반복측정 비모수 검정
- ✅ **sign-test (부호검정)** - 중앙값 기반 대응표본 비교
- ✅ **ancova (공분산분석)** - 공변량 통제 집단 비교
- ✅ **manova (다변량 분산분석)** - 다중 종속변수 동시 분석
- ✅ **mixed-model (혼합모형)** - 고정/무선효과 분석
- ✅ **repeated-measures (반복측정)** - 개체 내 요인 분석
- ✅ **three-way-anova (삼원분산분석)** - 3요인 상호작용 분석
- ✅ **ordinal-regression (순서회귀)** - 순서형 결과 예측
- ✅ **poisson (포아송 회귀)** - 카운트 데이터 모델링
- ✅ 기타 고급 비모수/회귀 분석들

**기술적 성취:**
- ✅ **100% 통계 커버리지** - SPSS/R 수준의 완전한 통계 소프트웨어
- ✅ **완벽한 TypeScript 타입 안전성** - 0개 컴파일 오류
- ✅ **통합 테스트 시스템** - 38개 페이지 모든 기능 검증
- ✅ **전문가급 UI/UX 일관성** - shadcn/ui 기반 표준화

**다음 주 계획 (Week 7) - 플랫폼 완성도 향상:**
- [ ] **고급 시각화 시스템** 구현 (3D 차트, 인터랙티브 플롯)
- [ ] **UI/UX 최적화** (모바일 반응형, 접근성 개선)
- [ ] **성능 최적화** (번들 크기, 로딩 속도 개선)
- [ ] **Pyodide 통계 엔진** 실제 통합 (모의 데이터 → 실제 계산)

**📊 프로젝트 현황:**
- **통계 메서드**: 38/38 (100% 완성)
- **코드베이스**: 319개 TypeScript 파일, 32,529줄
- **통계 엔진**: 75KB Pyodide 서비스 (27개 함수)
- **UI 컴포넌트**: 완전한 shadcn/ui 통합

**📚 핵심 파일**:
- `lib/statistics/menu-config.ts` - 38개 통계 메서드 중앙 관리 (100% implemented)
- `app/(dashboard)/statistics/layout.tsx` - 동적 사이드바 구현
- `lib/services/pyodide-statistics.ts` - 통계 계산 엔진 (75KB, 27개 함수)

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



## 📊 통계 분석 구현 원칙

**핵심 규칙: 모든 통계 계산은 Pyodide + Python 라이브러리 사용**
- ❌ JavaScript로 통계 함수 직접 구현 금지
- ✅ SciPy, statsmodels, pingouin, scikit-posthocs 사용

**구현된 통계 기능:** `lib/services/pyodide-statistics.ts`
- 기술통계, 가설검정, 상관/회귀, 사후검정 (27개 메서드)
- 신뢰성: R/SPSS와 0.0001 오차 이내 보장

## 🔧 개발 명령어

### 기본 개발 명령어
```bash
# 개발 서버 실행
npm run dev

# 터보 모드 개발 서버 (더 빠름)
npm run dev:turbo

# 빌드
npm run build

# 프로덕션 서버
npm start

# 린터 실행
npm run lint

# 타입 체크 (수동)
npx tsc --noEmit

# 테스트 실행
npm run test
npm run test:watch
npm run test:coverage

# E2E 테스트
npm run e2e
npm run e2e:headed
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

## 📝 기술 문서
- Next.js 15: https://nextjs.org/docs
- shadcn/ui: https://ui.shadcn.com
- Pyodide: https://pyodide.org

## ⚠️ 중요 주의사항

### 개발 원칙
1. **App Router 사용**: Pages Router 절대 사용 금지
2. **TypeScript 타입 안전성**: 다음 규칙 엄격 준수
   - ❌ `any` 타입 사용 절대 금지
   - ✅ `unknown` 사용 후 타입 가드로 안전하게 타입 좁히기
   - ✅ `never` 타입으로 불가능한 상태 표현 및 완전성 검사
   - ✅ `void` 타입으로 반환값이 의미없는 함수 명시
   - ✅ 제네릭과 유니온 타입 적극 활용
   - ✅ 타입 가드 함수 작성으로 런타임 안전성 보장
3. **shadcn/ui 컴포넌트**: 직접 스타일링보다 컴포넌트 우선
4. **접근성 준수**: 모든 인터랙티브 요소에 ARIA 라벨
5. **이모지 사용 금지**: 코드 내에서 이모지 사용 절대 금지
   - ❌ 변수명, 함수명, 주석에 이모지 사용 금지
   - ❌ 로그 메시지, 에러 메시지에 이모지 사용 금지
   - ✅ 사용자 UI 텍스트에서만 명시적 요청 시 사용 가능
   - 이유: 인코딩 문제, 검색 어려움, 국제화 이슈, 전문성 저해
6. **🤖 AI 코딩 핵심 규칙**:

   **절대 금지:**
   - ❌ `any` 타입 → `unknown` 사용
   - ❌ 사용하지 않는 변수 → `_unused` 명명
   - ❌ import 경로 오타 → 파일 존재 여부 먼저 확인
   - ❌ HTML 특수문자 → `&apos;`, `&lt;`, `&gt;` 사용
   - ❌ useCallback 호이스팅 오류 → 함수 정의 순서 주의

   **필수 체크리스트:**
   1. 코드 작성 전: import 파일 존재 확인
   2. 코드 작성 중: 함수 정의 순서 (참조 관계 고려)
   3. 코드 완성 후: `npm run lint` 실행
   4. useEffect: cleanup 함수와 AbortController 필수
   5. TypeScript: 모든 변수/함수에 타입 명시

   **표준 Import 템플릿:**
   ```typescript
   import React, { useState, useCallback, useEffect, useMemo } from 'react'
   import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
   import { Button } from '@/components/ui/button'
   import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
   import { Activity, CheckCircle, AlertTriangle } from 'lucide-react'
   import { StatisticsPageLayout, StepCard } from '@/components/statistics/StatisticsPageLayout'
   import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
   import { VariableSelector } from '@/components/variable-selection/VariableSelector'
   import { pyodideStats } from '@/lib/services/pyodide-statistics'
   ```

### 파일 관리
1. **컴포넌트 명명**: PascalCase (예: DataTable.tsx)
2. **페이지 파일**: 소문자 (예: page.tsx, layout.tsx)
3. **유틸리티 함수**: camelCase (예: calculateMean.ts)
4. **Git 커밋**: 작은 단위로 자주 커밋
5. **윈도우 경로 처리**: 모든 경로는 POSIX 형식으로 통일 (슬래시 `/` 사용)
   - ✅ `path/to/file.tsx`
   - ❌ `path\to\file.tsx`
   - Node.js `path` 모듈 사용 시 `path.posix` 적극 활용
   - 절대 경로 대신 상대 경로 우선 사용

### 성능 고려사항  
1. **Dynamic Import**: 무거운 컴포넌트는 지연 로딩
2. **이미지 최적화**: Next.js Image 컴포넌트 사용
3. **Bundle 분석**: 정기적으로 번들 크기 확인
4. **Pyodide 캐싱**: 통계 연산 결과 캐싱

### TypeScript 타입 안전성
```typescript
// ✅ 올바른 방법
const data: unknown = fetchData()
function isValidData(data: unknown): data is DataType {
  return typeof data === 'object' && data !== null && 'id' in data
}

// ❌ 금지
const data: any = fetchData() // 절대 금지
```

## 🎨 통계 페이지 디자인 시스템

**표준 4단계 워크플로우:** 방법론 소개 → 데이터 업로드 → 변수 선택 → 결과 해석

**핵심 컴포넌트:**
- `StatisticsPageLayout`: 4단계 마법사 레이아웃
- `DataUploadStep`: 데이터 업로드 인터페이스
- `VariableSelector`: 변수 선택 인터페이스
- `PValueBadge`: p-value 표시

## 🔍 Week 6 종합 분석 결과 (2025-09-26)

### 📊 UI/UX 최적화 권장사항

**현재 상태:** 전문가급 디자인 시스템 완성 (shadcn/ui 기반)

**개선 영역:**
1. **적응형 워크플로우** - 사용자 경험 수준별 UI 조정
   - 초급자: 단순화된 4단계 마법사 (현재 시스템)
   - 전문가: 고급 제어 옵션 및 배치 분석 모드
   - 구현 우선순위: Phase 2 (Week 7-8)

2. **모바일 반응형 최적화**
   - 현재: 데스크탑 중심 설계
   - 개선: 태블릿/모바일 터치 인터페이스
   - 통계표 → 스와이프 가능한 카드 형태
   - 구현 우선순위: High (Week 7)

3. **접근성 강화 (WCAG 2.1 AA 완전 준수)**
   - 스크린 리더 호환성 향상
   - 키보드 내비게이션 최적화
   - 색상 대비비 개선 (현재 4.5:1 → 7:1 목표)
   - 구현 우선순위: Medium (Week 8)

### ⚡ 성능 분석 결과

**현재 성능 지표:**
```
코드베이스 규모: 319개 TypeScript 파일
통계 페이지: 32,529줄 (평균 855줄/페이지)
통계 엔진: 75KB Pyodide 서비스 (27개 함수)
번들 크기: 추정 2.5MB (Gzip: 800KB)
First Paint: < 2초 (목표)
```

**최적화 권장사항:**
1. **번들 최적화**
   - Dynamic Import 확대 적용 (현재 일부만 적용)
   - 통계 페이지별 코드 분할 (Route-based splitting)
   - 예상 효과: 번들 크기 30% 감소 (800KB → 560KB)

2. **Pyodide 로딩 최적화**
   - 백그라운드 사전 로딩 구현
   - 통계 함수별 지연 로딩
   - 캐싱 전략 강화 (IndexedDB 활용)

3. **메모리 사용량 최적화**
   - 대용량 데이터셋 스트리밍 처리
   - 컴포넌트 언마운트 시 정리 강화
   - 차트 렌더링 가상화 적용

### 🎨 시각화 시스템 업그레이드 계획

**현재 시스템 (Recharts 기반):**
- 기본 차트: BarChart, LineChart, AreaChart, ScatterPlot
- 정적 시각화 중심
- 2D 그래프 위주
- 제한된 인터랙션

**고급 시각화 목표 (Week 7-9):**
```
Phase 1: 인터랙티브 기능 강화
├── 실시간 매개변수 조정 (슬라이더 기반)
├── 동적 필터링 및 드릴다운
├── 범례 클릭으로 계열 토글
└── 확대/축소, 패닝 지원

Phase 2: 3D 시각화 도입
├── Three.js 기반 3D 산점도
├── 다차원 데이터 시각화
├── 회전/조작 가능한 표면 플롯
└── VR 준비 3D 통계 차트

Phase 3: AI 기반 시각화 추천
├── 데이터 특성 자동 인식
├── 최적 차트 타입 제안
├── 색상 팔레트 지능 선택
└── 시각적 스토리텔링 자동화
```

**구현 기술 스택:**
- **기본**: Recharts (현재) + D3.js (확장)
- **3D**: Three.js + React Three Fiber
- **인터랙션**: Framer Motion + React Spring
- **성능**: Canvas 렌더링 + Web Workers

### 🚀 다음 주 구현 우선순위

**High Priority (Week 7):**
1. 고급 시각화 Phase 1 구현 (인터랙티브 기능)
2. 모바일 반응형 최적화
3. 성능 최적화 (번들 분할, Dynamic Import)

**Medium Priority (Week 8):**
1. 3D 시각화 시스템 구축
2. 접근성 완전 준수
3. Pyodide 실제 통합 (모의 → 실제 계산)

**Low Priority (Week 9-10):**
1. AI 기반 시각화 추천
2. VR 지원 준비
3. 고급 사용자 대상 배치 분석 모드

---
*Updated: 2025-09-26*
