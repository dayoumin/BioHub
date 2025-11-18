# 실습 예제 모음

**작성일**: 2024-11-18
**대상**: 코드를 직접 작성하면서 배우고 싶은 분
**목표**: 현재 프로젝트를 활용한 실전 실습

---

## 🎯 실습 구성

총 12개 실습 (Level 1~4, 각 3개씩)

```
Level 1 (기초): RAG 시스템 분석
Level 2 (빌더): 프로세스 JSON + UI
Level 3 (Agentic): 자동 판단 + 대화
Level 4 (고급): 성능 + 에러 처리
```

**권장 순서**: 1 → 2 → 3 → ... → 12

---

## 📚 Level 1 실습: RAG 시스템 분석

### 실습 1-1: RAG API 관찰하기 ⭐ (15분)

**목표**: 현재 프로젝트의 RAG가 어떻게 동작하는지 이해하기

**단계**:
```bash
1. 통계 플랫폼 실행
   cd d:/Projects/Statics/statistical-platform
   npm run dev

2. 브라우저에서 http://localhost:3000 열기

3. F12 (개발자 도구) → Network 탭

4. RAG 챗봇에 "t-검정이 뭐야?" 질문

5. /api/rag/query 요청 클릭 → Payload 확인

6. Response 확인 → 어떤 데이터가 오는지 관찰
```

**체크리스트**:
- [ ] Request Payload에 `query`, `topK` 필드가 있는가?
- [ ] Response에 `results` 배열이 있는가?
- [ ] 각 result에 `content`, `metadata` 필드가 있는가?

**추가 실험**:
- 다른 질문도 던져보기 ("ANOVA가 뭐야?")
- `topK` 값을 바꾸면 어떻게 되는지 확인 (코드 수정)

---

### 실습 1-2: 벡터 DB 구조 탐색 ⭐ (10분)

**목표**: SQLite 벡터 DB의 구조 이해하기

**준비**:
```bash
# SQLite 설치 (Windows)
# https://www.sqlite.org/download.html
# sqlite-tools-win32-x86-*.zip 다운로드 → 압축 풀기

# 또는 온라인 도구 사용
# https://sqliteonline.com/
```

**단계**:
```bash
1. public/rag-data/ 폴더 열기

2. rag.db 파일 확인
   - 크기: 5.4 MB
   - 테이블: documents, chunks

3. vector-qwen3-embedding-0.6b.db 파일 확인
   - 크기: 5.4 MB
   - 테이블: embeddings

4. (선택) SQLite로 열어서 데이터 확인
   sqlite3 rag.db
   .tables
   SELECT COUNT(*) FROM chunks;
   SELECT * FROM chunks LIMIT 1;
```

**체크리스트**:
- [ ] rag.db와 vector DB가 분리되어 있는가?
- [ ] chunks 테이블에 몇 개의 행이 있는가?
- [ ] embeddings 테이블의 vector 필드 타입은?

---

### 실습 1-3: Ollama API 호출 테스트 ⭐ (15분)

**목표**: 로컬 Ollama와 대화해보기

**준비**:
```bash
# Ollama 설치 확인
ollama list

# 모델 다운로드 (없으면)
ollama pull llama3.2:3b
```

