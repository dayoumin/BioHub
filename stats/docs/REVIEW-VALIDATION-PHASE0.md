# Phase 0 리뷰 요청: Statistical Validation System — R 기준값 생성

## 배경

BioHub 46개 통계 메서드 + 4개 데이터 도구의 정확도를 R/NIST 기준으로 교차검증하는 시스템.
Phase 0은 **R 기준값 생성** — Pyodide 검증 실행(Phase 1) 전에 비교 대상을 준비하는 단계.

- 설계서: `STATISTICAL-VALIDATION-DESIGN.md` (프로젝트 루트, v7)
- 기존 러너: `stats/scripts/run-pyodide-golden-tests.mjs` (1,192줄, Phase 1에서 확장 예정)

## Phase 0 산출물

```
stats/validation/
├── method-target-matrix.json          ← 50개 메서드 동치성 계약 (핵심)
├── golden-values/
│   ├── r-reference/  (50개 JSON)      ← R 4.5.3으로 생성한 기준값
│   └── nist/         (4개 JSON)       ← NIST StRD 인증값
├── r-scripts/
│   ├── generate-references.R          ← R 기준값 생성 마스터 스크립트 (1,754줄)
│   └── datasets/nist/                 ← NIST 원본 데이터 (4 CSV)
├── results/                           ← (Phase 1 이후 사용)
└── scripts/                           ← (Phase 1 이후 사용)
```

## 리뷰 포인트

### 1. method-target-matrix.json (동치성 계약)

50개 메서드별로 Python 실제 호출 ↔ R 호출 매핑을 정의.

**확인 요청:**
- `pythonCall`이 실제 Worker 코드와 일치하는가?
- `rCall`이 Python과 동일한 결과를 보장하는 옵션을 포함하는가?
- `toleranceTier` 할당이 통계량 유형에 적절한가?
- `knownDifferences`가 실제 알려진 차이를 빠짐없이 기술하는가?

**이미 수정한 항목:**
- cox-regression: worker5 → worker4, custom → statsmodels PHReg
- one-sample-proportion: prop.test → binom.test (Python과 동일한 exact binomial)
- partial-correlation: pcor.test → pcor (실제 R 스크립트 사용 함수)
- dataSource: "existing" 17건 → "synthetic" (R 스크립트가 inline 데이터 사용)

### 2. generate-references.R (R 스크립트)

1,754줄, 12개 섹션 (T-test / ANOVA / Nonparametric / Correlation / Regression / Chi-square / TimeSeries / Survival / Multivariate / Diagnostic / DataTools / NIST).

**확인 요청:**
- R 함수 호출 옵션이 matrix의 `rCall`과 일치하는가?
- 데이터가 검증 목적에 충분한 크기/다양성을 가지는가?
- 특수 케이스 (custom 구현 메서드)의 golden value가 신뢰할 수 있는가?

**알려진 제한:**
- Cochran Q, runs-test: 패키지 대신 수동 수식 구현 (정확하나 교차검증 없음)
- factor-analysis: ultra-Heywood case 경고 (iris 데이터 특성)
- reliability: 부적 상관 아이템 경고 (무작위 Likert 데이터)

### 3. NIST 인증값 (4개)

**확인 요청:**
- Norris (선형회귀), Pontius (2차회귀), AtmWtAg (ANOVA), Michelson (기술통계)
- AtmWtAg: F=15.9467 (초기 하드코딩 오류 1.5948 → 수정됨)

### 4. Golden Value JSON 스키마

설계서 §3.2 대비:
- `equivalenceContract` 블록은 JSON에 미포함 (method-target-matrix.json으로 분리)
- `referenceSource.function` 필드명 사용 (설계서 일치)
- 추가 필드: `rVersion` (재현성 확보 목적)

### 5. 설계서 대비 Phase 0 완성도

| 태스크 | 상태 |
|--------|------|
| 부록 A Target Matrix 확정 | ✅ 50개 |
| R 스크립트 작성 | ✅ 1,754줄 |
| NIST StRD 다운로드 | ✅ 4개 |
| 데이터 갭 24+1 소싱 | ✅ R 내장 데이터 |
| 데이터 도구 4건 fixture | ✅ iris/pwr |
| R 실행 → JSON 커밋 | ✅ 54개 |

## 주의사항

- R 스크립트는 1회 실행용 (CI 미포함). JSON 파일만 커밋하여 이후 R 불필요.
- Phase 1에서 기존 `run-pyodide-golden-tests.mjs` 확장 시 이 JSON을 로드하여 비교.
- 통계 메서드 ID는 canonical ID (`statistical-methods.ts` SSOT 기준).
