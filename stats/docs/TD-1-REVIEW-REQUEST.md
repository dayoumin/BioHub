# TD-1: OpenRouter API Key Security — Code Review Request

## 문제 (Before)

`NEXT_PUBLIC_OPENROUTER_API_KEY`가 Next.js Static Export 번들에 하드코딩되어 배포된 JS에서 API 키 추출 가능 → 과금 위험.

```
브라우저 → fetch('https://openrouter.ai/api/v1/...', { Authorization: Bearer EXPOSED_KEY })
```

## 해결 (After)

Cloudflare Worker를 프록시로 추가하여 API 키를 서버(Worker secrets)에만 보관.

```
브라우저 → fetch('/api/ai/...', { no auth header })
         → Worker (adds Authorization from secrets)
         → OpenRouter
```

## 아키텍처

- **배포 방식**: Cloudflare Workers + Static Assets (wrangler.toml 기반)
- **프레임워크**: Next.js 15, `output: 'export'` (정적 HTML/JS/CSS)
- **기존 구조**: `wrangler.toml`의 `[assets]` 블록이 Static Assets 서빙
- **변경**: Worker 코드(`src/worker.ts`)가 요청을 먼저 받아 라우팅

## 듀얼 모드 (dev/prod)

| | 로컬 개발 | 프로덕션 |
|---|---|---|
| API 키 | `.env.local`에 설정 | Worker secrets (`wrangler secret put`) |
| baseUrl | `https://openrouter.ai/api/v1` (직접) | `/api/ai` (프록시) |
| Authorization 헤더 | 클라이언트가 추가 | Worker가 추가 |
| 판단 기준 | `NEXT_PUBLIC_OPENROUTER_API_KEY` 존재 여부 | 동일 |

---

## 변경 파일 목록 (TD-1 관련만)

| 파일 | 상태 | 핵심 변경 |
|------|------|-----------|
| `src/worker.ts` | **신규** | Worker 프록시 (179줄) |
| `wrangler.toml` | 수정 | `main` + `binding` 추가 |
| `stats/lib/services/openrouter-recommender.ts` | 수정 | 듀얼 모드 baseUrl + buildHeaders() |
| `.github/workflows/deploy.yml` | 수정 | API 키 빌드 env 제거 |
| `stats/.env.local.example` | 수정 | 설명 업데이트 |
| `stats/.env.online.example` | 수정 | API 키 항목 제거, Worker secrets 안내 |

---

## 파일 1: `src/worker.ts` (신규, 179줄)

