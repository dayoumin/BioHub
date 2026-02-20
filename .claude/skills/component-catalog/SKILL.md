---
name: component-catalog
description: 공통 컴포넌트 목록 및 Design System 쇼케이스. 컴포넌트 작성, UI 개발, 디자인 시스템 작업 시 자동 적용.
user-invocable: false
---

# 공통 컴포넌트 카탈로그

## Design System 쇼케이스

```bash
pnpm dev
# → http://localhost:3000/design-system
```

파일: `stats/app/(dashboard)/design-system/page.tsx`

## 분석 관련 (`components/common/analysis/`)

| 컴포넌트 | 용도 |
|---------|------|
| PurposeCard | 선택 가능한 카드 (분석 목적, 방법 선택) |
| AIAnalysisProgress | AI 분석 진행 표시 (프로그레스 바 + 단계) |
| DataProfileSummary | 데이터 요약 표시 (표본 크기, 변수 타입) |

## 변수 선택 (`components/variable-selection/`)

| 컴포넌트 | 용도 |
|---------|------|
| VariableSelectorModern | 드래그앤드롭 + 모달 기반 (복잡한 다중 변수 선택) |
| VariableSelectorPanel | 클릭 기반 팝오버 선택 (간단한 변수 선택) |

## 통계 결과 (`components/common/statistics/`)

| 컴포넌트 | 용도 |
|---------|------|
| StatisticsTable | 통계 결과 테이블 (내보내기, 정렬) |
| EffectSizeCard | 효과 크기 표시 |
| AssumptionTestCard | 가정 검정 결과 표시 |

## Design System 메타데이터 동기화

다음 파일 수정 시 대응 JSON 업데이트 필수 (`lastUpdated` 필드):

| 트리거 파일 | 메타데이터 |
|------------|----------|
| `lib/utils/type-guards.ts` | `coding-patterns/type-guards.json` |
| `components/rag/*.tsx`, `lib/rag/*.ts` | `coding-patterns/rag-components.json` |
| `docs/STATISTICS_CODING_STANDARDS.md`, `hooks/use-statistics-page.ts` | `coding-patterns/statistics-page-pattern.json` |
| `__tests__/**/*.test.tsx` | `coding-patterns/test-snippets.json` |
| `lib/constants/statistical-methods.ts`, `DecisionTree.ts` | `coding-patterns/statistical-methods.json` |

상세: `stats/docs/DESIGN_SYSTEM_SYNC_RULES.md`
