# Bio-Tools 공통 컴포넌트 추출 계획 (2026-03-25)

13개 Bio-Tools 페이지에서 반복되는 3개 패턴을 공통화한다.

---

## 현황: 13개 페이지 반복 패턴

| 패턴 | 반복 횟수 | 페이지당 줄 수 |
|------|----------|--------------|
| 에러 배너 | 13개 페이지 | 4줄 |
| CSV 컬럼 선택 Select | 25개 (고정 옵션 4개 제외) | 12줄/개 |
| scrollIntoView useEffect | 13개 페이지 | 5줄 |

---

## 변경 1: BioErrorBanner

### 생성 파일
`components/bio-tools/BioErrorBanner.tsx`

### 인터페이스
```tsx
interface BioErrorBannerProps {
  error: string | null
}
export function BioErrorBanner({ error }: BioErrorBannerProps): React.ReactElement | null
```

### 사용 전/후
```tsx
// 전 (4줄, 13개 페이지 동일):
{error && (
  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
    <AlertCircle className="h-4 w-4 shrink-0" />
    {error}
  </div>
)}

// 후 (1줄):
<BioErrorBanner error={error} />
```

### 적용 대상: 13개 페이지 전체

### import 정리
AlertCircle import 제거 가능한 페이지 (에러 배너에서만 사용):
- **전체 13개** — 모든 Bio-Tools 페이지에서 AlertCircle은 에러 배너 전용

---

## 변경 2: BioColumnSelect

### 생성 파일
`components/bio-tools/BioColumnSelect.tsx`

### 인터페이스
```tsx
interface BioColumnSelectProps {
  label: string
  headers: string[]
  value: string
  onChange: (value: string) => void
  width?: number          // 기본값 180 (px). 가장 많이 사용되는 값
  labelSize?: 'sm' | 'xs' // 기본값 'sm'. text-sm vs text-xs
  allowNone?: boolean     // true면 "없음" 옵션 추가
  noneLabel?: string      // 기본값 '없음'. allowNone 시 표시 텍스트 (예: '없음 (단일 그룹)')
  layout?: 'inline' | 'stacked' // 기본값 'inline'. stacked = 라벨 위 / Select 아래
}
export function BioColumnSelect(props: BioColumnSelectProps): React.ReactElement
```

### NONE_VALUE 처리 (allowNone=true 시)

기존 코드에 2가지 패턴이 혼재:
- condition-factor: state에 `NONE_VALUE` 직접 저장
- nmds/survival: state에 `''` 저장, Select에서 `value={groupCol || NONE_VALUE}`로 변환

**통일 방침**: 컴포넌트 내부에서 변환 처리
- Select에는 항상 `NONE_VALUE` 표시 (Radix 빈 문자열 불가)
- `onChange`로 전달할 때 `NONE_VALUE` → `''`로 변환
- `value` 받을 때 `''` → `NONE_VALUE`로 변환
- **결과: 모든 페이지에서 state 값은 `''`(미선택) 또는 실제 컬럼명**

```tsx
// 컴포넌트 내부 로직:
const displayValue = allowNone && !value ? NONE_VALUE : (value || undefined)
const handleChange = (v: string) => {
  onChange(allowNone && v === NONE_VALUE ? '' : v)
}
```

**condition-factor 변경 필요**: `groupCol` 초기값을 `NONE_VALUE` → `''`로 변경. 기존 `groupCol !== NONE_VALUE` 체크를 `groupCol !== ''` (또는 `!!groupCol`)로 변경.

### 사용 전/후
```tsx
// 전 (12줄):
<div className="flex items-center gap-2">
  <label className="text-sm text-muted-foreground whitespace-nowrap">체장 열:</label>
  <Select value={col || undefined} onValueChange={setCol}>
    <SelectTrigger className="h-8 text-sm w-[180px]">
      <SelectValue placeholder="선택..." />
    </SelectTrigger>
    <SelectContent>
      {csvData.headers.map((h) => (
        <SelectItem key={h} value={h}>{h}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

// 후 (1줄):
<BioColumnSelect label="체장 열" headers={csvData.headers} value={col} onChange={setCol} />

// 컴팩트 라벨 (icc, survival, meta-analysis, roc-auc, mantel):
<BioColumnSelect label="시간 열" headers={csvData.headers} value={timeCol} onChange={setTimeCol} labelSize="xs" />

// 좁은 너비 (vbgf, length-weight):
<BioColumnSelect label="연령 열" headers={csvData.headers} value={ageCol} onChange={setAgeCol} width={160} />

// 더 좁은 너비 (condition-factor):
<BioColumnSelect label="체장 열" headers={csvData.headers} value={lengthCol} onChange={setLengthCol} width={140} />

// 선택적 그룹 (allowNone):
<BioColumnSelect label="그룹 열" headers={csvData.headers} value={groupCol} onChange={setGroupCol} allowNone />

// 커스텀 없음 라벨 (nmds):
<BioColumnSelect label="그룹 열 (선택)" headers={csvData.headers} value={groupCol} onChange={setGroupCol} allowNone noneLabel="없음 (단일 그룹)" />

// 세로 레이아웃 (meta-analysis, icc):
<BioColumnSelect label="연구명 열" headers={csvData.headers} value={studyCol} onChange={setStudyCol} labelSize="xs" layout="stacked" />
```

