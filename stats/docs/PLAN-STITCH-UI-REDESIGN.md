# STITCH 시안 기반 Smart Flow UI 리디자인

**상태**: Phase 1 완료, Phase 2 대기
**최종 업데이트**: 2026-03-11
**STITCH 시안**: 4개 화면 (Step 1, Step 3, Step 4)

---

## 원칙

1. **정보 구조 유지** — Step 계약(1=업로드, 2=방법, 3=변수, 4=결과) 변경 없음
2. **디자인 언어 적용** — STITCH 시안의 시각 패턴을 현재 Step 구조 위에 입힘
3. **점진적 기능 추가** — 옵션 설정(가설/유의수준)은 Step 3 내 섹션으로 도입
4. **Phase별 독립 커밋** — 각 Phase는 이전 Step 계약을 깨뜨리지 않음

---

## 디자인 언어 (시안 공통 패턴)

| 요소 | 패턴 |
|------|------|
| 스텝 인디케이터 | 원형 번호 + 연결선 + 하단 라벨 |
| 레이아웃 | 메인 + 사이드 패널 2-column |
| 카드 | 둥근 모서리, 미묘한 그림자 |
| 업로드 영역 | 점선 테두리, 중앙 정렬 |
| 변수 슬롯 | 색상 코드 (파란=종속, 초록=독립, 주황=공변량) |
| 데이터 값 | tabular-nums 모노스페이스 |
| 액션 버튼 | 상단 우측 정렬 |

---

## Phase 0: 스텝 인디케이터 교체

현재 FloatingStepIndicator(pill + 아이콘)를 시안 스타일로 교체.

```
현재:  [📊 탐색] ─ [🎯 방법] ─ [📋 변수] ─ [📈 분석]

시안:  (1)────(2)────(3)────(4)
       데이터   방법   변수   결과
       업로드   선택   설정
```

- 원형 번호: 완료=✓파란, 현재=파란배경, 미래=회색테두리, 스킵=✓회색
- 연결선: 완료=파란, 미완=회색
- 하단 텍스트 라벨 (terminology 기반)
- 클릭으로 스텝 이동 (기존 canNavigateToStep 로직 유지)

**파일**: `SmartFlowLayout.tsx` 내 FloatingStepIndicator 교체
**Step 계약 영향**: 없음 (렌더링만 변경)

---

## Phase 1: Step 1 (데이터 업로드) 스타일

### 2-column 레이아웃 도입

```
┌─────────────────────────┬──────────────────┐
│ 업로드 완료 카드          │ 컬럼 정보 패널    │
│ (점선, 파일명, 변경 버튼) │                  │
│                          │ 수치형: 3개       │
│ 데이터 미리보기           │ 범주형: 1개       │
│ (테이블 + "N행" 배지)    │ 결측: 0건         │
│                          │                  │
│ [▸ 상세 분석 펼치기]     │ (메서드 선택 후   │
│                          │  변수 지정 가능)  │
└─────────────────────────┴──────────────────┘
```

- 좌: 업로드 완료 UI (점선 카드) + 데이터 미리보기 테이블
- 우: 컬럼 요약 패널 (타입별 개수, 결측 정보)
- EDA 기능(분포차트, 히트맵): "상세 분석" 접이식 섹션으로 이동
- quickAnalysisMode + selectedMethod 시: 우측 패널을 변수 역할 지정으로 교체

**파일**: `DataExplorationStep.tsx`
**Step 계약 영향**: 없음

---

## Phase 2: Step 3 (변수 선택) 스타일 + 옵션 섹션

### 현재 역할 유지 + STITCH 시각 스타일

```
┌─────────────────────────┬──────────────────┐
│ 변수 역할 지정            │ LIVE DATA        │
│ (칩 기반 슬롯 UI)        │ SUMMARY          │
│                          │                  │
│ ─── 분석 옵션 ────────   │ 종속: 체중(g)    │
│ 가설: ● 양측 ○ 단측>    │ 그룹: 성별       │
│ 유의수준: [0.05 ▾]      │ n = 15 + 15      │
│ 가정검정: Levene [ON]    │ Total N = 30     │
│ 효과크기: Cohen's d [✓] │                  │
└─────────────────────────┴──────────────────┘
```

