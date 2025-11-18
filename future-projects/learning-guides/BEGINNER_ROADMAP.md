# 초보자 학습 로드맵

**작성일**: 2024-11-18
**대상**: AI/RAG/LLM을 처음 접하는 개발자
**목표**: 2-3개월 내에 Agentic AI 프로젝트를 직접 구현할 수 있는 수준 도달

---

## 🎯 전체 로드맵 개요

```
Level 1 (1-2주) → Level 2 (2-3주) → Level 3 (3-4주) → Level 4 (4주+)
    AI 대화          프로세스 빌더      Agentic AI       고급 통합
   하루 10분          하루 15분          하루 20분        필요시
```

**핵심 원칙**: "프로젝트 하면서 틈틈이 배우기"
- ✅ 하루 10-20분씩만 투자
- ✅ 현재 프로젝트 코드로 학습
- ✅ AI와 대화하면서 이해
- ✅ 작은 실험 자주하기

---

## 📚 Level 1: AI와 대화 기초 (1-2주, 하루 10분)

### 목표
현재 프로젝트에서 이미 사용 중인 기술을 이해하기

### 학습 개념

| 개념 | 설명 | 학습 방법 | 실습 |
|------|------|----------|------|
| **프롬프트 엔지니어링** | AI에게 효과적으로 질문하는 법 | AI_CONVERSATION_GUIDE.md 읽기 | 현재 RAG 챗봇에 다양한 질문 시도 |
| **RAG (Retrieval-Augmented Generation)** | 검색 + 생성 조합 | AI에게 "RAG를 초보자에게 설명해줘" 질문 | 통계 플랫폼 RAG 코드 읽기 |
| **임베딩/벡터** | 텍스트를 숫자 배열로 변환 | AI에게 "임베딩이 뭐야?" 질문 | `vector-qwen3-embedding-0.6b.db` 구조 확인 |
| **로컬 LLM (Ollama)** | 클라우드 vs 로컬 차이 | Ollama 공식 문서 5분 읽기 | Ollama API 호출 테스트 |

### 주간 학습 계획 (Week 1-2)

```
월요일 (10분):
- AI_CONVERSATION_GUIDE.md 읽기
- AI에게 "프롬프트 엔지니어링이 뭐야?" 질문

화요일 (10분):
- lib/rag/rag-service.ts 파일 열기
- 코드를 읽으면서 모르는 부분 메모

수요일 (10분):
- 통계 플랫폼 실행 → RAG 챗봇에 질문
- 개발자 도구 (F12) → Network 탭 → /api/rag/query 확인

목요일 (10분):
- AI에게 "임베딩이 뭐야?" 질문
- AI에게 "벡터 검색은 어떻게 동작해?" 질문

금요일 (15분):
- public/rag-data/ 폴더 확인
- vector-qwen3-embedding-0.6b.db 파일 크기 확인
- AI에게 "768차원 벡터가 뭐야?" 질문

주말 (30분):
- Ollama 공식 문서 읽기 (https://ollama.com/)
- Ollama API로 간단한 질문 보내보기
```

### 실습 예제

#### 실습 1: RAG 동작 관찰하기
```bash
1. 통계 플랫폼 실행 (npm run dev)
2. 브라우저에서 F12 (개발자 도구)
3. Network 탭 열기
4. RAG 챗봇에 "t-검정이 뭐야?" 질문
5. /api/rag/query 요청 클릭
6. Request Payload 확인:
   {
     "query": "t-검정이 뭐야?",
     "topK": 3
   }
7. Response 확인:
   {
     "results": [...]
   }
```

#### 실습 2: Ollama API 호출
```bash
# 터미널에서 실행
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2:3b",
  "prompt": "RAG를 한 줄로 설명해줘"
}'
```

#### 실습 3: 벡터 DB 크기 확인
```bash
cd d:/Projects/Statics/statistical-platform/public/rag-data/
ls -lh

# 출력:
# rag.db (5.4 MB)
# vector-qwen3-embedding-0.6b.db (5.4 MB)
```

### 체크리스트

