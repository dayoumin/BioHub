# AUTOMATED_TESTING_ROADMAP.md 검토 보고서

## 1. 총평
제시된 로드맵은 **테스트 피라미드(Unit -> Integration -> E2E)** 원칙을 잘 따르고 있으며, 통계 해석 엔진의 특성(텍스트 출력 중심, 다양한 입력 케이스)을 잘 반영하고 있습니다. 특히 **Golden Snapshot**을 최우선으로 둔 점은 텍스트 회귀 방지에 매우 적절한 전략입니다.

## 2. 긍정적인 점
*   **단계별 접근 (Phased Approach)**: Phase 0(기본)부터 Phase 4(CI/CD)까지 체계적으로 구성되어 있습니다.
*   **Golden Snapshot 전략**: 해석 엔진은 로직 변경 시 미묘한 텍스트 변화를 감지해야 하므로, 스냅샷 테스트가 가장 효율적입니다.
*   **Contract Testing**: `zod`를 활용한 입출력 검증은 데이터 무결성을 보장하는 좋은 방법입니다.
*   **현실적인 일정**: 각 단계별 예상 시간이 비교적 구체적이고 현실적으로 산정되어 있습니다.

## 3. 개선 및 제안 사항

### 3.1. Snapshot 테스트 방식 개선 (강력 권장)
로드맵에서는 `JSON` 파일을 수동으로 생성하고 읽어오는 방식을 제안하고 있습니다.
```typescript
// 제안된 방식
const data = JSON.parse(fs.readFileSync(...))
expect(result).toBe(data.expectedOutput)
```
하지만 **Jest의 Native Snapshot (`toMatchSnapshot` 또는 `toMatchInlineSnapshot`)**을 사용하는 것이 유지보수 측면에서 훨씬 유리합니다.
*   **이유**:
    *   JSON 파일을 일일이 만들 필요 없이, 첫 실행 시 Jest가 자동으로 생성해줍니다.
    *   변경 사항 발생 시 `jest -u` 명령어로 쉽게 업데이트 가능합니다.
    *   Diff 뷰가 훨씬 강력합니다.
*   **제안**: 수동 JSON 관리 대신 Jest Snapshot 기능을 적극 활용하세요. 데이터(Input)만 준비하면 됩니다.

### 3.2. 테스트 데이터 관리 (Fixtures)
129개의 시나리오를 관리하려면 데이터 관리가 핵심입니다.
*   **Factory Pattern 도입**: 각 통계 분석 결과(`AnalysisResult`)를 생성하는 Factory 함수를 만드세요.
    ```typescript
    const createTTestResult = (overrides?: Partial<AnalysisResult>) => ({ ...default, ...overrides });
    ```
*   이렇게 하면 129개의 JSON 파일을 만드는 수고를 덜고, 코드 내에서 명확하게 테스트 케이스를 정의할 수 있습니다.

### 3.3. Property-Based Testing 격상
통계 엔진은 수치 입력에 민감합니다. `NaN`, `Infinity`, `null`, `undefined`, `극단값` 등에 대한 방어 로직이 필수적입니다.
*   로드맵에 '선택(Optional)'으로 되어 있는 **Property-Based Testing (fast-check)**을 **Phase 2의 필수 항목**으로 격상하는 것을 추천합니다.
*   사람이 생각하지 못한 Edge Case를 찾아내는 데 탁월합니다.

### 3.4. 엔진 리팩토링 병행
현재 `engine.ts`가 1000라인이 넘어가고 있으며, 모든 로직이 하나의 파일에 집중되어 있습니다.
*   테스트를 작성하면서 **Strategy Pattern** 등을 적용하여 각 통계 분석별 핸들러를 분리하는 리팩토링을 병행하면 테스트 용이성이 훨씬 좋아집니다.
    *   예: `handlers/t-test.ts`, `handlers/anova.ts` 등으로 분리

### 3.5. CI/CD 파이프라인 최적화
*   E2E 테스트(Playwright)는 실행 시간이 오래 걸리므로, **매 커밋마다 실행하기보다는 PR 생성 시 또는 Nightly Build**로 돌리는 것이 효율적일 수 있습니다.
*   Unit/Snapshot 테스트는 매 커밋마다 실행하는 것이 좋습니다.

## 4. 수정된 로드맵 제안 (요약)

| Phase | 수정된 제안 | 비고 |
|-------|------------|------|
| **Phase 1** | **Jest Native Snapshot** 활용 | 수동 JSON 관리 제거, 생산성 향상 |
| **Phase 2** | **Property-Based Testing** 필수화 | 안정성 강화 |
| **Phase 2.5** | **엔진 리팩토링** (핸들러 분리) | 유지보수성 및 테스트 용이성 확보 |
| **Phase 3** | E2E 테스트 (주요 시나리오 위주) | 43개 전체보다는 핵심 경로(Critical Path) 우선 |

## 5. 결론
전반적으로 매우 훌륭한 로드맵입니다. **Snapshot 관리 방식(Jest Native 활용)**과 **Property-Based Testing의 중요성**만 조금 더 보강한다면 완벽한 테스트 전략이 될 것입니다.