- 좌 상단: 기존 변수 셀렉터를 칩/슬롯 UI로 교체 (로직 동일, 시각만 변경)
- 좌 하단: 분석 옵션 섹션 추가 (가설, 유의수준, 가정검정, 효과크기)
- 우: Live Data Summary (선택된 변수 기반 실시간 요약)

**옵션 파라미터 범위**:
- `alpha`: 이미 Worker 지원 → 즉시 기능 연결
- `alternative`: Worker 미지원 → UI만 (disabled 상태 + "준비 중" 표시), 후속 작업으로 Worker 대응
- 가정검정 토글: 현재 항상 실행 → UI는 ON 기본, OFF 시 결과에서 해당 섹션 숨김
- 효과크기: 현재 항상 계산 → 동일 처리

**파일**: `VariableSelectionStep.tsx` (리팩토링), 신규 `panels/LiveDataSummary.tsx`
**Step 계약 영향**: 없음 (case 3: variableMapping !== null 조건 유지)

---

## Phase 3: Step 4 (결과) 스타일

### Hero 컴팩트화

```
현재: 큰 p값 카드 + 결론 박스 + APA + 메타데이터
시안: [📊] 독립표본 t-검정  ✅ p=0.003 (유의함)  ✓ d=0.85 (큰 효과)
```

### 통계량 4-column

```
현재: 3-column (statistic, p, effect)
시안: 4-column (t통계량, 자유도, 평균차이, 95%CI)
```

### 차트 + 가정검정 2-column

```
현재: 1-column 순차
시안: 좌(차트) + 우(가정검정 + 기술통계)
```

### 액션 버튼 정리

```
현재: 상단 Copy+Save, 하단 5개 버튼
시안: 상단 "템플릿 저장" + "내보내기 ▾"
```

- Phase 애니메이션: 유지 (시안에 없지만 기존 UX 가치 있음)
- AI 해석: 기능 유지, 초기 표시만 간결하게

**파일**: `ResultsActionStep.tsx`
**Step 계약 영향**: 없음

---

## Phase 4: Step 2 (방법 선택) + 공통 마무리

- 시안 없음 → 동일 디자인 언어(카드, 타이포, 간격) 적용
- 사이드바 스타일 통일 (항목 변경 없음, 시각만)
- terminology 리소스 업데이트 (stepShortLabels)

**파일**: `PurposeInputStep.tsx`, `app-sidebar.tsx`, terminology 파일
**Step 계약 영향**: 없음

---

## 구현 순서

```
Phase 0  스텝 인디케이터 교체 ← 지금
   ↓
Phase 1  Step 1 스타일 (2-column + 업로드 UI)
   ↓
Phase 2  Step 3 스타일 (칩 UI + 옵션 섹션 + Live Summary)
   ↓
Phase 3  Step 4 스타일 (Hero + 4-col + 2-column)
   ↓
Phase 4  Step 2 + 공통 마무리
```

각 Phase: 코드 수정 → tsc → 테스트 → 커밋. Step 계약 변경 없음.

---

## 후속 작업 (이 계획서 범위 밖)

| 작업 | 선행 조건 |
|------|----------|
| `alternative` Worker 실행 지원 | 43개 메서드 Python 코드 수정 |
| 메서드 ID 정규화 (variable-requirements ↔ statistical-methods) | 매핑 레이어 설계 |
| Step 1 변수 패널 (quickAnalysisMode) | Phase 2 완료 + VariableRolePanel 안정화 |
| Hub 리디자인 | 별도 STITCH 시안 필요 |

---

## 제외 범위

- Step 계약 변경 (canProceedToNext, navigateToStep)
- Worker Python 코드 변경
- 메서드 ID 정규화
- ChatCentricHub, Bio-Tools
- 모바일 반응형
