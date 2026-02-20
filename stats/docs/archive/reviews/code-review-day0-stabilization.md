# Code Review: Day 0 Stabilization (Phase 5 준비)

**작성일**: 2025-10-03
**리뷰어**: Claude Code
**대상**: Phase 5 Registry + Worker Pool 리팩토링 시작 전 코드베이스

---

## 📊 전체 요약

### 현재 상태
- **Phase 4-1 완료**: Pyodide 런타임 테스트 (E2E 3/3 통과)
- **Registry 인프라**: 이미 구축 완료 (Day 1 작업 50% 완료)
- **파일 구조**: Phase 4와 Phase 5 파일이 혼재 (정리 필요)
- **타입 오류**: 100+ (executors, 테스트 파일 중심)

### 평가 점수
- **아키텍처 설계**: ⭐⭐⭐⭐⭐ (5/5) - Registry Pattern 잘 설계됨
- **타입 안전성**: ⭐⭐⭐ (3/5) - 오류 많지만 구조는 양호
- **코드 품질**: ⭐⭐⭐⭐ (4/5) - 핸들러 파일들은 우수
- **문서화**: ⭐⭐⭐⭐⭐ (5/5) - Phase 5 계획 문서 완벽
- **Phase 5 준비도**: ⭐⭐⭐ (3/5) - 안정화 후 시작 가능

---

## 🏗️ 파일 구조 분석

### 1. 통계 라이브러리 구조 (lib/statistics/)

```
lib/statistics/
├── 📁 calculator-handlers/ (16개 파일, 6,031줄) ✅ Phase 4 핵심
│   ├── descriptive.ts (209줄)
│   ├── hypothesis-tests.ts
│   ├── regression.ts, regression-extended.ts
│   ├── nonparametric.ts, nonparametric-extended.ts
│   ├── anova.ts, anova-extended.ts
│   ├── advanced.ts, advanced-extended.ts
│   └── 기타 (reliability, crosstab, proportion-test)
│
├── 📁 registry/ (4개 파일, ~500줄) ✅ Phase 5 인프라 (완료)
│   ├── method-metadata.ts (60개 메서드 메타데이터)
│   ├── statistical-registry.ts (동적 import 로직)
│   ├── types.ts (StatisticalGroup, MethodMetadata)
│   └── index.ts
│
├── 📄 method-router.ts (115줄) ✅ Phase 4 라우터 (작동 중)
├── 📄 statistical-calculator.ts (98줄) ✅ 2,421줄 제거 완료
│
├── 📄 descriptive.ts (189줄) ⚠️ 실험 파일? (미사용)
├── 📄 anova.ts ⚠️ 실험 파일? (미사용)
├── 📄 advanced.ts ⚠️ 실험 파일? (미사용)
├── 📄 regression.ts ⚠️ 실험 파일? (미사용)
├── 📄 nonparametric.ts ⚠️ 실험 파일? (미사용)
└── 📄 t-tests.ts ⚠️ 실험 파일? (미사용)
```

**총 라인 수**: 8,753줄 (루트) + 6,031줄 (핸들러) = **14,784줄**

### 2. 중복 파일 분석

#### 문제: 루트 레벨 파일 (descriptive.ts 등)

**특징**:
- Python 코드를 직접 runPythonAsync로 실행
- `utils.ts`, `types.ts`에 의존
- **현재 import 하는 곳**: `lib/services/pyodide/index.ts` (1곳만)

**의심**:
- Phase 5 그룹 모듈 실험?
- Pyodide 직접 호출 테스트?
- 또는 과거 버전 잔재?

**권장**:
1. **시나리오 A**: Phase 5 실험이면 → `groups/` 폴더로 이동, 구조 정리
2. **시나리오 B**: 과거 버전이면 → 삭제
3. **시나리오 C**: Pyodide 테스트면 → `lib/services/pyodide/modules/` 이동

---

## 🔴 타입 오류 분석 (100+)

### 카테고리별 분류

#### 1. Pyodide 서비스 메서드 네이밍 불일치 (18개)
**위치**: `lib/services/executors/*.ts`

