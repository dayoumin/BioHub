# helpers.py 모듈 등록 수정 테스트 가이드

**날짜**: 2025-11-14
**수정 커밋**: 49bf10a - fix: helpers.py 모듈 등록 및 Worker 상태 관리 개선

---

## 🐛 해결한 문제

### Issue 1: Levene Test Traceback 에러
```
가장 검증 실패: Worker 2 ◆□◆◆◆  levene_test  ◆◆◆◆
◆◆◆◆: Traceback (most recent call last):
File "/lib/python313.zip/_pyodide/_base.py", line 597, in eval_code_async
File "/lib/python313.zip/_pyodide/_base.py", line 411, in run_async
```

**원인**:
- Worker 2 (hypothesis.py)가 `from helpers import clean_groups` 실행 시 모듈을 찾지 못함
- helpers.py를 실행만 하고 Pyodide 파일 시스템에 등록하지 않았음

**해결**:
```typescript
// Before (잘못된 방법)
const helpersCode = await helpersResponse.text()
await pyodide.runPythonAsync(helpersCode)

// After (올바른 방법)
const helpersCode = await helpersResponse.text()
pyodide.FS.writeFile('/helpers.py', helpersCode)  // ← 파일 시스템 등록
await pyodide.runPythonAsync(helpersCode)
```

---

## 📋 테스트 절차

### 1. 브라우저 캐시 완전 삭제 (필수!)

**방법 1: Service Worker 캐시 삭제**
1. F12 (개발자 도구)
2. **Application** 탭 클릭
3. **Service Workers** → "Unregister" 클릭
4. **Cache Storage** → 모든 항목 우클릭 → Delete
5. **IndexedDB** → 모든 항목 우클릭 → Delete (선택사항)

**방법 2: 하드 리프레시**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**방법 3: 시크릿 모드**
- 새 시크릿 창에서 테스트 (가장 확실)

---

### 2. 개발 서버 재시작

```bash
cd statistical-platform
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

---

### 3. 스마트 분석 테스트

#### Step 1: CSV 업로드
- **스마트 분석** 페이지 이동
- 2개 이상 그룹이 있는 CSV 업로드 (예: group, value 컬럼)

#### Step 2: 분석 실행
- "분석 시작" 버튼 클릭
- Console 탭에서 다음 메시지 확인:

**✅ 성공 케이스 (수정 후)**:
```
[PyodideWorker] Loading helpers.py...
[PyodideWorker] ✓ helpers.py loaded and registered
[PyodideWorker] Loading Python module: worker2...
[PyodideWorker] ✓ Worker2 (worker2-hypothesis) loaded
[PyodideWorker] Executing: levene_test
```

**❌ 실패 케이스 (수정 전)**:
```
Traceback (most recent call last):
  File "/lib/python313.zip/_pyodide/_base.py", line 597, in eval_code_async
  ...
