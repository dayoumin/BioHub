# 📋 통계 분석 플랫폼 로드맵

**프로젝트**: 전문가급 통계 분석 플랫폼 (SPSS/R Studio 급)
**목표**: PC웹 + 데스크탑 앱
**기술**: Next.js 15 + TypeScript + Pyodide + Tauri

---

## 🎯 전체 개요

```
Phase 1-4: 핵심 기능 구축 (2025-09 ~ 10)
Phase 5: Registry + 성능 최적화 (2025-10 ~)
Phase 6+: 고도화 (예정)
```

---

## ✅ 완료된 Phase

### Phase 1: 기반 구축 (2025-09-11 ~ 09-26) ✅

**목표**: Next.js 15 + shadcn/ui 프로젝트 구축

**성과**:
- ✅ Next.js 15 + TypeScript 환경 구성
- ✅ shadcn/ui + Tailwind CSS 통합
- ✅ 38개 통계 페이지 100% 구현
- ✅ 스마트 분석 플로우 (파일 업로드 → 검증 → 분석 → 결과)
- ✅ 4단계 워크플로우 UI (방법론 소개 → 데이터 → 변수 선택 → 결과)

**핵심 산출물**:
- `app/(dashboard)/statistics/` - 38개 통계 페이지
- `components/StatisticsPageLayout.tsx` - 4단계 마법사
- `components/smart-flow/` - 스마트 분석 플로우

---

### Phase 2: 통계 엔진 리팩토링 (2025-10-01) ✅

**목표**: 2,488줄 Switch 문 → 112줄 라우터 기반 (95.5% 감소)

**성과**:
- ✅ 50/50 메서드 (100% 완료)
- ✅ 16개 핸들러 파일 (6,651줄)
- ✅ 27개 테스트 100% 통과
- ✅ 코드 리뷰 평균 97.5/100점

**핵심 산출물**:
- `lib/statistics/method-router.ts` (112줄) - 라우터
- `lib/statistics/calculator-handlers/` - 16개 핸들러 파일
- `lib/statistics/calculator-types.ts` - 타입 정의

**문서**:
- [phase2-complete.md](statistical-platform/docs/phase2-complete.md)

---

### Phase 3: Pyodide Python 구현 (2025-10-01) ✅

**목표**: Groups 5-6 고급 통계 메서드 9개 Python 구현 완료

**성과**:
- ✅ pyodide-statistics.ts (2,518 → 3,434줄, +916줄)
- ✅ 9개 Python 메서드 (936줄)
- ✅ 17개 통합 테스트 100% 통과
- ✅ **50/50 메서드 Python 구현 완료**

**핵심 산출물**:
- `lib/services/pyodide-statistics.ts` (3,434줄) - 50개 Python 메서드

**문서**:
- [phase3-complete.md](statistical-platform/docs/phase3-complete.md)

---

### Phase 4-1: Pyodide 런타임 테스트 (2025-10-02) ✅

**목표**: Pyodide 런타임 검증 및 성능 측정

**성과**:
- ✅ E2E 테스트 3/3 통과 (100%)
- ✅ 30개 Python 메서드 import 문제 해결
- ✅ 싱글톤 패턴 44배 성능 개선 검증 (11.8초 → 0.27초)
- ✅ Pyodide + NumPy + SciPy 브라우저 작동 확인

**성능 지표**:
- 첫 계산: 11.8초 (Pyodide 초기화 포함)
- 두 번째 계산: 0.27초 (캐싱 활용)
- 성능 개선: 97.7% (44배)

**문서**:
- [phase4-runtime-test-complete.md](statistical-platform/docs/phase4-runtime-test-complete.md)

---

### Phase 5-1: Registry Pattern 구축 (2025-10-10) ✅

**목표**: Registry Pattern + Groups 구조 완성

**성과**:
- ✅ method-metadata.ts: 60개 메서드 메타데이터 등록
- ✅ Groups 6개 생성 (descriptive, hypothesis, regression, nonparametric, anova, advanced)
- ✅ statistical-registry.ts: 동적 import 메커니즘 구현
- ✅ pyodide-statistics.ts: 41개 메서드 Python 구현 완료

**아키텍처**:
```
사용자 → Groups (TypeScript) → PyodideService → Python (SciPy/statsmodels)
         ↓                       ↓
    데이터 가공/검증         통계 계산 실행
    UI 포맷팅               (Pyodide Worker)
```

