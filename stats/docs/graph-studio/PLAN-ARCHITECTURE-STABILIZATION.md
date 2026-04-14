# Graph Studio 아키텍처 안정화 계획

> 작성: 2026-04-14
> 상태: Draft v1
> 범위: Graph Studio 세션/저장/렌더링/편집 경계 정리

## 배경

최근 Graph Studio 점검에서 기능 자체보다 경계 관리가 더 큰 리스크로 드러났다.

- 프로젝트 복원 판단이 약해 다른 데이터에 기존 `chartSpec`이 다시 붙을 수 있음
- preview와 export가 같은 차트를 보장하지 않음
- save, snapshot, route sync, AI chat persistence가 서로 다른 수명 주기를 가짐
- `LeftDataPanel`, `DataTab`, `AiPanel`이 비슷한 편집 규칙을 각자 들고 있음
- chart type 지원 여부가 여러 allowlist에 흩어져 있어 새 타입 추가 시 누락 위험이 큼

이 문제들은 UI polish보다 먼저 해결해야 하는 신뢰성 문제다.

## 목표

1. 사용자가 보는 차트와 저장/내보내는 차트가 동일한 계약을 따르게 한다.
2. Graph Studio의 프로젝트 identity와 세션 수명을 한 경로로 정리한다.
3. 편집 규칙과 차트 capability를 single source of truth로 만든다.
4. 새 chart type, 새 panel, 새 export path를 추가할 때 수정 지점을 줄인다.

## 비목표

- 전체 UI 재디자인
- 새 chart type 대량 추가
- AI 편집 프롬프트 전면 재작성
- project system 전체 통합 완료

## 기존 계획과의 관계

이 문서는 기존 Graph Studio 계획을 대체하지 않는다.

- [PLAN-UX-IMPROVEMENTS.md](D:/Projects/BioHub/stats/docs/graph-studio/PLAN-UX-IMPROVEMENTS.md):
  데이터 교체 시 스타일 보존, `goToSetup()`, `previousChartSpec`, AI 채팅 이력 초기화 같은 사용자 흐름 결정을 유지한 상태에서 수명 주기 경계를 더 명확히 만드는 계획이다.
- [PLAN-STYLE-ANNOTATION-IMPROVEMENTS.md](D:/Projects/BioHub/stats/docs/graph-studio/PLAN-STYLE-ANNOTATION-IMPROVEMENTS.md):
  `significance` 단일 경로, annotation/markLine 설계, 스타일-렌더러 연결 같은 기존 renderer 결정을 유지한 상태에서 capability registry와 export contract를 정리하는 계획이다.

즉 이 문서는 "무엇을 새로 만들지"보다 "이미 있는 기능 경계를 어떻게 안정화할지"를 다룬다.

## 유지할 기존 결정

아래 항목은 이 계획으로 뒤집지 않는다.

- 데이터 교체 시 스타일, export 설정, 주석 보존 방향
- `goToSetup()` + `previousChartSpec` 기반의 설정 단계 복귀 UX 자체
- `significance`를 유의성 브래킷의 단일 모델로 유지하는 결정
- Graph Studio 3단계 흐름(데이터 → 설정 → 편집)
- ECharts preview + 별도 matplotlib export의 이중 경로 자체

## 핵심 작업축

### 1. Session / Persistence Boundary

목표:
- `GraphStudioContent`, store, storage helper에 나뉜 수명 주기를 정리한다.

주요 변경:
- route sync를 page shell에서 분리하고 session coordinator로 이동
- project restore compatibility check 강화
- save metadata + snapshot의 성공/실패 의미를 정리
- `saveCurrentProject()`의 ambient research project 의존 제거

우선 검토 포인트:
- dataset fingerprint 또는 column schema signature 도입
- detached project / reopened route / draft chat key migration 단일화
- snapshot 실패 시 사용자 메시지와 상태 모델 재정의

### 2. Renderer / Export Contract

목표:
- preview, PNG/SVG export, matplotlib export가 같은 차트 계약을 공유하게 한다.

