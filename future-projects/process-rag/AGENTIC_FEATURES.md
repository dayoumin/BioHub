# Agentic 기능 로드맵

**작성일**: 2024-11-18
**목적**: 내부망 환경에서 가능한 AI Agent 기능 설계
**우선순위**: 향후 검토 (현재 프로젝트 완료 후)

---

## 🎯 개요

**핵심 아이디어**: 완전 오프라인 환경에서 로컬 Ollama + 로컬 RAG를 활용한 자동화

**제약 조건**:
- ✅ 인터넷 연결 없음 (내부망)
- ✅ HTML/JavaScript 기반
- ✅ 로컬 Ollama 서버만 사용
- ❌ 외부 API 호출 불가
- ❌ 클라우드 서비스 불가

---

## 📋 Agentic 기능 우선순위

| 순위 | 기능 | 난이도 | 효과 | 구현 시간 | Phase |
|------|------|--------|------|----------|-------|
| **1** | 프로세스 자동 실행 | 중 | ⭐⭐⭐⭐⭐ | 1주 | Phase 4 |
| **2** | 스마트 서류 검증 | 중 | ⭐⭐⭐⭐ | 3일 | Phase 5 |
| **3** | 프로세스 학습 | 하 | ⭐⭐⭐⭐ | 3일 | Phase 6 |
| **4** | 로컬 스케줄링 | 하 | ⭐⭐⭐ | 2일 | Phase 7 |

---

## 1️⃣ 프로세스 자동 실행 Agent (Phase 4)

### 목표
사용자가 프로세스를 실행할 때 AI Agent가 자동으로:
- 다음 단계 분기 판단
- 체크리스트 검증
- 메모 자동 생성

### 기술 스택
```typescript
// 로컬 Ollama + 로컬 RAG만 사용
interface ProcessAgent {
  localOllama: OllamaClient    // 로컬 LLM 서버
  localRAG: RAGService         // 로컬 벡터 검색
  indexedDB: IDBDatabase       // 실행 이력 저장
}
```

### 핵심 기능

#### A. 자동 분기 판단
```typescript
async autoDecideBranch(currentStep: ProcessStep): Promise<'yes' | 'no'> {
  // 1. RAG로 컨텍스트 수집
  const context = await localRAG.query(currentStep.ragQuery!)

  // 2. 로컬 Ollama로 판단
  const decision = await localOllama.chat({
    messages: [
      { role: 'system', content: '다음 프로세스 분기를 판단하세요' },
      { role: 'user', content: `
        상황: ${context}
        질문: ${currentStep.branch!.question}

        "예" 또는 "아니오"로만 답하세요.
      ` }
    ]
  })

  return decision.includes('예') ? 'yes' : 'no'
}
```

**사용 예시**:
```
프로세스: 계약 체결
Step 2: 법무 검토
  ├─ 분기: "수정이 필요한가요?"
  └─ Agent 자동 판단:
      1. RAG 검색: "법무 검토 기준" → 3개 문서
      2. 업로드된 파일 분석 → "계약서 초안.pdf"
      3. Ollama 판단: "조항 5번 수정 필요" → "예" 선택
      4. 자동으로 Step 1로 되돌아감
```

#### B. 체크리스트 자동 검증
```typescript
async autoValidateChecklist(files: File[]): Promise<CheckResult[]> {
  const results = await Promise.all(
    files.map(async file => {
      // 1. 로컬 파일 파싱 (PDF.js, Mammoth.js)
      const content = await extractText(file)

      // 2. 로컬 Ollama로 검증
      const validation = await localOllama.chat({
        messages: [
          { role: 'system', content: '서류 누락 항목을 찾으세요' },
          { role: 'user', content: `
            파일명: ${file.name}
            내용: ${content}

            필수 항목:
            - 입찰 공고문 작성
            - 예산 범위 확인
            - 법무팀 사전 검토

            누락된 항목을 나열하세요.
          ` }
        ]
      })

      return {
        filename: file.name,
        issues: validation,
        autoChecked: validation.includes('누락 없음')
      }
    })
  )

  return results
}
```

