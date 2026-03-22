# 분석 방법 선택 흐름 리팩토링 계획

**상태**: 검토 완료 → 구현 대기
**작성일**: 2026-03-22
**관련**: TODO.md, PurposeInputStep.tsx

---

## 1. 문제 인식

### 1.1 구조 문제

현재 Step 2(PurposeInputStep)의 **기본 경로가 AI 채팅**이다.

```
FlowStateMachine.ts:70  → step: 'ai-chat'
mode-store.ts:34        → purposeInputMode: 'ai'
```

통계 방법 선택은 본질적으로 **규칙 기반 결정**이다:
- 변수 타입, 그룹 수, 정규성, 표본 크기, 등분산성
- 이 5가지로 43개 메서드의 80%+가 결정됨
- Decision Tree + Guided Questions가 이미 잘 동작함

### 1.2 탭과 FlowStateMachine의 구조적 모순

```
Tab "AI가 추천" (inputMode='ai')     ← Guided Flow가 여기 안에 갇혀 있음
  └─ FlowStateMachine.step
       ├─ 'ai-chat'      ← AI 채팅
       ├─ 'category'     ← 목적 카테고리 (사실상 Guided)
       ├─ 'subcategory'  ← Guided 세부
       ├─ 'questions'    ← Guided 질문
       └─ 'result'       ← 추천 결과

Tab "직접 선택" (inputMode='browse')
  └─ MethodBrowser (전체 목록)
```

### 1.3 UI 디자인 문제

#### 챗봇 시대 패턴 (2023-24) — 제거 대상

| 패턴 | 문제 |
|------|------|
| 큰 중앙 정렬 제목 + 설명문 | 랜딩 페이지 패턴, 앱에 부적합 |
| 예시 프롬프트 칩 | ChatGPT 스타일, 통계 도구에 어울리지 않음 |
| 채팅 버블 + 인라인 결과 | 챗봇 대화형, 전문 도구 아님 |
| "AI 서버 연결 불가" 면책 문구 | 시스템 내부 사정 사용자에게 노출 |
| 입력 → 결과가 단일 스크롤 | 채팅 로그처럼 쌓이는 구조 |

#### 디자인 시스템 불일치

| 항목 | 다른 Step들 | Step 2 AI 채팅 |
|------|------------|---------------|
| 헤더 | StepHeader (아이콘 + 제목, 좌측 정렬) | 중앙 정렬 큰 텍스트 |
| 너비 | 부모 컨테이너 (px-6) 일관 | max-w-2xl → 전체 너비 점프 |
| 카드 | rounded-xl border shadow-sm | gradient from-primary/5 to-primary/10 |
| 배지 | bg-amber-500/90 (추천), secondary | bg-green-500/20 (신뢰도) — 비표준 |
| 정보 밀도 | 콤팩트 (p-3, gap-2) | 상단 sparse, 하단 dense |
| CTA 버튼 | 균형 잡힌 primary + secondary | primary만 거대, secondary 미니 |

#### 이미 잘 만들어진 컴포넌트 (재활용)

- **CategorySelector**: 4카드 그리드, 호버 애니메이션, 추천 배지 — 현대적
- **GuidedQuestions**: conversational 모드, auto-answer — 잘 설계됨
- **RecommendationResult**: 타임라인, spring 애니메이션, 대안 그리드 — 현대적
- **SubcategorySelector**: 슬라이드 전환, 키보드 네비게이션 — 잘 설계됨

**문제**: 이 좋은 컴포넌트들이 "AI가 추천" 탭 안 FlowStateMachine의 하위 step에 숨겨져 있고, 챗봇 UI가 기본으로 표시됨.

---

## 2. 목표

### 사용자 관점 플로우

**연구자가 데이터를 업로드하고 Step 2에 도달했을 때:**

