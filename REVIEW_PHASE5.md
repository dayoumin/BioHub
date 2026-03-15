# Review: Phase 5 UX 개선 (5-2, 5-3) + L1 Store 테스트

> 리뷰 대상 커밋 범위: 이번 세션 변경분 (미커밋)
> 계획 문서: `stats/docs/graph-studio/PLAN-UX-IMPROVEMENTS.md` Phase 5

---

## 변경 요약

| 항목 | 파일 | 변경 유형 |
|------|------|-----------|
| 5-2 색맹 친화 팔레트 | `chart-spec-defaults.ts` | 기존 파일 수정 (2줄) |
| 5-3 AI 변경 투명성 | `ai-patch-summary.ts` | **신규 파일** (222줄) |
| 5-3 AI 변경 투명성 | `use-ai-chat.ts` | 기존 파일 수정 (6줄) |
| 5-3 AI 변경 투명성 | `AiPanel.tsx` | 기존 파일 수정 (14줄) |
| L1 Store 테스트 | `graph-studio-store.test.ts` | 기존 파일 수정 (148줄) |

---

## 1. 5-2: 색맹 친화 팔레트 기본값

### 변경 내용
`STYLE_PRESETS`의 `default`와 `science` 프리셋에 `scheme: 'OkabeIto'` 추가.

### 배경
- OkabeIto = Wong (2011) Nature Methods 색맹 친화 팔레트
- 이미 `JOURNAL_PALETTES.OkabeIto`에 7색 정의됨
- `ALL_PALETTES`에 포함 → `echarts-converter.ts:89`에서 소비 확인

### 렌더링 경로 검증
```
createDefaultChartSpec() → style: { ...STYLE_PRESETS.default }
  → echarts-converter resolveStyle():
    colors = spec.style.colors
      ?? (spec.style.scheme ? ALL_PALETTES[spec.style.scheme] : undefined)  // ← 여기서 OkabeIto 적용
      ?? PRESET_COLORS[spec.style.preset]
```

### 리뷰 포인트
1. `ieee`/`grayscale`는 명시적 `colors` 배열이 있어 scheme보다 우선 → **영향 없음** (의도적)
2. 기존 사용자의 저장된 프로젝트: `scheme` 없으면 fallback으로 `PRESET_COLORS.default` 사용 → **하위 호환성 유지**
3. **주의**: `STYLE_PRESETS`에 `as const` assertion이 있으므로 `scheme`이 `StyleSpec` 타입에 optional로 정의되어 있는지 확인 필요

---

## 2. 5-3: AI 변경 투명성

### 계획 대비 구현 범위

계획(PLAN-UX-IMPROVEMENTS.md line 592)은 3가지를 포함:
1. **이전값→새값 diff 표시**: `encoding.y.domain: [auto] → [0, 100]` — **미구현** (현재 새 값만 표시)
2. **한국어 변경 요약**: 구현 완료
3. **[되돌리기] 버튼**: **미구현** (patches를 ChatMessage에 저장하지 않아 undo 불가)

현재 구현은 계획의 축소판이며, "이전값 표시"와 "되돌리기"는 후속 작업.

### 2-1. `ai-patch-summary.ts` (신규)

**역할**: JSON Patch 배열 → 한국어 변경 요약 변환

**공개 API**:
- `summarizePatches(patches: ChartSpecPatch[]): PatchSummaryItem[]`
- `formatPatchSummaryText(items: PatchSummaryItem[]): string` — 현재 미사용 (향후 텍스트 전용 표시용)

**내부 구조**:
- `PATH_LABELS`: 경로→한국어 매핑 (주요 ChartSpec 경로 커버, 일부 누락은 fallback으로 대응)
- `getPathLabel()`: 정확매치 → annotations/significance 인덱스(하위 필드명 포함) → 최장접두사 → 원본경로 fallback
- `formatValue()`: unknown → 읽기 가능 문자열 (boolean/number/string/array/object)

**리뷰 포인트**:
1. **`formatPatchSummaryText` 미사용 export**: 현재 소비자 없음. 향후 텍스트 전용 표시(접근성, 복사)에 필요할 수 있으나 dead code 정책상 제거 검토
2. **`getPathLabel` 부분매치 O(n)**: PATH_LABELS 키 수 ~70개, 매 패치마다 전체 순회. 패치 수가 보통 1-5개이므로 성능 문제 없음
3. **`formatValue` 재귀**: `Array.map(formatValue)` — 중첩 배열에서 무한 재귀는 아님 (ChartSpec 값은 얕은 구조), 하지만 이론적으로 깊이 제한 없음
4. **PATH_LABELS 동기화**: ai-service.ts 프롬프트의 스키마와 수동 동기화 필요. 새 ChartSpec 필드 추가 시 PATH_LABELS도 업데이트해야 함 → fallback이 있어 누락 시 경로 그대로 표시되므로 fatal은 아님

### 2-2. `use-ai-chat.ts` 변경 (6줄)

```diff
+ import { summarizePatches } from '@/lib/graph-studio/ai-patch-summary';
+ import type { PatchSummaryItem } from '@/lib/graph-studio/ai-patch-summary';

  export interface ChatMessage {
+   patchSummary?: PatchSummaryItem[];
  }

+     const summary = summarizePatches(response.patches);
      appendMessage({
+       patchSummary: summary,
      });
```