**UI 예시**:
```
┌─────────────────────────────────────────┐
│ Step 1: 입찰 공고 작성                   │
├─────────────────────────────────────────┤
│ 체크리스트 (AI 자동 검증)                │
│ ✅ 입찰 공고문 작성 (자동 확인됨)        │
│ ⚠️  예산 범위 확인 (누락: 항목 3)        │
│ ☐ 법무팀 사전 검토 (선택)                │
├─────────────────────────────────────────┤
│ 📄 첨부 파일:                            │
│   • 입찰공고문.pdf ✅                     │
│   • 예산증빙.xlsx ⚠️ (Sheet 2 누락)      │
└─────────────────────────────────────────┘
```

#### C. 메모 자동 생성
```typescript
async autoGenerateMemo(stepId: string, userActions: Action[]): Promise<string> {
  const summary = await localOllama.chat({
    messages: [
      { role: 'system', content: '업무 진행 상황을 요약하세요' },
      { role: 'user', content: `
        단계: ${stepId}
        사용자 행동:
        ${userActions.map(a => `- ${a.timestamp}: ${a.action}`).join('\n')}

        간결한 메모를 작성하세요 (50자 이내).
      ` }
    ]
  })

  return summary
}
```

**UI 예시**:
```
┌─────────────────────────────────────────┐
│ 📝 메모 (AI 자동 생성)                   │
├─────────────────────────────────────────┤
│ 2024-11-18 14:30                        │
│ 예산 8천만원, 법무 검토 통과             │
│ 수정 없이 다음 단계 진행                 │
│                                         │
│ [수정] [저장]                            │
└─────────────────────────────────────────┘
```

### 구현 단계
1. **Week 1-2**: 로컬 Ollama 연동 + 기본 프롬프트 엔지니어링
2. **Week 3**: 체크리스트 자동 검증 (PDF.js, Mammoth.js)
3. **Week 4**: 자동 분기 판단 + 메모 생성
4. **Week 5**: 테스트 + 최적화

---

## 2️⃣ 스마트 서류 검증 Agent (Phase 5)

### 목표
프로세스 실행 시 필요한 서류를 자동으로 검증:
- 파일명 패턴 매칭
- 파일 형식 검증 (PDF/DOCX/XLSX)
- 내용 검증 (필수 항목 확인)

### 기술 스택
```typescript
// File System Access API (Chrome/Edge)
interface DocumentValidator {
  fileSystemAPI: FileSystemDirectoryHandle  // 폴더 접근
  pdfParser: PDFParser                      // PDF.js
  docxParser: DocxParser                    // Mammoth.js
  xlsxParser: XlsxParser                    // SheetJS
}
```

### 핵심 기능

#### A. 자동 서류 검증
```typescript
async autoCheckDocuments(requiredDocs: FileSlot[]): Promise<Report> {
  // 1. 사용자에게 폴더 선택 요청
  const dirHandle = await window.showDirectoryPicker({
    mode: 'read'
  })

  const report: Report = { missing: [], invalid: [], valid: [] }

  for (const required of requiredDocs) {
    try {
      // 2. 파일명 패턴 매칭
      const fileHandle = await findFileByPattern(dirHandle, required.name)
      const file = await fileHandle.getFile()

      // 3. 파일 형식 검증
      const expectedFormats = required.format.split('/') // "PDF/DOCX"
      const actualFormat = file.name.split('.').pop()?.toUpperCase()

      if (!expectedFormats.includes(actualFormat!)) {
        report.invalid.push({
          name: required.name,
          reason: `형식 불일치 (필요: ${required.format}, 실제: ${actualFormat})`
        })
        continue
      }

      // 4. 내용 검증 (로컬 Ollama)
      const content = await extractText(file)
      const validation = await localOllama.chat({
        messages: [
          { role: 'system', content: `${required.name} 필수 항목을 확인하세요` },
          { role: 'user', content: content }
        ]
      })

      report.valid.push({
        name: required.name,
        summary: validation,
        path: file.name
      })
    } catch (error) {
      report.missing.push(required.name)
    }
  }

  return report
}
```

