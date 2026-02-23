# LLM 통합 가이드

> Next.js / Node.js 프로젝트에서 여러 AI 제공자를 사용하는 패턴 모음
> **범용 가이드** — 다른 프로젝트에도 그대로 이식 가능합니다.
>
> 최초 작성: Kemi 프로젝트 (`src/lib/ai.ts`) 기준, 2026-02

---

## 1. 구조 개요

AI 통합은 `lib/ai.ts` 하나로 모든 제공자를 추상화합니다.

```
호출하는 코드 (feature별 로직)
    ↓
chat() — 통합 인터페이스 (lib/ai.ts)
    ↓
┌─────────────┬──────────────┬──────────────┐
│  Ollama     │  OpenRouter  │  Grok/OpenAI │
│ (로컬 개발)  │  (무료 모델)  │  (유료 고성능) │
└─────────────┴──────────────┴──────────────┘
```

**핵심 아이디어**: 제공자가 바뀌어도 feature 코드는 변경 없음.

---

## 2. 환경 변수 설정

`.env.local`에 사용할 제공자의 키를 추가합니다. **여러 개를 동시에 설정해도 됩니다.**

```env
# 우선순위: Grok > OpenRouter > OpenAI (비용 효율 순)
# Ollama는 AI_PROVIDER=ollama로 명시해야만 사용됨

GROK_API_KEY=xai-...           # xAI Grok API 키 (XAI_API_KEY도 가능)
OPENROUTER_API_KEY=sk-or-...   # OpenRouter API 키 (무료 모델 포함)
OPENAI_API_KEY=sk-...          # OpenAI API 키

# 선택: 특정 제공자 강제 지정
AI_PROVIDER=openrouter         # ollama | grok | openrouter | openai

# 선택: 기능별로 다른 모델 사용 (예시)
AI_MODEL_REPORT=x-ai/grok-4.1-fast    # 리포트 생성용 고품질 모델
AI_MODEL_TAGGING=openai/gpt-4o-mini   # 태그 추출용 빠른 모델

# 선택: Ollama 로컬 서버 URL
OLLAMA_BASE_URL=http://localhost:11434

# OpenRouter 사용 시 필수: HTTP-Referer 헤더용
NEXT_PUBLIC_APP_URL=https://your-app.com
```

### 제공자별 무료/저렴 옵션 (2026년 기준)

| 제공자 | 추천 모델 | 비용 | 특징 |
|--------|----------|------|------|
| OpenRouter | `openai/gpt-oss-120b:free` | **무료** | 가장 저렴, 트래픽 많으면 rate limit |
| OpenRouter | `x-ai/grok-4.1-fast` | ~$0.001/1K tok | 빠름, 안정적 폴백 |
| Grok (xAI) | `grok-3-mini` | 저렴 | 직접 키 사용 시 |
| Ollama | 모든 오픈소스 모델 | **무료** | 로컬 전용, 키 불필요 |

---

## 3. 기본 사용법

### 3-1. 단순 텍스트 응답

```typescript
import { chat, isAIAvailable } from '@/lib/ai';

// AI 사용 가능 여부 먼저 확인 (키 없으면 false)
if (!isAIAvailable()) {
  return fallbackResponse();
}

const response = await chat({
  messages: [
    { role: 'system', content: '당신은 친절한 어시스턴트입니다.' },
    { role: 'user', content: '안녕하세요!' },
  ],
});

console.log(response.content);  // AI 응답 텍스트
console.log(response.provider); // 'openrouter' | 'grok' | 'openai' | 'ollama'
console.log(response.model);    // 실제 사용된 모델명
```

### 3-2. JSON 응답 받기

AI에게 JSON을 반환하게 하려면 두 가지를 조합합니다.

**① 프롬프트에 스키마를 명시 + 골격 제시** (모든 모델에서 동작)

```typescript
import { chat, parseJSONResponse, isAIAvailable } from '@/lib/ai';

const response = await chat({
  messages: [
    { role: 'system', content: '반드시 JSON만 출력하세요.' },
    {
      role: 'user',
      content: `
        사용자 데이터: ...

        아래 JSON 골격을 채워서 출력하세요:
        {
          "name": "이름",
          "tags": ["태그1", "태그2", "태그3"]
        }
      `,
    },
  ],
  // jsonMode: true → OpenAI만 response_format 설정됨, 다른 제공자는 무시됨
  // 프롬프트 골격 방식이 모든 모델에서 더 안정적
  jsonMode: true,
});

// JSON 파싱 (```json 블록, <think> 태그 등 자동 처리)
const parsed = parseJSONResponse<{ name: string; tags: string[] }>(response.content);
```

**② 에러 처리 포함 안전한 패턴**

```typescript
import { chat, parseJSONResponse, isAIAvailable } from '@/lib/ai';

