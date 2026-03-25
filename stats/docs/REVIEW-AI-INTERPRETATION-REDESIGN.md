# Code Review Request: AI 해석 카드 리디자인 — 구조화된 섹션 UI

**날짜**: 2026-03-25
**변경 파일**: 6개 (신규 3 + 수정 3)
**테스트**: 파서 14개 + ResultsActionStep 73개 + 히스토리 4개 = 91개 통과

---

## 변경 요약

| # | 카테고리 | 파일 | 핵심 변경 |
|---|----------|------|-----------|
| A | 섹션 파서 (NEW) | `lib/services/ai/parse-interpretation-sections.ts` | AI 상세 해석을 `**볼드 소제목**` 기준으로 개별 섹션 분리 |
| B | 아이콘 설정 (NEW) | `components/analysis/steps/results/ai-section-config.ts` | 섹션 키 → lucide 아이콘 매핑 (monochrome) |
| C | 카드 리디자인 | `components/analysis/steps/results/AiInterpretationCard.tsx` | plain markdown → pill 탐색 + warning/CTA callout |
| D | 부모 정리 | `components/analysis/steps/ResultsActionStep.tsx` | `detailedInterpretOpen` state 제거 |
| E | 테스트 업데이트 | `__tests__/components/analysis/ResultsActionStep.test.tsx` | CollapsibleSection → pill 기반 검증 |
| F | 파서 테스트 (NEW) | `__tests__/lib/services/ai/parse-interpretation-sections.test.ts` | 14개 테스트 케이스 |

---

## A. 섹션 파서 (`parse-interpretation-sections.ts`)

AI 해석의 상세 텍스트를 `**볼드 소제목**` 기준으로 구조화된 섹션 배열로 분리하는 순수 함수.

**핵심 설계:**
- `splitInterpretation()` 하류에서 동작 (export 호환 유지)
- regex: `(?:^|\n)\s*\*\*([^*]+)\*\*\s*[:：]?\s*/g` — 줄 시작 앵커로 본문 내 inline bold 무시
- 8개 알려진 헤딩 매핑 (통계량 해석, 효과크기, 신뢰구간, 가정 충족, 그룹 패턴, 활용법, 주의사항, 추가 분석)
- 카테고리 분류: `detail` | `warning` (주의할 점) | `action` (추가 분석 제안)
- 미완성 볼드(`**텍스트` 닫힘 없음) 자동 무시 (스트리밍 안전)
- unknown 헤딩 + 중복 키 방지 (`dedupIdx` 접미사)

**리뷰 포인트:**
- `lookupMeta()`의 부분 매칭(`heading.includes(pattern)`)이 충분히 안전한지
- regex가 모든 AI 응답 변형을 커버하는지 (콜론 있음/없음, 한국어 콜론, 줄바꿈 직후)

---

## B. 아이콘 설정 (`ai-section-config.ts`)

섹션 키 → lucide 아이콘 static 매핑. 모든 아이콘은 monochrome(`text-muted-foreground`)으로 렌더링.

```
statistics → Calculator, effectSize → TrendingUp, confidence → Target,
assumptions → ShieldCheck, groupPatterns → BarChart3, practical → Lightbulb,
cautions → AlertTriangle, suggestions → ArrowRight, unknown → FileText
```

`getBaseKey()`: `unknown-0` → `unknown` (접미사 제거), `getSectionIcon()`: fallback FileText.

---

## C. 카드 리디자인 (`AiInterpretationCard.tsx`)

### 기존 → 변경

| 기존 | 변경 후 |
|------|---------|
| plain markdown in single card | Summary Hero + Section Pills + Content Area |
| CollapsibleSection "상세 해석" (기본 접힘) | pill 클릭 탐색 + "전체 보기" 토글 |
| 전체가 violet 단일 스타일 | detail(monochrome) / warning(기존 토큰) / action(violet CTA) 분리 |
| `detailedInterpretOpen` 외부 state | 내부 state (`activeSection`, `showAll`) |

