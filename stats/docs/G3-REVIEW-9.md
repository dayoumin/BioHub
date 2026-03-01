# G3 브릿지 — 9차 리뷰 요청 (시뮬레이션 테스트)

> **범위**: ANCOVA Worker2 시뮬레이션 테스트 신규 작성 + 2건 버그 수정
> **관심사**: 테스트 커버리지 충분성, 엣지 케이스 누락, `prepareData()` null 그룹 동작

---

## 배경 (최소 컨텍스트)

- ANCOVA가 Worker3 → Worker2로 전환됨 (postHoc 포함)
- `statistical-executor.ts`의 `executeANOVA()` 내 ANCOVA 경로가 Worker2 `ancova_analysis()` 호출
- 실행 흐름: `executeMethod()` → `prepareData()` (byGroup 생성) → `executeANOVA()` (그룹 검증) → ANCOVA 분기 (validRows 필터링 → Worker2 호출)

---

## 변경 파일

### 1. `ancova-worker2-simulation.test.ts` (신규)

17개 테스트, 6개 describe 블록:

```
1. 정상 실행 경로 (6) — Worker2 호출, postHoc 정규화, effectSize, modelFit, postHocMethod, adjustedMeans
2. 변수 매핑 호환 (3) — dependent/group vs dependentVar/groupVar 키 호환
3. validRows 필터링 (3) — 무효 행 제거, 문자열→숫자 변환, 전체 무효 시 에러
4. 엣지 케이스 (3) — 빈 mainEffects, 빈 postHoc, 비유의 결과
5. result-transformer 호환 (1) — top-level rSquared/rmse 존재
6. rawResults (1) — 원본 결과 전달
```

**테스트 데이터 설계**:
```typescript
// 30행 기본 데이터: Control/Drug_A/Drug_B × 10행씩
// 무효 행 옵션: NaN score, 비숫자 covariate, undefined covariate, 비숫자 score
// 문자열 숫자 옵션: 처음 5행의 score/baseline을 String()으로 래핑
// 변수 키 옵션: dependent vs dependentVar, group vs groupVar
```

### 2. 테스트 데이터/경로 조정 2건

#### 9-1: 무효 행 테스트 데이터의 null group 문제 (테스트 데이터 수정)

**문제**: 테스트 데이터에 `{ score: 55, group: null, baseline: 45 }` 포함 → `prepareData()`의 `String(grp)` 변환이 `"null"` 문자열 그룹 생성 → 관측치 1개로 그룹 크기 검증(≥2) 실패

**수정**:
```typescript
// Before:
rows.push({ score: 55, group: null, baseline: 45 })

// After:
rows.push({ score: 55, group: 'Control', baseline: 'invalid' })  // 유효 그룹 + 무효 공변량
```

#### 9-2: "모든 행 무효" 테스트의 에러 경로 불일치 (테스트 경로 조정)

**문제**: 테스트 데이터의 score가 NaN/비숫자 → `prepareData()`의 byGroup에 유효 관측치 0개 → 그룹 크기 검증에서 먼저 실패 → ANCOVA validRows 에러에 도달 못함

**수정**:
```typescript
// Before: score=NaN → byGroup 자체가 비어서 그룹 검증에서 탈락
{ score: NaN, group: 'A', baseline: NaN },
{ score: 'abc', group: null, baseline: 45 },

// After: 유효 score+group (byGroup 통과) + 무효 covariate (validRows 전체 필터링)
{ score: 10, group: 'A', baseline: NaN },
{ score: 20, group: 'A', baseline: NaN },
{ score: 30, group: 'B', baseline: NaN },
{ score: 40, group: 'B', baseline: NaN },
```

---

## `prepareData()`의 null 그룹 동작 (발견)

`statistical-executor.ts` L407-426:
```typescript
const groups = [...new Set(data.map(row => row[group]))]  // null이 그룹 값으로 포함
// ...
byGroup[String(grp)] = data  // String(null) → "null" 문자열 키
  .filter(row => row[group] === grp)
  .map(row => Number(row[dependent[0]]))
  .filter((v: number) => !isNaN(v))
```

이는 테스트 코드 문제가 아닌 **프로덕션 코드의 잠재적 이슈**:
- 사용자 데이터에 그룹 컬럼이 null인 행이 있으면 `"null"` 그룹이 생성됨
- 해당 그룹에 관측치가 1개뿐이면 전체 분석이 실패

---

## 10차 리뷰 반영 (프로덕션 코드 수정 3건)

### 10H-1: validRows 필터링 후 그룹 재검증 (High)

**문제**: byGroup 기준(종속변수만)으로 그룹 검증 후, 공변량 필터링으로 그룹이 사라져도 Worker 호출 진행.

**수정**: `statistical-executor.ts` ANCOVA 분기에서 validRows 기준 그룹 수(≥2)/관측치(≥2) 재검증 추가.

### 10M-1: prepareData() null/undefined 그룹 필터링 (Medium)

**문제**: `String(null)` → `"null"` 문자열 그룹 생성.

**수정**: `prepareData()`에서 groups 생성 시 `null`, `undefined`, `''` 제외.

### 10M-2: visualizationData + missingRemoved 정합성 (Medium)

**문제**: 분석은 validRows, 시각화는 byGroup 기반 → 표본 불일치.

**수정**: `visualizationData`를 validRows 기준으로 변경. `missingRemoved` = `data.length - validRows.length`.

---

## 검증 결과

```
tsc --noEmit: 0 errors
pnpm test: 5415 passed, 0 failed (ANCOVA 25), 13 skipped
```