async function analyzeData<T>(data: unknown): Promise<T | null> {
  if (!isAIAvailable()) return null;

  try {
    const response = await chat({
      messages: [buildSystemPrompt(), buildUserPrompt(data)],
      temperature: 0.4,  // JSON 출력 안정성을 위해 낮게 설정
      maxTokens: 2000,
      timeout: 30000,
    });

    return parseJSONResponse<T>(response.content);
  } catch {
    return null; // AI 실패 시 null 반환, 호출자가 fallback 처리
  }
}
```

---

## 4. 배열 개수를 정확히 지키게 만들기

LLM은 "3개를 반환하세요"라는 지시를 **자주 무시합니다** (2개나 4개를 반환).

### 해결책: 프롬프트 + 코드 2중 방어

**① 프롬프트 — 골격 fill-in-the-blank 방식**

단순히 "N개를 반환하세요"라고 쓰는 것보다, **이미 N개짜리 슬롯이 채워진 골격**을 제시하는 것이 훨씬 효과적입니다. AI가 슬롯 수를 바꿀 동기가 없어집니다.

```
⚠️ 배열 개수 절대 규칙 (어기면 불합격):
- items: 정확히 3개 — 2개도 4개도 안 됨

아래 골격을 그대로 채워서 출력하세요 (슬롯 개수를 변경하지 마세요):
{
  "items": [
    { "title": "항목1", "description": "설명" },
    { "title": "항목2", "description": "설명" },
    { "title": "항목3", "description": "설명" }
  ]
}

출력 전 자가 검증:
- items 3개? 맞지 않으면 추가/제거 후 다시 출력하세요.
```

**② 코드 — 초과 제거 + 부족 시 fallback 패딩**

```typescript
function normalizeItems(aiItems: unknown[], fallbackItems: Item[]): Item[] {
  // 1. 초과 제거
  const normalized = (aiItems || []).slice(0, 3).map(parseItem);

  // 2. ⚠️ 반드시 while 루프 전에 부족 여부 체크!
  //    (while 루프 이후에 체크하면 항상 충족 → 경고가 절대 출력되지 않음)
  if (normalized.length < 3) {
    console.warn('AI 배열 부족, fallback 패딩', { count: normalized.length });
    while (normalized.length < 3) {
      normalized.push(fallbackItems[normalized.length] ?? fallbackItems[0]);
    }
  }

  return normalized;
}
```

> **흔한 버그**: 패딩(while 루프) 이후에 `if (length < 3) warn()` 을 두면 항상 충족되어 경고가 절대 출력되지 않습니다. 반드시 **루프 전에** 체크하세요.

---

## 5. OpenRouter 자동 폴백 패턴

무료 모델이 rate limit에 걸릴 때 자동으로 다음 모델로 넘어갑니다.

```typescript
// lib/ai.ts의 OPENROUTER_MODELS 배열 (우선순위 순)
export const OPENROUTER_MODELS = [
  'openai/gpt-oss-120b:free',  // 1순위: 무료
  'x-ai/grok-4.1-fast',        // 최종 폴백: 유료지만 안정적
];
```

`chat()` 함수가 내부적으로 순서대로 시도하므로 호출 코드에서 별도 처리 불필요.

**모델 추가/변경 시 동시 수정 필요:**
- `lib/ai.ts`의 `OPENROUTER_MODELS` 배열
- `.github/workflows/ai-health-check.yml`의 `MODELS` 환경변수 (모델 deprecated 감지용)

---

## 6. 기능별 모델 오버라이드

같은 앱에서 기능마다 다른 모델을 사용하고 싶을 때:

```env
# .env.local — 기능명은 프로젝트에 맞게 변경
AI_MODEL_REPORT=x-ai/grok-4.1-fast     # 리포트 생성 (고품질)
AI_MODEL_TAGGING=openai/gpt-4o-mini    # 태그 추출 (빠름·저렴)
```

```typescript
const response = await chat({
  messages: [...],
  // 이 모델로만 시도, OpenRouter 자동 폴백 없음
  modelOverride: process.env.AI_MODEL_REPORT,
});
```

---

## 7. 시스템 프롬프트 설계 원칙

실제 운영에서 효과가 확인된 패턴입니다.

### 페르소나 + 원칙 구조

```typescript
function buildSystemPrompt(): ChatMessage {
  return {
    role: 'system',
    content: `당신은 [페르소나 설명]입니다.

## 응답 원칙
1. [원칙1] — 좋은 예: "..." / 나쁜 예: "..."
2. [원칙2]
3. [원칙3]

## 출력 형식
- 반드시 유효한 JSON만 출력 (다른 텍스트 없이)
- 한국어로 응답
- 친근한 어투 (~해요, ~네요)`,
  };
}
```

### 데이터 인용 강제 (환각 방지)

AI가 입력 데이터를 무시하고 일반적인 답변을 하는 환각을 방지합니다.

```
## 핵심 규칙
- 모든 주장에 위 데이터의 구체적 수치를 인용하세요.
  좋은 예: "투표 5번 중 4번 '혼자'를 골랐어요 — 정말 독립적이네요"
  나쁜 예: "당신은 독립적인 성향이 있어요"
