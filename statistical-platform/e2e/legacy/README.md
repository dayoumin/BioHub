# Legacy E2E Tests

이 폴더에는 더 이상 사용하지 않는 E2E 테스트들이 보관되어 있습니다.

## 📁 폴더 구조

### `individual-pages/`
개별 통계 페이지 E2E 테스트 (더 이상 사용하지 않음)

**이동 이유:**
- 스마트 플로(Smart Flow)로 통합되어 개별 페이지 테스트 불필요
- 스마트 플로에서 통합적으로 모든 통계 방법 테스트

**파일 목록:**
- `t-test.spec.ts` - 독립표본/일표본/대응표본 t-검정 개별 페이지
- `anova.spec.ts` - ANOVA 개별 페이지
- `run-all.spec.ts` - ANOVA/T-Test 개별 페이지 통합 실행
- `statistics-advanced.spec.ts` - 고급 통계 (PCA, Cronbach's Alpha)

### `old-smart-flow/`
구버전 스마트 플로 E2E 테스트 (더 이상 사용하지 않음)

**이동 이유:**
- UI 텍스트 기반 셀렉터 → UI 변경 시 쉽게 깨짐
- 새로운 `smart-flow-e2e.spec.ts`가 data-testid 기반으로 더 안정적
- Selector Registry (`e2e/selectors.ts`) 도입으로 유지보수성 향상

**파일 목록:**
- `smart-flow.spec.ts` - 구버전 (51개 TC, UI 텍스트 기반)
- `smart-flow-full.spec.ts` - 전체 분석 흐름 (helpers 기반)
- `debug-smartflow.spec.ts` - 디버깅용 테스트

## ✅ 현재 사용 중인 E2E 테스트

**메인 통합 테스트:**
- `../smart-flow-e2e.spec.ts` - **data-testid 기반 안정적 테스트**

**실행:**
```bash
pnpm build
npx playwright test --config=e2e/playwright-e2e.config.ts --headed
```

## 📝 레거시 이동 날짜

- **2026-02-09**: 스마트 플로 통합으로 개별 테스트 레거시 이동

## 🔄 복원 방법

필요 시 다음 명령어로 복원 가능:
```bash
mv e2e/legacy/individual-pages/* e2e/statistics/
mv e2e/legacy/old-smart-flow/* e2e/
```

단, 현재 UI 구조와 맞지 않을 수 있으므로 수정 필요.
