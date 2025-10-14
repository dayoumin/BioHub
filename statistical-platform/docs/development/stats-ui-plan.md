### 통계 UI/라우팅 구현 계획 (하이브리드)

**버전**: 2025-09-19  
**목표**: 초보자 친화적 “스마트 분석” + 숙련자용 7개 그룹/29개 상세 공존, 단일 소스(`STATISTICAL_ANALYSIS_CONFIG`) 기반 일원화

---

## 1) 안정화 (Routing/Config 일치)
- [ ] 링크 생성 `id` 기반 표준화(`/analysis/{categoryId}/{methodId}`)
- [ ] 상세 페이지: `id` 우선 매칭, `popular` 스킵 또는 재매핑
- [ ] TEST_DATA_PATHS 키를 `id`로 통일 (예: `bonferroniPostHoc`, `gamesHowellPostHoc`, `principalComponentAnalysis`)
- [ ] AnalysisInterface: 하드코딩 제거 → `STATISTICAL_ANALYSIS_CONFIG` 파생 렌더
- [ ] 검색 결과 카드에 상세 페이지 링크 추가
- [ ] `/analysis?category=...` 쿼리 반영(초기 탭 선택)

## 2) UX 강화 (초보자 중심)
- [ ] 메인에 “스마트 분석 시작” CTA 강화(`/smart-flow`)
- [ ] 7개 그룹 타일: 설명/예시/상위 3도구 + “전체 보기”
- [ ] 브레드크럼/돌아가기 버튼 UX 일관성 유지
- [ ] 최근 사용/즐겨찾기/검색 히스토리(로컬 저장)

## 3) 확장 (기능/품질)
- [ ] 파라미터 폼 보강: t-검정/ANOVA/회귀/로지스틱/비모수/카이제곱 필수값 정의
- [ ] Tailwind safelist에 동적 색상 추가(`blue, green, purple, orange, pink, indigo, teal, red`)
- [ ] “29개” 고유 id 기준 정합성 확정(중복/누락 해소)
- [ ] 테스트 추가: 라우팅(링크 무결성), 렌더(스냅샷), 기본 실행 흐름(E2E 일부)
- [ ] 문서 갱신: 사용자 가이드, README 섹션 업데이트

---

## 체크리스트(요약)
- [ ] 링크 모두 200/OK, 상세 페이지 카테고리 일치
- [ ] `/analysis?category=` 정상 반영
- [ ] 스마트 플로우와 상세 페이지가 동일 데이터/설정으로 동작
- [ ] 단일 소스(설정 상수) 준수, 하드코딩 제거
- [ ] 29개 도구 수량 확정 및 표기 일치

---

## 파일 영향 범위
- `components/analysis/analysis-interface.tsx`
- `app/(dashboard)/analysis/[category]/[method]/page.tsx`
- `components/home/statistical-tools-section.tsx`
- `components/statistics/StatisticalAnalysisTemplate.tsx`
- `lib/statistics/ui-config.ts`
- `tailwind.config.*` (safelist)
- `__tests__/` 및 `e2e/`

---

## 브랜치/PR 전략
1. `feature/hybrid-routing` (안정화)  
2. `feature/all-in-one-ux` (UX 강화)  
3. `feature/forms-and-safelist` (확장)

각 단계는 작은 PR로, 테스트와 확인 체크리스트 포함.


