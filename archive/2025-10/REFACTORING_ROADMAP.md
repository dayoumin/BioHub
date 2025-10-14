# pyodide-statistics.ts 리팩토링 로드맵

**작성일**: 2025-10-14
**목표**: 유지보수 가능한 코드베이스 구축
**참조 문서**: [REFACTORING_ANALYSIS.md](REFACTORING_ANALYSIS.md), [OPTION_A_IMPLEMENTATION_PLAN.md](OPTION_A_IMPLEMENTATION_PLAN.md), [OPTION_B_LONG_TERM_PLAN.md](OPTION_B_LONG_TERM_PLAN.md)

---

## 📊 현황 요약

### 현재 상태 (2025-10-14)
```
파일: pyodide-statistics.ts
줄 수: 2,641줄
메서드: 84개
문제점:
  - 중복 코드: 1,400줄 (70개 메서드 × 20줄)
  - 단일 파일: 유지보수 어려움
  - 코드 충돌: 병렬 개발 시 충돌 발생
```

### 목표 상태 (Phase 9 완료 후)
```
파일: 6개 (Manager + Worker 1-4 + Facade)
줄 수: 2,500줄 (구조화됨)
메서드: 84개 (유지)
개선점:
  - 중복 코드: 0줄 (헬퍼로 제거)
  - Worker별 분리: 병렬 개발 가능
  - 테스트 용이: Worker별 독립 테스트
```

---

## 🎯 리팩토링 전략

### 2단계 접근 방식

```
┌─────────────────────────────────────────────┐
│ Phase 1: Option A (단기 - 즉시 시작)         │
│ 목표: 중복 코드 제거 (2,641줄 → 1,500줄)     │
│ 기간: 3-4일                                  │
│ 효과: 유지보수성 67% 향상                     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Phase 2: Option B (장기 - Phase 9)          │
│ 목표: Worker별 서비스 분리 (확장성)          │
│ 기간: 3-4일                                  │
│ 효과: 병렬 개발 가능, 코드 충돌 최소화        │
└─────────────────────────────────────────────┘
```

---

## 📅 상세 일정

### Phase 1: Option A (현재 ~ Phase 6)

#### Week 1: 헬퍼 구현 (Day 1-2)

**Day 1** (4시간)
- [ ] `callWorkerMethod<T>()` 헬퍼 구현
- [ ] `validateWorkerParam()` 검증 함수 구현
- [ ] 타입 정의 추가 (`WorkerMethodParam`, `WorkerMethodOptions`)
- [ ] 단위 테스트 작성 (Mock Pyodide)
- [ ] Worker 1 메서드 2-3개 리팩토링 (검증용)
- [ ] 통합 테스트 실행

**Day 2** (4시간)
- [ ] Worker 1 나머지 메서드 리팩토링 (7개)
- [ ] Worker 2 메서드 리팩토링 (20개)
- [ ] 테스트 실행 및 검증

#### Week 2: Worker 3-4 리팩토링 (Day 3-4)

**Day 3** (4시간)
- [ ] Worker 3 메서드 리팩토링 (30개)
- [ ] Worker 4 메서드 리팩토링 (10개)
- [ ] 전체 테스트 실행

**Day 4** (2시간)
- [ ] 코드 정리 (주석, 미사용 코드 제거)
- [ ] 문서 업데이트 ([CLAUDE.md](CLAUDE.md), [dailywork.md](dailywork.md))
- [ ] Git 커밋 및 PR

**완료 시점**: Phase 6 이전

---

### Phase 2: Option B (Phase 9)

#### Week 1: 아키텍처 구현 (Day 1-2)

**Day 1** (4시간)
- [ ] PyodideManager 구현
  - 초기화 로직 이동
  - `callWorkerMethod<T>()` 이동
  - Worker 로딩 로직 이동
- [ ] Worker1DescriptiveService 구현 (10개 메서드)
- [ ] Facade 구현 (Worker1 위임)
- [ ] 테스트 실행

**Day 2** (6시간)
- [ ] Worker2HypothesisService 구현 (20개 메서드)
- [ ] Worker3NonparametricService 구현 (30개 메서드)
- [ ] Worker4RegressionService 구현 (10개 메서드)
- [ ] 테스트 실행

#### Week 2: 복잡한 메서드 및 정리 (Day 3-4)

**Day 3** (4시간)
- [ ] Facade에서 복잡한 메서드 구현
  - `checkAllAssumptions()` (다중 Worker 호출)
  - `correlation()` (3가지 상관계수 병합)
  - `calculateCorrelation()` (상관행렬)
  - `performBonferroni()` (Bonferroni 보정)
- [ ] 전체 테스트 실행

**Day 4** (2시간)
- [ ] 문서 업데이트
  - [CLAUDE.md](CLAUDE.md) 아키텍처 섹션 업데이트
  - 각 Worker 파일에 JSDoc 추가
- [ ] 최종 검증 (TypeScript 컴파일, 테스트)
- [ ] Git 커밋 및 PR

**완료 시점**: Phase 9 배포 전

---

## 🎯 우선순위

### P0: 즉시 시작 (Option A)
**이유**:
- 중복 코드 1,400줄 제거 (43% 감소)
- 버그 수정 효율 70배 증가 (70개 → 1개 수정)
- 작업 시간 짧음 (3-4일)
- 위험도 낮음 (기존 API 유지)

**시작 조건**:
- ✅ 현재 상태 (추가 준비 불필요)

---