- [ ] RAG가 무엇인지 설명할 수 있다
- [ ] 임베딩/벡터의 개념을 이해했다
- [ ] 현재 프로젝트의 RAG 코드를 읽을 수 있다
- [ ] Ollama API를 호출할 수 있다
- [ ] 개발자 도구로 API 요청을 관찰할 수 있다

---

## 🛠️ Level 2: 프로세스 빌더 준비 (2-3주, 하루 15분)

### 목표
ReactFlow + JSON 스키마를 이해하고 간단한 UI 만들기

### 학습 개념

| 개념 | 설명 | 학습 방법 | 실습 |
|------|------|----------|------|
| **ReactFlow** | 드래그앤드롭 노드 기반 UI 라이브러리 | 공식 Quick Start 따라하기 | 2-노드 플로우 만들기 |
| **JSON Schema** | JSON 데이터 구조 정의 | `JSON_SCHEMA.json` 읽기 | 프로세스 JSON 수정하기 |
| **React 상태 관리** | useState, useCallback | React 공식 문서 읽기 | 체크리스트 만들기 |
| **File API** | 브라우저에서 파일 읽기/쓰기 | MDN 문서 읽기 | JSON 파일 저장/불러오기 |

### 주간 학습 계획 (Week 3-4)

```
월요일 (15분):
- ReactFlow 공식 문서 Quick Start 읽기
- AI에게 "ReactFlow가 뭐야?" 질문

화요일 (15분):
- ReactFlow 예제 1개 복붙해서 실행
- 노드 2개 연결해보기

수요일 (15분):
- future-projects/process-rag/JSON_SCHEMA.json 열기
- AI에게 "이 JSON Schema를 설명해줘" + 전체 내용 붙여넣기

목요일 (15분):
- 간단한 체크리스트 컴포넌트 만들기
- useState로 체크 상태 관리

금요일 (20분):
- JSON 파일 저장 코드 작성
- Blob + download 속성 사용

주말 (1시간):
- 간단한 프로세스 빌더 프로토타입 만들기
- 노드 추가 → JSON 저장 → 불러오기
```

### 실습 예제

#### 실습 1: ReactFlow 2-노드 연결
```typescript
// app/test-reactflow/page.tsx
'use client'

import ReactFlow, { Node, Edge } from 'reactflow'
import 'reactflow/dist/style.css'

const nodes: Node[] = [
  {
    id: '1',
    type: 'default',
    data: { label: '입찰 공고 작성' },
    position: { x: 100, y: 100 }
  },
  {
    id: '2',
    type: 'default',
    data: { label: '법무 검토' },
    position: { x: 100, y: 200 }
  }
]

const edges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2' }
]

export default function TestReactFlow() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow nodes={nodes} edges={edges} />
    </div>
  )
}
```

#### 실습 2: 간단한 체크리스트
```typescript
// components/simple-checklist.tsx
'use client'

import { useState } from 'react'

interface CheckItem {
  text: string
  checked: boolean
}

export function SimpleChecklist() {
  const [items, setItems] = useState<CheckItem[]>([
    { text: '입찰 공고문 작성', checked: false },
    { text: '예산 범위 확인', checked: false },
    { text: '법무팀 사전 검토', checked: false }
  ])

  const toggleItem = (index: number) => {
    const newItems = [...items]
    newItems[index].checked = !newItems[index].checked
    setItems(newItems)
  }

  return (
    <div className="space-y-2">
      <h3 className="font-bold">체크리스트</h3>
      {items.map((item, i) => (
        <label key={i} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={() => toggleItem(i)}
          />
          <span className={item.checked ? 'line-through' : ''}>
            {item.text}
          </span>
        </label>
      ))}
    </div>
  )
}
```

#### 실습 3: JSON 파일 저장/불러오기
```typescript
// 저장
function saveProcessJSON(process: ProcessDefinition) {
  const json = JSON.stringify(process, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${process.id}.json`
  a.click()

  URL.revokeObjectURL(url)
}

