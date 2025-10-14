# pyodide-statistics.ts 리팩토링 테스트 계획

## 요약
- **Registry 메서드**: 60개
- **pyodide-statistics.ts 전체**: 77개 (래퍼 포함)
- **리팩토링 완료**: 48개 (callWorkerMethod 사용)

## 테스트 전략

### 1단계: 자동화 테스트 (우선)
```bash
cd statistical-platform
npm test
```

**목표**: 기존 통합 테스트가 통과하는지 확인

### 2단계: Worker별 샘플 테스트

#### Worker 1 (Descriptive) - 2개 샘플
- [ ] descriptiveStats
- [ ] normalityTest

#### Worker 2 (Hypothesis) - 2개 샘플  
- [ ] tTestTwoSample
- [ ] correlationTest

#### Worker 3 (Nonparametric/ANOVA) - 2개 샘플
- [ ] mannWhitneyTest
- [ ] oneWayAnova

#### Worker 4 (Regression/Advanced) - 2개 샘플
- [ ] multipleRegression
- [ ] factorAnalysis

### 3단계: UI 연결 확인

**방법**: 개발 서버 실행 후 수동 테스트
```bash
cd statistical-platform
npm run dev
```

**테스트 항목**:
1. 기술통계 계산
2. t-검정 실행
3. ANOVA 실행
4. 회귀분석 실행

## 성공 기준

✅ **Pass**: 
- 기존 테스트 통과율 유지 (95%+)
- Worker별 샘플 테스트 8개 모두 성공
- UI에서 4개 주요 기능 정상 작동

❌ **Fail**:
- 테스트 통과율 감소
- Worker 호출 오류 발생
- UI에서 에러 발생

## 현재 상태

- [x] Registry 60개 메서드 확인
- [x] Groups 60개 메서드 구현 확인
- [x] pyodide-statistics.ts 48개 리팩토링 완료
- [ ] 자동화 테스트 실행
- [ ] 샘플 테스트 실행
- [ ] UI 연결 확인

