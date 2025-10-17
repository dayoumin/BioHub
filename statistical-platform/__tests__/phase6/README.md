# Phase 6 Tests

## Test Strategy

Phase 6에서는 PyodideStatistics Facade를 완전히 제거하고 Groups → PyodideCore 직접 연결 패턴으로 전환했습니다.

### 테스트 구조

1. **critical-bugs.test.ts** - 7개 치명적 버그 수정 검증
   - 데이터 정렬 문제 (Kaplan-Meier, Cox, VAR)
   - 입력 검증 누락 (K-means, Hierarchical, ARIMA, SARIMA)

2. **pyodide-core.test.ts** - PyodideCore 서비스 핵심 기능
   - Worker lazy loading
   - Method calling with type safety
   - Error handling

3. **groups-integration.test.ts** - Groups API 통합 테스트
   - 39개 메서드 대표 샘플 테스트
   - Mock을 통한 결과 검증

### 아카이브된 테스트

Phase 5 이전의 테스트들은 `__tests__/archive-phase5/`로 이동되었습니다:
- 668개 TypeScript 에러 (PyodideStatistics 의존성)
- 구조적 불일치 (Facade 패턴 → 직접 연결)

### 테스트 실행

```bash
# Phase 6 테스트만 실행
npm test -- __tests__/phase6

# 전체 테스트 실행
npm test
```

### 향후 계획

- [ ] E2E 테스트 추가 (Playwright)
- [ ] Smart Flow 통합 테스트
- [ ] 실제 Python Worker 검증 테스트
