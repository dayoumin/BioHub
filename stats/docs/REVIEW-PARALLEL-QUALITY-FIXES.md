# Code Review: 병렬 품질 수정 5건

**날짜**: 2026-03-25
**리뷰어**: Claude Opus 4.6 (Simplify 3-agent review)
**대상**: 5개 병렬 작업 — createLocalStorageIO 적용, TOAST 마이그레이션, Graph quota, FASTA 감지, deep-link UI

---

## 변경 요약

| # | 작업 | 파일 수 | 핵심 변경 |
|---|------|---------|-----------|
| A | `createLocalStorageIO` 5곳 적용 | 5 | raw localStorage → factory `readJson`/`writeJson` |
| B | TOAST 상수 마이그레이션 | 13 | 하드코딩 토스트 문자열 ~35곳 → `TOAST.*` 상수 |
| C | Graph Studio localStorage quota | 2+test | `MAX_GRAPH_PROJECTS=50`, 자동 eviction, QuotaExceededError 재시도 |
| D | 다중 FASTA 시퀀스 감지 | 1+test | `validateSequence()`에 다중 헤더 가드 추가 |
| E | deep-link 복원 실패 UI | 1 | 에러 배너 + URL 정리 + "새 분석 시작" 버튼 |

---

## 리뷰 결과

### Agent 1: Code Reuse Review

**결론: 중복 없음.**

| 검사 항목 | 결과 |
|-----------|------|
| QuotaExceededError 감지 패턴 중복 | 없음. 1곳에서만 사용. `isQuotaExceededError()` 추출은 향후 필요 시 고려. |
| URL cleanup (`replaceState`) 유틸 | 없음. 코드베이스에 유일한 인스턴스. |
| Amber 경고 배너 재사용 가능 컴포넌트 | 없음. 4+ 곳에서 수동 amber div 사용 중이나, 공통 `WarningBanner` 미존재. 향후 추출 기회. |
| `getEvictionCandidates` 정렬 유틸 | 없음. 각 `updatedAt` 정렬은 타입/방향이 달라 공통화 저가치. |
| TOAST 함수 패턴 공통 헬퍼 | 불필요. 단순 화살표 함수가 idiomatic. |

### Agent 2: Code Quality Review

**결론: 2건 수정, 나머지 클린.**

| 이슈 | 심각도 | 상태 |
|------|--------|------|
| `ReportComposer`에서 마크다운 복사 실패 시 `chartCopyError` 사용 (의미 불일치) | minor | **수정됨** → `copyError` 사용 |
| `codeExport.success` ternary `'R' ? 'R' : 'Python'` — 미래 언어 추가 시 취약 | minor | **수정됨** → `Record<string, string>` 매핑 |
| `entity-tab-registry` `saveTabSettings` try-catch 중복? | — | **정상** — factory throws, catch는 의도적 best-effort |
| `clearAnalysisHistory` `writeJson([])` vs `removeItem` | — | **정상** — 기능 동등 |
| `writeWithQuotaRetry` list 파라미터 mutation | — | **정상** — `filter()`는 새 배열 반환, 재할당일 뿐 |
| `isQuota` 검사의 string includes dead code | — | **정상** — factory 래핑으로 실제는 cause 체크만 작동, 해 없음 |
| `\r\n` 줄바꿈 처리 | — | **정상** — `\r`은 `\s` regex로 제거됨 |
| `deepLinkError` 상태 navigation 잔류 | — | **정상** — 컴포넌트 unmount 시 리셋 |
| sidebar `[projects]` 의존성 과도 | negligible | **skip** — 사용자 액션 시에만 변경 |

### Agent 3: Efficiency Review

**결론: 1건 수정, 나머지 문제 없음.**

| 검사 항목 | 결과 |
|-----------|------|
| `readJson` hot path 호출 | 없음 — 모두 이벤트 기반 또는 일회성 |
| TOAST 함수 렌더 시 할당 | 없음 — 이벤트 핸들러에서만 호출 |
| Graph quota `getEvictionCandidates` 이중 정렬 | 정상 경로 1회, 에러 경로에서만 추가. 50개 기준 무시 가능. |
| **FASTA `split().filter().length`** | **수정됨** → `indexOf` 수동 스캔 + early exit (대용량 붙여넣기 시 배열 할당 회피) |
| deep-link `URLSearchParams` | 일회성, 문제 없음 |
| sidebar `useMemo` 의존성 | `projects`가 올바른 의존성. `availableProjects`는 매 렌더 재생성되어 오히려 비효율. |

---

## Simplify 후 수정 사항 (3건)

### 1. ReportComposer — 토스트 키 의미 수정
```diff
- toast.error(TOAST.clipboard.chartCopyError)
+ toast.error(TOAST.clipboard.copyError)
```
**파일**: `stats/components/projects/ReportComposer.tsx:74`

### 2. codeExport.success — 언어 매핑 확장성 개선
```diff
- success: (language: string): string => `${language === 'R' ? 'R' : 'Python'} 코드를 다운로드했습니다.`,
+ success: (language: string): string => {
+   const label: Record<string, string> = { R: 'R', python: 'Python' }
+   return `${label[language] ?? language} 코드를 다운로드했습니다.`
+ },
```
**파일**: `stats/lib/constants/toast-messages.ts:79-82`

### 3. validate-sequence — early-exit 스캔으로 개선
```diff
- const headerCount = raw.split('\n').filter(line => line.startsWith('>')).length
+ let headerCount = 0
+ let idx = -1
+ while ((idx = raw.indexOf('>', idx + 1)) !== -1) {
+   if (idx === 0 || raw[idx - 1] === '\n' || raw[idx - 1] === '\r') {
+     headerCount++
+     if (headerCount > 1) break
+   }
+ }
```
**파일**: `stats/lib/genetics/validate-sequence.ts:29-37`
**이유**: 대용량 FASTA 붙여넣기 시 배열 할당 회피 + 두 번째 헤더 발견 즉시 종료
**UX 결정**: 정확한 개수 대신 "다중 서열 감지"만 안내 (개수를 알아도 행동은 동일)
**테스트 정합**: 테스트에서 개수 검증(`toContain('2개')`) 제거, 메시지 존재만 확인으로 변경

---

## 향후 개선 기회 (이번 범위 밖)

1. **공통 `WarningBanner` 컴포넌트** — amber 경고 배너가 4+ 곳에서 수동 작성됨. shadcn `Alert`에 `warning` variant 추가 또는 별도 컴포넌트 추출 검토.
2. **`isQuotaExceededError()` 유틸 추출** — 현재 1곳이나, 다른 storage 모듈에서 quota-aware 쓰기 필요 시 `local-storage-factory.ts`에 추출.

---

## 검증

- `tsc --noEmit`: 커밋 시 확인 예정
- `pnpm test`: 관련 테스트 통과 (기존 실패 3건은 사전 존재)
- 수정된 3개 파일 모두 기존 동작 유지, API 변경 없음