**리뷰 포인트**:
1. **localStorage 영향**: `patchSummary`가 ChatMessage에 추가되어 localStorage에 직렬화됨. PatchSummaryItem은 `{label, op, value?, path}` 4필드. 패치 5개 × 30메시지 = 최대 150개 항목. 용량 영향은 미미 (~10KB 미만)
2. **초기에 `patches: ChartSpecPatch[]`도 저장하려 했으나 리뷰에서 제거**: 되돌리기 기능 미구현이므로 불필요한 localStorage 부풀림 방지. 올바른 판단
3. **`PatchSummaryItem` type import**: ChatMessage 인터페이스에 사용되므로 필수

### 2-3. `AiPanel.tsx` 변경 (14줄)

MessageBubble 컴포넌트의 assistant 메시지에 "변경 내역" 섹션 추가:

```tsx
{message.patchSummary && message.patchSummary.length > 0 && (
  <div className="pt-1 border-t border-border/50 space-y-0.5">
    <span className="text-[10px] font-medium text-muted-foreground">변경 내역:</span>
    {message.patchSummary.map((item: PatchSummaryItem) => (
      <div key={item.path} className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <span className="font-medium">{item.label}</span>
        <span className="text-muted-foreground/60">
          {item.op === '제거' ? '제거됨' : `→ ${item.value ?? ''}`}
        </span>
      </div>
    ))}
  </div>
)}
```

**리뷰 포인트**:
1. **React key `item.path`**: 동일 AI 응답에 같은 path 패치 2개면 key 충돌. 실질적으로 불가능 (동일 path에 replace 두 번은 무의미)하지만, 방어적으로 `${item.path}-${index}` 사용 검토
2. **`(item: PatchSummaryItem)` 타입 어노테이션**: `message.patchSummary`가 이미 `PatchSummaryItem[]`로 타입되어 있어 추론 가능. 중복이지만 가독성 면에서 무해
3. **`text-[10px]` 크기**: 기존 메시지가 `text-sm` (14px), 변경 내역이 10px. 계층 구분 의도이나 접근성 최소 크기(12px) 미달. 학술 도구 사용자 대상이므로 수용 가능하나 주의
4. **AiPanel import `PatchSummaryItem`**: map 콜백의 명시적 타입용으로만 사용. PatchSummaryItem을 제거하고 타입 추론에 의존해도 동작하나 현재도 정상

---

## 3. L1 Store 테스트 (148줄 추가)

### 추가된 describe 블록

| describe | 테스트 수 | 검증 대상 |
|----------|-----------|-----------|
| `goToSetup — 에디터→설정 네비게이션` | 3 | chartSpec null, previousChartSpec 보관, dataPackage 유지 |
| `previousChartSpec 수명 관리` | 4 | loadDataPackageWithSpec/clearData/loadDataOnly/setProject 각각 null 초기화 |
| `disconnectProject — 프로젝트 연결 해제` | 4 | currentProject null, 데이터 유지, 안전 호출, 데이터 교체 시나리오 |

### 리뷰 포인트
1. **goToSetup AI 채팅 초기화 미검증**: store의 `goToSetup()`은 `clearAiChatHistory()`를 호출하지만, 이 side effect는 테스트하지 않음. 같은 테스트 파일에서 `localStorage.clear()`는 이미 사용 중이므로 기술적 장벽은 없으나, store 테스트의 범위(state 변경)와 분리한 것은 의도적
2. **`previousChartSpec` 수명 — `loadDataPackage` 누락**: `loadDataPackage()`도 `previousChartSpec: null`을 설정하지만(line 134), 이에 대한 테스트 없음. 프로젝트 복원 모드에서의 동작이므로 기존 프로젝트 복원 테스트에서 간접 커버되나, 명시적 테스트 추가 검토
3. **데이터 교체 시나리오**: `loadDataPackageWithSpec` + `disconnectProject`를 같은 `act()` 안에서 호출. 실제 코드(LeftDataPanel)에서도 순차 호출이므로 정확한 재현
4. **`resetAll` 후 `previousChartSpec`**: resetAll은 `initialState`를 spread하므로 `previousChartSpec: null` 보장. 이미 기존 resetAll 테스트에서 간접 커버

---

## 알려진 제한사항

1. **5-3 범위 축소**: 계획의 "이전값→새값 diff"와 "[되돌리기]"는 미구현. 현재는 새 값 요약만 표시
2. **ai-patch-summary 단위 테스트 없음**: `summarizePatches`, `getPathLabel`, `formatValue`에 대한 단위 테스트 미작성. 순수 함수이므로 테스트 작성 용이
3. **`formatPatchSummaryText` dead export**: 현재 소비자 없음
4. **PATH_LABELS ↔ ChartSpec 스키마 동기화**: 수동 관리. 주요 경로는 커버하나 완전하지 않음 (fallback이 있어 누락 시 경로 그대로 표시)
5. **색맹 시뮬레이션 미리보기**: 계획(5-2)에 "StyleTab에 색맹 미리보기 버튼" 언급. 이번 구현에서는 기본 팔레트 변경만 수행, 시뮬레이션 미구현

---

## 파일별 변경 요약

```
수정:
  stats/lib/graph-studio/chart-spec-defaults.ts          +2줄 (scheme: 'OkabeIto' × 2)
  stats/lib/graph-studio/use-ai-chat.ts                  +6줄 (import, ChatMessage 필드, summarize 호출)
  stats/components/graph-studio/AiPanel.tsx               +14줄 (변경 내역 UI 섹션)
  stats/__tests__/lib/graph-studio/graph-studio-store.test.ts +148줄 (3 describe, 11 it)

신규:
  stats/lib/graph-studio/ai-patch-summary.ts             222줄 (PATH_LABELS + summarizePatches + formatPatchSummaryText)
```