주요 변경:
- chart type별 capability registry 도입
- export background를 `style.background` 기반으로 통일
- unknown `chartType` fallback 제거 또는 fail-fast화
- matplotlib export 직렬화 범위를 preview contract와 동기화

우선 검토 포인트:
- `facet`, `significance`, `orientation`, `errorBar` 지원 선언 위치 통합
- export path별 validation 레벨 정리
- offline / restricted environment 대응 수준 명시

### 3. Editor Action Unification

목표:
- 편집 규칙과 액션을 `LeftDataPanel`, `DataTab`, `AiPanel`에서 따로 구현하지 않게 한다.

주요 변경:
- field assignment / chart mutation 공용 action layer 도입
- `useDataTabLogic`와 좌측 패널의 규칙 중복 제거
- AI panel의 direct mutation을 공용 액션 호출로 전환
- `GraphStudioContent`는 composition만 담당하도록 축소

우선 검토 포인트:
- X/Y/color/facet/Y2 eligibility matrix 공통화
- chart setup -> editor -> setup 전환 시 undo/history 정책 명확화
- panel별 상태와 editor state의 경계 재정의

## 단계별 실행 순서

### Phase 1. Trust Blockers

먼저 막아야 할 문제:
- project restore compatibility 강화
- export background / preview mismatch 제거
- unknown chart type fail-fast 또는 명시적 fallback 정책 확정

완료 기준:
- 잘못된 데이터에 기존 프로젝트가 자동 재부착되지 않음
- 같은 spec에서 preview와 export 배경/스타일이 일치함
- 기존 Graph Studio UX 계획과 충돌하는 수명 주기 규칙이 없는지 문서 기준선이 명시됨

### Phase 2. Session Coordinator

다음 단계:
- route/project/draft chat/snapshot 수명 주기 정리
- save transaction semantics 정리

완료 기준:
- project identity의 source of truth가 하나로 설명 가능함
- 저장 성공/실패 의미가 메타데이터와 썸네일 기준으로 일관됨

### Phase 3. Capability Registry

다음 단계:
- chart type 지원 범위를 registry로 이동
- preview/export/overlay 지원 여부를 한 곳에서 선언

완료 기준:
- 새 chart type 추가 시 수정 지점이 registry + converter 구현으로 줄어듦
- allowlist drift가 줄어듦

### Phase 4. Editor Action Layer

마지막 단계:
- 좌측 패널, 우측 탭, AI 패널이 같은 action layer를 사용
- shell orchestration 축소

완료 기준:
- field assignment 규칙이 한 곳에서만 정의됨
- `GraphStudioContent`는 restore/save/layout compose 중심으로 축소됨

## 예상 수정 범위

- `stats/app/graph-studio/GraphStudioContent.tsx`
- `stats/lib/stores/graph-studio-store.ts`
- `stats/lib/graph-studio/project-storage.ts`
- `stats/lib/graph-studio/chart-snapshot-storage.ts`
- `stats/lib/graph-studio/echarts-converter.ts`
- `stats/lib/graph-studio/converters/*`
- `stats/lib/graph-studio/export-utils.ts`
- `stats/lib/graph-studio/use-ai-chat.ts`
- `stats/lib/graph-studio/useDataTabLogic.ts`
- `stats/lib/graph-studio/useStyleTabLogic.ts`
- `stats/components/graph-studio/LeftDataPanel.tsx`
- `stats/components/graph-studio/AiPanel.tsx`
- `stats/components/graph-studio/ChartPreview.tsx`
- `stats/components/graph-studio/panels/DataTab.tsx`
- `stats/components/graph-studio/DataUploadPanel.tsx`
- `stats/lib/services/matplotlib-export.service.ts`

## 수용 기준

- 사용자는 다른 데이터 업로드 후 기존 프로젝트를 실수로 덮어쓰기 어렵다.
- export 결과가 in-app preview와 다르게 보이지 않는다.
- chart type 지원/미지원이 명시적으로 드러난다.
- 편집 규칙 변경 시 패널 3곳을 따로 고치지 않아도 된다.
