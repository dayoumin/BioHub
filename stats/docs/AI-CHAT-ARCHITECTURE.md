# AI 채팅 아키텍처 — 현재 상태 + 확장 포인트

## 모델 설정 (2026-03-31)

```
1순위: google/gemini-3.1-flash-lite-preview (간결, 저렴, 길이 지시 준수)
fallback: openai/gpt-5.4-mini (정확도 높음, 장황함)
```

설정: `stats/.env.local` → `NEXT_PUBLIC_OPENROUTER_MODEL`

## 서비스 구조

```
┌──────────────────────────────────────────────────┐
│               llm-recommender.ts                  │
│  (통합 오케스트레이터: OpenRouter / Ollama 분기)   │
└────────┬───────────────────────┬──────────────────┘
         │                       │
   ┌─────▼─────────┐    ┌───────▼──────────┐
   │  openrouter-   │    │  ollama-          │
   │  recommender   │    │  recommender      │
   │  .ts           │    │  .ts (비활성)     │
   └────────────────┘    └──────────────────┘
```

## API 호출 유형

### Single-turn (히스토리 없음)
| 메서드 | 파일 | maxTokens | 용도 |
|--------|------|-----------|------|
| `generateRawText()` | openrouter-recommender | 2000 | 범용 텍스트 |
| `streamChatCompletion()` | openrouter-recommender | 2000 | 결과 해석 |
| `editChart()` | graph-studio/ai-service | 1500 | 차트 JSON 패치 |
| `requestInterpretation()` | result-interpreter | 2000 | 초기 해석 |

### Multi-turn (히스토리 포함)
| 메서드 | 파일 | maxTokens | 히스토리 | 용도 |
|--------|------|-----------|----------|------|
| `callModel()` | openrouter-recommender | 2000 | 압축 | 통계 추천 |
| `getHubAiResponse()` | hub-chat-service | 2000 | 압축 | 허브 채팅 |
| `streamFollowUp()` | result-interpreter | 4000 | 압축 | 해석 Q&A |
| `streamChatWithMessages()` | openrouter-recommender | 4000 | 직접 전달 | 범용 스트리밍 |

## 채팅 히스토리 압축 (`chat-history-compressor.ts`)

### 동작 방식
```
전체 히스토리 (예: 16메시지)
  ↓ isError 제외
  ↓ 최근 4개(2턴) → 원본 유지
  ↓ 나머지 12개 → 메시지당 150자 잘라서 "[이전 대화 맥락]" 단일 메시지로 병합
  ↓ 총 토큰 추정 > 2000이면 → 축약 메시지 추가 트리밍
  = 최종 5개 메시지 (축약1 + 최근4)
```

### 설정 옵션
| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `recentMessageCount` | 4 | 원본 유지할 최근 메시지 수 |
| `oldMessageMaxChars` | 150 | 오래된 메시지당 최대 글자 수 |
| `maxTotalTokens` | 2000 | 히스토리 전체 토큰 상한 |

### 특징
- LLM 호출 없음 (순수 문자열 처리, 지연/비용 0)
- 한국어 토큰 추정: 한글 × 2 + ASCII × 0.3
- 문장 경계 기반 자르기 (`.`, `다.`, `!`, `?`)

## 향후 확장 포인트

### L1: 현재 (구현 완료)
- [x] 최근 2턴 원본 + 이전 메시지 축약
- [x] 에러 메시지 제외
- [x] 토큰 추정 + 초과 시 트리밍
- [x] 3개 서비스에 통합 (callModel, hubChat, followUp)

### L2: 맥락 누적 (미구현)
- [ ] LLM으로 이전 대화 요약 생성 (비용 추가)
- [ ] 요약을 IndexedDB에 캐시 (세션 간 유지)
- [ ] 시스템 프롬프트에 "대화 요약" 섹션 추가

### L3: 대화 분기 (미구현)
- [ ] 독립 채팅 페이지
- [ ] 대화 내 데이터 변경 시 분기
- [ ] 대화 트리 구조 저장

## 파일 목록

```
stats/lib/services/ai/
├── chat-history-compressor.ts    ← 히스토리 압축
├── data-context-builder.ts       ← 데이터 요약 마크다운
├── parse-interpretation-sections.ts
└── prompts.ts                    ← 시스템 프롬프트

stats/lib/services/
├── openrouter-recommender.ts     ← OpenRouter API 호출 (핵심)
├── llm-recommender.ts            ← 통합 오케스트레이터
├── hub-chat-service.ts           ← 허브 채팅
├── result-interpreter.ts         ← 결과 해석 + Q&A
└── graph-studio/ai-service.ts    ← 차트 편집

stats/__tests__/lib/services/ai/
└── chat-history-compressor.test.ts  ← 10개 테스트
```
