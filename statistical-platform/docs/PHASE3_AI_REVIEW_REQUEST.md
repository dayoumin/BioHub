# Phase 3: 공통 컴포넌트 확대 적용 - AI 검토 요청서

**작성일**: 2025-11-11
**담당자**: Claude Code
**검토 요청 대상**: 다른 AI 어시스턴트
**우선순위**: Medium (선택 사항)

---

## 📋 배경 및 목적

### 현재 상황
- ✅ **Phase 1-2 완료**: Critical 버그 수정 및 표준화 완료
  - Commit: `715a078` - anova/page.tsx, mann-whitney/page.tsx 수정
  - TypeScript: 0 errors
  - Build: 성공 (66/66 pages)
  - 코드 품질: 4.5/5 → 4.9/5

### Phase 3 목표
개별 통계 페이지(약 26개)의 UI/UX 일관성 향상을 위해 공통 컴포넌트 사용을 확대합니다.

**적용 범위**:
- 스마트 분석 페이지: `app/(dashboard)/statistics/smart-flow/`
- 개별 통계 페이지: `app/(dashboard)/statistics/`

**예상 효과**:
- ✅ UI 일관성 향상
- ✅ 코드 중복 제거
- ✅ 유지보수성 개선
- ✅ 접근성 향상

**예상 리스크**:
- 🟡 26개 페이지 동시 수정 시 회귀 버그 가능성
- 🟡 특수한 테이블 구조를 공통 컴포넌트로 변환 시 레이아웃 깨짐 가능성

---

## 🎯 검토 요청 사항

### 1. 공통 컴포넌트 존재 여부 확인

다음 3가지 컴포넌트가 실제로 존재하는지 확인해주세요:

```bash
# 확인할 파일 경로
statistical-platform/components/statistics/common/StatisticsTable.tsx
statistical-platform/components/statistics/common/EffectSizeCard.tsx
statistical-platform/components/statistics/common/StatisticalResultCard.tsx
```

**존재하지 않는다면**:
- 각 컴포넌트의 구현이 필요합니다
- 예상 구현 시간: 각 30분 (총 90분)

**존재한다면**:
- Props 인터페이스 검토
- 기존 사용 예시 확인
- 확장 가능성 평가

---

### 2. 시범 적용 대상 선정

**우선 적용 대상 (2개 페이지)**:
1. `app/(dashboard)/statistics/anova/page.tsx`
   - 이유: ANOVA Table이 명확하게 정의되어 있음
   - 난이도: ★★☆ (중간)
   - Line 962-1000: ANOVA Table 직접 구현 부분

2. `app/(dashboard)/statistics/t-test/page.tsx`
   - 이유: 기술통계 표가 단순함
   - 난이도: ★☆☆ (낮음)
   - 기존 직접 구현 부분 확인 필요

**시범 적용 검증 항목**:
- [ ] TypeScript 컴파일 에러 없음
- [ ] 테이블 레이아웃이 기존과 동일하게 표시됨
- [ ] 반응형 동작 정상
- [ ] 데이터 포맷팅 정상 (소수점, Badge 색상 등)

---

### 3. 컴포넌트 Props 설계 검토

#### StatisticsTable Props (제안)

```typescript
interface Column<T> {
  key: keyof T | string
  label: string
  align?: 'left' | 'center' | 'right'
  format?: (value: unknown) => string | number
  render?: (value: unknown, row: T) => React.ReactNode
}

interface StatisticsTableProps<T> {
  columns: Column<T>[]
  data: T[]
  caption?: string
  striped?: boolean
  compact?: boolean
  responsive?: boolean
}
```

**검토 사항**:
- Props 설계가 유연한가?
- 특수한 케이스를 처리할 수 있는가?
- 타입 안전성이 확보되는가?

#### EffectSizeCard Props (제안)

```typescript
interface EffectSizeMetric {
  name: string
  value: number
  symbol?: string
  ci?: [number, number]
}

interface EffectSizeInterpretation {
  size: 'negligible' | 'small' | 'medium' | 'large'
  description?: string
  guideline?: string
}

interface EffectSizeCardProps {
  testType: 'ttest' | 'anova' | 'correlation' | 'chi-square' | 'mann-whitney'
  metrics: EffectSizeMetric[]
  interpretation?: EffectSizeInterpretation
  showGauge?: boolean
}
```

**검토 사항**:
- 효과크기 해석 기준이 통계 방법별로 올바른가?
- Cohen (1988) 기준이 자동 적용되는가?

#### StatisticalResultCard Props (제안)

```typescript
interface TestStatistic {
  name: string
  value: number
  df?: number | number[]
}

interface Interpretation {
  significant: boolean
  conclusion: string
  hypothesis?: {
    null: string
    alternative: string
  }
}

interface StatisticalResultCardProps {
  testName: string
  statistic: TestStatistic
  pValue: number
  alpha?: number
  interpretation: Interpretation
  confidenceInterval?: {
    lower: number
    upper: number
    level?: number
  }
}
```

**검토 사항**:
- 검정통계량 포맷이 다양한 케이스를 커버하는가? (F(2, 27), t(29), U = 120 등)
- PValueBadge 통합이 자연스러운가?

---

## 📊 작업 계획 검토

### Step 1: 공통 컴포넌트 확인/구현
**예상 시간**: 30분 (확인만) ~ 120분 (구현 포함)

**작업 항목**:
1. 3개 컴포넌트 파일 존재 여부 확인
2. 없으면 구현 (각 30분)
3. Props 인터페이스 검증
4. 기존 사용 예시 확인

---

### Step 2: 시범 적용 (2개 페이지)
**예상 시간**: 40분

**대상**:
- anova/page.tsx (ANOVA Table)
- t-test/page.tsx (기술통계 표)