**방법 1: curl 명령어**
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2:3b",
  "prompt": "RAG를 한 줄로 설명해줘",
  "stream": false
}'
```

**방법 2: JavaScript (브라우저 콘솔)**
```javascript
// F12 → Console 탭
fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'llama3.2:3b',
    prompt: 'RAG를 한 줄로 설명해줘',
    stream: false
  })
})
.then(res => res.json())
.then(data => console.log(data.response))
```

**체크리스트**:
- [ ] Ollama 서버가 실행 중인가? (http://localhost:11434)
- [ ] 응답이 한글로 나오는가?
- [ ] 답변이 이해 가능한가?

**추가 실험**:
- 다른 질문도 해보기
- `temperature` 파라미터 조정 (0.0 ~ 1.0)

---

## 🛠️ Level 2 실습: 프로세스 빌더

### 실습 2-1: 간단한 프로세스 JSON 만들기 ⭐ (20분)

**목표**: JSON Schema를 이해하고 직접 프로세스 정의 작성하기

**단계**:
```typescript
// my-first-process.json
{
  "id": "test-process-v1.0",
  "name": "나의 첫 프로세스",
  "department": "테스트팀",
  "createdBy": "홍길동",
  "version": "1.0",
  "createdAt": "2024-11-18T09:00:00Z",
  "description": "간단한 테스트 프로세스",
  "tags": ["테스트", "연습"],
  "steps": [
    {
      "id": "step-1",
      "type": "task",
      "title": "문서 작성",
      "description": "보고서를 작성합니다",
      "checklist": [
        { "text": "제목 작성", "required": true },
        { "text": "본문 작성", "required": true },
        { "text": "검토 요청", "required": false }
      ],
      "files": [
        { "name": "보고서", "format": "DOCX", "required": true }
      ],
      "nextSteps": ["step-2"],
      "estimated": "1시간"
    },
    {
      "id": "step-2",
      "type": "task",
      "title": "검토 완료",
      "description": "검토를 완료합니다",
      "checklist": [
        { "text": "오타 확인", "required": true },
        { "text": "승인", "required": true }
      ],
      "nextSteps": [],
      "estimated": "30분"
    }
  ]
}
```

**검증**:
```bash
# JSON 문법 검증
1. https://jsonlint.com/ 에서 붙여넣기
2. Validate 클릭
3. 에러 없으면 성공!
```

**체크리스트**:
- [ ] JSON 문법이 올바른가?
- [ ] 필수 필드가 모두 있는가? (id, name, version, steps)
- [ ] steps 배열에 2개 이상의 단계가 있는가?

**추가 과제**:
- 조건 분기 추가 (type: "branch")
- 3개 이상의 단계 만들기
- changelog 추가

---

### 실습 2-2: 체크리스트 컴포넌트 만들기 ⭐ (30분)

**목표**: React로 간단한 체크리스트 UI 구현하기

**파일 생성**: `components/simple-checklist.tsx`
```typescript
'use client'

import { useState } from 'react'

interface CheckItem {
  text: string
  checked: boolean
  required: boolean
}

