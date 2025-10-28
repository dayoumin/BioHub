# 🧪 통합 테스트 가이드 (Integration Testing Guide)

**작성일**: 2025-10-28
**대상**: 통계 신뢰성 개선 작업 검증

---

## 📊 **테스트 개요**

이 가이드는 9개의 통계 메서드를 검증된 라이브러리로 교체한 작업을 검증하는 방법을 설명합니다.

### 개선된 메서드 목록
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

## 🎯 **테스트 범위**

### Level 1: Python 단위 테스트
- **위치**: `__tests__/library-compliance/statistical-reliability.test.py`
- **목적**: 개별 Python 함수가 라이브러리를 올바르게 호출하는지 검증
- **실행 환경**: 로컬 Python 3.11+

### Level 2: TypeScript 통합 테스트
- **위치**: `__tests__/library-compliance/integration-flow.test.ts`
- **목적**: TypeScript → PyodideCore → Python Worker 연동 검증
- **실행 환경**: Jest (Node.js)

### Level 3: E2E 테스트 (선택)
- **위치**: `__tests__/statistics-pages/*.test.ts`
- **목적**: 실제 브라우저에서 Pyodide 실행 검증
- **실행 환경**: Playwright/Selenium

---

## 🚀 **빠른 시작**

### 1단계: 환경 설정

#### Python 환경 (Level 1)
```bash
# 필수 라이브러리 설치
cd statistical-platform
pip install -r __tests__/library-compliance/requirements.txt

# 설치 확인
pip list | grep -E "(pingouin|scikit-posthocs|lifelines)"
```

**예상 출력**:
```
pingouin             0.5.4
scikit-posthocs      0.9.1
lifelines            0.28.2
```

#### Node.js 환경 (Level 2)
```bash
# 이미 설치되어 있음 (npm install 완료 상태)
cd statistical-platform
npm test -- --version
```

---

### 2단계: 테스트 실행

#### A. Python 단위 테스트 (권장 첫 실행)

```bash
cd statistical-platform

# 전체 테스트 실행
pytest __tests__/library-compliance/statistical-reliability.test.py -v

# 특정 클래스만 실행
pytest __tests__/library-compliance/statistical-reliability.test.py::TestScheffeTest -v

# 커버리지 포함
pytest __tests__/library-compliance/statistical-reliability.test.py \
  --cov=public/workers/python \
  --cov-report=term-missing
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

====== 9 passed in 3.24s ======
```

#### B. TypeScript 통합 테스트

```bash
cd statistical-platform

# 통합 테스트만 실행
npm test -- __tests__/library-compliance/integration-flow.test.ts

# Watch 모드 (개발 중)
npm test -- --watch __tests__/library-compliance/integration-flow.test.ts

# 전체 Phase 6 테스트
npm test -- __tests__/phase6/
```

**예상 출력**:
```
PASS __tests__/library-compliance/integration-flow.test.ts
  Library Compliance - Integration Flow Tests
    1. Cronbach's Alpha (pingouin)
      ✓ should calculate Cronbach's alpha via PyodideCore (12ms)
    2. Z-Test (statsmodels)
      ✓ should perform z-test via PyodideCore (8ms)
    ...
    Integration Summary
      ✓ should verify all 9 methods use PyodideCore (5ms)

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

---

## 📋 **테스트 체크리스트**

작업 완료 후 다음 체크리스트를 확인하세요:

### ✅ Python 단위 테스트
- [ ] 모든 9개 메서드 테스트 통과
- [ ] 라이브러리 import 오류 없음
- [ ] 반환값 타입 일치
- [ ] 경계 조건 에러 핸들링 정상

### ✅ TypeScript 통합 테스트
- [ ] PyodideCore 호출 확인
- [ ] Worker 할당 정확성
- [ ] Mock 데이터 반환 검증
- [ ] 타입 안전성 확인

### ✅ 코드 품질
- [ ] TypeScript 컴파일 에러 0개
- [ ] 직접 구현 제거 확인
- [ ] 라이브러리 의존성 명시
- [ ] 주석 및 문서 업데이트

---

## 🔧 **트러블슈팅**

### 문제 1: pytest not found
```bash
pip install pytest pytest-cov
```

### 문제 2: 라이브러리 import 실패
```bash
# 누락된 라이브러리 확인
pip list | grep -E "(pingouin|scikit-posthocs|lifelines)"

