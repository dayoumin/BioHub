# Troubleshooting: Papers autosave/reload E2E

**작성일**: 2026-04-30
**영향**: 자료 작성 편집 내용이 저장된 것처럼 보이지만 reload 후 editor 화면 검증이 실패하거나, E2E가 최신 소스와 다른 결과를 볼 수 있음.

## 증상

- IndexedDB의 `document-blueprints`에는 수정한 섹션 `content`와 `plateValue`가 들어 있다.
- reload 후 화면의 Plate editor에는 이전 본문이 보인다.
- 소스 수정 후 Playwright를 다시 실행했는데 같은 실패가 반복된다.
- autosave 직후 reload E2E가 간헐적으로 실패한다.

## 원인

1. `stats/playwright.config.ts`는 `next dev`가 아니라 `stats/out` 정적 export를 서빙한다. 소스 수정 후 `pnpm --filter stats build`를 생략하면 E2E가 이전 빌드를 볼 수 있다.
2. autosave는 editor serialize debounce와 document save debounce가 분리되어 있다. IndexedDB polling이 통과해도 사용자에게 보이는 저장 큐 상태가 아직 `저장됨`으로 확정되지 않았을 수 있다.
3. Plate editor는 내부 editor state와 React DOM 표시가 어긋날 수 있다. 저장소 값만 확인하면 실제 사용자 화면 복원을 검증하지 못한다.
4. 섹션 전환 중 pending serialize가 남아 있으면, 새 섹션 editor state로 이전 섹션을 flush하는 오염이 생길 수 있다.

## 재현/진단 순서

1. 소스 수정 후 `pnpm --filter stats build`를 먼저 실행한다.
2. targeted E2E를 실행한다.

```bash
pnpm --filter stats exec playwright test e2e/ux/papers-section-regeneration.spec.ts -g "autosaves manual edits"
```

3. 실패하면 IndexedDB 값과 editor DOM을 분리해 확인한다.
4. IndexedDB 값은 최신인데 DOM이 이전이면 `DocumentEditor`의 Plate 초기값/`setValue`/섹션 전환 flush 경로를 본다.
5. IndexedDB 값도 이전이면 serialize debounce, save debounce, unload flush, conflict 상태를 본다.

## 회귀 방지 기준

- autosave/reload E2E는 `content`, `plateValue`, 사용자 표시 상태 `저장됨`, reload 후 실제 `[contenteditable="true"]` 텍스트를 모두 확인한다.
- 섹션 전환은 `setActiveSectionId()` 전에 현재 섹션을 `flushSerialize()`해야 한다.
- `DocumentEditor`에서 `content`를 저장할 때는 같은 markdown에서 역직렬화한 `plateValue`도 함께 갱신한다.
- 실패한 section regeneration은 성공 toast를 보여주지 않아야 한다.

## 관련 파일

- `stats/components/papers/DocumentEditor.tsx`
- `stats/components/papers/useDocumentSectionRegeneration.ts`
- `stats/e2e/ux/papers-section-regeneration.spec.ts`
- `stats/__tests__/components/papers/DocumentEditor.export-freshness.test.tsx`