```typescript
/**
 * BioHub Cloudflare Worker — OpenRouter API 프록시
 *
 * 클라이언트 번들에서 API 키를 제거하고, Worker secrets로 서버에만 보관.
 * /api/ai/* 요청을 OpenRouter에 중계하며, 나머지는 Static Assets 서빙.
 *
 * 보안:
 * - Origin 검증: 같은 도메인에서만 프록시 허용
 * - Rate limit: IP당 분당 30회 제한
 * - 경로 화이트리스트: /chat/completions, /models만 허용
 */

interface Env {
  ASSETS: Fetcher
  OPENROUTER_API_KEY: string
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

/** 허용된 OpenRouter 경로 (화이트리스트) */
const ALLOWED_PATHS: ReadonlySet<string> = new Set([
  '/chat/completions',
  '/models',
])

/** Rate limit: IP당 분당 최대 요청 수 */
const RATE_LIMIT_MAX = 30
const RATE_LIMIT_WINDOW_MS = 60_000

/** IP별 요청 카운터 (Worker 인스턴스 메모리, 리스타트 시 초기화) */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

/** 주기적 정리: 만료된 엔트리 제거 (메모리 누수 방지) */
function cleanupRateLimitMap(): void {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now >= entry.resetAt) {
      rateLimitMap.delete(ip)
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // /api/ai/* → OpenRouter 프록시
    if (url.pathname.startsWith('/api/ai/') || url.pathname === '/api/ai') {
      return handleOpenRouterProxy(request, env, url)
    }

    // 그 외 → Static Assets (기존 동작)
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>

/**
 * OpenRouter API 프록시
 * - Origin 검증 (same-site만 허용)
 * - IP 기반 rate limiting
 * - 클라이언트 body를 그대로 전달
 * - Worker가 Authorization 헤더 추가
 * - 스트리밍(SSE) 응답은 body pass-through
 */
async function handleOpenRouterProxy(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  // Origin 검증: 같은 도메인에서만 허용
  const origin = request.headers.get('Origin')
  const referer = request.headers.get('Referer')
  const requestHost = url.host

  // Origin 또는 Referer가 있으면 같은 호스트인지 확인
  // (curl 등 헤더 없는 요청도 차단)
  if (origin) {
    const originHost = new URL(origin).host
    if (originHost !== requestHost) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }
  } else if (referer) {
    const refererHost = new URL(referer).host
    if (refererHost !== requestHost) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }
  } else {
    // Origin도 Referer도 없는 요청 (curl, Postman 등) 차단
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  // Rate limit 검사
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown'
  if (!checkRateLimit(clientIp)) {
    // 100회마다 만료 엔트리 정리
    cleanupRateLimitMap()
    return jsonResponse(
      { error: 'Rate limit exceeded. Try again later.' },
      429
    )
  }

  // /api/ai/chat/completions → /chat/completions
  const subPath = url.pathname.replace(/^\/api\/ai/, '')

  // 화이트리스트 검증
  if (!ALLOWED_PATHS.has(subPath)) {
    return jsonResponse({ error: 'Not found' }, 404)
  }

  // API 키 검증
  if (!env.OPENROUTER_API_KEY) {
    return jsonResponse({ error: 'API key not configured' }, 500)
  }

  const targetUrl = `${OPENROUTER_BASE}${subPath}`

  // 클라이언트 헤더 중 전달할 것만 선별
  const proxyHeaders = new Headers()
  proxyHeaders.set('Authorization', `Bearer ${env.OPENROUTER_API_KEY}`)
  proxyHeaders.set('Content-Type', request.headers.get('Content-Type') || 'application/json')

  // 클라이언트가 보낸 HTTP-Referer/X-Title 전달 (OpenRouter 대시보드 표시용)
  const httpReferer = request.headers.get('HTTP-Referer')
  if (httpReferer) {
    proxyHeaders.set('HTTP-Referer', httpReferer)
  }
  const xTitle = request.headers.get('X-Title')
  if (xTitle) {
    proxyHeaders.set('X-Title', xTitle)
  }

  // OpenRouter에 요청 전달
  const openRouterResponse = await fetch(targetUrl, {
    method: request.method,
    headers: proxyHeaders,
    body: request.method !== 'GET' ? request.body : undefined,
  })

  // 응답 헤더 구성
  const responseHeaders = new Headers()
  responseHeaders.set('Content-Type', openRouterResponse.headers.get('Content-Type') || 'application/json')

  // 스트리밍(SSE) 응답 처리
  if (openRouterResponse.headers.get('Content-Type')?.includes('text/event-stream')) {
    responseHeaders.set('Cache-Control', 'no-cache')
    responseHeaders.set('Connection', 'keep-alive')
  }

  return new Response(openRouterResponse.body, {
    status: openRouterResponse.status,
    headers: responseHeaders,
  })
}

function jsonResponse(body: Record<string, string>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

### 리뷰 포인트

1. **Origin 검증**: `Origin` 또는 `Referer` 헤더로 same-site 확인. 둘 다 없으면 차단. 이 방식의 우회 가능성?
2. **Rate limit**: Worker 인스턴스 메모리 기반 (Map). Worker 재시작 시 초기화됨. 분산 환경에서의 한계? (Cloudflare Workers는 요청마다 isolate가 달라질 수 있음)
3. **cleanup 타이밍**: `cleanupRateLimitMap()`이 rate limit 초과 시에만 호출됨 (주석은 "100회마다"라고 되어 있지만 코드는 매번). 더 나은 전략?
4. **경로 화이트리스트**: `/chat/completions`과 `/models`만 허용. 향후 확장 시 관리 방법?
5. **SSE 스트리밍**: `response.body` pass-through로 처리. `Connection: keep-alive`는 Cloudflare Workers에서 의미 있는지?
6. **에러 처리**: OpenRouter가 5xx 반환 시 클라이언트에 그대로 전달. 에러 정보 누출 위험?
7. **`new URL()` 예외**: `origin`이나 `referer`가 잘못된 URL이면 예외 발생 → 500 에러. try-catch 필요?

---

## 파일 2: `stats/lib/services/openrouter-recommender.ts` (수정 부분)

### 변경 1: Constructor — 듀얼 모드 baseUrl

```typescript
// Before:
this.config = {
  apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '',
  models,
  baseUrl: 'https://openrouter.ai/api/v1',  // 항상 직접 호출
  ...
}

// After:
const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || ''
this.config = {
  apiKey,
  models,
  // 프로덕션: API 키 없음 → Worker 프록시 경유 (/api/ai)
  // 로컬 dev: API 키 있음 → OpenRouter 직접 호출
  baseUrl: apiKey ? 'https://openrouter.ai/api/v1' : '/api/ai',
  ...
}
```

### 변경 2: `buildHeaders()` 신규 메서드 (4곳 중복 제거)

```typescript
// Before: 4곳에 동일한 헤더 블록 반복
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${this.config.apiKey}`,  // 항상 포함
  'HTTP-Referer': ...,
  'X-Title': 'Statistical Analysis Platform'
}

// After: 공통 메서드, Authorization 조건부
private buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    'X-Title': 'Statistical Analysis Platform'
  }
  if (this.config.apiKey) {
    headers['Authorization'] = `Bearer ${this.config.apiKey}`
  }
  return headers
}
```

### 변경 3: Health check — hasValidKey 로직