**핵심 산출물**:
- `lib/statistics/registry/method-metadata.ts` (60개)
- `lib/statistics/registry/statistical-registry.ts`
- `lib/statistics/groups/` (6개 그룹 파일)

**문서**:
- [phase5-architecture.md](statistical-platform/docs/phase5-architecture.md)
- [phase5-implementation-plan.md](statistical-platform/docs/phase5-implementation-plan.md)
- [phase5-migration-guide.md](statistical-platform/docs/phase5-migration-guide.md)

---

## 🔄 진행 중인 Phase

### Phase 6: PyodideCore Direct Connection (2025-10-17) ✅

**목표**: PyodideStatistics Facade 제거 및 PyodideCore 직접 연결

**성과**:
- ✅ **아키텍처 단순화**: PyodideStatistics 2,110줄 완전 제거
- ✅ **타입 안전성 강화**: Worker enum + 80+ 공통 타입
- ✅ **10개 핸들러 100% 변환**: 39개 메서드 (descriptive, hypothesis-tests, anova, nonparametric, regression, crosstab, proportion-test, reliability, hypothesis, **advanced**)
- ✅ **TypeScript 컴파일 에러 0개**
- ✅ **코드 품질**: 4.9/5

**핵심 산출물**:
- `lib/services/pyodide/core/pyodide-worker.enum.ts` (97줄) - Worker enum
- `types/pyodide-results.ts` (500+줄) - 100+ 공통 타입
- `lib/statistics/calculator-handlers/*.ts` (10개 핸들러 변환)

**아키텍처 변경**:
```
Before: Groups → PyodideStatistics (Facade) → PyodideCore → Python Workers
After:  Groups → PyodideCore → Python Workers (10-15% 성능 향상)
```

**문서**:
- [CODE_REVIEW_PHASE6_2025-10-17.md](docs/CODE_REVIEW_PHASE6_2025-10-17.md) - 상세 코드 리뷰

---

### Phase 5-2: 구현 검증 및 TypeScript 래퍼 추가 (보류)

**목표**: Python Worker 구현 100% TypeScript 래퍼 완성

**정확한 현황** (2025-10-15 검증):
- ✅ **Python Worker 함수**: 55개 (100% 완성)
- ✅ **TypeScript 메서드**: 76개 (별칭 포함)
- ✅ **완전 매칭**: 43개 (78%)
- ⚠️ **TypeScript 래퍼 필요**: 12개 (22%)

**작업 내용**:
1. ✅ 실제 파일 검증 스크립트 작성 (generate-complete-mapping.js)
2. ✅ 정확한 매핑 테이블 생성 (implementation-status.md)
3. 🔄 TypeScript 래퍼 12개 추가
4. ✅ 문서 전면 업데이트

**TypeScript 래퍼 추가 필요 (12개)** - 모두 Worker 4:
| # | Python 함수 | TypeScript 메서드 | 우선순위 |
|---|-------------|------------------|---------|
| 1 | linear_regression | linearRegression | High |
| 2 | pca_analysis | pcaAnalysis | High |
| 3 | curve_estimation | curveEstimation | High |
| 4 | binary_logistic | binaryLogistic | High |
| 5 | nonlinear_regression | nonlinearRegression | Medium |
| 6 | stepwise_regression | stepwiseRegression | Medium |
| 7 | multinomial_logistic | multinomialLogistic | Medium |
| 8 | ordinal_logistic | ordinalLogistic | Medium |
| 9 | probit_regression | probitRegression | Medium |
| 10 | poisson_regression | poissonRegression | Medium |
| 11 | durbin_watson_test | durbinWatsonTest | Medium |
| 12 | negative_binomial_regression | negativeBinomialRegression | Low |

**최종 목표**:
- 현재: 43/55 (78%)
- 목표: 55/55 (100%)
- 예상 시간: 3시간

**문서** (✅ 최신):
- **[implementation-status.md](docs/implementation-status.md)** ⭐ 정확한 매핑 테이블
- [complete-mapping.json](statistical-platform/complete-mapping.json) - 기계 판독용
- [generate-complete-mapping.js](statistical-platform/generate-complete-mapping.js) - 검증 스크립트

---

## ⏳ 예정된 Phase

### Phase 5-3: Worker Pool 통합 (예정)