**작업 순서**:
1. 기존 코드 백업 (git branch 생성)
2. 공통 컴포넌트로 교체
3. TypeScript 컴파일 체크
4. 로컬 테스트 (npm run dev)
5. 레이아웃 비교 (Before/After 스크린샷)

---

### Step 3: 검증 및 피드백
**예상 시간**: 20분

**체크리스트**:
- [ ] TypeScript: 0 errors
- [ ] 테이블 레이아웃 동일
- [ ] 반응형 정상 동작
- [ ] Badge 색상 정확
- [ ] 소수점 포맷 정확
- [ ] 접근성 (ARIA) 개선됨

**문제 발견 시**:
- 회귀 (git revert)
- Props 설계 수정
- 재적용

---

### Step 4: 확대 적용 (선택)
**예상 시간**: 200분 (나머지 24개 페이지)

**조건**:
- ✅ Step 2-3 검증 통과
- ✅ 긍정적 피드백
- ✅ 리스크 관리 가능

**작업 우선순위**:
1. StatisticsTable 확대 (8개 페이지)
2. StatisticalResultCard 확대 (6개 페이지)
3. EffectSizeCard 확대 (6개 페이지)
4. 나머지 페이지 (4개)

---

## 🔍 검토 체크리스트

AI 검토자는 다음 항목을 확인해주세요:

### 기술적 타당성
- [ ] 공통 컴포넌트가 실제로 존재하는가?
- [ ] Props 설계가 유연하고 확장 가능한가?
- [ ] 타입 안전성이 확보되는가?
- [ ] 성능 이슈가 없는가? (렌더링 최적화)

### 표준 준수
- [ ] Section 17-18 코딩 표준 위반 없는가?
- [ ] 기존 페이지 패턴을 깨뜨리지 않는가?
- [ ] CLAUDE.md 규칙 준수하는가?

### 리스크 관리
- [ ] 회귀 계획이 명확한가? (git branch, revert)
- [ ] 단계적 적용 계획이 합리적인가?
- [ ] 검증 방법이 충분한가?

### 우선순위
- [ ] Phase 3가 정말 지금 필요한가?
- [ ] 다른 긴급 작업이 우선 아닌가?
- [ ] ROI(투자 대비 효과)가 높은가?

---

## 💡 대안 제안

AI 검토자는 다음 대안도 고려해주세요:

### 대안 A: 신규 페이지만 적용
- 기존 26개 페이지는 유지
- 향후 신규 페이지만 공통 컴포넌트 사용
- **장점**: 리스크 최소화
- **단점**: 일관성 확보 지연

### 대안 B: Tailwind 유틸리티 클래스 통일
- 공통 컴포넌트 대신 클래스명 통일
- `className="statistics-table"` 같은 공통 클래스 정의
- **장점**: 구현 간단, 유연성 유지
- **단점**: 로직 중복 여전히 존재

### 대안 C: Headless UI 라이브러리 도입
- Radix UI Table, @tanstack/react-table 등
- **장점**: 검증된 컴포넌트, 접근성 보장
- **단점**: 의존성 추가, 학습 곡선

---

## 📝 검토 후 작성할 문서

AI 검토자는 다음 내용을 포함한 검토 리포트를 작성해주세요:

### 1. 공통 컴포넌트 현황 보고
```markdown
## StatisticsTable
- 존재 여부: ✅ / ❌
- 위치: components/statistics/common/StatisticsTable.tsx
- Props 인터페이스: [코드 첨부]
- 기존 사용 예시: [파일명 + 라인 번호]
- 평가: [Good / Needs Improvement / Missing]

## EffectSizeCard
- ...

## StatisticalResultCard
- ...
```

### 2. 시범 적용 결과 보고
```markdown
## anova/page.tsx
- 적용 완료: ✅ / ❌
- TypeScript 에러: 0개 / X개
- 레이아웃 비교: [Before/After 스크린샷 또는 설명]
- 발견된 이슈: [없음 / 있음 - 상세 설명]

## t-test/page.tsx
- ...
```

### 3. 최종 권고사항
```markdown
## 권고
- [ ] Phase 3 즉시 진행 (확대 적용까지)
- [ ] Phase 3 부분 진행 (시범 적용만)
- [ ] Phase 3 보류 (대안 제시)

## 이유
[상세 설명]

## 다음 단계
1. [Action Item 1]
2. [Action Item 2]
3. ...
```

---

## 📚 참고 문서

- [PHASE3_COMMON_COMPONENTS_PLAN.md](PHASE3_COMMON_COMPONENTS_PLAN.md) - 전체 계획서
- [STATISTICS_CODING_STANDARDS.md](STATISTICS_CODING_STANDARDS.md) - 코딩 표준
- [CLAUDE.md](../../CLAUDE.md) - AI 코딩 규칙
- [STATUS.md](../../STATUS.md) - 프로젝트 상태

---

## 🔗 관련 Commit

- **Phase 1-2 완료**: `715a078` - feat(statistics): Phase 1-2 완료 - Critical 버그 수정 및 표준화
- **변수 role 매핑**: `96b92ea` - fix(types): 변수 role 매핑 표준화 (Section 17 준수)

---

**검토 시작 전 확인 사항**:
1. 최신 코드 pull 완료: `git pull origin master`
2. TypeScript 컴파일: `cd statistical-platform && npx tsc --noEmit`
3. 빌드 체크: `npm run build`

**검토 완료 후**:
- 이 문서와 같은 위치에 `PHASE3_AI_REVIEW_REPORT.md` 작성
- 검토 결과에 따라 Phase 3 진행 또는 보류 결정

---

**작성자**: Claude Code
**검토 요청일**: 2025-11-11
**예상 검토 시간**: 60분 (확인) ~ 180분 (구현 포함)