```
1. 즉시 "무엇을 알고 싶으신가요?" 목적 카드 4개 표시
   - 데이터 기반 추천 배지 (이 데이터에 적합한 분석)
   - 카드 하단에 대표 메서드 미리보기

2. 목적 선택 → 2-3개 조건 질문 (대부분 auto-answer)
   → 메서드 추천 결과 (근거 + 대안)

3. 막히면: "어떤 분석을 해야 할지 모르겠어요" → AI 채팅
4. 이미 아는 사람: "전체 목록에서 선택" → MethodBrowser
```

### 디자인 원칙

1. **탭 제거, 단일 흐름** — CategorySelector가 기본 화면
2. **즉시 응답** — Decision Tree 동기 실행, API 대기 없음
3. **디자인 시스템 일관성** — StepHeader, 카드 스타일, 너비, 배지 통일
4. **챗봇 패턴 제거** — 중앙 정렬 헤더, 예시 칩, 인라인 결과 삭제
5. **AI 코드 삭제 안 함** — 경로만 변경

---

## 3. 변경 계획

### Phase 1: 기본 흐름 전환

#### 3-1. 탭 제거 + 단일 흐름

```
Before:
  FilterToggle [AI가 추천 | 직접 선택]
  └─ 'ai': FlowStateMachine
  └─ 'browse': MethodBrowser

After:
  StepHeader "분석 방법 선택"
  └─ 데이터 요약 (상단 고정)
  └─ FlowStateMachine (탭 없이 직접 표시)
       ├─ 'category'  ← 기본: CategorySelector
       ├─ 'subcategory'
       ├─ 'questions'
       ├─ 'result'
       ├─ 'browse'    ← "전체 목록" 진입
       └─ 'ai-chat'   ← "AI 추천" 진입
```

**변경 파일**: PurposeInputStep.tsx, mode-store.ts, FlowStateMachine.ts

- FilterToggle 제거
- `inputMode` useState + `handleInputModeChange` 제거 (PurposeInputStep.tsx:143,152-161)
- `mode-store.ts`의 `purposeInputMode` 제거 (더 이상 사용 안 함)
- FlowStateMachine 초기 step: `'category'`
- browse/ai-chat 진입은 CategorySelector 하단 링크로 대체

**isAutoTriggered 재설계**:
- 현재: Path D/E에서 `isAutoTriggered=true` 설정 → `step='ai-chat'` + 자동 로딩/확인 뷰
- 변경:
  - Path E (cachedAiRecommendation): `flowDispatch(setAiRecommendation)` → `step='result'`로 직행
  - Path D (userQuery + data): `classifyPurpose(query)` → 성공 시 해당 category 자동 선택, 실패 시 `step='ai-chat'`으로 AI fallback
  - `isAutoTriggered` 플래그는 AI 채팅 경로에서만 사용 (축소)

#### 3-2. CategorySelector 기본 화면 강화

```
파일: CategorySelector.tsx
```

**현재**: 4카드 그리드 (비교/관계/분포/예측) — 이미 잘 되어 있음

**추가**:
- 데이터 기반 추천: `validationResults`로 Decision Tree 실행 → 적합한 카테고리에 배지
- 카드 하단에 대표 메서드 1-2개 미리보기 텍스트
- 하단 보조 경로:
  ```
  ─────────────────────────────────
  📋 전체 목록에서 선택     💬 AI에게 추천받기
  ```
  - `text-sm text-muted-foreground` (현재 text-xs보다 키움)
  - 아이콘 + 텍스트, hover:text-foreground

#### 3-3. Path D 재설계 (userQuery 처리)

```
파일: PurposeInputStep.tsx (신규 함수 classifyPurpose)
```

```typescript
function classifyPurpose(query: string): AnalysisPurpose | null
```

- keyword-based-recommender.ts의 KEYWORD_PATTERNS 재활용
- "비교", "차이" → 'compare' / "상관", "관계" → 'relationship' 등
- null → AI 채팅 fallback (기존 Path D)
- 분류 성공 → 해당 카테고리 자동 선택 → Guided questions

#### 3-4. Hub 트랙별 분기