- "~인 것 같아요", "~일 수도 있어요" 같은 불확실한 표현 금지
```

### 필수 키워드 체크리스트

중요한 데이터가 반드시 응답에 포함되어야 할 때:

```
## ⚠️ 필수 포함 항목 (빠지면 불합격)
- [ ] 사용자 활동 일수: 34일
- [ ] 일관성 점수: 61%

필수 키워드 (JSON 안에 이 단어들이 반드시 등장해야 함): "34일", "61%"
```

---

## 8. 성능 & 비용 팁

| 설정 | 권장값 | 이유 |
|------|--------|------|
| `temperature` | 창의적 텍스트: 0.7 / JSON 출력: 0.4 | 낮을수록 JSON 구조가 안정적 |
| `maxTokens` | 한국어 JSON 7섹션: 4000 | 한국어는 영어보다 토큰 1.5~2배 소모 |
| `timeout` | 서버 설정보다 5초 여유 | 예: 서버 60s → 클라이언트 timeout 65s |

**한국어 토큰 주의**: 한국어는 영어 대비 약 1.5~2배 토큰을 소모합니다. `maxTokens`를 영어 기준으로 설정하면 응답이 잘릴 수 있습니다.

**`jsonMode` 동작 차이**:
- `OpenAI`: `response_format: { type: 'json_object' }` 실제 전송 → 스키마 강제
- `Grok`, `OpenRouter`: 무시됨 → 프롬프트 골격 방식으로 제어해야 함

---

## 9. Rate Limit 처리 패턴

AI API는 비용이 발생하므로 사용자별 호출 횟수를 제한합니다.

```typescript
// In-memory rate limit (단일 인스턴스용)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24시간
const MAX_REQUESTS_PER_WINDOW = 3; // 24시간에 N회

function checkRateLimit(identifier: string): { allowed: boolean; resetIn?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, resetIn: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true };
}

// 식별자: 로그인 사용자 = user ID / 비로그인 = IP
const identifier = session?.user?.id
  ? `user:${session.user.id}`
  : `ip:${req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'}`;

const limit = checkRateLimit(identifier);
if (!limit.allowed) {
  return Response.json({ error: 'Too many requests' }, {
    status: 429,
    headers: { 'Retry-After': String(limit.resetIn ?? 86400) },
  });
}
```

> **주의**: In-memory는 서버 재시작·스케일아웃 시 초기화됩니다. 멀티 인스턴스 환경에서는 Redis 등 외부 저장소가 필요합니다.

---

## 10. 다른 프로젝트에 이식할 때 체크리스트

- [ ] `src/lib/ai.ts` 복사
- [ ] `src/utils/logger.ts` 복사 (없으면 `logger.warn` → `console.warn`으로 대체)
- [ ] `.env.local`에 API 키 추가 (`OPENROUTER_API_KEY` 추천)
- [ ] OpenRouter 사용 시 `NEXT_PUBLIC_APP_URL` 설정 (HTTP-Referer 헤더용)
- [ ] `OPENROUTER_MODELS` 배열에서 원하는 모델로 교체
- [ ] `.github/workflows/ai-health-check.yml` 복사 후 `MODELS` 동기화 (모델 deprecated 자동 감지)
- [ ] 기능별 모델 오버라이드가 필요하면 `AI_MODEL_{기능명}` 환경변수 추가

---

## 관련 파일 (Kemi 프로젝트 기준)

| 파일 | 역할 |
|------|------|
| `src/lib/ai.ts` | AI 통합 라이브러리 (제공자 추상화, 복사 대상) |
| `src/data/insight/stage7-ai-analysis.ts` | Stage7 전용 프롬프트 + AI 호출 예시 |
| `src/app/api/insight/ai-report/route.ts` | AI API 엔드포인트 (rate limit, 입력 새니타이즈) |
| `scripts/test-ai-insight.mjs` | AI 응답 직접 테스트 스크립트 |
| `.github/workflows/ai-health-check.yml` | OpenRouter 모델 deprecated 감지 (주간 자동) |