**목표**: 2+2 Adaptive Worker Pool 구축

**기대 효과**:
- 초기 로딩: 83% 빠름 (3초 → 0.5초)
- 첫 계산: 74% 빠름 (11.8초 → 3초)
- UI 블로킹: 100% 제거 (11.8초 → 0초)
- 병렬 처리: 89% 빠름 (35.4초 → 3.8초)

**작업 내용**:
1. AdaptiveWorkerPool 클래스 구현
2. Worker별 Pyodide 인스턴스 최적화
3. Worker 메시지 프로토콜 정의
4. 20분 미사용 시 확장 Worker 종료 로직

**Worker 매핑**:
- Worker 1: Descriptive (10개)
- Worker 2: Hypothesis (8개)
- Worker 3: Nonparametric + ANOVA (18개)
- Worker 4: Regression + Advanced (24개)

---

### Phase 6: 추가 메서드 구현 (예정)

**목표**: 나머지 통계 메서드 구현

**대상 메서드**:
- 우선순위 3-4: 약 20개 메서드
- 수산과학 특화 기능
- 고급 시각화

---

### Phase 7: Tauri 데스크탑 앱 (예정, 평가 후 결정)

**목표**: 데스크탑 앱 패키징

**현재 상태**:
- ✅ Phase 6 완료로 기술적 준비 완료
- ⏳ **외부 평가 대기 중** (다른 사람들의 웹 버전 평가 후 결정)
- 📊 **판단 기준**: 사용자 피드백, 성능 측정, 기능 만족도

**예상 작업 내용** (평가 완료 후):
1. Tauri 프로젝트 설정
2. 네이티브 파일 시스템 연동
3. PyodideCore 패턴 재사용 (Phase 6 학습 활용)
4. 앱 패키징 및 테스트
5. 설치 프로그램 생성

**참고사항**:
- Phase 6의 PyodideCore 직접 연결 패턴은 데스크탑에서도 그대로 활용 가능
- 웹 버전이 안정화되면 데스크탑으로의 전환이 용이함

---

### Phase 8: AI 모델 통합 (선택, 향후)

**목표**: Ollama 기반 로컬 AI 모델 통합

**기능**:
- 분석 방법 자동 추천
- 자동 데이터 품질 검사
- 지능적 결과 해석
- 동적 워크플로 생성

**문서**:
- [AI_MODEL_INTEGRATION_PLAN.md](AI_MODEL_INTEGRATION_PLAN.md)

---

### Phase 9: 배포 전 리팩토링 및 최적화 (예정)

**목표**: 프로덕션 배포를 위한 코드 품질 및 성능 최적화

#### 9-1. 코드 리팩토링
- ✅ 타입 안전성 100% 달성
  - `any` 타입 완전 제거 → `unknown` + 타입 가드
  - Non-null assertion (`!`) 제거 → 타입 가드로 대체
  - 모든 함수 명시적 타입 지정 검증
- ✅ 코드 정리
  - 사용하지 않는 import 제거
  - Dead code 제거 (주석 처리된 코드, 미사용 함수)
  - 임시 파일 제거 (`.backup`, `.old`, `.new`, `__pycache__` 등)
  - 중복 코드 제거 및 공통 유틸리티로 통합
- ✅ 네이밍 일관성
  - 변수명/함수명 통일 (camelCase, PascalCase 규칙)
  - 파일명 규칙 통일
  - 주석/문서에서 이전 명칭 업데이트

#### 9-2. 성능 최적화
- ✅ 번들 크기 최적화
  - Tree shaking 검증
  - Dynamic import 적용 범위 확대
  - 사용하지 않는 라이브러리 제거
  - 번들 분석 (webpack-bundle-analyzer)
- ✅ 런타임 성능
  - React 컴포넌트 메모이제이션 (React.memo, useMemo)
  - 불필요한 리렌더링 제거
  - 이미지/에셋 최적화
  - Lazy loading 적용

#### 9-3. 테스트 강화
- ✅ 테스트 커버리지 90% 이상
  - 모든 통계 메서드 단위 테스트
  - Groups 통합 테스트
  - E2E 테스트 확장
- ✅ 엣지 케이스 테스트
  - 빈 데이터셋
  - 극단값 처리
  - 에러 처리 검증
- ✅ 성능 테스트
  - 대용량 데이터셋 테스트 (10,000+ 행)
  - 동시 계산 부하 테스트

