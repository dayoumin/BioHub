# 📊 Library Compliance Testing Guide

이 디렉토리는 **통계 신뢰성 개선 작업**(2025-10-28)의 검증 테스트를 포함합니다.

## 🎯 테스트 목적

9개의 직접 구현된 통계 메서드를 검증된 라이브러리로 교체한 작업을 검증합니다:
1. Scheffé Test → `scikit-posthocs`
2. Cochran Q Test → `statsmodels`
3. Kaplan-Meier → `lifelines`
4. Z-Test → `statsmodels`
5. Cohen's d → `pingouin`
6. McNemar Test → `statsmodels`
7. Cronbach's Alpha → `pingouin`
8. PCA → `sklearn`
9. Durbin-Watson → `statsmodels`

---

## 🧪 테스트 구조

### 1. Python 단위 테스트
**파일**: `statistical-reliability.test.py`

**테스트 범위**:
- 각 메서드의 기본 동작 검증
- 에러 핸들링 (경계 조건)
- 라이브러리 호출 확인
- 반환값 타입 검증

**실행 방법**:
```bash
cd statistical-platform

# 전체 테스트 실행
pytest __tests__/library-compliance/statistical-reliability.test.py -v

# 특정 메서드만 테스트
pytest __tests__/library-compliance/statistical-reliability.test.py::TestScheffeTest -v

# 커버리지 포함 실행
pytest __tests__/library-compliance/statistical-reliability.test.py --cov=public/workers/python -v
```

**예상 출력**:
```
===== Library Compliance Test Results: 9/9 methods verified =====
✅ PASS - Scheffé Test
✅ PASS - Cochran Q Test
✅ PASS - Kaplan-Meier
✅ PASS - Z-Test
✅ PASS - Cohen's d
✅ PASS - McNemar Test
✅ PASS - Cronbach's Alpha
✅ PASS - PCA
✅ PASS - Durbin-Watson
==================================================================
```

---

### 2. TypeScript 통합 테스트
**파일**: `integration-flow.test.ts`

**테스트 범위**:
- TypeScript Groups → PyodideCore 연동
- Worker 할당 확인
- 데이터 변환 검증
- 타입 안전성

**실행 방법**:
```bash
cd statistical-platform

# Jest 테스트 실행
npm test -- __tests__/library-compliance/integration-flow.test.ts

# 또는 watch 모드
npm test -- --watch __tests__/library-compliance/integration-flow.test.ts
```

---

## 📋 테스트 체크리스트

### Python 단위 테스트 (9개 메서드)

- [ ] **Scheffé Test** (scikit-posthocs)
  - [ ] 3개 이상의 그룹으로 정상 실행
  - [ ] 비교 쌍(comparisons) 반환 확인
  - [ ] MSE 및 자유도 계산 검증

- [ ] **Cochran Q Test** (statsmodels)
  - [ ] 2D 행렬로 정상 실행
  - [ ] Q 통계량 및 p-값 반환
  - [ ] 최소 3개 조건 검증

- [ ] **Kaplan-Meier** (lifelines)
  - [ ] 생존 함수 단조 감소 확인
  - [ ] 중앙 생존 시간 계산
  - [ ] 검열 데이터 처리

- [ ] **Z-Test** (statsmodels)
  - [ ] 대표본(n≥30) 검정
  - [ ] Z 통계량 및 p-값 반환
  - [ ] 양측 검정 구현

- [ ] **Cohen's d** (pingouin)
  - [ ] t-test 내에서 효과 크기 계산
  - [ ] -∞ ~ +∞ 범위 확인
  - [ ] 풀드 표준편차 사용

- [ ] **McNemar Test** (statsmodels)
  - [ ] 2x2 분할표 검정
  - [ ] 연속성 보정 자동 적용
  - [ ] 불일치 쌍 반환

- [ ] **Cronbach's Alpha** (pingouin)
  - [ ] 0~1 범위 확인
  - [ ] 항목 수 및 응답자 수 반환
  - [ ] 최소 2개 항목 검증

- [ ] **PCA** (sklearn)
  - [ ] 주성분 행렬 반환
  - [ ] 설명 분산 비율 계산
  - [ ] 누적 분산 확인

- [ ] **Durbin-Watson** (statsmodels)
  - [ ] 0~4 범위 통계량
  - [ ] 자기상관 해석 제공
  - [ ] 독립성 판정

### TypeScript 통합 테스트 (9개 메서드)

- [ ] 각 메서드가 올바른 Worker에 할당됨
- [ ] PyodideCore.callWorkerMethod 호출 확인
- [ ] 입력 파라미터 타입 검증
- [ ] 반환값 구조 일치 확인

---

## 🚀 CI/CD 통합

### GitHub Actions 예시

```yaml
name: Library Compliance Tests

on:
  push:
    paths:
      - 'public/workers/python/**'
      - '__tests__/library-compliance/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install Python dependencies
        run: |
          pip install pytest numpy scipy statsmodels scikit-learn \
                      pingouin scikit-posthocs lifelines pandas

      - name: Run Python unit tests
        run: |
          cd statistical-platform
          pytest __tests__/library-compliance/statistical-reliability.test.py -v

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Node dependencies
        run: |
          cd statistical-platform
          npm ci

      - name: Run TypeScript integration tests
        run: |
          cd statistical-platform
          npm test -- __tests__/library-compliance/integration-flow.test.ts
```

---

## 📊 테스트 결과 해석

### 성공 기준

✅ **모든 테스트 통과**:
```
9/9 Python unit tests passed
9/9 TypeScript integration tests passed
```

⚠️ **일부 실패**:
- 라이브러리 버전 불일치 확인
- Python 환경 의존성 재설치
- Mock 데이터 업데이트

❌ **대부분 실패**:
- Python Worker 파일 수정 검토
- 라이브러리 import 오류 수정
- Pyodide 초기화 문제 확인

---

## 🔧 트러블슈팅

### 1. Import 오류
```bash
ImportError: cannot import name 'posthoc_scheffe' from 'scikit_posthocs'
```
**해결**: scikit-posthocs 최신 버전 설치
```bash
pip install --upgrade scikit-posthocs
```

### 2. lifelines 없음
```bash
ModuleNotFoundError: No module named 'lifelines'
```
**해결**: lifelines 설치
```bash
pip install lifelines
```

### 3. Pyodide 환경에서 실행 시
Pyodide는 브라우저 환경에서만 실행되므로, Python 단위 테스트는 **로컬 Python**에서만 가능합니다.

브라우저 테스트는 Playwright 또는 Selenium을 사용하세요:
```bash
npm run test:e2e
```

---

## 📚 참고 자료

- [CLAUDE.md](../../CLAUDE.md) - AI 코딩 규칙
- [Python Worker 1](../../public/workers/python/worker1-descriptive.py)
- [Python Worker 2](../../public/workers/python/worker2-hypothesis.py)
- [Python Worker 3](../../public/workers/python/worker3-nonparametric-anova.py)
- [Python Worker 4](../../public/workers/python/worker4-regression-advanced.py)

---

**작성일**: 2025-10-28
**버전**: 1.0
**상태**: ✅ 완료