ModuleNotFoundError: No module named 'helpers'
```

#### Step 3: 결과 확인
- Levene Test 결과가 정상 표시되는지 확인
- `statistic`, `pValue`, `equalVariance` 값 표시

---

### 4. 개별 통계 분석 테스트

#### 4-1. ANOVA (Worker 2 사용)
1. **통계 분석** → **ANOVA**
2. CSV 업로드 (3개 그룹 이상)
3. 변수 선택 → 분석 실행
4. Levene 검정 결과 확인

#### 4-2. T-Test (Worker 2 사용)
1. **통계 분석** → **T-Test**
2. CSV 업로드 (2개 그룹)
3. 독립표본 t-검정 선택
4. Levene 검정 결과 확인

#### 4-3. Mann-Whitney (Worker 3 사용)
1. **통계 분석** → **Mann-Whitney**
2. CSV 업로드
3. `from helpers import clean_array` 정상 동작 확인

#### 4-4. Cluster Analysis (Worker 4 사용)
1. **통계 분석** → **Cluster Analysis**
2. `from helpers import clean_array` 정상 동작 확인

---

## 🔍 Console 로그 체크리스트

### 초기화 단계
```
✅ [PyodideWorker] ✓ Pyodide 0.26.4 loaded
✅ [PyodideWorker] ✓ Core packages loaded (numpy, scipy)
✅ [PyodideWorker] ✓ helpers.py loaded and registered  ← 이 메시지 확인!
✅ [PyodideWorker] ✓ Pyodide initialized
```

### Worker 로딩 단계
```
✅ [PyodideWorker] Loading Python module: worker2...
✅ Loading additional packages for worker2: []
✅ [PyodideWorker] ✓ Worker2 (worker2-hypothesis) loaded
```

### 메서드 실행 단계
```
✅ [PyodideWorker] Executing: levene_test
✅ (결과 정상 반환, Traceback 없음)
```

---

## 🚨 예상 문제 및 해결

### 문제 1: "No module named 'helpers'" 여전히 발생
**원인**: 브라우저 캐시가 완전히 삭제되지 않음

**해결**:
1. **시크릿 모드**에서 테스트
2. Service Worker 완전 삭제 후 재시작
3. 브라우저 재시작

---

### 문제 2: "helpers.py loaded" 표시되지만 에러 발생
**원인**: FS.writeFile()이 실행되지 않음

**디버깅**:
1. F12 → Console 탭
2. 다음 명령 실행:
```javascript
// Service Worker에서 helpers.py 등록 확인
navigator.serviceWorker.controller?.postMessage({ type: 'CHECK_HELPERS' })
```

---

### 문제 3: "No new packages to load" 메시지
**상태**: ✅ **정상 동작** (에러 아님)

**설명**:
- Pyodide가 이미 패키지를 로드했다는 정보성 메시지
- 실제 분석 실패와 무관
- 무시해도 됨

---

## 📊 성공 기준

### ✅ 통과 조건
1. Console에 Traceback 에러 없음
2. "helpers.py loaded and registered" 메시지 표시
3. Levene test 결과 정상 표시:
   - statistic: 숫자
   - pValue: 0~1 사이 값
   - equalVariance: true/false

### ❌ 실패 조건
1. ModuleNotFoundError: No module named 'helpers'
2. Traceback 에러 발생
3. 결과 패널에 "분석 중 오류가 발생했습니다" 표시

---

## 🛠️ 추가 검증

### TypeScript 컴파일 확인
```bash
cd statistical-platform
npx tsc --noEmit
# 결과: 0 errors ✓
```

### Git 상태 확인
```bash
git log --oneline -1
# 결과: 49bf10a fix: helpers.py 모듈 등록 및 Worker 상태 관리 개선
```

---

## 📝 관련 파일

**수정된 파일**:
- `lib/services/pyodide/core/pyodide-worker.ts`
  - Line 34-39: PyodideInterface에 FS 타입 추가
  - Line 68: loadedWorkers const 선언
  - Line 165: `pyodide.FS.writeFile('/helpers.py', helpersCode)` 추가

**영향받는 Worker 파일** (4개):
- `public/workers/python/worker1-descriptive.py` (Line 11: `from helpers import clean_array`)
- `public/workers/python/worker2-hypothesis.py` (Line 12: `from helpers import clean_groups`)
- `public/workers/python/worker3-nonparametric-anova.py` (Line 12: `from helpers import clean_groups`)
- `public/workers/python/worker4-regression-advanced.py` (Line 11: `from helpers import clean_array`)

---

## 🎯 다음 단계

### 1. 로컬 테스트 (지금)
- 위 테스트 절차 수행
- Console 로그 확인
- 성공 시 → Step 2

### 2. Vercel 배포 테스트 (선택)
```bash
git push origin master
# Vercel 자동 배포 대기 (2-3분)
# https://stats-nifs.vercel.app 접속
# 동일한 테스트 수행
```

### 3. 문제 발생 시
- Console 로그 전체 복사
- Network 탭 스크린샷
- 재현 단계 기록
- GitHub Issue 생성 또는 Claude에 보고

---

**작성일**: 2025-11-14
**작성자**: Claude Code
**커밋**: 49bf10a