// 불러오기
function loadProcessJSON() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'

  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    const text = await file.text()
    const process = JSON.parse(text)
    console.log('불러온 프로세스:', process)
  }

  input.click()
}
```

### 체크리스트

- [ ] ReactFlow로 2-노드 플로우를 만들 수 있다
- [ ] JSON 파일을 저장/불러올 수 있다
- [ ] 간단한 체크리스트 컴포넌트를 만들 수 있다
- [ ] JSON Schema를 읽고 수정할 수 있다
- [ ] useState로 상태를 관리할 수 있다

---

## 🤖 Level 3: Agentic AI 이해 (3-4주, 하루 20분)

### 목표
AI가 자동으로 판단/실행하는 원리 배우기

### 학습 개념

| 개념 | 설명 | 학습 방법 | 실습 |
|------|------|----------|------|
| **프롬프트 체이닝** | 여러 단계로 나눠 AI에게 질문 | AI에게 "프롬프트 체이닝을 설명해줘" | RAG → 판단 → 실행 흐름 만들기 |
| **Function Calling** | AI가 함수 호출하도록 유도 | Ollama 문서 읽기 | "파일 찾기" 요청 |
| **Context Management** | 대화 이력 관리 | AI에게 "대화 컨텍스트 관리법" 질문 | 이전 답변 기억하기 |
| **Autonomous Agent** | 자율 실행 개념 | AGENTIC_FEATURES.md 읽기 | 간단한 자동화 스크립트 |

### 주간 학습 계획 (Week 5-6)

```
월요일 (20분):
- AI에게 "프롬프트 체이닝을 초보자에게 설명해줘" 질문
- 예제 코드 받아서 실행

화요일 (20분):
- RAG → 판단 → 실행 3단계 흐름 코드 작성
- 로컬 Ollama로 테스트

수요일 (20분):
- AI에게 "Function Calling이 뭐야?" 질문
- Ollama에 "파일 찾기" 요청 보내기

목요일 (20분):
- 대화 이력을 배열로 저장
- 이전 답변을 다음 질문에 포함

금요일 (25분):
- AGENTIC_FEATURES.md 읽기
- 간단한 자동 분기 판단 코드 작성

주말 (2시간):
- 프로토타입: 자동 분기 판단 Agent 만들기
- RAG + Ollama + 간단한 규칙
```

### 실습 예제

#### 실습 1: 프롬프트 체이닝 (3단계)
```typescript
async function autoDecideBranch(question: string): Promise<'yes' | 'no'> {
  // 1단계: RAG로 정보 수집
  const context = await ragService.query("법무 검토 기준")

  // 2단계: Ollama에 판단 요청
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2:3b',
      prompt: `
        상황: ${context}
        질문: ${question}

        "예" 또는 "아니오"로만 답하세요.
      `,
      stream: false
    })
  })

  const data = await response.json()

  // 3단계: 결과 파싱
  return data.response.includes('예') ? 'yes' : 'no'
}

// 사용
const decision = await autoDecideBranch("수정이 필요한가요?")
console.log('자동 판단 결과:', decision) // "yes" or "no"
```

#### 실습 2: 대화 이력 관리
```typescript
interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

class ConversationManager {
  private history: Message[] = []

  addMessage(role: Message['role'], content: string) {
    this.history.push({ role, content })
  }

  async chat(userMessage: string): Promise<string> {
    // 1. 사용자 메시지 추가
    this.addMessage('user', userMessage)

    // 2. Ollama에 전체 이력 전송
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        messages: this.history,
        stream: false
      })
    })

    const data = await response.json()
    const assistantMessage = data.message.content

    // 3. AI 답변 추가
    this.addMessage('assistant', assistantMessage)

    return assistantMessage
  }
}

// 사용
const manager = new ConversationManager()
await manager.chat("t-검정이 뭐야?")
await manager.chat("그럼 언제 사용해?") // 이전 대화 기억함
```

#### 실습 3: 간단한 자동 분기 판단
```typescript
// 규칙 기반 (Ollama 없이)
function autoDecideSimple(budget: number): 'yes' | 'no' {
  // 예산 1억 초과 → 법무 검토 필수
  return budget > 100_000_000 ? 'yes' : 'no'
}