#### B. 파일 찾기 헬퍼
```typescript
async function findFileByPattern(
  dirHandle: FileSystemDirectoryHandle,
  pattern: string
): Promise<FileSystemFileHandle> {
  // 패턴 정규화: "입찰 공고문" → /입찰.*공고/i
  const regex = new RegExp(
    pattern.split(' ').join('.*'),
    'i'
  )

  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file' && regex.test(entry.name)) {
      return entry as FileSystemFileHandle
    }
  }

  throw new Error(`파일을 찾을 수 없습니다: ${pattern}`)
}
```

### UI 예시
```
┌─────────────────────────────────────────┐
│ 📂 서류 자동 검증                        │
├─────────────────────────────────────────┤
│ [폴더 선택: C:\Documents\계약\]          │
├─────────────────────────────────────────┤
│ ✅ 입찰 공고문.pdf                       │
│    • 형식 OK, 내용 OK                    │
│                                         │
│ ❌ 예산 증빙.xlsx                        │
│    • 누락: Sheet 2 (항목 3, 7)           │
│    • [자동 수정 제안 보기]               │
│                                         │
│ ⚠️  계약서 초안.docx                     │
│    • 형식: DOCX (권장: PDF)              │
│    • [PDF로 변환하기]                    │
└─────────────────────────────────────────┘
```

### 구현 단계
1. **Day 1**: File System Access API 연동
2. **Day 2**: PDF/DOCX/XLSX 파서 통합
3. **Day 3**: 로컬 Ollama 내용 검증 + UI

---

## 3️⃣ 프로세스 학습 Agent (Phase 6)

### 목표
과거 실행 데이터를 학습하여:
- 자주 사용하는 메모/파일 자동 제안
- 평균 소요 시간 예측
- 병목 구간 자동 감지

### 기술 스택
```typescript
// IndexedDB로 실행 이력 저장
interface ExecutionHistory {
  processId: string
  stepId: string
  startTime: Date
  endTime: Date
  timeSpent: number        // 실제 소요 시간 (ms)
  userMemo: string
  filesUploaded: string[]
  branchDecision?: 'yes' | 'no'
}
```

### 핵심 기능

#### A. 자동 완성 제안
```typescript
class ProcessLearningAgent {
  private db: IDBDatabase

  async autoFillFromHistory(stepId: string): Promise<AutoFillData> {
    // 1. 과거 동일 단계 데이터 로드
    const pastData = await this.db
      .transaction('history', 'readonly')
      .objectStore('history')
      .index('stepId')
      .getAll(stepId)

    if (pastData.length === 0) {
      return { suggestedMemo: null, suggestedFiles: [] }
    }

    // 2. 가장 자주 사용한 메모 찾기
    const memoFrequency = new Map<string, number>()
    pastData.forEach(d => {
      const count = memoFrequency.get(d.userMemo) || 0
      memoFrequency.set(d.userMemo, count + 1)
    })

    const mostCommonMemo = [...memoFrequency.entries()]
      .sort((a, b) => b[1] - a[1])[0][0]

    // 3. 가장 자주 첨부한 파일 찾기
    const fileFrequency = new Map<string, number>()
    pastData.forEach(d => {
      d.filesUploaded.forEach(file => {
        const count = fileFrequency.get(file) || 0
        fileFrequency.set(file, count + 1)
      })
    })

    const suggestedFiles = [...fileFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([file, count]) => ({ file, count }))

    return {
      suggestedMemo: mostCommonMemo,
      suggestedFiles
    }
  }

  async suggestOptimization(processId: string): Promise<Suggestions> {
    // 1. 전체 실행 이력 로드
    const history = await this.db
      .transaction('history', 'readonly')
      .objectStore('history')
      .index('processId')
      .getAll(processId)

    // 2. 로컬 Ollama로 패턴 분석
    const analysis = await localOllama.chat({
      messages: [
        { role: 'system', content: '업무 패턴을 분석하고 개선점을 제안하세요' },
        { role: 'user', content: JSON.stringify(history, null, 2) }
      ]
    })

    // 3. 통계 계산
    const avgTimePerStep = new Map<string, number>()
    const stepCounts = new Map<string, number>()

    history.forEach(h => {
      const total = avgTimePerStep.get(h.stepId) || 0
      const count = stepCounts.get(h.stepId) || 0
      avgTimePerStep.set(h.stepId, total + h.timeSpent)
      stepCounts.set(h.stepId, count + 1)
    })

    const bottleneck = [...avgTimePerStep.entries()]
      .map(([stepId, total]) => ({
        stepId,
        avgTime: total / stepCounts.get(stepId)!
      }))
      .sort((a, b) => b.avgTime - a.avgTime)[0]

    return {
      suggestions: analysis,
      avgTime: this.calculateAverage(history),
      bottleneck
    }
  }

  private calculateAverage(history: ExecutionHistory[]): number {
    const total = history.reduce((sum, h) => sum + h.timeSpent, 0)
    return total / history.length
  }
}
```