```typescript
// ❌ 오류
await pyodideService.calculateDescriptiveStats(data)

// ✅ 실제 메서드
await pyodideService.calculateDescriptiveStatistics(data)
// 또는
await pyodideService.descriptiveStats(data)
```

**영향도**: 🔴 높음 (빌드 실패 직접 원인)
**수정 난이도**: 🟢 쉬움 (찾기-바꾸기)

#### 2. 카멜케이스 불일치 (12개)
```typescript
// ❌ pvalue
result.pvalue

// ✅ pValue
result.pValue
```

**영향도**: 🟡 중간
**수정 난이도**: 🟢 쉬움

#### 3. Null 체크 누락 (30개)
```typescript
// ❌ TS2531: Object is possibly 'null'
this.pyodide.runPythonAsync(...)

// ✅ 수정
if (!this.pyodide) throw new Error('Pyodide not initialized')
this.pyodide.runPythonAsync(...)
```

**영향도**: 🔴 높음 (런타임 크래시 가능)
**수정 난이도**: 🟡 중간 (패턴 반복 작업)

#### 4. 타입 정의 불일치 (15개)
- PyodideInterface 중복 선언
- 메서드 반환 타입 불일치 (explainedVariance vs explainedVarianceRatio)
- 테스트 파일 props 타입 오류

**영향도**: 🟡 중간
**수정 난이도**: 🟡 중간

#### 5. 테스트 파일 오류 (25개)
- React component props 타입 오류
- Mock 데이터 타입 불일치

**영향도**: 🟢 낮음 (프로덕션 코드 영향 없음)
**수정 난이도**: 🟢 쉬움

---

## ✅ 잘된 부분

### 1. Registry 인프라 (⭐⭐⭐⭐⭐)

**method-metadata.ts**: 60개 메서드 메타데이터 완벽 정의
```typescript
export const METHOD_METADATA: Record<string, MethodMetadata> = {
  mean: {
    group: 'descriptive',
    deps: ['numpy'],
    estimatedTime: 0.1
  },
  // ... 59개 더
}
```

**평가**:
- ✅ 그룹 매핑 명확 (6개 논리 그룹 → 4개 Worker)
- ✅ 의존성 패키지 정확 (numpy, scipy 등)
- ✅ 예상 실행 시간 포함 (성능 최적화 근거)
- ✅ 1KB 크기로 메타데이터만 보관 (초기 로딩 최소화)

### 2. 라우터 기반 아키텍처 (⭐⭐⭐⭐⭐)

**method-router.ts**: 2,488줄 Switch → 115줄 (95.5% 감소)
```typescript
export class MethodRouter {
  private handlers: Map<CanonicalMethodId, MethodHandler> = new Map()

  constructor(private context: CalculatorContext) {
    this.registerHandlers()
  }

  async execute(methodId: CanonicalMethodId, ...): Promise<CalculationResult> {
    const handler = this.handlers.get(methodId)
    if (!handler) {
      return { success: false, error: `Unknown method: ${methodId}` }
    }
    return handler(data, parameters)
  }
}
```

**평가**:
- ✅ 핸들러 동적 등록 (확장성 우수)
- ✅ 타입 안전성 (CanonicalMethodId로 제한)
- ✅ 에러 처리 명확
- ✅ 테스트 가능성 (핸들러 독립 테스트)

### 3. 타입 시스템 (⭐⭐⭐⭐)

**types/statistics/calculation.d.ts**:
```typescript
export interface CalculationResult {
  success: boolean
  data?: CalculationPayload
  error?: string
}
```

**types/statistics/method-contracts.d.ts**:
```typescript
export type CanonicalMethodId =
  | "calculateDescriptiveStats"
  | "normalityTest"
  // ... 32개 메서드
```

**평가**:
- ✅ 명확한 타입 정의
- ✅ Result 패턴 (success + error)
- ✅ 유니온 타입으로 메서드 제한

### 4. 문서화 (⭐⭐⭐⭐⭐)

**Phase 5 문서 3개**:
- `phase5-architecture.md` (325줄) - 2+2 Worker 전략
- `phase5-implementation-plan.md` (362줄) - 10일 일정
- `phase5-critical-issues-resolution.md` (280줄) - 위험 관리

