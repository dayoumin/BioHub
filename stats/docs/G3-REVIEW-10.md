# G3-A KM/ROC 골든값 교차검증 리뷰 (Round 4)

**일시**: 2026-03-02
**범위**: r-reference-results.ts, r-reference-km-roc.test.ts, km-roc-cross-validation.test.ts, large-dataset-benchmark.test.ts, generate-r-references.R
**방법**: 독립 시뮬레이션 검증 (Node.js) + 소스 코드 정밀 분석

---

## 주요 발견사항 (심각도 순)

### 1. [HIGH] ROC random 골든값 `auc: 0.50` → 실제 0.385

**파일**: `r-reference-results.ts` rocCurve.random.expected.auc
**원인**: "랜덤 분류기" 데이터가 실제로는 약한 역분류기. 양성 평균 예측값(0.49) < 음성 평균 예측값(0.51)이므로 AUC < 0.5.
**검증**: Mann-Whitney brute-force 계산 → 38 concordant + 1 tied / 100 pairs = 0.385.
**수정**: `auc: 0.385`, description 변경, 관련 테스트 제목 업데이트, 골든값과 직접 비교하는 테스트 추가.

### 2. [MEDIUM] ROC diagnostic `optimalThreshold: 0.525` → 0.55, `specificity: 0.80` → 1.00

**파일**: `r-reference-results.ts` rocCurve.diagnostic.expected
**원인**: 0.525는 데이터셋에 존재하지 않는 예측값. Youden's J 최적 = threshold=0.55 (J=0.80), 이때 specificity=1.0 (FP=0).
**검증**: 모든 임계값에 대해 Youden's J 직접 계산. th=0.55에서 J=0.80 (최대), th=0.50에서 J=0.70.
**수정**: 골든값 수정 + 테스트에서 Youden's J 직접 계산으로 검증하도록 강화. ⚠️→✅ 표기 변경.

### 3. [MEDIUM] logRank chiSq 테스트 precision 너무 느슨

**파일**: `r-reference-km-roc.test.ts`
**원인**: `toBeCloseTo(tsChiSq, 1)` = ±0.05 허용이지만, 실제 차이는 0.0015 (3.71 vs 3.7115).
**수정**: precision 1 → 2 (±0.005). 테스트 이름도 "±0.1" → "±0.005" 반영.

### 4. [LOW] KM CI 주석 오류: "R survival 패키지 기본 방식"

**파일**: `large-dataset-benchmark.test.ts`
**원인**: R survival 패키지의 기본 CI는 `conf.type="log"` (log 변환). 코드는 log-log 변환을 구현하면서 주석에 "R 기본 방식"이라고 잘못 표기.
**검증**: log CI 공식으로 R 골든값 [0.7320, 1.000] 재현 성공 (t=1). log-log CI 공식은 [0.4730, 0.9853]로 완전히 다름.
**수정**: 주석을 "R survival 기본은 conf.type="log". 여기는 "log-log" 변환"으로 수정.

### 5. [LOW] KM survival[t=3] 반올림 부정확

**파일**: `r-reference-results.ts` kaplanMeier.singleGroup.expected.survival
**원인**: `0.787`은 R `summary()` 3자리 표시값. 정확값은 0.9 × 7/8 = 0.7875.
**수정**: survival 배열을 4자리 정밀값으로 변경: `[0.9000, 0.7875, 0.6750, 0.5400, 0.3600, 0.1800]`.

### 6. [LOW] 주석 모순: "R 미실행 추정값" vs "✅ 검증됨"

**파일**: `r-reference-results.ts` rocCurve.diagnostic 주석
**원인**: optimalThreshold/sensitivity/specificity를 검증값으로 교체했지만, 상위 주석에 "R 미실행 추정값"이 남아 있었음.
**수정**: 주석 통합. "✅ 전체 검증 완료: AUC는 MW+trap 교차검증, threshold/sens/spec은 Youden J 직접 계산."

---

## 검증 방법

### 독립 시뮬레이션 (7개 테스트 그룹, 24 assertions)

| 테스트 | 방법 | 결과 |
|--------|------|------|
| ROC diagnostic AUC | MW brute-force + trapezoidal | 0.93 ✅ |
| ROC random AUC | MW brute-force | 0.385 ✅ |
| ROC optimal threshold | Youden's J 전수 탐색 | th=0.55, J=0.80 ✅ |
| KM survival 6 시점 | 분수 곱 정확 계산 | 전부 일치 ✅ |
| logRank chiSq | 독립 log-rank O-E 계산 | 3.7115 ✅ |
| logRank p-value | A&S normal CDF 근사 | 0.0540 ✅ |
| KM CI 방법론 | log vs log-log 비교 | log=R 골든값, log-log≠R 골든값 ✅ |

### 자동화 테스트 결과

- tsc: 0 에러
- 테스트: 5520 pass (이전 대비 +1, ROC random MW AUC 직접 비교 테스트 추가)

---

## 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `r-reference-results.ts` | random AUC 0.50→0.385, threshold 0.525→0.55, spec 0.80→1.00, survival 정밀값, 주석 |
| `r-reference-km-roc.test.ts` | logRank precision 강화, ROC threshold Youden J 검증, random AUC 직접 비교 테스트 추가 |
| `km-roc-cross-validation.test.ts` | survival 정밀값, ROC random 제목/주석 수정 |
| `large-dataset-benchmark.test.ts` | KM CI 주석 수정 |
| `generate-r-references.R` | ROC random 주석 수정 |

---

## 잔여 리스크

| 항목 | 상태 | 설명 |
|------|------|------|
| R 미실행 | ⚠️ | generate-r-references.R 실행 후 logRank chiSq/pValue 정확값 교체 필요 (TODO G3-R-VERIFY) |
| pROC direction | ⚠️ | R pROC가 AUC<0.5일 때 direction 자동반전할 수 있음. random 데이터에서 R은 1-0.385=0.615를 줄 수 있음 |
| KM CI 불일치 | Info | TS 구현 = log-log, R 기본 = log. 기능 테스트에는 영향 없으나 CI 정밀 비교 시 주의 필요 |
| Plotly 테스트 flaky | Info | plotly-chart-renderer.test.tsx 2건 간헐 실패. KM/ROC 무관 |