### UI 예시
```
┌─────────────────────────────────────────┐
│ 💡 AI 제안 (10번의 실행 데이터 분석)     │
├─────────────────────────────────────────┤
│ 📄 자주 사용한 파일:                     │
│   1. C:\계약\예산증빙.xlsx (8/10회)      │
│      → [자동으로 폴더 열기]              │
│   2. C:\계약\공고문_템플릿.docx (6/10회) │
│                                         │
│ 📝 자주 사용한 메모:                     │
│   "예산 확인 완료, 법무 검토 대기"       │
│   → [자동 입력]                          │
│                                         │
│ ⏱️ 평균 소요 시간: 3일                   │
│   ⚠️ 현재 5일 경과                       │
│   → 병목: Step 2 (법무 검토)             │
│   → [RAG로 법무팀 연락처 보기]           │
└─────────────────────────────────────────┘
```

### 구현 단계
1. **Day 1**: IndexedDB 스키마 설계 + CRUD
2. **Day 2**: 실행 이력 자동 저장
3. **Day 3**: 자동 완성 + 최적화 제안

---

## 4️⃣ 로컬 스케줄링 Agent (Phase 7)

### 목표
브라우저 내에서 완전히 동작하는 스케줄러:
- 마감 임박 알림
- 다음 업무 자동 제안
- 우선순위 자동 판단

### 기술 스택
```typescript
// Notification API + setTimeout
interface ProcessSchedule {
  processId: string
  processName: string
  currentStep: number
  totalSteps: number
  dueDate: Date
  priority: 'high' | 'medium' | 'low'
}
```

### 핵심 기능

#### A. 자동 알림
```typescript
class ProcessScheduler {
  private db: IDBDatabase

  scheduleReminder(dueDate: Date, processName: string) {
    const now = new Date()
    const delay = dueDate.getTime() - now.getTime()

    if (delay < 0) {
      // 이미 마감 지났음
      this.showNotification('마감 초과', `${processName} - 마감일 지남!`)
      return
    }

    // 마감 1일 전 알림
    const oneDayBefore = delay - (24 * 60 * 60 * 1000)
    if (oneDayBefore > 0) {
      setTimeout(() => {
        this.showNotification('마감 임박', `${processName} - 내일 마감`)
      }, oneDayBefore)
    }

    // 마감일 알림
    setTimeout(() => {
      this.showNotification('마감일', `${processName} - 오늘까지 완료 필요`)
    }, delay)

    // IndexedDB에 저장 (브라우저 재시작 시 복원)
    this.db.transaction('schedules', 'readwrite')
      .objectStore('schedules')
      .add({ processName, dueDate, scheduled: now })
  }

  private showNotification(title: string, body: string) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/process-icon.png',
        badge: '/badge-icon.png',
        requireInteraction: true  // 클릭할 때까지 유지
      })
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.showNotification(title, body)
        }
      })
    }
  }

  async restoreSchedules() {
    // 브라우저 재시작 시 호출
    const schedules = await this.db
      .transaction('schedules', 'readonly')
      .objectStore('schedules')
      .getAll()

    schedules.forEach(s => {
      if (s.dueDate > new Date()) {
        this.scheduleReminder(s.dueDate, s.processName)
      }
    })
  }
}
```

