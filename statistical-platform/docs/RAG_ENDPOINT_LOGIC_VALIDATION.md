# RAG Ollama Endpoint 로직 검증 가이드

**작성일**: 2025-11-14
**목적**: Ollama endpoint 설정 로직 수동 검증

---

## 📋 검증 시나리오

### Scenario 1: 명시적 Endpoint 설정 (어디서든 허용)

**설정:**
```bash
# .env.local
NEXT_PUBLIC_OLLAMA_ENDPOINT=http://my-server:11434
```

**검증 방법:**
1. 개발 서버 실행: `npm run dev`
2. 브라우저 콘솔에서 환경 확인:
   ```js
   console.log(process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT)
   // 출력: "http://my-server:11434"
   ```
3. RAG 챗봇 인터페이스 접속
4. **예상 동작**:
   - ✅ Ollama 상태: "사용 가능" 또는 "연결 실패" (서버 상태에 따라)
   - ✅ 초기화 시도함 (콘솔에 `[OllamaProvider] 초기화 시작...` 로그)
   - ✅ fetch 요청: `http://my-server:11434/api/tags`

**검증 체크리스트:**
- [ ] localhost 접속 시 Ollama 사용 가능
- [ ] LAN IP(192.168.x.x) 접속 시 Ollama 사용 가능
- [ ] Vercel 배포 후에도 Ollama 사용 가능 (서버 연결 가능 시)

---

### Scenario 2: Endpoint 없음 + Localhost

**설정:**
```bash
# .env.local
# (NEXT_PUBLIC_OLLAMA_ENDPOINT 설정 안 함)
```

**검증 방법:**
1. `npm run dev` 실행
2. **localhost:3000** 접속
3. RAG 챗봇 접속
4. **예상 동작**:
   - ✅ Ollama 상태: "사용 가능" (로컬 Ollama 실행 시)
   - ✅ fetch 요청: `http://localhost:11434/api/tags`

**검증 체크리스트:**
- [ ] localhost 접속 → Ollama 체크 시도
- [ ] 127.0.0.1 접속 → Ollama 체크 시도

---

### Scenario 3: Endpoint 없음 + 원격 (차단)

**설정:**
```bash
# .env.local
# (NEXT_PUBLIC_OLLAMA_ENDPOINT 설정 안 함)
```

**검증 방법:**

#### 3-1. LAN IP 접속
1. `npm run dev` 실행
2. LAN IP로 접속 (예: `http://192.168.0.100:3000`)
3. RAG 챗봇 접속
4. **예상 동작**:
   - ❌ Ollama 상태: "사용 불가"
   - ❌ fetch 요청 없음 (콘솔에 로그 없음)
   - ✅ 환경 인디케이터: "웹/Ollama 불가"

#### 3-2. Vercel 배포
1. Vercel에 배포
2. `https://myapp.vercel.app` 접속
3. RAG 챗봇 접속 시도
4. **예상 동작**:
   - ❌ Ollama 상태: "사용 불가"
   - ✅ 에러 메시지: "RAG 챗봇은 로컬 환경에서만 사용 가능합니다. NEXT_PUBLIC_OLLAMA_ENDPOINT를 설정하거나 localhost에서 실행해주세요."

**검증 체크리스트:**
- [ ] LAN IP 접속 → Ollama 차단
- [ ] Vercel 배포 → Ollama 차단
- [ ] 에러 메시지가 사용자 친화적
- [ ] 해결 방법 포함 (NEXT_PUBLIC_OLLAMA_ENDPOINT 설정 안내)

---

## 🔍 코드 레벨 검증

### 1. environment-detector.ts

**검증 포인트:**
```typescript
export async function checkOllamaAvailable(): Promise<boolean> {
  const ollamaEndpoint = process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT

  // ✅ 체크 1: 명시적 endpoint 설정이 있으면 체크 시도
  if (ollamaEndpoint) {
    return fetchWithRetry(`${ollamaEndpoint}/api/tags`)
  }

  // ✅ 체크 2: 환경 판단
  const env = detectEnvironment()
  if (env === 'web') {
    return false // ✅ 웹 환경에서는 차단
  }

  // ✅ 체크 3: 로컬 환경에서는 기본 localhost 체크
  return fetchWithRetry('http://localhost:11434/api/tags')
}
```

### 2. ollama-provider.ts

**검증 포인트:**
```typescript
async initialize(): Promise<void> {
  const hasExplicitEndpoint = !!process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT

  // ✅ 체크 1: endpoint 없음 + 웹 환경 → 차단
  if (!hasExplicitEndpoint && detectEnvironment() === 'web') {
    throw new Error('RAG 챗봇은 로컬 환경에서만...') // ✅ 사용자 친화적 에러
  }

  // ✅ 체크 2: 나머지는 초기화 진행
}
```

### 3. rag-chat-interface.tsx