export function SimpleChecklist() {
  const [items, setItems] = useState<CheckItem[]>([
    { text: '입찰 공고문 작성', checked: false, required: true },
    { text: '예산 범위 확인', checked: false, required: true },
    { text: '법무팀 사전 검토', checked: false, required: false }
  ])

  const toggleItem = (index: number) => {
    const newItems = [...items]
    newItems[index].checked = !newItems[index].checked
    setItems(newItems)
  }

  const completedCount = items.filter(item => item.checked).length
  const requiredCount = items.filter(item => item.required && !item.checked).length

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-bold mb-2">체크리스트</h3>

      {/* 진행률 */}
      <div className="mb-4 text-sm text-gray-600">
        진행률: {completedCount}/{items.length} ({Math.round(completedCount/items.length*100)}%)
        {requiredCount > 0 && (
          <span className="text-red-500 ml-2">
            필수 항목 {requiredCount}개 미완료
          </span>
        )}
      </div>

      {/* 체크리스트 */}
      <div className="space-y-2">
        {items.map((item, i) => (
          <label key={i} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleItem(i)}
              className="w-4 h-4"
            />
            <span className={item.checked ? 'line-through text-gray-500' : ''}>
              {item.text}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </span>
          </label>
        ))}
      </div>

      {/* 완료 버튼 */}
      <button
        disabled={requiredCount > 0}
        className={`mt-4 px-4 py-2 rounded ${
          requiredCount > 0
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        다음 단계로
      </button>
    </div>
  )
}
```

**테스트 페이지**: `app/test-checklist/page.tsx`
```typescript
import { SimpleChecklist } from '@/components/simple-checklist'

export default function TestChecklistPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">체크리스트 테스트</h1>
      <SimpleChecklist />
    </div>
  )
}
```

**실행**:
```bash
npm run dev
# http://localhost:3000/test-checklist 접속
```

**체크리스트**:
- [ ] 체크박스 클릭 시 상태가 바뀌는가?
- [ ] 진행률이 정확하게 표시되는가?
- [ ] 필수 항목 미완료 시 버튼이 비활성화되는가?

---

### 실습 2-3: JSON 파일 저장/불러오기 ⭐ (25분)

**목표**: 브라우저에서 JSON 파일 다운로드 및 업로드 구현

**파일 생성**: `components/json-file-manager.tsx`
```typescript
'use client'

import { useState } from 'react'

interface ProcessDefinition {
  id: string
  name: string
  version: string
  steps: any[]
}

export function JsonFileManager() {
  const [process, setProcess] = useState<ProcessDefinition | null>(null)

  // 저장
  const saveJSON = () => {
    if (!process) {
      alert('프로세스가 없습니다')
      return
    }

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
  const loadJSON = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const text = await file.text()
      const data = JSON.parse(text)
      setProcess(data)
    }

    input.click()
  }

  // 테스트 데이터 생성
  const createTestProcess = () => {
    setProcess({
      id: 'test-process-v1.0',
      name: '테스트 프로세스',
      version: '1.0',
      steps: [
        { id: 'step-1', title: '단계 1' },
        { id: 'step-2', title: '단계 2' }
      ]
    })
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-bold mb-4">JSON 파일 관리</h3>

      <div className="space-x-2 mb-4">
        <button
          onClick={createTestProcess}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          테스트 데이터 생성
        </button>

        <button
          onClick={saveJSON}
          disabled={!process}
          className={`px-4 py-2 rounded ${
            process
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          JSON 저장
        </button>

        <button
          onClick={loadJSON}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          JSON 불러오기
        </button>
      </div>

      {process && (
        <div>
          <h4 className="font-semibold mb-2">현재 프로세스:</h4>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-64 text-sm">
            {JSON.stringify(process, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
```

**실행**:
```bash
# test-checklist/page.tsx에 추가
import { JsonFileManager } from '@/components/json-file-manager'

// ...
<JsonFileManager />
```

**체크리스트**:
- [ ] "테스트 데이터 생성" 버튼이 동작하는가?
- [ ] "JSON 저장" 시 파일이 다운로드되는가?
- [ ] "JSON 불러오기" 시 파일 선택 창이 뜨는가?
- [ ] 불러온 데이터가 화면에 표시되는가?

---

## 🤖 Level 3 실습: Agentic AI

### 실습 3-1: 프롬프트 체이닝 구현 ⭐ (30분)

**목표**: RAG → 판단 → 실행 3단계 흐름 만들기

**파일 생성**: `lib/auto-decision.ts`
```typescript
// 1단계: RAG로 정보 수집
async function collectContext(topic: string): Promise<string> {
  const response = await fetch('/api/rag/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: topic,
      topK: 3
    })
  })

  const data = await response.json()
  return data.results.map((r: any) => r.content).join('\n\n')
}

// 2단계: Ollama로 판단
async function makeDecision(
  context: string,
  question: string
): Promise<'yes' | 'no'> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2:3b',
      prompt: `
상황:
${context}

질문: ${question}

"예" 또는 "아니오"로만 답하세요.
      `.trim(),
      stream: false
    })
  })

  const data = await response.json()
  const answer = data.response.toLowerCase()

  return answer.includes('예') || answer.includes('yes') ? 'yes' : 'no'
}

// 3단계: 통합 (프롬프트 체이닝)
export async function autoDecideBranch(question: string): Promise<'yes' | 'no'> {
  console.log('1단계: RAG로 정보 수집 중...')
  const context = await collectContext('법무 검토 기준')

  console.log('2단계: Ollama로 판단 중...')
  const decision = await makeDecision(context, question)

  console.log('3단계: 결과 반환:', decision)
  return decision
}
```

**테스트 코드**:
```typescript
// app/test-auto-decision/page.tsx
'use client'

import { useState } from 'react'
import { autoDecideBranch } from '@/lib/auto-decision'

