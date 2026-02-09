# Smart Flow Terminology 적용 계획

**작성일**: 2026-02-09
**목표**: Smart Flow 내부 텍스트를 Terminology System으로 완전 전환

---

## ✅ 완료된 작업 (Step 1-4)

### 1. Core Infrastructure (100%)
- ✅ `terminology-types.ts` - SmartFlowText 인터페이스 추가
- ✅ `TerminologyDictionary` - smartFlow 필드 추가
- ✅ `aquaculture.ts` - smartFlow 섹션 구현 (한글)
- ✅ `generic.ts` - smartFlow 섹션 구현 (영어)
- ✅ TypeScript 0 errors (legacy E2E 제외)

### 2. Variable Selectors (이미 완료)
- ✅ 6개 Selector에 useTerminology() 적용
- ✅ 하드코딩 제거 100%

---

## 📝 남은 작업 (Step 5-7)

### Step 5: Smart Flow Step 파일 수정 (3개 우선)

#### 5-1. PurposeInputStep.tsx ⏳
**파일**: `components/smart-flow/steps/PurposeInputStep.tsx`
**하드코딩 텍스트**:
- [ ] Line 703: `title="분석 방법 선택"` → `t.smartFlow.stepTitles.purposeInput`
- [ ] Line 714: `ariaLabel="분석 방법 선택 모드"` → (그대로 유지 또는 별도 키)
- [ ] Line 916: `title="데이터 분석 중..."` → `t.smartFlow.statusMessages.analyzing`

**작업 순서**:
1. useTerminology import 추가
2. const t = useTerminology() 추가
3. 하드코딩된 텍스트를 t.smartFlow.* 로 교체
4. TypeScript 체크

**예상 시간**: 10분

---

#### 5-2. AnalysisExecutionStep.tsx ⏳
**파일**: `components/smart-flow/steps/AnalysisExecutionStep.tsx`
**하드코딩 텍스트**:
- [ ] Line 354: `title="분석 실행"` → `t.smartFlow.stepTitles.analysisExecution`
- [ ] Line 369: `title="분석이 완료되었습니다"` → `t.smartFlow.statusMessages.analysisComplete`

**작업 순서**:
1. useTerminology import 추가
2. const t = useTerminology() 추가
3. 하드코딩된 텍스트를 t.smartFlow.* 로 교체
4. TypeScript 체크

**예상 시간**: 10분

---

#### 5-3. DataExplorationStep.tsx ⏳
**파일**: `components/smart-flow/steps/DataExplorationStep.tsx`
**하드코딩 텍스트**:
- [ ] Line 808: `title="데이터 탐색"` → `t.smartFlow.stepTitles.dataExploration`
- [ ] Line 883: `title="데이터 탐색"` → (동일)
- [ ] Line 951: `title="데이터 탐색"` → (동일)

**작업 순서**:
1. useTerminology import 추가
2. const t = useTerminology() 추가
3. 하드코딩된 텍스트를 t.smartFlow.* 로 교체
4. TypeScript 체크

**예상 시간**: 10분

---

### Step 6: DomainSwitcher 배치 ⏳

**위치 옵션**:
- **Option A (권장)**: ConditionalHeader 우측 상단
- Option B: 설정 모달 내부

**작업 순서**:
1. `components/layout/conditional-header.tsx` 읽기
2. DomainSwitcher compact 모드로 추가
3. 스타일 조정
4. 브라우저 테스트

**예상 시간**: 15분

---

### Step 7: 최종 검증 ⏳

#### 7-1. TypeScript 체크
```bash
cd statistical-platform && pnpm tsc --noEmit
```

#### 7-2. 브라우저 테스트
```bash
pnpm dev
# → http://localhost:3000
```

**테스트 항목**:
- [ ] Smart Flow 실행
- [ ] Step 제목이 한글로 표시됨 ("분석 방법 선택", "데이터 탐색" 등)
- [ ] DomainSwitcher 클릭
- [ ] Domain 전환 (aquaculture → generic)
- [ ] Step 제목이 영어로 변경됨 ("Method Selection", "Data Exploration" 등)
- [ ] Variable Selector 텍스트도 변경됨
- [ ] 다시 aquaculture로 전환
- [ ] 한글로 돌아옴

**예상 시간**: 20분

---

## 📊 진행 상황

| 단계 | 작업 | 상태 | 소요 시간 |
|------|------|------|----------|
| **Step 1** | 하드코딩 텍스트 조사 | ✅ 완료 | 10분 |
| **Step 2** | Terminology 타입 추가 | ✅ 완료 | 10분 |
| **Step 3** | aquaculture.ts 수정 | ✅ 완료 | 5분 |
| **Step 4** | generic.ts 수정 | ✅ 완료 | 5분 |
| **Step 5** | Step 파일 수정 (3개) | ⏳ 대기 | 30분 예상 |
| **Step 6** | DomainSwitcher 배치 | ⏳ 대기 | 15분 예상 |
| **Step 7** | 최종 검증 | ⏳ 대기 | 20분 예상 |
| **총계** | | 30% 완료 | 1시간 35분 예상 |

---

## 🎯 현재 중단점

**현재 위치**: Step 4 완료
**다음 작업**: Step 5-1 (PurposeInputStep.tsx 수정)
**커밋 준비**: ✅

---

## 📝 커밋 메시지 (예정)

```
feat: Smart Flow Terminology 기초 인프라 추가

변경 내역:
- terminology-types.ts: SmartFlowText 인터페이스 추가
- aquaculture.ts: smartFlow 섹션 추가 (한글)
- generic.ts: smartFlow 섹션 추가 (영어)
- TerminologyDictionary: smartFlow 필드 추가

검증 결과:
- TypeScript: 0 errors ✓

다음 단계:
- Step 5: Smart Flow Step 파일 수정
- Step 6: DomainSwitcher 헤더 배치
- Step 7: 브라우저 테스트

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🚨 주의사항

1. **Step 파일 수정 시**:
   - 반드시 파일을 Read로 먼저 읽기
   - useTerminology import 추가
   - const t = useTerminology() 추가
   - 하드코딩된 텍스트만 교체, 로직은 건드리지 않기

2. **DomainSwitcher 배치 시**:
   - Compact 모드 사용 (아이콘만)
   - 헤더 레이아웃 깨지지 않도록 주의
   - 모바일 반응형 확인

3. **브라우저 테스트 시**:
   - 실제로 도메인 전환이 동작하는지 확인
   - Console 에러 없는지 확인
   - 모든 Step에서 텍스트가 바뀌는지 확인

---

**작성자**: Claude Code
**버전**: v1.0 (임시 계획)
