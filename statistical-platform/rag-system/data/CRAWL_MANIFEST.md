# RAG Document Crawling Manifest

**목적**: 크롤링한 문서의 출처, 라이선스, 버전 추적
**작성일**: 2025-10-31
**최종 업데이트**: 2025-10-31

---

## 📋 목차

1. [크롤링 대상 문서 목록](#1-크롤링-대상-문서-목록)
2. [라이선스 정보](#2-라이선스-정보)
3. [크롤링 히스토리](#3-크롤링-히스토리)
4. [삭제 정책](#4-삭제-정책)

---

## 1. 크롤링 대상 문서 목록

### 1.1 Tier 0: 통계 방법론 가이드 (수동 작성)

| 파일명 | 작성 방식 | 라이선스 | 라인 수 | 상태 |
|--------|----------|---------|---------|------|
| `statistical-decision-tree.md` | 수동 작성 (통계학 일반 지식) | Public Domain | 652 | ✅ 완료 |
| `assumption-guide.md` | 수동 작성 (통계학 일반 지식) | Public Domain | 638 | ✅ 완료 |
| `interpretation-guide.md` | 수동 작성 (통계학 일반 지식) | Public Domain | 559 | ✅ 완료 |
| `method-comparison.md` | 수동 작성 (통계학 일반 지식) | Public Domain | 524 | ✅ 완료 |

**참고 문헌**:
- Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences.
- Field, A. (2013). Discovering Statistics Using IBM SPSS Statistics.
- Ghasemi, A., & Zahediasl, S. (2012). Normality tests for statistical analysis.

**저작권 상태**: ✅ **문제 없음** (통계학 공통 지식, Fair Use 인용)

---

### 1.2 Tier 1: SciPy 문서 (✅ 크롤링 완료)

**대상**: Worker 1-4에서 실제 사용하는 41개 함수

| 모듈 | 함수 개수 | 크롤링 URL 패턴 | 라이선스 | 상태 |
|------|----------|----------------|---------|------|
| `scipy.stats` | 41 | `https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.{function}.html` | BSD 3-Clause | ✅ 완료 |

**함수 목록** (41개):

#### A. 가설검정 (14개)
1. `ttest_ind` - 독립표본 t-검정
2. `ttest_rel` - 대응표본 t-검정
3. `ttest_1samp` - 단일표본 t-검정
4. `mannwhitneyu` - Mann-Whitney U 검정
5. `wilcoxon` - Wilcoxon Signed-Rank 검정
6. `kruskal` - Kruskal-Wallis 검정
7. `friedmanchisquare` - Friedman 검정
8. `f_oneway` - 일원 ANOVA
9. `chi2_contingency` - 카이제곱 독립성 검정
10. `chisquare` - 카이제곱 적합도 검정
11. `fisher_exact` - Fisher's Exact Test
12. `kstest` - Kolmogorov-Smirnov 검정
13. `shapiro` - Shapiro-Wilk 정규성 검정
14. `levene` - Levene 등분산 검정

#### B. 상관분석 (4개)
15. `pearsonr` - Pearson 상관계수
16. `spearmanr` - Spearman 순위상관
17. `kendalltau` - Kendall's tau
18. `pointbiserialr` - Point-biserial 상관

#### C. 회귀분석 (3개)
19. `linregress` - 단순 선형 회귀
20. `theilslopes` - Theil-Sen 회귀
21. `siegelslopes` - Siegel 반복중위수 회귀

#### D. 분포 관련 (8개)
22. `norm.cdf` - 정규분포 누적분포함수
23. `norm.ppf` - 정규분포 백분위수
24. `t.ppf` - t-분포 백분위수
25. `chi2.ppf` - 카이제곱 분포 백분위수
26. `f.ppf` - F-분포 백분위수
27. `binom_test` - 이항검정
28. `poisson_means_test` - 포아송 평균 검정
29. `normaltest` - D'Agostino-Pearson 정규성 검정

#### E. 기타 통계량 (12개)
30. `sem` - 표준오차 (Standard Error of Mean)
31. `zscore` - Z-score 표준화
32. `skew` - 왜도 (Skewness)
33. `kurtosis` - 첨도 (Kurtosis)
34. `iqr` - 사분위수 범위 (IQR)
35. `entropy` - Shannon 엔트로피
36. `rankdata` - 순위 변환
37. `percentileofscore` - 백분위 점수
38. `trim_mean` - 절사평균 (Trimmed Mean)
39. `gmean` - 기하평균 (Geometric Mean)
40. `hmean` - 조화평균 (Harmonic Mean)
41. `mode` - 최빈값 (Mode)

**크롤링 방법**: Crawl4AI → 각 함수 페이지 개별 크롤링
**저장 경로**: `data/scipy/stats/{function}.md`

**라이선스**: BSD 3-Clause License
```
Copyright (c) 2001-2002 Enthought, Inc. 2003-2024, SciPy Developers.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that...
```

**저작권 상태**: ✅ **상업적 사용 가능** (BSD License)

---

### 1.3 Tier 1: NumPy 문서 (✅ 크롤링 완료)

**대상**: Worker 1-4에서 실제 사용하는 20개 함수

| 모듈 | 함수 개수 | 크롤링 URL 패턴 | 라이선스 | 상태 |
|------|----------|----------------|---------|------|
| `numpy` | 20 | `https://numpy.org/doc/stable/reference/generated/numpy.{function}.html` | BSD 3-Clause | ✅ 완료 |

**함수 목록** (20개):

#### A. 기본 통계 (8개)
1. `mean` - 평균
2. `median` - 중위수
3. `std` - 표준편차
4. `var` - 분산
5. `min` - 최솟값
6. `max` - 최댓값
7. `sum` - 합계
8. `percentile` - 백분위수

#### B. 배열 조작 (6개)
9. `array` - 배열 생성
10. `concatenate` - 배열 결합
11. `reshape` - 배열 재구성
12. `transpose` - 전치
13. `where` - 조건부 선택
14. `isnan` - NaN 확인

#### C. 선형대수 (3개)
15. `linalg.eig` - 고유값/고유벡터
16. `linalg.svd` - 특이값 분해 (SVD)
17. `linalg.inv` - 역행렬

#### D. 수학 함수 (3개)
18. `sqrt` - 제곱근
19. `log` - 자연로그
20. `exp` - 지수함수

**크롤링 방법**: Crawl4AI → 각 함수 페이지 개별 크롤링
**저장 경로**: `data/numpy/{function}.md`

**라이선스**: BSD 3-Clause License
**저작권 상태**: ✅ **상업적 사용 가능**

---

### 1.4 Tier 2: 프로젝트 내부 문서 (✅ 크롤링 완료)

**대상**: 프로젝트 내 TypeScript/Markdown 메타데이터

| 소스 파일 | 변환 방식 | 저장 경로 | 설명 | 상태 |
|----------|----------|----------|------|------|
| `method-metadata.ts` | TypeScript → Markdown | `data/project/method-metadata.md` | 60개 통계 메서드 카탈로그 | ✅ 완료 |
| `implementation-summary.md` | 복사 | `data/project/implementation-summary.md` | 구현 현황 (41개 완료, 24개 예정) | ✅ 완료 |

**총 크기**: 10.2 KB (2개 파일)

**라이선스**: 프로젝트 자체 라이선스 (MIT/BSD)
**저작권 상태**: ✅ **내부 문서** (자유롭게 사용)

**참고**: Worker Python 파일은 RAG 시스템에서 제외 (구현 코드는 메뉴 안내에 불필요)

---

### 1.5 Tier 3: OpenIntro Statistics (✅ 크롤링 완료)

**대상**: Introduction to Modern Statistics (IMS) 통계 교재 - 통계 이론 챕터

| 소스 | 챕터 개수 | 크롤링 URL 패턴 | 라이선스 | 상태 |
|------|----------|----------------|---------|------|
| OpenIntro IMS | 9 | `https://openintro-ims.netlify.app/{chapter}` | CC BY-SA 3.0 | ✅ 완료 |

**챕터 목록** (9개):

#### A. 실험 설계 (1개)
1. `ch2-data-design` - Study Design and Sampling (실험 설계, 관찰 연구 vs 실험 연구, 무작위 배정, 표본 추출 방법)

#### B. 회귀분석 (3개)
2. `ch7-model-slr` - Linear Regression with a Single Predictor (단순 선형 회귀, 최소제곱법, 잔차 분석, R²)
3. `ch8-model-mlr` - Linear Regression with Multiple Predictors (다중 선형 회귀, 다중공선성, 모형 선택)
4. `ch9-model-logistic` - Logistic Regression (이항 로지스틱 회귀, Odds Ratio, 분류 정확도)

#### C. 가설검정 기초 (2개)
5. `ch11-foundations-randomization` - Hypothesis Testing with Randomization (가설검정 원리, p-value, 부트스트랩)
6. `ch13-foundations-mathematical` - Hypothesis Testing with Mathematical Models (정규분포 기반 가설검정, t-분포, 신뢰구간, Type I/II Error)

#### D. ANOVA 및 회귀 추론 (3개)
7. `ch22-inference-many-means` - Inference for Comparing Many Means (일원 ANOVA, F-검정, 사후 검정, 다중 비교)
8. `ch24-inference-one-mean` - Inference for Linear Regression with a Single Predictor (회귀 계수 검정, 신뢰구간, 회귀 진단)
9. `ch25-inference-many-means-mlr` - Inference for Linear Regression with Multiple Predictors (다중 회귀 추론, F-검정, 모형 진단)

**크롤링 방법**: Crawl4AI v0.7.6 → HTML 크롤링 후 R/Python 코드 블록 제거
**저장 경로**: `data/openintro/{chapter}.md`

**라이선스**: CC BY-SA 3.0 (Creative Commons Attribution-ShareAlike 3.0)
```
Copyright (c) OpenIntro Project (www.openintro.org)
Attribution-ShareAlike 3.0 Unported (CC BY-SA 3.0)

You are free to:
- Share — copy and redistribute the material
- Adapt — remix, transform, and build upon the material
for any purpose, even commercially.
```

**저작권 상태**: ✅ **상업적 사용 가능** (CC BY-SA 3.0)

**코드 제거**: R 및 Python 코드 블록 제거됨 (통계 이론만 유지)

---

### 1.6 Tier 1: statsmodels 문서 (✅ 크롤링 완료)

**대상**: Worker 3-4에서 실제 사용하는 함수 (약 30개)

| 모듈 | 함수 개수 (예상) | 크롤링 URL 패턴 | 라이선스 | 상태 |
|------|----------|----------------|---------|------|
| `statsmodels` | ~30 | `https://www.statsmodels.org/stable/generated/{module}.{function}.html` | BSD 3-Clause | ⏳ 대기 |

**사용 현황**:
- Worker 3 (9개): ols, AnovaRM, MANOVA, runstest_1samp, mcnemar, cochrans_q 등
- Worker 4 (21개): OLS, Logit, Poisson, ARIMA, SARIMAX, VAR, MixedLM, PHReg 등

**크롤링 방법**: Crawl4AI → 실제 사용 함수만 선택적 크롤링
**저장 경로**: `data/statsmodels/{function}.md`

**라이선스**: BSD 3-Clause License
**저작권 상태**: ✅ **상업적 사용 가능**

---

### 1.6 Tier 1: pingouin 문서 (크롤링 예정)

**대상**: Worker 1-2에서 실제 사용하는 함수 (약 5개)

| 모듈 | 함수 개수 (예상) | 크롤링 URL 패턴 | 라이선스 | 상태 |
|------|----------|----------------|---------|------|
| `pingouin` | ~5 | `https://pingouin-stats.org/generated/pingouin.{function}.html` | GPL-3.0 | ⏳ 대기 |

**사용 현황**:
- Worker 1: partial_corr
- Worker 2: partial_corr 등

**크롤링 방법**: Crawl4AI → 실제 사용 함수만 선택적 크롤링
**저장 경로**: `data/pingouin/{function}.md`

**라이선스**: GPL-3.0 License
**저작권 상태**: ⚠️ **GPL 라이선스 주의** (강력한 Copyleft)

---

## 2. 라이선스 정보

### 2.1 크롤링 대상별 라이선스

| 소스 | 라이선스 | 상업적 사용 | 수정/배포 | 저작권 표시 |
|------|---------|-----------|----------|-----------|
| **통계 방법론 가이드** | Public Domain | ✅ | ✅ | ❌ 불필요 |
| **SciPy 문서** | BSD 3-Clause | ✅ | ✅ | ✅ 필수 |
| **NumPy 문서** | BSD 3-Clause | ✅ | ✅ | ✅ 필수 |
| **프로젝트 내부 문서** | MIT/BSD (프로젝트 라이선스) | ✅ | ✅ | ✅ 필수 |

### 2.2 BSD 3-Clause License 요구사항

**필수 사항**:
1. ✅ 저작권 표시 유지
2. ✅ 라이선스 전문 포함
3. ✅ 보증 부인 문구 포함

**허용 사항**:
- ✅ 상업적 사용
- ✅ 수정/재배포
- ✅ 서브라이선스

**금지 사항**:
- ❌ 원저작자 이름으로 홍보 금지

**구현 방법**:
```markdown
<!-- 각 크롤링 문서 하단에 추가 -->
---
**Source**: SciPy Documentation (https://docs.scipy.org/)
**License**: BSD 3-Clause License
**Copyright**: (c) 2001-2024, SciPy Developers
**Crawled**: 2025-10-31
```

---

## 3. 크롤링 히스토리

### 3.1 크롤링 세션 로그

| 날짜 | 대상 | 문서 수 | 소요 시간 | 총 글자 수 | 도구 | 상태 |
|------|------|---------|----------|-----------|------|------|
| 2025-10-31 | Tier 0 (Methodology) | 4 | 수동 작성 | - | 수동 작성 | ✅ 완료 |
| 2025-10-31 | SciPy (Sample 3개) | 3 | ~3분 | 93,626 | Crawl4AI v0.7.6 | ✅ 완료 |
| 2025-10-31 | NumPy (Sample 2개) | 2 | ~2분 | 35,042 | Crawl4AI v0.7.6 | ✅ 완료 |
| 2025-10-31 | SciPy (Batch 38개) | 38 | ~4.5분 | 821,793 | Crawl4AI v0.7.6 | ✅ 완료 |
| 2025-10-31 | NumPy (Batch 1차) | 5 | ~1분 | 97,272 | Crawl4AI v0.7.6 | ✅ 완료 (5/18) |
| 2025-10-31 | NumPy (Retry 13개) | 13 | ~1.5분 | 251,645 | Crawl4AI v0.7.6 | ✅ 완료 |
| 2025-10-31 | statsmodels (Batch 28개) | 28 | ~1분 | 666,256 | Crawl4AI v0.7.6 | ✅ 완료 |
| 2025-10-31 | pingouin (Batch 2개) | 2 | ~5초 | 2,141 | Crawl4AI v0.7.6 | ✅ 완료 |
| 2025-11-01 | OpenIntro IMS (Batch 9개) | 9 | ~2분 | 641,049 | Crawl4AI v0.7.6 | ✅ 완료 |
| 2025-11-01 | Project Docs | 2 | ~10초 | 10,280 | TypeScript Parser + Copy | ✅ 완료 |

**샘플 크롤링 상세 (2025-10-31)**:
- **SciPy (3개)**: `ttest_ind.md` (305줄, 34,213자), `mannwhitneyu.md` (269줄, 33,347자), `f_oneway.md` (224줄, 26,066자)
- **NumPy (2개)**: `mean.md` (254줄, 16,747자), `percentile.md` (316줄, 18,295자)
- **도구**: Crawl4AI v0.7.6 (Playwright 1.55.0)
- **Python 환경**: Python 3.13
- **인코딩**: UTF-8 (Windows cp949 충돌 해결)
- **메타데이터**: YAML frontmatter 포함 (title, source, license, copyright, crawled_date)

**배치 크롤링 상세 (2025-10-31)**:

**SciPy (38개)**:
- 100% 성공률 (38/38)
- 총 글자 수: 821,793 (평균 21,626자/문서)
- 소요 시간: ~4.5분 (평균 6.5초/문서)
- 스크립트: `scripts/crawl_scipy_batch.py` (259 lines)
- 로그 파일: `data/crawl_log_scipy_2025-10-31.txt`

**NumPy (18개, 2단계 접근)**:
- 1차 시도: 5/18 성공 (27.8%, 인터넷 연결 끊김)
  - 성공: median, std, var, min, max (97,272자)
  - 실패: sum부터 exp까지 13개
- 2차 재시도: 13/13 성공 (100%)
  - 총 글자 수: 251,645 (평균 19,357자/문서)
  - 소요 시간: ~1.5분
- **최종 결과**: 20/20 완료 (샘플 2개 포함)
- 스크립트: `scripts/crawl_numpy_batch.py`, `scripts/crawl_numpy_remaining.py`
- 로그 파일: `data/crawl_log_numpy_2025-10-31.txt`, `data/crawl_log_numpy_remaining_2025-10-31.txt`

**statsmodels (28개)**:
- 100% 성공률 (28/28)
- 총 글자 수: 666,256 (평균 23,795자/문서)
- 소요 시간: ~1분 (평균 2.1초/문서)
- 스크립트: `scripts/crawl_statsmodels_batch.py` (285 lines)
- 로그 파일: `data/crawl_log_statsmodels_2025-10-31.txt`
- 대상: Worker 3-4에서 사용하는 OLS, ARIMA, VAR, MixedLM 등

**pingouin (2개)**:
- 100% 성공률 (2/2)
- 총 글자 수: 2,141 (평균 1,071자/문서)
- 소요 시간: ~5초 (평균 2.5초/문서)
- 스크립트: `scripts/crawl_pingouin_batch.py` (235 lines)
- 로그 파일: `data/crawl_log_pingouin_2025-10-31.txt`
- 대상: Worker 1-2에서 사용하는 compute_effsize, cronbach_alpha

**OpenIntro IMS (9개, 2025-11-01)**:
- 100% 성공률 (9/9)
- 총 글자 수: 641,049 (평균 71,228자/챕터)
- 소요 시간: ~2분 (평균 13.3초/챕터)
- 스크립트: `scripts/crawl_openintro_batch.py` (366 lines)
- 로그 파일: `data/crawl_log_openintro_2025-11-01.txt`
- 대상: 통계 이론 교재 (실험 설계, 회귀분석, 가설검정, ANOVA)
- **특징**: R/Python 코드 블록 자동 제거 (`remove_code_blocks()` 함수 적용)

**Project Docs (2개, 2025-11-01)**:
- 100% 성공률 (2/2)
- 총 크기: 10,280 bytes (7,140 + 3,140 bytes)
- 소요 시간: ~10초
- 스크립트: `scripts/extract_method_metadata.py` (191 lines)
- 대상:
  - `method-metadata.ts` (60개 통계 메서드 카탈로그)
  - `implementation-summary.md` (구현 현황)

**공통 설정**:
- Rate Limiting: 1-2초 지연 (서버 부하 방지)
- 에러 처리: Continue-on-failure 패턴
- 저장 경로: `data/scipy/`, `data/numpy/`, `data/statsmodels/`, `data/pingouin/`, `data/openintro/`, `data/project/`

### 3.2 버전 추적

| 라이브러리 | 크롤링 버전 | 릴리스 날짜 | 문서 URL |
|-----------|------------|------------|----------|
| SciPy | 1.14.1 (latest) | 2024-09-29 | https://docs.scipy.org/doc/scipy-1.14.1/ |
| NumPy | 2.1.2 (latest) | 2024-10-05 | https://numpy.org/doc/2.1/ |
| statsmodels | 0.14.4 (latest) | 2024-07-31 | https://www.statsmodels.org/stable/ |
| pingouin | 0.5.6 (latest) | 2024-03-15 | https://pingouin-stats.org/ |
| Python | 3.11.x | - | Worker 실행 환경 |

**업데이트 주기**: 6개월마다 최신 버전 재크롤링 (선택적)

---

## 4. 삭제 정책

### 4.1 삭제 기준

**즉시 삭제**:
- ❌ 라이선스 위반 발견 시
- ❌ 저작권자 요청 시 (DMCA Takedown)
- ❌ 부정확한 정보 발견 시

**주기적 검토**:
- ⚠️ 6개월 이상 사용 안 된 문서
- ⚠️ 버전이 2개 이상 오래된 문서

### 4.2 삭제 절차

```bash
# 1. 삭제 대상 확인
find data/scipy -name "*.md" -mtime +180  # 180일 이상 미수정

# 2. 백업 (Git에 보관)
git log --follow data/scipy/{function}.md

# 3. 삭제 실행
rm data/scipy/{function}.md

# 4. Manifest 업데이트
# 이 파일에서 해당 행 제거 또는 상태를 "❌ 삭제됨"으로 변경
```

### 4.3 삭제 로그

| 날짜 | 삭제 파일 | 사유 | 복원 가능 여부 |
|------|----------|------|---------------|
| - | - | - | - |

---

## 5. 품질 관리

### 5.1 크롤링 품질 체크리스트

**샘플 5개 문서 검증 (2025-10-31)**:
- [x] 완전한 HTML → Markdown 변환 (Crawl4AI 자동 처리)
- [x] 수식 (LaTeX) 정확히 보존 (원본 HTML 수식 태그 보존)
- [x] 코드 블록 형식 유지 (파라미터 설명, 예제 코드 포함)
- [x] 이미지/다이어그램 URL 유효 (로고 및 네비게이션 링크 포함)
- [x] 저작권 표시 추가됨 (YAML frontmatter에 license, copyright 포함)
- [x] 크롤링 날짜 기록됨 (crawled_date: 2025-10-31)
- [x] UTF-8 인코딩 확인 (한글 메타데이터 정상 표시)
- [x] 파일 크기 적절 (평균 300줄, 25KB/문서)

**검증 방법**:
```bash
# 1. 라인 수 확인
wc -l data/scipy/*.md data/numpy/*.md

# 2. 메타데이터 확인
head -20 data/scipy/ttest_ind.md

# 3. 내용 샘플 확인 (함수 파라미터 설명 보존 여부)
sed -n '100,180p' data/scipy/ttest_ind.md
```

**검증 결과**: ✅ 모든 항목 통과 (5/5 문서)

### 5.2 메타데이터 필수 항목

**각 크롤링 문서 헤더**:
```markdown
---
title: scipy.stats.ttest_ind
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
scipy_version: 1.14.1
---
```

---

## 6. 사용 통계 (RAG 시스템 운영 후)

### 6.1 문서 접근 빈도 (미래)

| 문서 | 접근 횟수 | 마지막 접근 | 유용성 |
|------|----------|-----------|--------|
| - | - | - | - |

**수집 방법**: RAG 시스템 로그 분석 (Week 4 이후)

---

## 7. 참고 자료

### 7.1 Crawl4AI 문서
- GitHub: https://github.com/unclecode/crawl4ai
- Documentation: https://docs.crawl4ai.com/

### 7.2 라이선스 가이드
- BSD License: https://opensource.org/licenses/BSD-3-Clause
- Fair Use (Academic): https://www.copyright.gov/fair-use/

### 7.3 통계 방법론 참고 문헌
- Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences.
- Field, A. (2013). Discovering Statistics Using IBM SPSS Statistics.
- Tabachnick, B. G., & Fidell, L. S. (2013). Using Multivariate Statistics.

---

**작성자**: Claude Code (AI)
**버전**: 1.0
**최종 업데이트**: 2025-10-31