// AI 기반 (Ollama 사용)
async function autoDecideWithAI(
  budget: number,
  context: string
): Promise<'yes' | 'no'> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2:3b',
      prompt: `
        예산: ${budget.toLocaleString()}원
        상황: ${context}

        법무 검토가 필요한가요?
        "예" 또는 "아니오"로만 답하세요.
      `,
      stream: false
    })
  })

  const data = await response.json()
  return data.response.includes('예') ? 'yes' : 'no'
}

// 비교 테스트
const budget = 120_000_000
console.log('규칙 기반:', autoDecideSimple(budget))
console.log('AI 기반:', await autoDecideWithAI(budget, "신규 계약 건"))
```

### 체크리스트

- [ ] 프롬프트 체이닝을 구현할 수 있다
- [ ] RAG → 판단 → 실행 흐름을 만들 수 있다
- [ ] Ollama에 복잡한 질문을 할 수 있다
- [ ] 대화 이력을 관리할 수 있다
- [ ] AGENTIC_FEATURES.md를 이해했다

---

## 🚀 Level 4: 고급 통합 (4주 이후, 필요시)

### 목표
실제 프로덕션 수준의 기능 구현

### 학습 개념

| 개념 | 설명 | 학습 방법 | 실습 |
|------|------|----------|------|
| **Vector Search 최적화** | 코사인 유사도 이해 | AI에게 "코사인 유사도를 설명해줘" | 검색 정확도 개선 |
| **Streaming Response** | 실시간 응답 출력 | Ollama streaming API 사용 | 타이핑 효과 구현 |
| **Error Handling** | AI 응답 검증 | try-catch + 응답 파싱 | 이상한 답변 필터링 |
| **Performance** | 응답 속도 개선 | 캐싱, 병렬 처리 | 3초 → 1초 단축 |

### 실습 예제

#### 실습 1: Streaming Response (타이핑 효과)
```typescript
async function streamingChat(prompt: string, onToken: (token: string) => void) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2:3b',
      prompt,
      stream: true // 스트리밍 활성화
    })
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(line => line.trim())

    for (const line of lines) {
      const data = JSON.parse(line)
      if (data.response) {
        onToken(data.response) // 토큰 하나씩 출력
      }
    }
  }
}

// 사용
await streamingChat("RAG를 설명해줘", (token) => {
  process.stdout.write(token) // 타이핑 효과
})
```

#### 실습 2: 응답 검증 및 에러 처리
```typescript
async function safeAutoDecide(question: string): Promise<'yes' | 'no'> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        prompt: `${question}\n\n"예" 또는 "아니오"로만 답하세요.`,
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API 에러: ${response.status}`)
    }

    const data = await response.json()
    const answer = data.response.trim().toLowerCase()

    // 검증: "예" 또는 "아니오"만 허용
    if (answer.includes('예') || answer.includes('yes')) {
      return 'yes'
    } else if (answer.includes('아니오') || answer.includes('no')) {
      return 'no'
    } else {
      // 이상한 답변 → 재시도 또는 기본값
      console.warn('예상치 못한 답변:', answer)
      return 'no' // 기본값
    }
  } catch (error) {
    console.error('자동 판단 실패:', error)
    return 'no' // 에러 시 안전한 기본값
  }
}
```

#### 실습 3: 캐싱으로 성능 개선
```typescript
class CachedRAGService {
  private cache = new Map<string, any>()

  async query(question: string): Promise<any> {
    // 1. 캐시 확인
    if (this.cache.has(question)) {
      console.log('캐시 히트!')
      return this.cache.get(question)
    }

    // 2. 실제 RAG 검색 (3초 소요)
    const results = await ragService.query(question)

    // 3. 캐시 저장 (다음엔 즉시 반환)
    this.cache.set(question, results)

    return results
  }
}

// 사용
const cached = new CachedRAGService()
await cached.query("t-검정이 뭐야?") // 3초
await cached.query("t-검정이 뭐야?") // 0.001초 (캐시)
```

### 체크리스트