**검증 포인트:**
```typescript
useEffect(() => {
  const checkOllama = async () => {
    const hasExplicitEndpoint = !!process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT

    // ✅ 체크 1: endpoint 없음 + 원격 → unavailable
    if (!hasExplicitEndpoint && detectEnvironment() === 'web') {
      setOllamaStatus('unavailable')
      return
    }

    // ✅ 체크 2: 나머지는 fetch 시도
    const response = await fetch(`${ollamaEndpoint}/api/tags`, ...)
  }
}, [])
```

### 4. error-handler.ts

**검증 포인트:**
```typescript
function formatUserMessage(errorMessage: string, ...): string {
  // ✅ 체크 1: Provider 메시지 감지
  if (
    errorMessage.includes('RAG 챗봇') ||
    errorMessage.includes('NEXT_PUBLIC_OLLAMA_ENDPOINT')
  ) {
    return errorMessage // ✅ 그대로 전달
  }

  // ✅ 체크 2: 일반 에러는 표준 메시지로 변환
  switch (errorType) { ... }
}
```

---

## 🧪 통합 테스트 (수동)

### 테스트 1: 로컬 개발 환경

```bash
# 1. Ollama 실행
ollama serve

# 2. 개발 서버 실행
npm run dev

# 3. 브라우저에서 확인
# → localhost:3000/statistics/t-test (예시)
# → RAG 챗봇 클릭
# → "Ollama 사용 가능" 표시 확인
```

**체크리스트:**
- [ ] Ollama 상태 표시: "사용 가능"
- [ ] 환경 인디케이터: "로컬/Ollama 사용 가능"
- [ ] 채팅 입력 가능
- [ ] 응답 정상 수신

---

### 테스트 2: LAN 접속 (원격 차단 확인)

```bash
# 1. 개발 서버 실행
npm run dev

# 2. 스마트폰/다른 PC에서 LAN IP로 접속
# 예: http://192.168.0.100:3000

# 3. RAG 챗봇 클릭
# → "Ollama 사용 불가" 표시 확인
```

**체크리스트:**
- [ ] Ollama 상태: "사용 불가"
- [ ] 환경 인디케이터: "웹/Ollama 불가"
- [ ] 채팅 입력 비활성화
- [ ] fetch 요청 없음 (네트워크 탭 확인)

---

### 테스트 3: 명시적 Endpoint + 클라우드

```bash
# 1. Vercel 환경변수 설정
NEXT_PUBLIC_OLLAMA_ENDPOINT=http://my-ollama-server:11434

# 2. Vercel에 배포
vercel --prod

# 3. 브라우저에서 확인
# → https://myapp.vercel.app
# → RAG 챗봇 클릭
# → "Ollama 사용 가능" 또는 "연결 실패" (서버 상태에 따라)
```

**체크리스트:**
- [ ] Ollama 상태: fetch 시도함
- [ ] 네트워크 탭: `http://my-ollama-server:11434/api/tags` 요청 확인
- [ ] 서버 연결 성공 시 채팅 동작

---

## 📊 검증 결과 요약

| 시나리오 | 환경변수 | 접속 URL | 예상 결과 | 실제 결과 | 상태 |
|---------|---------|---------|----------|----------|------|
| 1-1 | `ENDPOINT=server` | localhost:3000 | 사용 가능 | | ⬜ |
| 1-2 | `ENDPOINT=server` | 192.168.x.x:3000 | 사용 가능 | | ⬜ |
| 1-3 | `ENDPOINT=server` | vercel.app | 사용 가능 | | ⬜ |
| 2-1 | (없음) | localhost:3000 | 사용 가능 | | ⬜ |
| 2-2 | (없음) | 127.0.0.1:3000 | 사용 가능 | | ⬜ |
| 3-1 | (없음) | 192.168.x.x:3000 | 차단 | | ⬜ |
| 3-2 | (없음) | vercel.app | 차단 + 에러 | | ⬜ |

**범례:**
- ✅ 통과
- ❌ 실패
- ⬜ 미실행

---

## 🔧 디버깅 팁

### 콘솔 로그 확인

**브라우저 콘솔:**
```js
// 환경 확인
console.log({
  endpoint: process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT,
  hostname: window.location.hostname,
})

// 환경 감지
import { detectEnvironment } from '@/lib/utils/environment-detector'
console.log('Environment:', detectEnvironment())
```

**서버 로그:**
```
[OllamaProvider] 초기화 시작...
[OllamaProvider] Ollama 가용성 체크 (endpoint 기반)
[OllamaProvider] 모델 확인 완료:
  - 임베딩: nomic-embed-text
  - 추론: qwen2.5
```

### 네트워크 탭 확인

**예상 요청:**
1. `GET http://localhost:11434/api/tags` (기본)
2. `GET http://my-server:11434/api/tags` (명시적 endpoint)

**차단 시:**
- 요청 없음 ✅

---

## ✅ 최종 체크리스트

- [ ] Scenario 1-1, 1-2, 1-3 모두 통과
- [ ] Scenario 2-1, 2-2 모두 통과
- [ ] Scenario 3-1, 3-2 모두 통과
- [ ] 에러 메시지 사용자 친화적
- [ ] TypeScript 컴파일 에러 없음
- [ ] 콘솔 에러 없음

---

**검증 완료 서명:** _________________
**검증 일시:** _________________
