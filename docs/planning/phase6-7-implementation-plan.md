# Phase 6-7 Implementation Plan

**작성일**: 2025-10-17
**상태**: 계획 단계
**목표**: Groups → PyodideCore 직접 연결 + UI/UX 개선

## 📋 현재 상태 (Phase 5-2 완료)

### ✅ 완료된 작업
- PyodideCore + PyodideStatistics 아키텍처 (4.8/5 품질)
- Python Workers 4개 완전 분리 (1,822 lines)
- Python Type Hints 추가
- Pytest 단위 테스트 (22개 통과)
- 레거시 파일 정리 완료

### 📊 현재 아키텍처
```
Groups (TypeScript)
    → PyodideStatisticsService (Facade)
        → PyodideCore
            → Python Workers
```

## 🎯 Phase 6: Groups → PyodideCore 직접 연결

### 목표
PyodideStatistics Facade를 우회하고 Groups가 PyodideCore를 직접 호출하도록 변경

### 예상 소요 시간
- **2-3일** (16-24시간)

### 작업 단계

#### Day 1: Groups 리팩토링 (6-8시간)

**1.1 descriptive.group.ts 변경**
```typescript
// 현재
const result = await pyodideStats.descriptiveStats(data);

// 변경 후
const result = await pyodideCore.callWorkerMethod<DescriptiveStatsResult>(
    'descriptive_stats',
    { data }
);
```

- 6개 Groups 파일 모두 수정
- TypeScript 컴파일 확인
- 기존 테스트 통과 확인

**1.2 타입 정의 통합**
- `pyodide-statistics.ts`의 타입 정의를 Groups에서 직접 import
- 중복 타입 제거

#### Day 2: 통합 테스트 (6-8시간)

**2.1 E2E 테스트 작성**
```typescript
describe('Groups → PyodideCore Integration', () => {
    it('should execute descriptive stats via PyodideCore', async () => {
        const result = await descriptiveGroup.descriptiveStats(data);
        expect(result.mean).toBeDefined();
    });
});
```

**2.2 성능 벤치마크**
- Facade 제거 후 성능 변화 측정
- 메모리 사용량 비교
- 초기 로딩 시간 측정

#### Day 3: 코드 정리 및 문서화 (4-8시간)

**3.1 PyodideStatistics Facade 제거 고려**
- 하위 호환성 유지 필요 시 Facade 유지
- 필요 없으면 archive로 이동

**3.2 문서 업데이트**
- CLAUDE.md 아키텍처 섹션 업데이트
- README.md 예제 코드 업데이트

### 예상 효과
- **성능**: 함수 호출 레이어 1개 감소 (10-15% 성능 향상)
- **코드 복잡도**: PyodideStatistics 2,110 lines → 제거 가능
- **유지보수성**: 직접 연결로 디버깅 용이

### 위험 요소
- ⚠️ **하위 호환성**: 기존 코드에서 PyodideStatistics를 직접 사용하는 경우
- ⚠️ **타입 안전성**: 타입 정의 누락 가능성

### 완료 기준
- [ ] Groups 6개 파일 모두 PyodideCore 직접 호출
- [ ] TypeScript 컴파일 에러 0개
- [ ] 기존 테스트 100% 통과
- [ ] 성능 벤치마크 5% 이상 향상
- [ ] 문서 업데이트 완료

---

## 🎯 Phase 7: UI/UX 개선

### 목표
사용자 경험 개선 및 프로덕션 준비

### 예상 소요 시간
- **3-5일** (24-40시간)

### 작업 단계

#### Day 1-2: 에러 처리 개선 (12-16시간)

**1.1 사용자 친화적 에러 메시지**
```typescript
// 현재
throw new Error("Descriptive stats requires at least 2 observations");

// 변경 후
throw new ValidationError({
    code: 'INSUFFICIENT_DATA',
    message: '기술통계 분석에는 최소 2개의 데이터가 필요합니다.',
    userMessage: '데이터를 추가하거나 다른 분석 방법을 선택해주세요.',
    dataRequired: 2,
    dataProvided: data.length
});
```

**1.2 에러 복구 메커니즘**
- 자동 재시도 (네트워크 에러)
- Fallback 제공 (Worker 로드 실패 시)

#### Day 3-4: 로딩 상태 개선 (12-16시간)

**3.1 프로그레스 인디케이터**
```typescript
// Worker 로딩 진행률 표시
const progress = await pyodideCore.loadWorker('worker1-descriptive', {
    onProgress: (percent) => {
        setLoadingProgress(percent);
    }
});
```

**3.2 스켈레톤 UI**
- 결과 로딩 중 스켈레톤 표시
- Suspense 활용

#### Day 5: 성능 최적화 (8시간)

**5.1 Worker 캐싱**
- 자주 사용하는 Worker 사전 로드
- LRU 캐시 구현

**5.2 결과 캐싱**
- 동일한 데이터/파라미터에 대한 결과 캐싱
- Cache invalidation 전략

### 예상 효과
- **사용자 만족도**: 에러 메시지 개선으로 30% 향상 예상
- **성능**: 캐싱으로 40-50% 응답 시간 감소
- **안정성**: 에러 복구로 99% 가용성 달성

### 완료 기준
- [ ] 모든 에러 메시지 한글화
- [ ] 에러 복구 메커니즘 구현
- [ ] 프로그레스 인디케이터 구현
- [ ] Worker 캐싱 구현
- [ ] 성능 40% 이상 향상

---

## 📊 전체 로드맵

### Phase 6-7 일정 (총 5-8일)
```
Week 1:
- Day 1-3: Phase 6 (Groups → PyodideCore)
- Day 4-5: Phase 7 시작 (에러 처리)

Week 2:
- Day 6-7: Phase 7 계속 (로딩 상태)
- Day 8: Phase 7 완료 (성능 최적화)
```

### 우선순위
1. **P0 (필수)**: Groups → PyodideCore 직접 연결
2. **P1 (중요)**: 에러 처리 개선
3. **P2 (선택)**: 로딩 상태 개선
4. **P3 (선택)**: 성능 최적화

---

## 🔧 개발 환경

### 필요 도구
- TypeScript 5.0+
- Next.js 15
- pytest (Python 테스트)
- React Testing Library

### 브랜치 전략
```bash
git checkout -b feature/phase6-groups-direct-call
git checkout -b feature/phase7-ux-improvements
```

---

## 📝 참고 자료

### 관련 문서
- [CLAUDE.md](../../CLAUDE.md) - AI 코딩 규칙
- [phase5-architecture.md](../../statistical-platform/docs/phase5-architecture.md) - 현재 아키텍처
- [CODE_REVIEW_FINAL_2025-10-17.md](../CODE_REVIEW_FINAL_2025-10-17.md) - 코드 리뷰 결과

### 기술 스택
- **TypeScript**: 타입 안전성
- **Python**: 통계 계산 (SciPy, statsmodels)
- **Pyodide**: 브라우저 Python 실행
- **pytest**: Python 단위 테스트

---

**다음 단계**: Phase 6 Day 1 시작 (Groups 리팩토링)