# 전체 재설치
pip install -r __tests__/library-compliance/requirements.txt --upgrade
```

### 문제 3: Jest 테스트 실패
```bash
# Node modules 재설치
cd statistical-platform
rm -rf node_modules package-lock.json
npm install

# 캐시 클리어
npm test -- --clearCache
```

### 문제 4: Python Worker 파일 찾기 실패
테스트 파일의 경로 확인:
```python
# statistical-reliability.test.py의 상단
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../public/workers/python'))
```

Windows에서는 백슬래시를 슬래시로 변경:
```python
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../public/workers/python').replace('\\', '/'))
```

---

## 📊 **테스트 결과 해석**

### 성공 시나리오 ✅

**Python 테스트**:
```
9/9 methods verified
All tests passed
```

**TypeScript 테스트**:
```
Test Suites: 1 passed
Tests: 10 passed
```

→ **결론**: 모든 개선 작업이 정상적으로 동작합니다!

---

### 일부 실패 시나리오 ⚠️

**예시**:
```
===== Library Compliance Test Results: 7/9 methods verified =====
✅ PASS - Scheffé Test
❌ FAIL - Kaplan-Meier
❌ FAIL - Cronbach's Alpha
...
```

**확인 사항**:
1. `pip list`로 라이브러리 설치 확인
2. Python 버전 확인 (3.11+)
3. 에러 메시지 로그 확인

---

### 전체 실패 시나리오 ❌

**Python 테스트**:
```
ImportError: cannot import name 'posthoc_scheffe'
ModuleNotFoundError: No module named 'lifelines'
```

**해결 방법**:
```bash
# 1. Python 환경 확인
python --version  # 3.11 이상

# 2. 가상환경 생성 (권장)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 라이브러리 재설치
pip install -r __tests__/library-compliance/requirements.txt

# 4. 테스트 재실행
pytest __tests__/library-compliance/statistical-reliability.test.py -v
```

---

## 🎓 **추가 테스트 (고급)**

### 1. 커버리지 리포트 생성

```bash
pytest __tests__/library-compliance/statistical-reliability.test.py \
  --cov=public/workers/python \
  --cov-report=html

# 결과 확인
open htmlcov/index.html  # macOS
start htmlcov/index.html # Windows
```

### 2. 성능 벤치마크

```python
# statistical-reliability.test.py에 추가
import time

def test_performance_benchmark():
    start = time.time()
    # ... test code ...
    duration = time.time() - start
    assert duration < 1.0, f"Test took too long: {duration}s"
```

### 3. 병렬 테스트 실행

```bash
# pytest-xdist 설치
pip install pytest-xdist

# 병렬 실행 (4개 프로세스)
pytest __tests__/library-compliance/ -n 4
```

---

## 📚 **관련 문서**

- [CLAUDE.md](CLAUDE.md) - AI 코딩 규칙
- [README.md](__tests__/library-compliance/README.md) - 테스트 상세 가이드
- [Python Worker 구조](statistical-platform/public/workers/python/)
- [Phase 6 아키텍처](statistical-platform/docs/phase6-architecture.md)

---

## 🎯 **다음 단계**

테스트가 모두 통과하면:

1. **문서 업데이트**
   - [STATUS.md](STATUS.md)에 개선 사항 기록
   - [dailywork.md](dailywork.md)에 작업 로그 추가

2. **Git 커밋**
   ```bash
   git add .
   git commit -m "feat: Replace 9 direct implementations with verified libraries

   - Scheffé Test → scikit-posthocs
   - Cochran Q Test → statsmodels
   - Kaplan-Meier → lifelines
   - Z-Test, McNemar, Durbin-Watson → statsmodels
   - Cohen's d, Cronbach's Alpha → pingouin
   - PCA → sklearn

   All tests passing (9/9 methods verified)"
   ```

3. **실제 데이터로 검증**
   - 각 통계 페이지에서 샘플 데이터 실행
   - 결과가 이전과 일치하는지 확인

4. **배포**
   - Static HTML Export (`npm run build`)
   - 로컬 환경에서 테스트
   - 문서에 배포 완료 기록

---

**작성자**: Claude Code
**검증 완료**: 2025-10-28
**버전**: 1.0
**상태**: ✅ 테스트 가이드 완료
