# Phase 5-3: pyodide-statistics 안정화 + 장기 구조화 계획

연쇄 오류를 줄이는 단기 리팩터링과, 타입 계약을 단일화하는 장기 구조개편을 분리합니다.

> **작성일**: 2026-02-19  
> **핵심 대상**: `lib/services/pyodide-statistics.ts`  
> **관련 범위**: `lib/services/executors/*`, `lib/services/statistical-executor.ts`, `types/smart-flow.ts`, `lib/constants/methods-registry.*`

---

## 목표 재정의

1. **단기(이번 작업)**: 회귀 위험을 낮추는 안전한 구조 정리
2. **중기(별도 트랙 A)**: Worker/Generated/Executor/UI 결과 계약의 명시적 통합
3. **중기(별도 트랙 B)**: methods-registry 메타모델 확장(v2)

---

## 현재 상태 요약 (코드 검증 반영)

| 항목 | 상태 | 판단 |
|------|------|------|
| `multipleRegression`, `logisticRegression`, `dunnTest`, `gamesHowellTest` | ✅ | 현행 유지 |
| `clusterAnalysis` alias (`clusters`, `centers`) | 🔶 | 분리 가능하나 하위호환 테스트 필수 |
| `performPCA` | 🔶 | 레거시 API, 사용처 축소 우선 |
| `calculateCorrelation` | ✅ | Generated 1:1 불가, 의도된 커스텀 유지 |
| `performBonferroni` | 🔶 | 명시 타입 분리 필요 |
| `andersonDarlingTest`, `dagostinoPearsonTest` | 📌 | 의도적 throw 유지 (UI는 degrade 허용) |

---

## 실행 구조 (2개 레인)

### Lane 1: 단기 안정화 (지금 진행)

#### S1. 타입 명시 강화 (낮은 리스크)
- `performBonferroni` 인라인 반환 타입을 파일 상단 인터페이스로 분리
- `calculateCorrelation` JSDoc에 "의도된 N×N 매트릭스 API" 명시

#### S2. Adapter 레이어 도입 (호환 유지 전제)
- 신규 파일: `lib/services/pyodide-statistics.adapters.ts`
- 1차 분리 대상: `clusterAnalysis` alias 후처리
- 규칙: `Generated` 단순 pass-through는 service에 두고, 변환/alias는 adapter로 이동

#### S3. `performPCA` 처리 원칙
- 즉시 `Generated.PcaAnalysisResult`로 강제 통합하지 않음
- 이유: `performPCA`는 레거시 메서드이며, 런타임 핵심 경로는 `pcaAnalysis` 중심
- 대신:
  1. `performPCA`를 레거시 호환 메서드로 명시
  2. 신규 코드에서 `pcaAnalysis` 사용 규칙 강화
  3. 사용처 제거/축소를 별도 태스크로 추적

#### S4. 미구현 정규성 테스트 관리
- `@throws` JSDoc 유지
- UI는 현재처럼 warning + fallback 동작 유지
- **중요**: 현행 스키마에서 `methods-registry.json`에 `"status": "todo"`를 직접 추가하지 않음  
  (`methods-registry.schema.json`의 `additionalProperties: false` 제약)

---

### Lane 2: 별도 트랙 A (결과 계약 통합)

문제: 결과 타입이 `Generated` / `ExecutorAnalysisResult` / `types/smart-flow.ts`로 분산됨.

산출물:
1. 계약 맵 문서: method별 source-of-truth 필드 정의
2. 변환 계층 표준화: `ExecutorResult -> UI AnalysisResult` 단일 어댑터 경로
3. 린트/테스트 가드: 새 메서드 추가 시 계약 맵 갱신 강제

권장 문서: `docs/PHASE5-3-TRACK-A-CONTRACT-UNIFICATION.md`

---

### Lane 3: 별도 트랙 B (methods-registry v2)

목표: `status`, `deprecated`, `replacement`, `since` 등 운영 메타데이터 지원.

순서:
1. `methods-registry.schema.json` 확장
2. `scripts/generate-method-types.mjs` 영향 검토 및 업데이트
3. `methods-registry.types.ts` 타입 확장
4. 레지스트리 데이터 마이그레이션

권장 문서: `docs/PHASE5-3-TRACK-B-REGISTRY-V2.md`

---

## 검증 전략 (현실적 게이트)

`pnpm tsc --noEmit`는 현재 저장소 베이스라인 자체에 기존 에러가 있어, Phase 5-3 변경 검증 게이트로 단독 사용하지 않습니다.

### 필수
```bash
# 변경 파일 대상 테스트
pnpm test --run __tests__/services/pyodide-statistics-regression-fixes.test.ts

# pyodide 관련 회귀
pnpm test --run pyodide
```

### 권장
```bash
# 가능하면 수행, 단 기존 전역 에러와 분리 보고
pnpm tsc --noEmit
pnpm test --run
```

보고 원칙:
- "전역 통과/실패"와 "변경 범위 회귀 여부"를 분리해서 기록

---

## 우선순위 및 소요 (개정)

| 우선순위 | 작업 | 예상 소요 | 위험도 |
|---------|------|-----------|--------|
| P0 | S1 타입 명시 강화 (`Bonferroni` 타입, `calculateCorrelation` JSDoc) | 45분 | 🟢 낮음 |
| P0 | S2 `clusterAnalysis` adapter 분리 + 하위호환 테스트 | 60분 | 🟡 중간 |
| P1 | S3 `performPCA` 레거시 정책 명시 + 사용처 스캔 | 45분 | 🟡 중간 |
| P1 | S4 미구현 메서드 TODO 추적 방식 문서화 | 20분 | 🟢 낮음 |
| P2 | Track A 착수 문서 작성 | 60분 | 🟡 중간 |
| P2 | Track B 스키마 초안 작성 | 60분 | 🟡 중간 |

**총합(이번 PR 권장 범위)**: 약 2.5~3시간  
**별도 트랙(후속)**: 2~4일

---

## 이번 PR 완료 기준 (Definition of Done)

1. `pyodide-statistics.ts`의 커스텀 반환 타입이 문서화/명시됨
2. `clusterAnalysis` 변환 로직이 adapter 계층으로 분리됨
3. 기존 `clusters/centers` 하위호환이 테스트로 보장됨
4. pyodide 회귀 테스트 통과
5. Track A/B 착수 문서 생성
