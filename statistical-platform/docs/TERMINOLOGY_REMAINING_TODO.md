# Terminology 시스템 - 남은 작업

**작성일**: 2026-02-10
**현재 상태**: 인프라 완료, 텍스트 연결 ~10%

---

## 완료된 것 (인프라 + 일부 텍스트)

- [x] TerminologyContext + Provider (localStorage 지속성 포함)
- [x] useTerminology() hook
- [x] DomainSwitcher (compact 모드, SmartFlowLayout 헤더에 배치)
- [x] aquaculture / generic 도메인 사전
- [x] Step 헤더 제목 5개 (DataExploration, PurposeInput, VariableSelection, AnalysisExecution, Results)
- [x] Variable Selector 제목/설명 6개
- [x] 상태 메시지 2개 (analyzing, analysisComplete)
- [x] 결과 섹션 1개 (effectSizeDetail)

---

## 남은 파일별 하드코딩 텍스트

### 1. ChatCentricHub.tsx (~40개) - 최다
- 허브 제목, 설명, 카드 텍스트, 빠른 시작 가이드, 추천 카드 등
- terminology-types.ts에 `hub` 섹션 추가 필요

### 2. PurposeInputStep.tsx (~25개)
- ANALYSIS_PURPOSES 배열 (7개 항목 × title/description/example)
- 탭 라벨 ('AI가 추천', '직접 선택')
- 안내 메시지

### 3. SmartFlowLayout.tsx (~15개)
- STEPS 배열 라벨 ('탐색', '방법', '변수', '분석')
- 도움말 패널 텍스트, 툴팁

### 4. AnalysisExecutionStep.tsx (~12개)
- EXECUTION_STAGES 배열 (6 stages × label + message)

### 5. FitScoreIndicator.tsx (~15개)
- 적합도 점수 라벨, 설명, 해석 텍스트

### 6. AnalysisInfoCard.tsx (~15개)
- 분석 정보 라벨, 설명

### 7. AnalysisHistoryPanel.tsx (~15개)
- 히스토리 제목, 상태 라벨, 빈 상태 메시지

### 8. GuidedQuestions.tsx (~15개)
- 질문 텍스트, 선택지, 안내 메시지

### 9. DataExplorationStep.tsx (~7개)
- 탭 라벨, 차트 타입 라벨

### 10. ResultsActionStep.tsx (~10개)
- 효과크기 해석 라벨

**총 남은 텍스트: ~150개**

---

## 작업 방법

각 파일에 대해:
1. terminology-types.ts에 해당 섹션 키 추가
2. aquaculture.ts + generic.ts 두 사전에 번역 추가
3. 컴포넌트에서 `useTerminology()` → `t.섹션.키` 로 교체
4. `pnpm tsc --noEmit` 확인

## 주의사항

- DomainSwitcher는 모든 텍스트 연결 완료 전까지 **개발자 전용**으로 취급
- 부분 연결 상태에서 도메인 전환하면 혼재 UI 발생 → UX 문제
- 완료 후 DomainSwitcher를 정식 사용자 기능으로 승격
