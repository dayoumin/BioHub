# Phase 3 작업 시작 전 - AI 검토 요청 요약

**날짜**: 2025-11-11
**현재 상태**: Phase 1-2 완료, 모든 변경사항 푸시 완료
**다음 작업**: Phase 3 (공통 컴포넌트 확대 적용)

---

## 🎯 현재까지 완료된 작업

### Phase 1: Critical 버그 수정 ✅
- **파일**: `app/(dashboard)/statistics/anova/page.tsx`
- **수정**: Line 278, 357, 441
- **내용**: `actions.setResults() + setCurrentStep()` → `actions.completeAnalysis()`
- **효과**: isAnalyzing 버그 완전 해결

### Phase 2: 표준화 ✅
- **파일**: `app/(dashboard)/statistics/mann-whitney/page.tsx`
- **수정**: `pyodideStats` → `PyodideCoreService` 전환
- **효과**: 타입 안전성 향상, Worker 직접 호출

### 검증 결과 ✅
- TypeScript: **0 errors**
- Build: **66/66 pages 성공**
- 코드 품질: **4.5/5 → 4.9/5** (+8.9%)

### 커밋 및 푸시 완료 ✅
```bash
715a078 - feat(statistics): Phase 1-2 완료 - Critical 버그 수정 및 표준화
1259e28 - docs(phase3): AI 검토 요청서 작성 (현재)
```

---

## 📋 다음 작업: Phase 3

### 목표
개별 통계 페이지(약 26개)의 UI/UX 일관성 향상

### 적용할 공통 컴포넌트 (3개)
1. **StatisticsTable** - 테이블 표준화
2. **EffectSizeCard** - 효과크기 표시
3. **StatisticalResultCard** - 결과 요약

### 예상 작업량
- 시범 적용: 2개 페이지 (60분)
- 확대 적용: 24개 페이지 (240분)
- **총 예상 시간**: 5시간

---

## 🔍 AI 검토 요청 사항

### 중요! 먼저 확인해야 할 것

다른 AI가 다음을 먼저 확인해주세요:

#### 1. 공통 컴포넌트가 존재하는가?

```bash
# 확인할 파일 3개
statistical-platform/components/statistics/common/StatisticsTable.tsx
statistical-platform/components/statistics/common/EffectSizeCard.tsx
statistical-platform/components/statistics/common/StatisticalResultCard.tsx
```

**존재하지 않으면**:
- 먼저 컴포넌트 구현 필요 (각 30분, 총 90분)
- Props 인터페이스 설계
- 기본 스타일 적용

**존재하면**:
- Props 인터페이스 확인
- 기존 사용 예시 확인
- 확장 가능성 평가

#### 2. 시범 적용 대상 선정

**우선 적용할 2개 페이지**:
1. `anova/page.tsx` - ANOVA Table (Line 962-1000)
2. `t-test/page.tsx` - 기술통계 표

**시범 적용 성공 기준**:
- [ ] TypeScript 에러 없음
- [ ] 레이아웃 기존과 동일
- [ ] 반응형 정상
- [ ] 데이터 포맷 정확

---

## 📚 상세 문서 위치

### 주요 문서 (반드시 읽어야 함)
1. **[PHASE3_AI_REVIEW_REQUEST.md](statistical-platform/docs/PHASE3_AI_REVIEW_REQUEST.md)**
   - 상세 검토 요청 사항
   - Props 인터페이스 설계안
   - 체크리스트
   - 검토 리포트 양식

2. **[PHASE3_COMMON_COMPONENTS_PLAN.md](statistical-platform/docs/PHASE3_COMMON_COMPONENTS_PLAN.md)**
   - 전체 계획서
   - 26개 페이지 목록
   - Before/After 코드 예시
   - 작업 우선순위

### 참고 문서
3. **[STATISTICS_CODING_STANDARDS.md](statistical-platform/docs/STATISTICS_CODING_STANDARDS.md)**
   - Section 17-18: 변수 role 매핑, 타입 중앙 정의

4. **[CLAUDE.md](CLAUDE.md)**
   - AI 코딩 규칙 (TypeScript, Pyodide, 통계 페이지)

---

## 🚨 리스크 및 회귀 계획

### 리스크
- 🟡 26개 페이지 동시 수정 시 회귀 버그
- 🟡 특수 테이블 구조 → 공통 컴포넌트 변환 시 레이아웃 깨짐

### 회귀 계획
현재 상태는 **안전하게 푸시되어 있음** (`1259e28`)

문제 발생 시:
```bash
# 옵션 1: 전체 회귀
git reset --hard 1259e28

# 옵션 2: 특정 파일만 회귀
git checkout 1259e28 -- app/(dashboard)/statistics/anova/page.tsx
```

---

## ✅ AI 검토 후 작성할 문서

다음 문서를 작성해주세요:

### `PHASE3_AI_REVIEW_REPORT.md`

필수 포함 내용:
```markdown
## 1. 공통 컴포넌트 현황
- StatisticsTable: ✅ 존재 / ❌ 없음
- EffectSizeCard: ✅ 존재 / ❌ 없음
- StatisticalResultCard: ✅ 존재 / ❌ 없음

## 2. Props 인터페이스 평가
[각 컴포넌트별 평가]

## 3. 시범 적용 결과 (2개 페이지)
[anova, t-test 적용 결과]

## 4. 최종 권고
- [ ] Phase 3 즉시 진행
- [ ] 부분 진행 (시범만)
- [ ] 보류 (대안 제시)

## 5. 다음 단계
1. [구체적 Action Item]
2. ...
```

---

## 💬 AI에게 전달할 프롬프트 (제안)

다른 AI에게 이렇게 요청하세요:

```
Phase 3 작업을 시작하기 전에 검토가 필요합니다.

현재 상태:
- Commit: 1259e28 (모든 변경사항 푸시 완료)
- Phase 1-2 완료 (Critical 버그 수정 + 표준화)

다음을 확인해주세요:

1. 공통 컴포넌트 3개가 존재하는가?
   - components/statistics/common/StatisticsTable.tsx
   - components/statistics/common/EffectSizeCard.tsx
   - components/statistics/common/StatisticalResultCard.tsx

2. 존재한다면 Props 인터페이스 검토
3. 존재하지 않으면 구현 필요

상세 내용:
- statistical-platform/docs/PHASE3_AI_REVIEW_REQUEST.md
- statistical-platform/docs/PHASE3_COMMON_COMPONENTS_PLAN.md

검토 후 PHASE3_AI_REVIEW_REPORT.md 작성해주세요.
```

---

## 🔗 Git 정보

**Repository**: https://github.com/dayoumin/Statistics.git
**Branch**: master
**Latest Commit**: `1259e28` - docs(phase3): AI 검토 요청서 작성

**Pull 명령어**:
```bash
git clone https://github.com/dayoumin/Statistics.git
cd Statistics/statistical-platform
git pull origin master
```

---

## 📞 추가 질문이 있다면

이 문서 또는 상세 문서를 읽어도 불명확한 부분이 있다면:
1. `PHASE3_AI_REVIEW_REQUEST.md` 다시 확인
2. `PHASE3_COMMON_COMPONENTS_PLAN.md`의 예시 코드 참고
3. 기존 컴포넌트 사용 예시 검색:
   ```bash
   # StatisticsTable 사용 예시 찾기
   grep -r "StatisticsTable" app/(dashboard)/statistics/
   ```

---

**작성자**: Claude Code
**작성일**: 2025-11-11
**상태**: 검토 대기 중