#### 9-4. 문서화
- ✅ API 문서
  - 모든 public 메서드 JSDoc 작성
  - 타입 정의 문서화
  - 사용 예제 작성
- ✅ 사용자 가이드
  - 통계 메서드별 사용법
  - 데이터 형식 가이드
  - 문제 해결 가이드 (FAQ)
- ✅ 개발자 문서
  - 아키텍처 다이어그램
  - 기여 가이드
  - 개발 환경 설정 가이드

#### 9-5. 보안 및 안정성
- ✅ 보안 검증
  - ✅ 의존성 취약점 스캔 (`npm audit`) - xlsx 0.20.3 업데이트 완료 (2025-10-15)
  - XSS/CSRF 방어 검증
  - 사용자 입력 검증 강화
- 🔄 라이브러리 마이그레이션 (장기 계획)
  - xlsx → ExcelJS 전환 (CDN 링크 불안정 시 또는 고급 기능 필요 시)
  - 예상 작업: 6-10시간 (excel-processor.ts 재작성 + 23개 파일 검증)
  - 우선순위: Low (현재 xlsx 0.20.3 CDN 버전 안정적)
- ✅ 에러 처리
  - 전역 에러 핸들러 구현
  - 사용자 친화적 에러 메시지
  - 에러 로깅 시스템 구축
- ✅ 접근성 (a11y)
  - WCAG 2.1 AA 준수
  - 키보드 네비게이션 지원
  - 스크린 리더 호환성

---

### Phase 10: 배포 준비 (예정)

**목표**: 프로덕션 환경 배포를 위한 인프라 구성

#### 10-1. 빌드 및 배포 설정
- ✅ 프로덕션 빌드 최적화
  - 환경 변수 관리 (.env.production)
  - Source map 설정 (에러 추적용)
  - 압축 및 minification 검증
- ✅ CI/CD 파이프라인
  - GitHub Actions 워크플로우 설정
  - 자동 테스트 실행
  - 자동 배포 스크립트
- ✅ 호스팅 플랫폼 선정
  - Vercel / Netlify / AWS 중 선택
  - CDN 설정
  - 도메인 연결

#### 10-2. 모니터링 및 분석
- ✅ 성능 모니터링
  - Google Analytics / Mixpanel 연동
  - 성능 메트릭 수집 (Core Web Vitals)
  - 에러 추적 (Sentry)
- ✅ 사용자 피드백
  - 피드백 수집 시스템
  - 버그 리포트 시스템
  - 사용자 행동 분석

#### 10-3. 법적 준비
- ✅ 라이선스 확인
  - 오픈소스 라이선스 검토
  - LICENSE 파일 작성
  - 의존성 라이선스 컴플라이언스
- ✅ 개인정보 처리
  - 개인정보 처리방침 작성 (필요 시)
  - GDPR/CCPA 준수 검토 (필요 시)
  - 쿠키 정책 (필요 시)

#### 10-4. 배포 체크리스트
- [ ] TypeScript 빌드 에러 0개 (`npx tsc --noEmit`)
- [ ] 모든 테스트 통과 (`npm test`)
- [ ] 번들 크기 < 2MB (gzip 압축 후)
- [ ] Lighthouse 스코어 > 90 (Performance, Accessibility, Best Practices, SEO)
- [ ] 크로스 브라우저 테스트 (Chrome, Firefox, Safari, Edge)
- [ ] 모바일 반응형 테스트
- [ ] 프로덕션 환경 변수 설정 완료
- [ ] 도메인 및 SSL 인증서 설정
- [ ] 백업 및 롤백 계획 수립
- [ ] 사용자 문서 및 튜토리얼 작성 완료

---

## 📊 현재 구현 현황 (2025-10-15 검증)

### 통계 메서드 구현 상태 (정확한 현황)

| Worker | Python 함수 | TypeScript 래퍼 | 완료율 |
|--------|------------|----------------|--------|
| **Worker 1: Descriptive** | 8개 | 8개 | **100%** ✅ |
| **Worker 2: Hypothesis** | 12개 | 12개 | **100%** ✅ |
| **Worker 3: Nonparametric + ANOVA** | 18개 | 18개 | **100%** ✅ |
| **Worker 4: Regression + Advanced** | 17개 | 5개 | **29%** ⚠️ |
| **합계** | **55개** | **43개** | **78%** |