### 적용 대상: 25개 CSV 컬럼 Select (13개 페이지)

| 페이지 | 적용 Select | labelSize | width | layout | allowNone | noneLabel | 고정 옵션 (미적용) |
|--------|-----------|-----------|-------|--------|-----------|-----------|-----------------|
| alpha-diversity | 1 (siteCol) | sm | 180 | inline | — | — | — |
| beta-diversity | 1 (siteCol) | sm | 180 | inline | — | — | metric |
| rarefaction | 1 (siteCol) | sm | 180 | inline | — | — | — |
| nmds | 2 (siteCol, groupCol) | sm | 180 | inline | groupCol | 없음 (단일 그룹) | — |
| permanova | 2 (siteCol, groupCol) | sm | 180 | inline | — | — | — |
| mantel-test | 2 (siteColX, siteColY) | xs | 180 | inline | — | — | method |
| survival | 3 (timeCol, eventCol, groupCol) | xs | 180 | inline | groupCol | 없음 | — |
| meta-analysis | 3 (effectCol, seCol, studyCol) | xs | 180 | stacked | — | — | model |
| roc-auc | 2 (actualCol, predCol) | xs | 180 | inline | — | — | — |
| icc | 1 (subjectCol) | xs | 180 | stacked | — | — | iccType |
| vbgf | 2 (ageCol, lengthCol) | sm | 160 | inline | — | — | — |
| length-weight | 2 (lengthCol, weightCol) | sm | 160 | inline | — | — | — |
| condition-factor | 3 (lengthCol, weightCol, groupCol) | sm | 140 | inline | groupCol | 없음 | — |

**고정 옵션 Select 4개는 변경하지 않음** — CSV 헤더가 아닌 고정 리스트.

### 너비 분포 (실측)

| 너비 | 사용 수 | 페이지 |
|------|--------|--------|
| 180px (기본) | 18개 | alpha, beta, rarefaction, nmds, permanova, mantel, survival, meta, roc-auc, icc |
| 160px | 4개 | vbgf (2), length-weight (2) |
| 140px | 3개 | condition-factor (3) |

### import 정리

| 페이지 | Select 5개 import 제거 가능? |
|--------|---------------------------|
| alpha-diversity | **O** (CSV Select만) |
| beta-diversity | **X** (metric 고정 Select 있음) |
| rarefaction | **O** |
| nmds | **O** |
| permanova | **O** |
| mantel-test | **X** (method 고정 Select) |
| survival | **O** |
| meta-analysis | **X** (model 고정 Select) |
| roc-auc | **O** |
| icc | **X** (iccType 고정 Select) |
| vbgf | **O** |
| length-weight | **O** |
| condition-factor | **O** |

9개 페이지에서 `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` import 제거.

---

## 변경 3: useScrollToResults 독립 훅

### 생성 파일
`hooks/use-scroll-to-results.ts`

기존 계획은 `useBioToolAnalysis`에 통합이었으나 **독립 훅으로 변경**.

**변경 이유**:
- mantel-test도 사용 가능 (useBioToolAnalysis 미사용이지만 스크롤은 필요)
- 분석 상태 관리와 스크롤은 별개 관심사
- 13개 **전체** 적용 가능 (예외 없음)

### 인터페이스
```tsx
export function useScrollToResults<T>(results: T | null): React.RefObject<HTMLDivElement | null>
```

### 사용 전/후
```tsx
// 전 (6줄, 13개 페이지):
const resultsRef = useRef<HTMLDivElement>(null)
useEffect(() => {
  if (results) {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}, [results])

// 후 (1줄):
const resultsRef = useScrollToResults(results)
```

### 적용 대상: 13개 페이지 전체 (mantel-test 포함)

### import 정리