export default function TestAutoDecisionPage() {
  const [question, setQuestion] = useState('수정이 필요한가요?')
  const [result, setResult] = useState<'yes' | 'no' | null>(null)
  const [loading, setLoading] = useState(false)

  const handleDecide = async () => {
    setLoading(true)
    setResult(null)

    try {
      const decision = await autoDecideBranch(question)
      setResult(decision)
    } catch (error) {
      console.error(error)
      alert('에러 발생!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">자동 분기 판단 테스트</h1>

      <div className="space-y-4">
        <div>
          <label className="block font-semibold mb-2">질문:</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button
          onClick={handleDecide}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          {loading ? '판단 중...' : '자동 판단'}
        </button>

        {result && (
          <div className={`p-4 rounded ${
            result === 'yes' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <strong>판단 결과:</strong> {result === 'yes' ? '예' : '아니오'}
          </div>
        )}
      </div>
    </div>
  )
}
```

**체크리스트**:
- [ ] RAG 검색이 동작하는가?
- [ ] Ollama 응답이 오는가?
- [ ] "예" 또는 "아니오"로 판단되는가?

---

### 실습 3-2: 대화 이력 관리 ⭐ (25분)

**목표**: AI와 대화할 때 이전 대화를 기억하게 만들기

**파일 생성**: `lib/conversation-manager.ts`
```typescript
interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class ConversationManager {
  private history: Message[] = []

  constructor(systemPrompt?: string) {
    if (systemPrompt) {
      this.history.push({ role: 'system', content: systemPrompt })
    }
  }

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

  getHistory(): Message[] {
    return [...this.history]
  }

  clear() {
    this.history = []
  }
}
```

**테스트 코드**:
```typescript
// app/test-conversation/page.tsx
'use client'

import { useState, useRef } from 'react'
import { ConversationManager } from '@/lib/conversation-manager'

export default function TestConversationPage() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const managerRef = useRef(
    new ConversationManager('너는 통계 전문가야. 친절하게 설명해줘.')
  )

  const handleSend = async () => {
    if (!input.trim()) return

    setLoading(true)
    const userMessage = input
    setInput('')

    try {
      const response = await managerRef.current.chat(userMessage)
      setMessages(managerRef.current.getHistory())
    } catch (error) {
      console.error(error)
      alert('에러 발생!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">대화 이력 관리 테스트</h1>

      {/* 메시지 목록 */}
      <div className="border rounded p-4 mb-4 h-96 overflow-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-3 ${
            msg.role === 'user' ? 'text-right' : 'text-left'
          }`}>
            <div className={`inline-block px-4 py-2 rounded ${
              msg.role === 'user'
                ? 'bg-blue-500 text-white'
                : msg.role === 'assistant'
                ? 'bg-gray-200'
                : 'bg-yellow-100'
            }`}>
              <strong>{msg.role}:</strong> {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* 입력 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="메시지를 입력하세요..."
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          {loading ? '전송 중...' : '전송'}
        </button>
      </div>
    </div>
  )
}
```

**테스트 시나리오**:
```
1. "t-검정이 뭐야?" 질문
2. "그럼 언제 사용해?" 질문 (이전 대화 기억하는지 확인)
3. "예시 하나 들어줘" 질문
```

**체크리스트**:
- [ ] 이전 대화를 기억하는가?
- [ ] 대화 이력이 화면에 표시되는가?
- [ ] Enter 키로 전송 가능한가?

---

### 실습 3-3: 규칙 기반 vs AI 기반 비교 ⭐ (20분)

**목표**: 간단한 규칙과 AI 판단의 차이 체험하기

**파일 생성**: `lib/decision-comparison.ts`
```typescript
// 규칙 기반 (빠르지만 유연하지 않음)
export function ruleBasedDecision(budget: number): 'yes' | 'no' {
  // 예산 1억 초과 → 법무 검토 필수
  return budget > 100_000_000 ? 'yes' : 'no'
}

// AI 기반 (느리지만 유연함)
export async function aiBasedDecision(
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
      `.trim(),
      stream: false
    })
  })

  const data = await response.json()
  const answer = data.response.toLowerCase()

  return answer.includes('예') || answer.includes('yes') ? 'yes' : 'no'
}
```

**테스트 코드**:
```typescript
// 직접 테스트
import { ruleBasedDecision, aiBasedDecision } from '@/lib/decision-comparison'

// 테스트 케이스 1: 예산 1억 2천만원
const budget1 = 120_000_000
console.log('규칙 기반:', ruleBasedDecision(budget1)) // "yes"
console.log('AI 기반:', await aiBasedDecision(budget1, "신규 계약 건"))

// 테스트 케이스 2: 예산 8천만원 (하지만 복잡한 계약)
const budget2 = 80_000_000
console.log('규칙 기반:', ruleBasedDecision(budget2)) // "no"
console.log('AI 기반:', await aiBasedDecision(budget2, "복잡한 국제 계약, 특허 포함"))
// → AI는 "yes"를 선택할 수도!
```

**체크리스트**:
- [ ] 규칙 기반이 더 빠른가?
- [ ] AI 기반이 맥락을 고려하는가?
- [ ] 어느 상황에 어떤 방법이 적합한지 이해했는가?

---

## 🚀 Level 4 실습: 고급 통합

### 실습 4-1: Streaming Response (타이핑 효과) ⭐ (35분)

**목표**: AI 응답을 실시간으로 한 글자씩 출력하기

**파일 생성**: `lib/streaming-chat.ts`
```typescript
export async function streamingChat(
  prompt: string,
  onToken: (token: string) => void,
  onComplete: () => void
) {
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
      try {
        const data = JSON.parse(line)
        if (data.response) {
          onToken(data.response)
        }
      } catch (e) {
        // JSON 파싱 에러 무시
      }
    }
  }

  onComplete()
}
```

**테스트 코드**:
```typescript
// app/test-streaming/page.tsx
'use client'

import { useState } from 'react'
import { streamingChat } from '@/lib/streaming-chat'

export default function TestStreamingPage() {
  const [prompt, setPrompt] = useState('RAG를 자세히 설명해줘')
  const [response, setResponse] = useState('')
  const [streaming, setStreaming] = useState(false)

  const handleStream = async () => {
    setResponse('')
    setStreaming(true)

    await streamingChat(
      prompt,
      (token) => {
        setResponse(prev => prev + token) // 토큰 하나씩 추가
      },
      () => {
        setStreaming(false) // 완료
      }
    )
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Streaming Response 테스트</h1>

      <div className="space-y-4">
        <div>
          <label className="block font-semibold mb-2">질문:</label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button
          onClick={handleStream}
          disabled={streaming}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          {streaming ? '응답 중...' : '질문하기'}
        </button>

        {response && (
          <div className="border rounded p-4 bg-gray-50">
            <div className="whitespace-pre-wrap">{response}</div>
            {streaming && <span className="animate-pulse">▊</span>}
          </div>
        )}
      </div>
    </div>
  )
}
```

**체크리스트**:
- [ ] 타이핑 효과가 보이는가?
- [ ] 깜박이는 커서(▊)가 표시되는가?
- [ ] 완료 후 커서가 사라지는가?

---

### 실습 4-2: 에러 처리 및 응답 검증 ⭐ (25분)

**목표**: AI 응답이 이상할 때 대처하기

**파일 생성**: `lib/safe-auto-decision.ts`
```typescript
export async function safeAutoDecide(
  question: string,
  maxRetries: number = 2
): Promise<'yes' | 'no'> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2:3b',
          prompt: `${question}\n\n"예" 또는 "아니오"로만 답하세요.`,
          stream: false
        }),
        signal: AbortSignal.timeout(10000) // 10초 타임아웃
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
        console.warn(`예상치 못한 답변 (${attempt + 1}/${maxRetries}):`, answer)
        if (attempt === maxRetries - 1) {
          // 최종 재시도 실패 → 기본값
          console.error('최종 재시도 실패, 기본값 반환: no')
          return 'no'
        }
        // 재시도
        continue
      }
    } catch (error) {
      console.error(`판단 실패 (${attempt + 1}/${maxRetries}):`, error)
      if (attempt === maxRetries - 1) {
        // 최종 재시도 실패 → 기본값
        return 'no'
      }
    }
  }

  return 'no' // fallback
}
```

**테스트 시나리오**:
```typescript
// 1. 정상 케이스
await safeAutoDecide("수정이 필요한가요?")

// 2. 이상한 질문 (응답 검증 실패 유도)
await safeAutoDecide("아무 말 대잔치")

// 3. 타임아웃 유도 (Ollama 서버 중지 후)
await safeAutoDecide("테스트")
```

**체크리스트**:
- [ ] 이상한 응답 시 재시도하는가?
- [ ] 최대 재시도 후 기본값을 반환하는가?
- [ ] 타임아웃이 동작하는가?

---

### 실습 4-3: 캐싱으로 성능 개선 ⭐ (20분)

**목표**: 같은 질문을 여러 번 하면 캐시에서 즉시 반환하기

**파일 생성**: `lib/cached-rag-service.ts`
```typescript
interface CacheEntry {
  results: any[]
  timestamp: number
}

export class CachedRAGService {
  private cache = new Map<string, CacheEntry>()
  private ttl = 60 * 60 * 1000 // 1시간

  async query(question: string): Promise<any[]> {
    // 1. 캐시 확인
    const cached = this.cache.get(question)
    if (cached) {
      const age = Date.now() - cached.timestamp
      if (age < this.ttl) {
        console.log('✅ 캐시 히트! (', age, 'ms 전)')
        return cached.results
      } else {
        console.log('⏰ 캐시 만료, 재검색')
        this.cache.delete(question)
      }
    }

    // 2. 실제 RAG 검색
    console.log('🔍 RAG 검색 중...')
    const startTime = Date.now()

    const response = await fetch('/api/rag/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: question, topK: 3 })
    })

    const data = await response.json()
    const endTime = Date.now()

    console.log(`⏱️ 검색 완료 (${endTime - startTime}ms)`)

    // 3. 캐시 저장
    this.cache.set(question, {
      results: data.results,
      timestamp: Date.now()
    })

    return data.results
  }

  clearCache() {
    this.cache.clear()
    console.log('🗑️ 캐시 클리어')
  }

  getCacheSize(): number {
    return this.cache.size
  }
}
```

**테스트 코드**:
```typescript
// 브라우저 콘솔에서 테스트
import { CachedRAGService } from '@/lib/cached-rag-service'

const cached = new CachedRAGService()

// 첫 번째 검색 (3초 소요)
await cached.query("t-검정이 뭐야?")

// 두 번째 검색 (즉시 반환!)
await cached.query("t-검정이 뭐야?")

// 다른 질문 (3초 소요)
await cached.query("ANOVA가 뭐야?")

// 캐시 상태 확인
console.log('캐시 크기:', cached.getCacheSize()) // 2
```

**체크리스트**:
- [ ] 첫 번째 검색이 느린가? (~3초)
- [ ] 두 번째 검색이 빠른가? (~0.001초)
- [ ] 캐시 크기가 정확한가?

---

## 📊 학습 진행도 체크

```
Level 1 (기초):
- [ ] 실습 1-1: RAG API 관찰
- [ ] 실습 1-2: 벡터 DB 탐색
- [ ] 실습 1-3: Ollama 호출

Level 2 (빌더):
- [ ] 실습 2-1: 프로세스 JSON 작성
- [ ] 실습 2-2: 체크리스트 컴포넌트
- [ ] 실습 2-3: JSON 파일 관리

Level 3 (Agentic):
- [ ] 실습 3-1: 프롬프트 체이닝
- [ ] 실습 3-2: 대화 이력 관리
- [ ] 실습 3-3: 규칙 vs AI 비교

Level 4 (고급):
- [ ] 실습 4-1: Streaming Response
- [ ] 실습 4-2: 에러 처리
- [ ] 실습 4-3: 캐싱
```

---

## 🎓 다음 단계

모든 실습을 완료했다면:

1. **실제 프로젝트 구현 시작**
   - [../process-rag/PROCESS_BUILDER_PLAN.md](../process-rag/PROCESS_BUILDER_PLAN.md)
   - [../process-rag/AGENTIC_FEATURES.md](../process-rag/AGENTIC_FEATURES.md)

2. **현재 프로젝트에 기여**
   - 통계 플랫폼 개선
   - 새로운 통계 방법 추가

3. **더 공부하기**
   - ReactFlow 고급 기능
   - Ollama Model Library
   - Vector Search 최적화

---

**작성자**: Claude Code
**최종 업데이트**: 2024-11-18
**관련 문서**: [BEGINNER_ROADMAP.md](./BEGINNER_ROADMAP.md), [AI_CONVERSATION_GUIDE.md](./AI_CONVERSATION_GUIDE.md)