### 정보 위계
1. **Summary Hero** — violet 좌측 보더 + 배경 틴트, `React.memo` 래핑 (스트리밍 최적화)
2. **Section Pills** — detail 카테고리 섹션만 pill로 표시, 클릭 시 콘텐츠 표시
3. **Content Area** — 선택된 섹션 또는 전체 보기 (AnimatePresence 전환)
4. **Warning Callout** — 기존 `warning-border`/`warning-bg` 디자인 토큰, 긴 텍스트 `overflow-hidden max-h-[3.5em]` + 더 보기
5. **Action CTA** — violet outline, 행동 유도

### 상태 관리
```
activeSection: string | null  — 선택된 pill (null = 선택 없음)
showAll: boolean              — 전체 보기 모드
autoSelectPending: useRef     — 스트리밍 완료/히스토리 복원 시 1회 자동 선택
detailRef: useRef             — detail 변경 감지 (재해석/히스토리 전환 리셋)
```

### 스트리밍 동작
- detail 스트리밍 중: pill이 순차 등장, 사용자 선택 유지 (리셋 안 함)
- 스트리밍 완료: 첫 detail 섹션 자동 선택
- 재해석: 모든 UI 상태 리셋 + autoSelect 재활성화
- 히스토리 전환: 즉시 리셋 + 첫 섹션 자동 선택

**리뷰 포인트:**
- render-body setState 패턴 (React 18+) — 가드 조건이 무한 루프를 확실히 방지하는지
- 스트리밍 중 pill 선택 → 다음 청크에서 리셋되는 버그 없는지 (`!isInterpreting` 가드)
- WarningCallout/ActionCallout 구조 유사 — 통합 필요 여부
- 하드코딩 한글 ('전체 보기', '접기', '더 보기') — 단일 로케일이므로 현재 OK, 추후 i18n 시 처리

---

## D. ResultsActionStep 변경 (최소)

- `detailedInterpretOpen` state 제거 (AiInterpretationCard 내부로 이동)
- AiInterpretationCard props에서 `detailedInterpretOpen`, `onDetailedInterpretOpenChange` 제거

---

## E. 테스트 변경

기존 CollapsibleSection "상세 해석" 라벨 기반 → "전체 보기" 버튼 기반 검증으로 변경.
- `getByText('통계량')` → `getByText('전체 보기')` (StatisticCard 라벨과 중복 방지)

---

## F. 파서 테스트 (14개)

| 테스트 | 검증 내용 |
|--------|-----------|
| 빈 문자열/null | 빈 배열 |
| 볼드 없음 | 빈 배열 (fallback) |
| 전체 8섹션 | 키 순서, 카테고리, shortLabel |
| 부분 3섹션 | 일부만 존재 시 정확 파싱 |
| 스트리밍 isStreaming | 마지막만 true |
| 미완성 볼드 | 1섹션만 파싱 |
| unknown 헤딩 | unknown-0, unknown-1 |
| 중복 헤딩 | statistics, statistics-0 |
| 콜론 변형 | 없음, `:`, `：` |
| 부분 매칭 | "통계량 해석 결과" → statistics |
| **inline bold** | 본문 내 `**0.003**` 무시, 줄 시작만 섹션 |

---

## 아키텍처 다이어그램

```
interpretation (string, streaming)
  │
  ▼
splitInterpretation()        →  { summary, detail }     [기존, 변경 없음]
  │
  ▼
parseDetailSections()        →  InterpretationSection[]  [NEW]
  │
  ▼
AiInterpretationCard
  ├── SummaryBlock (memo)    →  violet hero
  ├── SectionPill × N        →  pill 탐색 바
  ├── SectionContent          →  선택된 섹션 / 전체 보기
  ├── WarningCallout          →  주의사항 (warning 토큰)
  └── ActionCallout           →  추가 분석 (violet CTA)
```

---

## 리뷰어에게 요청

1. **C (auto-select 로직)**: `autoSelectPending` ref + render-body setState가 모든 시나리오(스트리밍, 재해석, 히스토리)에서 올바르게 동작하는지
2. **A (파서 regex)**: `(?:^|\n)` 앵커가 AI 응답의 모든 줄바꿈 변형(CRLF, LF)을 처리하는지
3. **C (WarningCallout `max-h-[3.5em]`)**: ReactMarkdown 출력에서 실제로 텍스트가 잘리는지 — 다중 `<p>` 블록 시 동작
4. **전체**: 놓친 엣지 케이스나 regression 위험
