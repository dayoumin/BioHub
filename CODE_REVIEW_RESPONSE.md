# 코딩 표준 검토 의견 대응 계획

**검토일**: 2025-10-29
**검토자**: External AI Reviewer
**문서**: STATISTICS_PAGE_CODING_STANDARDS.md v1.1
**평가**: 6/10

---

## 🔴 치명적 오류 (즉시 수정 필요)

### 1. actions 객체 안정성 문제 ✅ **검토자 정확**

**검토 의견**:
> actions 객체가 매 렌더마다 새로 생성됩니다. [actions]를 의존성에 넣으면 무한 재실행됩니다.

**검증 결과**:
- ✅ **use-statistics-page.ts:276-290**: actions는 일반 객체 리터럴 (useCallback 없음)
- ✅ **means-plot/page.tsx:98, 106, 211**: `[actions]`를 의존성 배열에 사용 중
- ⚠️ **현재 상태**: 테스트는 통과하지만 런타임 무한 루프 위험 존재

**문서의 잘못된 주장**:
```
**참고**: actions는 useStatisticsPage에서 `useCallback`으로 메모이제이션되어 있으므로 안정적입니다.
```
→ **완전히 거짓**

**필수 수정 사항**:

**Option A: Hook 수정** (권장):
```typescript
// use-statistics-page.ts
const actions = useMemo(() => ({
  setCurrentStep,
  nextStep,
  prevStep,
  // ...
}), [nextStep, prevStep, updateVariableMapping, /* ... */])
```

**Option B: 문서 수정** (임시):
```markdown
### useCallback 의존성 배열 (수정됨)

| 함수 | 의존성 배열 | 비고 |
|-----|-----------|------|
| `handleDataUpload` | `[]` | actions 메서드는 직접 사용 (클로저) |
| `runAnalysis` | `[uploadedData]` | actions는 의존성에서 제외 |

**⚠️ 중요**: actions 객체는 매 렌더 새로 생성되므로 의존성 배열에 **넣지 마세요**.
대신 actions의 개별 메서드를 직접 호출하세요.

```typescript
// ✅ 권장
const runAnalysis = useCallback(async (params) => {
  actions.startAnalysis()  // ← 클로저에서 직접 호출
  // ...
}, [uploadedData])  // actions 제외!

// ❌ 금지
const runAnalysis = useCallback(async (params) => {
  // ...
}, [uploadedData, actions])  // ← 무한 루프!
```
```

**Action Items**:
1. [ ] **즉시**: use-statistics-page.ts 수정 (useMemo로 actions 안정화)
2. [ ] **즉시**: 문서 Section 5 수정 (의존성 배열 테이블 재작성)
3. [ ] 모든 Phase 1-2 페이지 검증 (무한 루프 발생 여부)
4. [ ] 테스트 추가: actions 객체 참조 안정성 검증

---

## ⚠️ 개선 필요 (기술적 근거 부족)

### 2. setTimeout 100ms 근거 부족 ⚠️ **부분 동의**

**검토 의견**:
> React 18에서 await loadPyodideWithPackages 자체가 렌더링 플러시를 보장하므로 100ms 불필요.
> 임의 딜레이는 분석을 느리게 하고 테스트가 하드코딩함.

**검증 결과**:
- ✅ **검토자 정확**: await는 자동으로 Event Loop 양보
- ⚠️ **하지만**: setTimeout은 **일관성** 목적 (Phase 1 1500ms → 개선 100ms)
- ❌ **문서 문제**: 기술적 필수성처럼 설명함 (실제로는 선택)

**대응 방안**:

**Option A: setTimeout 제거** (권장 - 검토자 제안):
```typescript
const runAnalysis = useCallback(async (params) => {
  if (!uploadedData) return
  actions.startAnalysis()

  try {
    // await 자체가 렌더링 플러시 보장
    const pyodide = await loadPyodideWithPackages([...])
    // ...
    actions.completeAnalysis(results, 4)
  } catch (err) {
    actions.setError(...)
  }
}, [uploadedData])
```

**Option B: 문서 명확화** (현재 패턴 유지):
```markdown
### setTimeout 사용 (선택 사항)

**권장하지 않음**: React 18/Next 15에서는 await가 자동으로 렌더링 플러시를 보장합니다.

**사용 이유** (일관성 목적만):
- Phase 1 페이지들과의 일관성 유지
- 명시적 UI 업데이트 의도 표현

```typescript
// ✅ 권장 (setTimeout 없음)
const runAnalysis = useCallback(async (params) => {
  actions.startAnalysis()  // UI 업데이트
  const pyodide = await loadPyodideWithPackages([...])  // 자동 플러시
  // ...
}, [uploadedData])

// ⚠️ 선택 (일관성 목적)
setTimeout(async () => {
  // ...
}, 100)
```
```