- [ ] Streaming Response를 구현할 수 있다
- [ ] AI 응답을 검증하고 에러를 처리할 수 있다
- [ ] 캐싱으로 성능을 개선할 수 있다
- [ ] 코사인 유사도의 개념을 이해했다

---

## 📊 진행 상황 추적

### 전체 진행도

```
□□□□□□□□□□ 0%   - 시작 전
■■□□□□□□□□ 20%  - Level 1 완료
■■■■□□□□□□ 40%  - Level 2 완료
■■■■■■□□□□ 60%  - Level 3 완료
■■■■■■■■■■ 100% - Level 4 완료
```

### 주간 체크리스트

```
Week 1:
- [ ] AI_CONVERSATION_GUIDE.md 읽기
- [ ] 현재 프로젝트 RAG 코드 읽기
- [ ] 개발자 도구로 API 관찰
- [ ] Ollama API 호출 테스트

Week 2:
- [ ] RAG/임베딩/벡터 개념 이해
- [ ] Level 1 체크리스트 완료

Week 3:
- [ ] ReactFlow 예제 따라하기
- [ ] JSON Schema 읽기
- [ ] 체크리스트 컴포넌트 만들기

Week 4:
- [ ] JSON 파일 저장/불러오기
- [ ] Level 2 체크리스트 완료

Week 5:
- [ ] 프롬프트 체이닝 구현
- [ ] RAG → 판단 → 실행 흐름
- [ ] 대화 이력 관리

Week 6:
- [ ] 자동 분기 판단 프로토타입
- [ ] Level 3 체크리스트 완료
```

---

## 🎓 추천 학습 자료

### 무료 온라인 자료

1. **ReactFlow 공식 문서**
   - URL: https://reactflow.dev/
   - 추천: Quick Start, Custom Nodes

2. **Ollama 공식 문서**
   - URL: https://ollama.com/
   - 추천: API, Model Library

3. **MDN Web Docs (File API)**
   - URL: https://developer.mozilla.org/ko/docs/Web/API/File_API
   - 추천: Using files from web applications

### 현재 프로젝트 코드 (최고의 학습 자료!)

1. **RAG 시스템**
   - `lib/rag/rag-service.ts` (388줄)
   - `lib/rag/providers/ollama-provider.ts` (2,213줄)

2. **UI 컴포넌트**
   - `components/rag-assistant-compact.tsx`
   - `components/ui/*` (shadcn/ui)

3. **데이터 구조**
   - `public/rag-data/rag.db`
   - `public/rag-data/vector-qwen3-embedding-0.6b.db`

---

## 💡 학습 팁

### Tip 1: 완벽주의 버리기
```
❌ "모든 개념을 100% 이해하고 넘어가야지"
✅ "70% 이해했으면 일단 실습하고, 나중에 다시 복습하자"
```

### Tip 2: AI와 대화하면서 배우기
```
❌ "문서를 다 읽고 질문해야지"
✅ "모르는 거 바로바로 AI에게 물어보자"
```

### Tip 3: 작은 실험 자주하기
```
❌ "완벽한 프로토타입을 만들어야지"
✅ "10줄짜리 코드로 일단 동작 확인"
```

### Tip 4: 현재 프로젝트 코드 활용
```
❌ "새로운 프로젝트를 만들어서 연습해야지"
✅ "현재 프로젝트 코드를 읽고 수정하면서 배우자"
```

---

## 🚀 다음 단계

Level을 완료하면 다음 문서를 읽어보세요!

- **Level 1 완료** → [AI_CONVERSATION_GUIDE.md](./AI_CONVERSATION_GUIDE.md)
- **Level 2 완료** → [PRACTICAL_EXERCISES.md](./PRACTICAL_EXERCISES.md)
- **Level 3 완료** → [../process-rag/AGENTIC_FEATURES.md](../process-rag/AGENTIC_FEATURES.md)
- **Level 4 완료** → 실제 프로젝트 구현 시작!

---

**작성자**: Claude Code
**최종 업데이트**: 2024-11-18
**다음 읽을 문서**: [AI_CONVERSATION_GUIDE.md](./AI_CONVERSATION_GUIDE.md)