```typescript
// Before:
const hasApiKey = !!this.config.apiKey && this.config.apiKey !== 'your_openrouter_api_key_here'
// 문제: 프록시 모드(apiKey='')면 hasApiKey=false → 항상 비활성화

// After:
const hasValidKey = !this.config.apiKey || this.config.apiKey !== 'your_openrouter_api_key_here'
// 프록시 모드(apiKey=''): !'' = true → 패스 (Worker가 키 추가)
// 직접 모드(apiKey='sk-or-...'): false || true → true
// placeholder(apiKey='your_openrouter_api_key_here'): false || false → false
```

### 변경 4: Health check fetch — 조건부 Authorization

```typescript
// Before:
const res = await fetch(`${this.config.baseUrl}/models`, {
  headers: { 'Authorization': `Bearer ${this.config.apiKey}` },  // 빈 키도 전송
  ...
})

// After:
const headers: Record<string, string> = {}
if (this.config.apiKey) {
  headers['Authorization'] = `Bearer ${this.config.apiKey}`
}
const res = await fetch(`${this.config.baseUrl}/models`, { headers, ... })
```

### 리뷰 포인트

1. **듀얼 모드 판단**: `apiKey` 존재 여부만으로 dev/prod 구분. 이 방식의 엣지 케이스? (예: 프로덕션에서 실수로 API 키 설정)
2. **`buildHeaders()`의 `window` 체크**: SSR 환경이 아닌 Static Export이므로 `typeof window !== 'undefined'`는 항상 true. 불필요한 체크?
3. **hasValidKey 3항 로직**: `!apiKey || apiKey !== placeholder` — 가독성은 충분한가?
4. **싱글톤 패턴**: `export const openRouterRecommender = new OpenRouterRecommender()` — 모듈 로드 시 constructor 실행. 환경변수 로드 타이밍 이슈?

---

## 파일 3: `wrangler.toml` (수정)

```toml
# Before:
name = "biohub"
account_id = "57140ab2a81a65bf7507b8de95334a06"
compatibility_date = "2026-02-19"

[assets]
directory = "./stats/out"
not_found_handling = "single-page-application"
html_handling = "auto-trailing-slash"

# After (추가된 줄):
main = "src/worker.ts"          # Worker 코드 진입점
# ...
binding = "ASSETS"              # Worker에서 env.ASSETS로 접근
```

---

## 파일 4: `.github/workflows/deploy.yml` (수정)

```yaml
# Before:
env:
  NEXT_PUBLIC_TURSO_URL: ${{ secrets.NEXT_PUBLIC_TURSO_URL }}
  NEXT_PUBLIC_TURSO_AUTH_TOKEN: ${{ secrets.NEXT_PUBLIC_TURSO_AUTH_TOKEN }}
  NEXT_PUBLIC_OPENROUTER_API_KEY: ${{ secrets.NEXT_PUBLIC_OPENROUTER_API_KEY }}  # 번들에 포함!
  NEXT_PUBLIC_OPENROUTER_MODEL: ${{ secrets.NEXT_PUBLIC_OPENROUTER_MODEL }}

# After:
env:
  NEXT_PUBLIC_TURSO_URL: ${{ secrets.NEXT_PUBLIC_TURSO_URL }}
  NEXT_PUBLIC_TURSO_AUTH_TOKEN: ${{ secrets.NEXT_PUBLIC_TURSO_AUTH_TOKEN }}
  # OPENROUTER_API_KEY는 Worker secrets로 이동 (번들 미포함)
  # npx wrangler secret put OPENROUTER_API_KEY 으로 1회 등록
  NEXT_PUBLIC_OPENROUTER_MODEL: ${{ secrets.NEXT_PUBLIC_OPENROUTER_MODEL }}
```

### 리뷰 포인트

- `NEXT_PUBLIC_TURSO_AUTH_TOKEN`도 동일한 노출 패턴 (Static Export 번들 포함). 이건 범위 밖이지만 인지 필요.

---

## 검증 결과

- `npx wrangler deploy --dry-run` → 성공 (3.73 KiB)
- OpenRouter/LLM 관련 테스트 41건 전체 통과
- 배포 전 필요: `npx wrangler secret put OPENROUTER_API_KEY` (1회)

## 알려진 한계

1. **Rate limit은 인스턴스 메모리**: Cloudflare Workers isolate 간 공유 안 됨 → 분산 환경에서 정확한 제한 불가
2. **Origin/Referer 우회**: 공격자가 헤더를 조작하면 우회 가능 (하지만 API 키 자체는 노출되지 않으므로 직접 OpenRouter 호출보다 안전)
3. **`NEXT_PUBLIC_TURSO_AUTH_TOKEN`**: 여전히 번들에 포함됨 (TD-1 범위 밖, 후속 처리 필요)

## 요청 사항

1. 보안 관점: 빠뜨린 공격 벡터가 있는지?
2. Cloudflare Workers 관점: Workers 런타임 특성을 고려할 때 문제될 부분?
3. 코드 품질: 불필요한 코드, 개선 가능한 패턴?
4. 엣지 케이스: 놓친 시나리오?