| Hub 트랙 | Step 2 동작 |
|----------|------------|
| `direct-analysis` (메서드 결정됨) | Step 2 건너뛰기 |
| `direct-analysis` (메서드 미결정) | Guided 직행 |
| `data-consultation` | classifyPurpose() → Guided 또는 AI fallback |
| `experiment-design` | AI 채팅 |

### Phase 2: UI 디자인 일관성

#### 3-5. 헤더 통일

**Before**: NaturalLanguageInput 내부에 중앙 정렬 큰 제목
```tsx
<h2 className="text-xl font-semibold tracking-tight">어떤 분석을 하고 싶으신가요?</h2>
<p className="text-sm text-muted-foreground max-w-md mx-auto">연구 목표를 자유롭게...</p>
```

**After**: StepHeader 사용 (다른 Step과 동일)
```tsx
<StepHeader icon={<Target />} title="분석 방법 선택" />
```
- 좌측 정렬, 아이콘 + 제목
- 부제는 CategorySelector 내부 설명으로 이동

#### 3-6. 데이터 요약 상단 고정

**Before**: NaturalLanguageInput 헤더 안에만 표시 (AI 탭 전용)

**After**: Step 2 상단에 항상 표시 (모든 하위 화면에서 보임)
```tsx
<div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full
                bg-muted/50 text-xs text-muted-foreground">
  <span>📊 15행 × 3열</span>
  <span># 수치형 3개</span>
  <span>◇ 범주형 0개</span>
</div>
```
- StepHeader 우측 또는 바로 아래 배치
- 데이터가 없으면 숨김

#### 3-7. 너비 통일

**Before**: NaturalLanguageInput은 max-w-2xl, 추천 카드는 전체 너비

**After**: 모든 하위 컴포넌트가 **부모 컨테이너 너비**(px-6)를 따름
- CategorySelector: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4` (기존 유지)
- GuidedQuestions: 부모 너비 (기존 유지)
- RecommendationResult: 부모 너비 (기존 유지)
- NaturalLanguageInput (AI 채팅): `max-w-2xl` 제거 → 부모 너비
  - 채팅 메시지만 max-w-[85%] 유지 (메시지 버블)

#### 3-8. 카드/배지 스타일 통일

**추천 배지** — 기존 디자인 시스템 사용:
```
Before: bg-green-500/20 text-green-400 (신뢰도) — 비표준
After:  bg-amber-500/90 text-white (추천) — CategorySelector와 동일
```

**추천 카드** — 기존 Card 스타일 사용:
```
Before: border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10
After:  border-primary/20 shadow-sm (RecommendationResult와 동일)
```

**키워드 fallback 표시**:
```
Before: "AI 추천 85% 확신" (misleading)
After:  provider='keyword' → "규칙 기반 추천" + bg-muted 배지 (neutral)
```

#### 3-9. CTA 버튼 균형

**Before**:
```
[==========이 방법으로 분석하기→==========]  [↻ 다시 질문]
```
primary가 전체 너비, secondary가 작은 outline

**After**:
```
[====이 방법으로 분석하기→====]  [다른 방법 보기]
```
- primary: `flex-1` (대부분 차지하되 전체가 아님)
- secondary: `gap-2` outline (최소 120px, 충분한 크기)
- Guided 결과에서는 "다시 질문" 대신 "다른 조건으로"
- AI 채팅에서만 "다시 질문" 표시

#### 3-10. AI 채팅 경로 정리 (표시만 변경)

AI 채팅 화면에 진입했을 때:
- 중앙 정렬 대형 헤더 제거 → StepHeader는 상위에서 이미 표시
- 예시 칩 → 제거하거나 좌측 정렬 링크로 변경
- 데이터 요약 → 이미 상단에 고정이므로 중복 제거
- 채팅 영역 너비 → 부모 컨테이너와 일치

### Phase 3: Guided Flow 강화

#### 3-11. auto-answer 확장

현재 자동 응답 7개 + 추가:
- `group_count`: validationResults에서 범주형 변수의 unique count
- `sample_type`: 같은 ID 반복 → paired 가능성

#### 3-12. Guided 질문 최소화 UX

- auto-answer된 질문: "자동 판단됨" 배지 + 접힌 상태
- 실제 입력 필요한 질문만 강조

---

## 4. 영향 범위

### 수정 파일

| 파일 | 변경 내용 | Phase |
|------|----------|-------|
| `PurposeInputStep.tsx` | FilterToggle 제거, 단일 흐름, 데이터 요약 상단, Path D | 1,2 |
| `FlowStateMachine.ts` | 초기 step → 'category' | 1 |
| `mode-store.ts` | inputMode 상태 제거 (또는 미사용) | 1 |
| `CategorySelector.tsx` | 데이터 기반 추천 배지, 하단 보조 경로 | 1 |
| `NaturalLanguageInput.tsx` | 헤더 제거, 너비 통일, 데이터 요약 중복 제거 | 2 |
| `AutoRecommendationConfirm.tsx` | CTA 균형, 배지 색상 | 2 |
| `RecommendationResult.tsx` | CTA 균형 통일 | 2 |
| `auto-answer.ts` | 자동 응답 확장 | 3 |
| (신규 함수) | `classifyPurpose()` | 1 |

### 삭제 없음

- LLM 서비스 코드 유지
- OpenRouter, Ollama, Keyword fallback 유지
- NaturalLanguageInput 컴포넌트 유지 (AI 채팅 경로에서 사용)

### 테스트 영향

- 기존 관련 테스트 **0개** — 모두 신규 작성
- classifyPurpose() 단위 테스트 신규 (Phase 1)
- FlowStateMachine 초기 상태 테스트 신규 (Phase 1 완료 후)

---

## 5. 실행 순서

```
Phase 1 — 기본 흐름 전환 (구조)
  1. FlowStateMachine 초기 step → 'category'
  2. PurposeInputStep에서 FilterToggle 제거 + 단일 흐름
  3. CategorySelector에 하단 보조 경로 추가 (전체 목록 / AI 추천)
  4. classifyPurpose() 구현 + Path D 재설계
  5. Hub 트랙별 분기 정리