### P1: Phase 9 진행 (Option B)
**이유**:
- 병렬 개발 가능 (팀 확장 대비)
- Worker별 독립 테스트
- 확장성 향상 (Worker 5 추가 시)

**시작 조건**:
- ✅ Option A 완료
- ✅ Phase 6-8 완료 (새 메서드 추가 완료)
- ✅ 모든 테스트 통과

---

## 📊 예상 효과

### Option A 효과 (단기)

| 지표 | Before | After | 개선율 |
|------|--------|-------|--------|
| **총 줄 수** | 2,641줄 | 1,500줄 | **43% ↓** |
| **중복 코드** | 1,400줄 | 0줄 | **100% ↓** |
| **메서드당 평균 줄 수** | 31줄 | 18줄 | **42% ↓** |
| **버그 수정 효율** | 70개 파일 수정 | 1개 함수 수정 | **70배 ↑** |
| **유지보수성** | 3/5 | 5/5 | **67% ↑** |

### Option B 효과 (장기)

| 지표 | Before (Option A) | After (Option B) | 개선율 |
|------|-------------------|------------------|--------|
| **최대 파일 크기** | 1,500줄 | 700줄 | **53% ↓** |
| **병렬 개발** | 불가 (코드 충돌) | 가능 (독립 파일) | **∞** |
| **테스트 속도** | 전체 실행 | Worker별 실행 | **4배 ↑** |
| **확장성** | 중간 | 높음 | **67% ↑** |

---

## ⚠️ 위험 요소 및 대응

### Option A 위험 요소

| 위험 | 영향도 | 확률 | 대응 방안 |
|------|--------|------|----------|
| 테스트 커버리지 부족 | 중간 | 중간 | 리팩토링 전 수동 테스트 |
| 파라미터 직렬화 오류 | 낮음 | 낮음 | `validateWorkerParam()` 검증 |
| 에러 메시지 변경 | 낮음 | 중간 | `errorMessage` 옵션으로 동일하게 유지 |

### Option B 위험 요소

| 위험 | 영향도 | 확률 | 대응 방안 |
|------|--------|------|----------|
| Import 경로 변경 | 중간 | 낮음 | Facade 유지로 기존 경로 동일 |
| 순환 의존성 | 높음 | 낮음 | Worker는 Manager만 의존 |
| 테스트 Mock 수정 | 중간 | 중간 | Facade 테스트는 그대로 유지 |

---

## ✅ 검증 체크리스트

### Option A 완료 기준
- [ ] `callWorkerMethod<T>()` 구현 완료
- [ ] 70개 메서드 리팩토링 완료
- [ ] 모든 테스트 통과
- [ ] TypeScript 컴파일 에러 0개
- [ ] 코드 품질 검사 통과 (`npm run lint`)
- [ ] 문서 업데이트 완료
- [ ] Git 커밋 및 PR 완료

### Option B 완료 기준
- [ ] PyodideManager 구현 완료
- [ ] Worker 1-4 서비스 구현 완료
- [ ] Facade 구현 완료 (기존 API 유지)
- [ ] 모든 테스트 통과
- [ ] TypeScript 컴파일 에러 0개
- [ ] 문서 업데이트 완료
- [ ] Git 커밋 및 PR 완료

---

## 🔄 롤백 계획

### Option A 롤백
**조건**: 테스트 실패 또는 심각한 버그 발생
**방법**: Git revert
**영향**: 없음 (기존 API 유지)

### Option B 롤백
**조건**: 성능 저하 또는 순환 의존성 발생
**방법**: Facade만 유지, Worker 서비스 제거
**영향**: Option A 상태로 복귀 (여전히 개선된 상태)

---

## 📚 참조 문서

### 리팩토링 계획
- [REFACTORING_ANALYSIS.md](REFACTORING_ANALYSIS.md) - 현황 분석
- [OPTION_A_IMPLEMENTATION_PLAN.md](OPTION_A_IMPLEMENTATION_PLAN.md) - Option A 상세 계획
- [OPTION_B_LONG_TERM_PLAN.md](OPTION_B_LONG_TERM_PLAN.md) - Option B 상세 계획

### 프로젝트 문서
- [CLAUDE.md](CLAUDE.md) - AI 코딩 규칙
- [dailywork.md](dailywork.md) - 작업 기록

### 외부 검토
- [수정 검토.md](수정 검토.md) - Gemini Code Assist 검토 의견

---

## 🎯 최종 권장사항

### 즉시 시작
✅ **Option A (callWorkerMethod 헬퍼)**
- 작업 시간: 3-4일
- 효과: 43% 코드 감소, 유지보수성 67% 향상
- 위험도: 낮음

### Phase 9 진행
✅ **Option B (Worker별 서비스 분리)**
- 작업 시간: 3-4일
- 효과: 병렬 개발 가능, 확장성 향상
- 전제조건: Option A 완료

### 총 작업 시간
**6-8일** (Option A: 3-4일 + Option B: 3-4일)

---

## 📝 다음 단계

1. **사용자 승인 대기**
   - 이 로드맵 검토
   - Option A 시작 승인

2. **Option A 시작** (승인 후)
   - Git 브랜치 생성: `refactor/option-a-helper`
   - Day 1 작업 시작

3. **Option B 계획** (Phase 9)
   - Option A 완료 후 재검토
   - Phase 9 일정에 맞춰 진행

---

**작성자**: Claude Code
**최종 업데이트**: 2025-10-14
**상태**: 사용자 승인 대기