**Action Items**:
1. [ ] Phase 1-2 페이지에서 setTimeout 제거 (성능 개선)
2. [ ] 문서 Section 2 재작성 (선택 사항으로 명시)
3. [ ] 테스트 템플릿에서 setTimeout 검증 제거

---

### 3. 메모리 누수 주장 부정확 ⚠️ **검토자 정확**

**검토 의견**:
> loadPyodideWithPackages가 싱글톤 캐시 제공 시 useState+useEffect도 누수 없음.

**검증 필요**:
```typescript
// pyodide-loader.ts를 확인해야 함
export async function loadPyodideWithPackages(packages: string[]): Promise<PyodideInterface> {
  // 싱글톤 캐시가 있는가?
}
```

**임시 대응**:
```markdown
### Pyodide 초기화 방법 (수정)

**✅ 권장 (함수 내부 로드)**:
- **장점**: 로딩 시점 제어 용이
- **장점**: 코드 가독성 (분석 로직과 초기화 통합)
- ~~메모리 누수 방지~~ ← 삭제

**⚠️ 레거시 (useState + useEffect)**:
- **단점**: 컴포넌트 마운트 시 즉시 로드 (불필요)
- **단점**: 코드 분산 (useEffect와 분석 함수 분리)
```

**Action Items**:
1. [ ] pyodide-loader.ts 싱글톤 캐시 확인
2. [ ] 문서에서 "메모리 누수" 표현 제거
3. [ ] 장점을 "로딩 시점 제어"로 재정의

---

## 💡 추가 제안 (누락된 표준)

### 4. 성능 최적화 규칙

**검토 의견**: React.memo, useMemo 사용 시점 문서화

**Action Items**:
- [ ] Section 추가: "성능 최적화 (선택)"
- [ ] React.memo 사용 시점 (대용량 데이터 테이블)
- [ ] useMemo 사용 시점 (복잡한 계산)

### 5. 접근성 (a11y)

**검토 의견**: 결과 테이블 aria 속성, 키보드 네비게이션, 로딩 SR 안내

**Action Items**:
- [ ] Section 추가: "접근성 (필수)"
- [ ] 테이블: `role="table"`, `aria-label`
- [ ] 로딩: `aria-live="polite"`, `role="status"`
- [ ] 키보드: Tab 순서, Enter/Space 핸들링

### 6. 데이터 검증

**검토 의견**: 업로드 CSV 유효성, 통계 가정 검증 규칙

**Action Items**:
- [ ] Section 추가: "데이터 검증 (필수)"
- [ ] CSV 유효성: 헤더 확인, 타입 검증
- [ ] 통계 가정: 정규성, 등분산성 체크
- [ ] 에러 메시지 표준

### 7. 다국어 지원

**검토 의견**: i18n 함수 사용, 번역 키 네이밍 가이드

**Action Items**:
- [ ] Section 추가: "다국어 지원 (미래)"
- [ ] i18n 함수 사용법
- [ ] 번역 키 네이밍 규칙

### 8. 에러 바운더리

**검토 의견**: Pyodide 초기화 실패 시 ErrorBoundary 사용

**Action Items**:
- [ ] Section 추가: "에러 바운더리 (권장)"
- [ ] Pyodide 로드 실패 처리
- [ ] 페이지 수준 ErrorBoundary 예제

---

## 📋 우선순위 작업 계획

### Phase 1: 치명적 오류 수정 (즉시)
1. ✅ **use-statistics-page.ts**: actions를 useMemo로 안정화
2. ✅ **문서 Section 5**: 의존성 배열 테이블 수정
3. ✅ **모든 페이지**: [actions] 의존성 제거 또는 검증

### Phase 2: 기술적 정확성 개선 (1일)
4. ⏳ **setTimeout 제거**: Phase 1-2 페이지 수정
5. ⏳ **메모리 누수 주장 삭제**: Section 2 수정
6. ⏳ **pyodide-loader 검증**: 싱글톤 캐시 확인

### Phase 3: 누락 표준 추가 (2일)
7. ⏳ **접근성 (a11y)**: 새 Section 추가
8. ⏳ **데이터 검증**: 새 Section 추가
9. ⏳ **에러 바운더리**: 새 Section 추가

### Phase 4: 선택적 표준 (추후)
10. 🔜 **성능 최적화**: React.memo, useMemo 가이드
11. 🔜 **다국어 지원**: i18n 규칙
12. 🔜 **문서 구조**: 필수/권장 챕터 분리

---

## 🎯 수정 후 목표

- **평가 점수**: 6/10 → **9/10**
- **치명적 오류**: 1개 → **0개**
- **기술적 정확성**: 중간 → **높음**
- **실무 적용성**: 부족 → **충분**

---

**Updated**: 2025-10-29
**Status**: Phase 1 작업 시작 예정
