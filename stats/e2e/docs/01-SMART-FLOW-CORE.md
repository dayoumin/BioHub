# Phase 1: Smart Flow 핵심 워크플로우 테스트

> 기존 `smart-flow-e2e.spec.ts` 강화 + 누락 시나리오 보완

## 목표

Smart Flow의 4단계 핵심 워크플로우가 **모든 진입 경로**에서 안정적으로 동작함을 검증한다.

## Phase 1 vs Phase 4 구분

| 구분 | Phase 1 (여기) | Phase 4 (UX) |
|------|---------------|--------------|
| 관점 | "기능이 동작하는가" | "사용자가 자연스럽게 쓸 수 있는가" |
| 검증 방식 | data-testid 기반 요소 존재 | 사용자 시나리오 기반 (시간, 클릭 수, 복구) |
| 예시 | `results-main-card` 표시됨 | "초보 연구자가 5분 내 분석 완료" |
| 에러 처리 | 에러 발생 시 UI 상태 | 에러 발생 → 사용자 복구 경로 |

## 기존 테스트 현황 (smart-flow-e2e.spec.ts)

| # | 테스트 | 상태 |
|---|--------|------|
| 1 | 독립표본 t-검정 (직접 선택) | 기존 ✅ |
| 2 | 카이제곱 독립성 검정 (직접 선택) | 기존 ✅ |
| 3 | 일표본 t-검정 (OneSampleSelector) | 기존 ✅ |
| 4 | 대응표본 t-검정 (PairedSelector) | 기존 ✅ |
| 5 | 이원 분산분석 (TwoWayAnovaSelector) | 기존 ✅ |
| 6 | 다중 회귀분석 (MultipleRegressionSelector) | 기존 ✅ |
| 7 | LLM 추천 t-검정 | 기존 ✅ |

## 신규 추가 시나리오

### 1.1 Hub 진입점 테스트 (@smoke)

```
파일: smart-flow-e2e.spec.ts (기존 파일에 추가)

TC-1.1.1: Hub 페이지 렌더링
  - / 접근 → hub-upload-card, hub-visualization-card, hub-sample-size-card 표시
  - QuickAccessBar 렌더링 확인
  - 검증: data-testid 기반

TC-1.1.2: Hub → 데이터 업로드 진입
  - hub-upload-card 클릭 → Step 1 진입
  - input[type="file"] 표시 확인

TC-1.1.3: Hub → Graph Studio 진입
  - hub-visualization-card 클릭 → /graph-studio 이동
  - graphStudioPage 표시 확인

TC-1.1.4: Hub → 표본크기 계산기
  - hub-sample-size-card 클릭 → SampleSizeModal 표시
```

### 1.2 Step 1: 데이터 업로드/탐색 (@critical)

```
TC-1.2.1: CSV 업로드 → 데이터 프로파일 표시
  - t-test.csv 업로드
  - data-profile-summary 표시 확인
  - 행 수, 열 수 텍스트 확인

TC-1.2.2: 대용량 CSV 업로드 (5,000행+)
  - 대용량 CSV → 처리 완료 확인
  - 프로파일 정상 표시

TC-1.2.3: Excel 업로드 (excel-upload.spec.ts 기존)
  - .xlsx 파일 → 시트 선택 → 데이터 로드

TC-1.2.4: 잘못된 파일 업로드 → 에러 메시지
  - 빈 CSV, 이미지 파일 등
  - 에러 메시지 표시 확인

TC-1.2.5: 데이터 교체 (replace-data-button)
  - 데이터 로드 후 → replace-data-button 클릭
  - 새 파일 업로드 → 프로파일 갱신

TC-1.2.6: 데이터 준비 가이드 토글
  - data-prep-guide-toggle 클릭 → 가이드 컨텐츠 표시/숨김
```

### 1.3 Step 2: 방법 선택 (@critical)

```
TC-1.3.1: 직접 선택 탭 → 검색 → 메서드 선택
  - filter-browse 클릭 → method-search-input 입력
  - 검색 결과 필터링 → 메서드 클릭
  - selected-method-bar 표시

TC-1.3.2: AI 추천 탭 → 질문 → 추천 수락 (@ai-mock)
  - filter-ai 클릭 → ai-chat-input 입력 → ai-chat-submit
  - recommendation-card 표시 → select-recommended-method 클릭
  - 모킹: OpenRouter API

TC-1.3.3: AI 추천 → 대안 보기
  - 추천 카드에서 alternatives-toggle 클릭
  - 대안 메서드 목록 표시

TC-1.3.4: AI 추천 → 재질문
  - retry-question 클릭 → 입력 초기화
  - 새 질문 입력 가능

TC-1.3.5: 예시 프롬프트 클릭
  - example-prompts 영역의 버튼 클릭
  - ai-chat-input 자동 입력
```

### 1.4 Step 3: 변수 선택 (@critical)

```
TC-1.4.1: 자동 변수 할당 확인
  - 메서드 선택 후 Step 3 진입
  - 변수가 자동 할당된 경우 run-analysis-btn 활성화

TC-1.4.2: 수동 변수 할당 (그룹비교)
  - variable-item 클릭 → role-zone 드롭
  - 또는 역할 존 클릭 → variable-modal 표시
  - modal-var 선택 → modal-confirm-btn

TC-1.4.3: 변수 타입 불일치 경고
  - 범주형 변수를 수치형 역할에 할당 시도
  - 경고 메시지 표시

TC-1.4.4: 변수 재할당
  - 이미 할당된 변수 제거 → 다른 변수 할당
  - run-analysis-btn 상태 변경 확인
```

### 1.5 Step 4: 실행 & 결과 (@critical @slow)

```
TC-1.5.1: 분석 실행 → 결과 표시
  - run-analysis-btn 클릭
  - 로딩 인디케이터 → results-main-card 표시
  - 통계량, p-value, 효과크기 확인

TC-1.5.2: 결과 카드 검증
  - results-main-card 내 통계값 확인
  - detailed-results-section 확인
  - diagnostics-section 확인

TC-1.5.3: 내보내기 드롭다운
  - export-dropdown 클릭
  - export-docx, export-xlsx, export-html 표시

TC-1.5.4: 새 분석 시작
  - new-analysis-btn 클릭 → Hub 또는 Step 1 복귀
  - 이전 결과 초기화 확인
```

### 1.6 Stepper 내비게이션 (@important)

```
TC-1.6.1: Stepper 클릭으로 Step 이동
  - 완료된 Step 클릭 → 해당 Step 표시
  - 미완료 Step 클릭 → 이동 불가 또는 경고

TC-1.6.2: 뒤로 가기 → 상태 유지
  - Step 3에서 Step 1로 이동
  - 업로드된 데이터 유지 확인

TC-1.6.3: 브라우저 새로고침 → 상태 복원
  - Step 3에서 F5
  - sessionStorage에서 상태 복원
```

## 실행

```bash
# Phase 1 전체
npx playwright test e2e/smart-flow-e2e.spec.ts --headed

# Smoke만
npx playwright test --grep "@smoke" e2e/smart-flow-e2e.spec.ts
```

## 예상 소요 시간

- Smoke: ~3분
- Critical: ~15분 (Pyodide 로딩 포함)
- 전체 Phase 1: ~20분