| 페이지 | useRef 제거 | useEffect 제거 | 비고 |
|--------|-----------|---------------|------|
| alpha-diversity | O | O | |
| beta-diversity | O | O | |
| rarefaction | O | O | useMemo 유지 |
| nmds | O | O | useMemo 유지 |
| permanova | O | O | |
| mantel-test | O | O | |
| survival | O | O | useMemo 유지 |
| meta-analysis | O | O | useMemo 유지 |
| roc-auc | O | O | useMemo 유지 |
| icc | O | O | |
| vbgf | O | O | |
| length-weight | O | O | |
| condition-factor | O | O | |

모든 페이지에서 useRef는 resultsRef만, useEffect는 scrollIntoView만 사용하므로 둘 다 제거 가능.

---

## 수정 파일 목록

### 신규 생성 (3개)
| 파일 | 내용 |
|------|------|
| `components/bio-tools/BioErrorBanner.tsx` | 에러 배너 공통 컴포넌트 |
| `components/bio-tools/BioColumnSelect.tsx` | CSV 컬럼 선택 공통 컴포넌트 |
| `hooks/use-scroll-to-results.ts` | 결과 스크롤 훅 |

### 수정 (13개)
| 파일 | 변경1 (에러) | 변경2 (Select) | 변경3 (스크롤) |
|------|------------|---------------|--------------|
| `app/bio-tools/alpha-diversity/page.tsx` | O | O (1개) | O |
| `app/bio-tools/beta-diversity/page.tsx` | O | O (1개) | O |
| `app/bio-tools/rarefaction/page.tsx` | O | O (1개) | O |
| `app/bio-tools/nmds/page.tsx` | O | O (2개, allowNone) | O |
| `app/bio-tools/permanova/page.tsx` | O | O (2개) | O |
| `app/bio-tools/mantel-test/page.tsx` | O | O (2개, labelSize=xs) | O |
| `app/bio-tools/survival/page.tsx` | O | O (3개, labelSize=xs, allowNone) | O |
| `app/bio-tools/meta-analysis/page.tsx` | O | O (3개, labelSize=xs) | O |
| `app/bio-tools/roc-auc/page.tsx` | O | O (2개, labelSize=xs) | O |
| `app/bio-tools/icc/page.tsx` | O | O (1개, labelSize=xs) | O |
| `app/bio-tools/vbgf/page.tsx` | O | O (2개, width=160) | O |
| `app/bio-tools/length-weight/page.tsx` | O | O (2개, width=160) | O |
| `app/bio-tools/condition-factor/page.tsx` | O | O (3개, width=140, allowNone) | O |

**useBioToolAnalysis.ts는 수정 불필요** (독립 훅 방식)

---

## 구현 순서

| 단계 | 내용 | 리스크 |
|------|------|--------|
| 1 | `BioErrorBanner.tsx` 생성 | 없음 |
| 2 | `BioColumnSelect.tsx` 생성 | 낮음 (NONE_VALUE 변환 로직) |
| 3 | `use-scroll-to-results.ts` 생성 | 없음 |
| 4 | 13개 페이지 일괄 적용 | 중간 (기계적이지만 각 페이지 확인) |
| 5 | condition-factor: `groupCol` 초기값 `NONE_VALUE` → `''` 변경 | 낮음 |
| 6 | nmds/survival: NONE_VALUE 변환 제거 (컴포넌트가 처리) | 낮음 |
| 7 | `tsc --noEmit` 검증 | — |
| 8 | import 정리 | 낮음 |

---

## 예상 효과

| 지표 | 전 | 후 |
|------|-----|-----|
| 에러 배너 코드 | 13 × 4줄 = 52줄 | 13 × 1줄 = 13줄 |
| Select 코드 | 25 × 12줄 = 300줄 | 25 × 1줄 = 25줄 |
| scrollIntoView | 13 × 6줄 = 78줄 | 13 × 1줄 = 13줄 |
| **합계 절감** | | **~379줄** |
| AlertCircle import | 13개 페이지 | 0개 |
| Select import 5개 | 13개 페이지 | 4개 (고정 옵션 있는 페이지만) |
| useRef/useEffect import | 13개 페이지 | 0개 |

---

## 안 하는 것

| 항목 | 이유 |
|------|------|
| `as number` 캐스트 수정 | Worker Python이 clean_paired_arrays로 처리. 런타임 안전 |
| siteCol 미사용 문제 | 훅 API 변경 파급 큼, 미사용이지만 해 없음 |
| 접근성 (label/role) | 전체 UI 접근성 작업 시 일괄 |
| 고정 옵션 Select 4개 | BioColumnSelect 대상 아님 (CSV 헤더가 아닌 고정 리스트) |
| useBioToolAnalysis 수정 | 독립 훅으로 대체, 기존 훅 API 변경 불필요 |