#### B. 우선순위 자동 판단
```typescript
async autoSuggestNextStep(): Promise<ProcessSchedule[]> {
  // 1. 진행 중인 모든 프로세스 로드
  const pending = await this.db
    .transaction('processes', 'readonly')
    .objectStore('processes')
    .index('status')
    .getAll('in_progress')

  // 2. 로컬 Ollama로 우선순위 판단
  const priority = await localOllama.chat({
    messages: [
      { role: 'system', content: '가장 시급한 업무를 선택하세요' },
      { role: 'user', content: `
        진행 중인 업무:
        ${pending.map(p => `
          - ${p.processName}
          - 진행률: ${p.currentStep}/${p.totalSteps} (${Math.round(p.currentStep/p.totalSteps*100)}%)
          - 마감: ${p.dueDate}
        `).join('\n')}

        우선순위를 1, 2, 3 순서로 나열하세요.
      ` }
    ]
  })

  // 3. Ollama 응답 파싱 + 정렬
  const sorted = this.parsePriority(priority, pending)
  return sorted
}

private parsePriority(
  ollamaResponse: string,
  processes: ProcessSchedule[]
): ProcessSchedule[] {
  // 간단한 파싱 (실제로는 더 정교하게)
  const lines = ollamaResponse.split('\n')
  const order: string[] = []

  lines.forEach(line => {
    processes.forEach(p => {
      if (line.includes(p.processName) && !order.includes(p.processName)) {
        order.push(p.processName)
      }
    })
  })

  return order.map(name =>
    processes.find(p => p.processName === name)!
  )
}
```

### UI 예시
```
┌─────────────────────────────────────────┐
│ 🔔 오늘의 업무 (AI 추천)                 │
├─────────────────────────────────────────┤
│ 1️⃣ 계약 체결 ⚠️                         │
│    진행률: ████████░░ 80%                │
│    마감: 오늘 (11/18)                    │
│    → [계속하기]                          │
│                                         │
│ 2️⃣ 시설 점검                             │
│    진행률: ██░░░░░░░░ 20%                │
│    마감: 내일 (11/19)                    │
│    → [시작하기]                          │
│                                         │
│ 3️⃣ 예산 편성                             │
│    진행률: ░░░░░░░░░░ 0%                 │
│    마감: 1주일 후 (11/25)                │
│    → [보류]                              │
└─────────────────────────────────────────┘
```

### 구현 단계
1. **Day 1**: Notification API + IndexedDB 스케줄 저장
2. **Day 2**: 우선순위 자동 판단 (Ollama)

---

## 🚀 전체 로드맵

### Phase 1-3: 기본 시스템 (현재 프로젝트)
- [x] Phase 1: 프로세스 빌더 (ReactFlow)
- [x] Phase 2: 프로세스 실행기 (체크박스, 메모, 파일)
- [x] Phase 3: RAG 통합 (단계별 질문)

### Phase 4: 프로세스 자동 실행 Agent 🤖
**목표**: 사용자가 수동으로 선택하던 분기/체크를 AI가 자동 판단
**기간**: 1주
**핵심 기능**:
- 자동 분기 판단 (RAG + Ollama)
- 체크리스트 자동 검증
- 메모 자동 생성

**성공 지표**:
- 분기 판단 정확도 > 90%
- 체크리스트 검증 정확도 > 85%
- 사용자 개입 50% 감소