### Worker별 상세 현황

**✅ Worker 1-3: 완전 구현** (38/38, 100%)
- Worker 1: descriptive_stats, normality_test, outlier_detection, frequency_analysis, crosstab_analysis, one_sample_proportion_test, cronbach_alpha, kolmogorov_smirnov_test
- Worker 2: 모든 t-test 변형, z_test, chi_square (3종), binomial_test, correlation_test, partial_correlation, levene_test, bartlett_test
- Worker 3: 모든 비모수 검정 (9개), 모든 ANOVA (9개)

**⚠️ Worker 4: 부분 구현** (5/17, 29%)
- ✅ 구현: multiple_regression, logistic_regression, factor_analysis, cluster_analysis, time_series_analysis
- ❌ 미구현: linear_regression, pca_analysis, curve_estimation, binary_logistic, multinomial_logistic, ordinal_logistic, probit_regression, poisson_regression, negative_binomial_regression, nonlinear_regression, stepwise_regression, durbin_watson_test (12개)

### 다음 단계 (Phase 5-2)
**Worker 4 TypeScript 래퍼 12개 추가** → **100% 달성** (43개 → 55개)

---

## 🎯 성공 지표

### 성능 지표 (현재 vs 목표)

| 지표 | Phase 4-1 | Phase 5 목표 | 상태 |
|------|-----------|-------------|------|
| 앱 시작 | 2.8초 | <0.5초 | 🔄 Phase 5-3 |
| 첫 계산 | 11.8초 | <3초 | 🔄 Phase 5-3 |
| 캐싱 계산 | 0.27초 | <0.1초 | ✅ 달성 |
| UI 블로킹 | 11.8초 | 0초 | 🔄 Phase 5-3 |

### 품질 지표

| 지표 | 목표 | 현재 상태 |
|------|------|----------|
| 통계 메서드 구현 | 100% | 68% (41/60) |
| 테스트 커버리지 | 90%+ | ✅ 27개 통과 |
| 타입 안전성 | 100% | ⚠️ 개선 중 |
| 빌드 성공률 | 100% | ✅ 정상 |

---

## 📚 참조 문서

### 개발 가이드
- [CLAUDE.md](CLAUDE.md) - AI 코딩 규칙 (최신)
- [AI-CODING-RULES.md](statistical-platform/docs/AI-CODING-RULES.md) - any → unknown 예제

### 아키텍처
- [phase5-architecture.md](statistical-platform/docs/phase5-architecture.md) - Phase 5 아키텍처
- [phase5-implementation-plan.md](statistical-platform/docs/phase5-implementation-plan.md) - Day 1-10 계획

### 구현 현황
- [implementation-summary.md](statistical-platform/docs/implementation-summary.md) - 최신 구현 현황
- [priority1-implementation.md](statistical-platform/docs/priority1-implementation.md) - 우선순위 1 (11개)
- [priority2-implementation.md](statistical-platform/docs/priority2-implementation.md) - 우선순위 2 (13개)

### 완료 보고서
- [phase2-complete.md](statistical-platform/docs/phase2-complete.md) - 리팩토링 상세
- [phase3-complete.md](statistical-platform/docs/phase3-complete.md) - Pyodide 통합
- [phase4-runtime-test-complete.md](statistical-platform/docs/phase4-runtime-test-complete.md) - E2E 테스트

### 초기 계획 (참고)
- [PROJECT_INITIAL_VISION.md](PROJECT_INITIAL_VISION.md) - 초기 비전 문서
- [AI_MODEL_INTEGRATION_PLAN.md](AI_MODEL_INTEGRATION_PLAN.md) - AI 통합 계획 (Phase 8+)

---

## 🔮 장기 비전

### 기술적 목표
- 통계 메서드: 100개 이상 구현
- 성능: SPSS 급 반응 속도 (<1초)
- 플랫폼: 웹 + 데스크탑 + 모바일

### 사용자 경험 목표
- 새 사용자 온보딩: <10분
- 일반적인 분석 완료: <5분
- 전문가 만족도: >4.5/5

---

**최종 업데이트**: 2025-10-15
**현재 Phase**: 5-2 (구현 검증 및 TypeScript 래퍼 추가)
**현재 진행률**: 43/55 (78%) → 목표 55/55 (100%)
**다음 마일스톤**: Phase 5-3 (Worker Pool Lazy Loading)