Phase 2 — UI 디자인 일관성
  1. StepHeader 통일 + 데이터 요약 상단 고정
  2. 너비 통일 (max-w-2xl 제거)
  3. 카드/배지 스타일 디자인 시스템 통일
  4. CTA 버튼 균형
  5. AI 채팅 화면 정리 (헤더/칩/중복 제거)
  6. 키워드 fallback "규칙 기반 추천" 표시

Phase 3 — Guided Flow 강화
  1. auto-answer 확장 (group_count, sample_type)
  2. 자동 판단 질문 접힘 UX
```

Phase 1 완료 후 시각 확인 → Phase 2 진행
Phase 2 완료 후 사용 테스트 → Phase 3 진행 여부 판단

---

## 6. 리스크

| 리스크 | 대응 |
|--------|------|
| Hub 채팅 → Step 2 연계 깨짐 | classifyPurpose null → AI 채팅 fallback |
| Guided 질문이 너무 많음 | auto-answer 확장으로 실제 질문 수 줄임 |
| Decision Tree 신뢰도 부족 | 결과에 "AI에게 추천받기" 링크 제공 |
| AI 채팅 진입점 발견성 낮음 | CategorySelector 하단에 명확한 링크 |
| 탭 제거로 Browse 접근성 저하 | CategorySelector 하단 + RecommendationResult에서 "전체 목록" 링크 |

---

## 7. 성공 기준

- [ ] Step 2 진입 시 AI 로딩 없이 즉시 목적 카드 표시
- [ ] 목적 선택 → 메서드 추천까지 평균 3-4클릭
- [ ] AI 채팅은 보조 경로로 존재 (기본이 아님)
- [ ] 오프라인에서 메서드 선택 완전 동작
- [ ] 모든 하위 화면 너비 일관성 (점프 없음)
- [ ] 헤더/카드/배지 스타일이 디자인 시스템과 일치
- [ ] 키워드 fallback이 "AI 추천"으로 오표기되지 않음
- [ ] 기존 AI 채팅 코드 삭제 없음
