### ADR: 하이브리드 네비게이션/UX 전략 (스마트 올인원 + 7그룹 + 29개 상세)

**상태**: Accepted  
**날짜**: 2025-09-19

### 배경
- **사용자 유형**: (1) 통계를 잘 모르는 초보자, (2) 특정 검정을 빠르게 수행하려는 숙련자
- **현황**: 단일 화면 스마트 플로우(`app/(dashboard)/smart-flow/page.tsx`)와 개별 상세 페이지(`app/(dashboard)/analysis/[category]/[method]/page.tsx`) 공존
- **검토 중 발견된 이슈 요약**
  - 링크 생성이 `name` 기반으로 되어 있어 공백/표기 차이로 매칭 실패 가능
  - `popular` 가상 카테고리가 상세 매칭 시 잘못 잡혀 경고 발생 가능
  - `TEST_DATA_PATHS` 키가 설정의 `id`와 불일치(`bonferroni` vs `bonferroniPostHoc`, `pca` vs `principalComponentAnalysis` 등)
  - `AnalysisInterface`가 설정 상수 미사용(하드코딩) → 단일 소스 원칙 위배
  - 검색 카드에 상세 페이지 링크 없음, `/analysis?category=` 쿼리 미처리
  - 파라미터 폼 정의가 일부만 구현되어 다수 방법이 기본 폼으로 동작
  - Tailwind 동적 색상 클래스(safelist 미설정)로 빌드 시 스타일 누락 위험
  - “29개” 카운트 기준 불명확(중복/누락 가능)

### 결정
- **하이브리드 전략 유지**
  - 초보자: 메인에서 “스마트 통계처리(올인원)”를 기본 진입으로 제공
  - 숙련자: 7개 그룹 카테고리와 29개 상세 페이지로 빠른 진입 유지
- **단일 소스 원칙**
  - 모든 목록/메타는 `STATISTICAL_ANALYSIS_CONFIG`(`lib/statistics/ui-config.ts`)에서 파생
  - 라우팅 파라미터는 `id` 기준으로 표준화(`/analysis/{categoryId}/{methodId}`)
- **표준 카테고리 처리**
  - `popular`는 표시용으로만 사용하고 상세 매칭 시 캐논컬 카테고리로 재매핑 또는 검색 제외
- **데이터 매핑 통일**
  - `TEST_DATA_PATHS`를 메서드 `id` 키와 1:1로 통일

### 결과(Trade-offs)
- **장점**: 초보자 진입장벽 최소화, 숙련자 효율 극대화, 코드/데이터 일관성, SEO/딥링크 유지
- **단점**: 두 경로(스마트/개별) 동시 품질 관리 필요, 설정 상수와 UI 동기화 작업 필요

### 구현 지침
- **링크/매칭**
  - 링크 생성: `/analysis/${category.id}/${method.id}`
  - 상세 페이지 매칭: `id` 우선 매칭, 표시 텍스트는 `name`
  - `popular`는 매칭 소스에서 제외하거나 캐논컬 카테고리 재매핑
- **메인 인터페이스**
  - `components/analysis/analysis-interface.tsx`에서 하드코딩 제거 → `STATISTICAL_ANALYSIS_CONFIG` 파생 렌더링
  - 검색 결과 카드에 상세 페이지 링크 추가
  - 쿼리 파라미터 `?category=`로 초기 탭 선택
- **테스트 데이터 매핑**
  - `TEST_DATA_PATHS` 키를 모두 `id`로 통일: `bonferroniPostHoc`, `gamesHowellPostHoc`, `principalComponentAnalysis` 등
- **스타일**
  - Tailwind safelist에 동적 색상 팔레트 추가(`blue, green, purple, orange, pink, indigo, teal, red` 등)
- **폼**
  - 주요 방법군(t-검정/ANOVA/회귀/로지스틱/비모수/카이제곱)의 필수 파라미터를 `StatisticalAnalysisTemplate`에 확대 정의

### 수용 기준(AC)
- 모든 링크가 404 없이 상세 페이지로 이동하며, 상세는 올바른 카테고리로 렌더링
- `/analysis?category=...`가 초기 탭에 반영됨
- 스마트 플로우와 29개 상세가 동일 데이터/설정으로 일관 동작
- `STATISTICAL_ANALYSIS_CONFIG`가 단일 소스가 되고 중복 정의 제거
- “29개” 고유 `id` 기준 정합성 보장(중복 없음)

### 관련 파일
- `app/(dashboard)/analysis/page.tsx`
- `app/(dashboard)/analysis/[category]/[method]/page.tsx`
- `components/analysis/analysis-interface.tsx`
- `components/statistics/StatisticalAnalysisTemplate.tsx`
- `components/home/statistical-tools-section.tsx`
- `lib/statistics/ui-config.ts`

### 대안 검토(Rejected)
- 올인원만 유지: 숙련자/SEO/딥링크 니즈 미충족 → 기각
- 29개 상세만 유지: 초보자 경험 저하, 온보딩 어려움 → 기각


