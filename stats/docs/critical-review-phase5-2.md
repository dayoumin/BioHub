# 비판적 검토: pyodide-statistics.ts 리팩토링 현황 (수정 v2)

Phase 5-2 리팩토링 후 정밀 분석 + 교차 검증 피드백 반영 결과입니다.

---

## 🔴 심각도 높음

### 1. Generated Types의 `unknown` 필드 — 20개 잔존

**원인 (v2 수정)**: `methods-registry.json`이 아니라 `generate-method-types.mjs`의 `returnsToInterface()` 함수의 **이름 기반 타입 추론 규칙**에서 매칭되지 않는 키가 `unknown`으로 설정됨.

| 인터페이스 | `unknown` 필드 | 생성 스크립트 위치 |
|-----------|---------------|----------------|
| `TTestPairedSummaryResult` | `stdDiff` | 규칙 미포함 |
| `PartialCorrelationResult` | `confidenceInterval` | L413-414 (의도적) |
| `WilcoxonTestResult` | `nobs`, `zScore`, `medianDiff` | 규칙 미포함 |
| `OneWayAnovaResult` | `ssBetween`, `ssWithin`, `ssTotal` | 규칙 미포함 |
| `PcaAnalysisResult` | 5개 필드 | 규칙 미포함 |
| 기타 | `parameters`, `steps`, `marginalEffects`, 등 | L427-428 (의도적 unknown[]) |

**해결 방법**: `generate-method-types.mjs`의 `METHOD_TYPE_OVERRIDES`에 메서드별 오버라이드 추가 → 재생성.

### 2. 미구현 TODO 메서드 2건 — 잘못된 결과 반환 위험

- `andersonDarlingTest` → Shapiro-Wilk fallback 위장
- `dagostinoPearsonTest` → Shapiro-Wilk fallback 위장  
- **실제 영향**: `useNormalityTest.ts`의 종합 정규성 판정에서 3개 검정이 동일 결과를 반환하여 판정이 무의미
- **주의 (v2 추가)**: `scipy.stats.anderson`은 pValue를 직접 반환하지 않음 → 변환 로직 필요

### 3. `detectOutliersIQR` (pyodide-statistics.ts) — 미사용 + 빈 배열

- 외부 호출처 없음 → 삭제 가능

---

## 🟡 중간 심각도

### 4. `pvalue` vs `pValue` 명명 불일치 — 18곳
### 5. 레거시 래퍼 과잉 — ~15개 중복 메서드
### 6. `correlation()` 성능 비효율 — Worker 3회 순차 호출
### 7. `calculateCorrelation()` — O(n²) Worker 호출
### 8. `partialCorrelationWorker` — unsafe 캐스팅 (생성 스크립트 L62의 `controlIndices` 규칙 수정 필요)
### 9. `performBonferroni` — 불필요한 수동 초기화

---

## 🔵 낮은 심각도

### 10. 미사용 매개변수 9건 (ESLint 경고)
### 11. 중복/빈 JSDoc 주석
### 12. 파일 내 섹션 정리 미흡