### Phase 5: 스마트 서류 검증 Agent 📂
**목표**: 파일 시스템 자동 스캔 + 내용 검증
**기간**: 3일
**핵심 기능**:
- File System Access API 연동
- PDF/DOCX/XLSX 자동 파싱
- 누락 항목 자동 탐지

**성공 지표**:
- 파일 찾기 성공률 > 95%
- 내용 검증 정확도 > 80%
- 서류 준비 시간 30% 감소

### Phase 6: 프로세스 학습 Agent 📊
**목표**: 과거 데이터 학습 + 자동 완성
**기간**: 3일
**핵심 기능**:
- IndexedDB 실행 이력 저장
- 자주 사용하는 메모/파일 제안
- 병목 구간 자동 감지

**성공 지표**:
- 자동 완성 사용률 > 70%
- 평균 소요 시간 20% 감소

### Phase 7: 로컬 스케줄링 Agent 🔔
**목표**: 브라우저 기반 알림 + 우선순위 자동 판단
**기간**: 2일
**핵심 기능**:
- Notification API 알림
- 우선순위 자동 판단 (Ollama)
- 브라우저 재시작 시 복원

**성공 지표**:
- 마감 준수율 > 95%
- 업무 누락 0건

---

## 🔐 기술 제약 및 해결책

### 제약 1: 인터넷 없음
**해결**: 로컬 Ollama + 로컬 RAG + 로컬 파일 시스템

### 제약 2: 외부 API 불가
**해결**: 모든 AI 추론을 로컬 Ollama에서 처리

### 제약 3: 서버 없음
**해결**: IndexedDB + File System Access API (완전 클라이언트)

### 제약 4: 브라우저 재시작 시 상태 손실
**해결**: IndexedDB에 모든 상태 저장 + 복원 로직

---

## 📊 예상 효과

### 정량적 효과
| 지표 | 현재 | Agent 도입 후 | 개선 |
|------|------|---------------|------|
| 프로세스 완료 시간 | 3일 | 2일 | **-33%** |
| 서류 준비 시간 | 1시간 | 40분 | **-33%** |
| 분기 판단 시간 | 30분 | 1분 | **-97%** |
| 사용자 개입 횟수 | 10회 | 5회 | **-50%** |
| 마감 준수율 | 80% | 95% | **+19%** |

### 정성적 효과
- ✅ 신입 직원도 즉시 업무 가능
- ✅ 업무 누락 방지
- ✅ 일관된 품질 유지
- ✅ 지식 축적 (IndexedDB)

---

## 🚫 불가능한 기능 (참고)

| 기능 | 이유 | 대안 |
|------|------|------|
| 이메일 자동 발송 | 외부 SMTP 서버 필요 | 메모 생성 → 수동 전송 |
| 외부 API 호출 | 인터넷 필요 | 로컬 Ollama |
| 클라우드 동기화 | 인터넷 필요 | 파일 서버 공유 |
| Voice Interface | Web Speech API (클라우드) | 텍스트만 |
| 실시간 협업 | WebSocket 서버 필요 | 파일 공유 |

---

## 📋 다음 단계

1. **현재 프로젝트 완료** (Phase 1-3)
   - 프로세스 빌더 + 실행기 + RAG 통합

2. **Phase 4 착수 전 검토**
   - 로컬 Ollama 성능 테스트
   - File System Access API 브라우저 지원 확인
   - IndexedDB 용량 제한 확인

3. **프로토타입 제작**
   - 1개 기능만 선택 (예: 자동 분기 판단)
   - 실제 업무 데이터로 테스트
   - 정확도 측정

4. **사용자 피드백**
   - 업무 담당자 인터뷰
   - UI/UX 개선
   - 추가 기능 요청 수렴

---

**작성자**: Claude Code
**관련 문서**:
- [PROCESS_BUILDER_PLAN.md](./PROCESS_BUILDER_PLAN.md)
- [SHARING_GUIDE.md](./SHARING_GUIDE.md)
- [../multi-tenant-rag/PLAN.md](../multi-tenant-rag/PLAN.md)