**평가**:
- ✅ 성능 목표 수치화 (83% 빠른 초기화)
- ✅ 메모리 트레이드오프 명시 (170MB → 510MB)
- ✅ 롤백 전략 포함
- ✅ 검증 계획 (Day 8 실측)

---

## ⚠️ 개선 필요 부분

### 1. 파일 정리 필요 (우선순위: 높음)

**문제**:
- `lib/statistics/{descriptive,anova,advanced}.ts` (6개 파일) 용도 불명확
- `lib/statistics/method-router-refactored.ts` - 이름 혼란

**조치**:
1. 용도 확인 후 삭제 또는 이동
2. `method-router-refactored.ts` → `method-router-v2.ts` 또는 삭제

### 2. 타입 오류 수정 (우선순위: 최고)

**수정 순서**:
1. **Phase 1**: Pyodide 서비스 메서드 네이밍 통일 (18개, 30분)
2. **Phase 2**: Null 체크 추가 (30개, 1시간)
3. **Phase 3**: 카멜케이스 수정 (12개, 20분)
4. **Phase 4**: 타입 정의 불일치 해결 (15개, 1시간)
5. **Phase 5**: 테스트 파일 수정 (25개, 30분)

**예상 시간**: 3-4시간

### 3. Executors 파일 리팩토링 (우선순위: 중간)

**문제**:
- `lib/services/executors/*.ts` - 타입 오류 집중
- Pyodide 서비스와의 결합도 높음

**제안**:
- Phase 5에서 핸들러로 통합할지 결정
- 또는 타입 안전성만 강화

---

## 📋 Phase 5 시작 전 체크리스트

### 필수 (Must Have)
- [ ] TypeScript 컴파일 오류 0개 (`npx tsc --noEmit`)
- [ ] 빌드 성공 (`npm run build` < 60초)
- [ ] 파일 구조 정리 (중복 파일 제거)
- [ ] CLAUDE.md AI 코딩 가이드라인 추가 ✅ 완료

### 권장 (Should Have)
- [ ] 27개 유닛 테스트 100% 통과
- [ ] 임시 파일 삭제 ✅ 완료
- [ ] Git 상태 클린 (untracked 파일 정리)
- [ ] Phase 4-1 브랜치 master 병합

### 선택 (Nice to Have)
- [ ] Executors 타입 안전성 강화
- [ ] E2E 테스트 재실행
- [ ] 성능 벤치마크 재측정

---

## 🎯 권장 작업 순서

### Day 0 (오늘, 4시간)
1. ✅ **CLAUDE.md 업데이트** (완료)
2. ✅ **임시 파일 삭제** (완료)
3. ⏳ **파일 구조 정리** (1시간)
   - `lib/statistics/{descriptive,anova,advanced}.ts` 용도 확인
   - 삭제 또는 `groups/` 폴더로 이동
4. ⏳ **타입 오류 수정** (3시간)
   - Pyodide 메서드 네이밍 통일
   - Null 체크 추가
   - 빌드 검증

### Day 1 (내일, Phase 5 시작)
1. Registry 기반 그룹 모듈 분리
2. 핸들러 → 그룹 마이그레이션

---

## 💡 결론

### 긍정적 측면
- ✅ Registry 인프라 이미 완성 (Day 1 작업 50% 완료)
- ✅ 라우터 기반 아키텍처 안정적 작동
- ✅ 타입 시스템 구조 우수
- ✅ Phase 5 계획 문서 완벽
- ✅ Pyodide 런타임 검증 완료 (Phase 4-1)

### 우려 사항
- 🔴 타입 오류 100+ (빌드 실패 가능)
- 🟡 파일 구조 혼재 (Phase 4/5 혼합)
- 🟢 테스트 파일 오류 (프로덕션 영향 없음)

### 최종 평가
**Phase 5 준비도**: ⭐⭐⭐ (3/5)

**권장**: Day 0 안정화 작업 완료 후 Phase 5 시작
- 타입 오류 수정 (3-4시간)
- 파일 구조 정리 (1시간)
- **총 4-5시간 투자로 Phase 5 안전하게 시작 가능**

---

**다음 문서**: [day0-stabilization-action-plan.md](./day0-stabilization-action-plan.md)
