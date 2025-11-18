# 프로세스 빌더 구현 계획

**작성일**: 2025-01-18
**목적**: 업무 담당자가 드래그앤드롭으로 프로세스를 생성하고 JSON으로 공유

---

## 🎯 핵심 목표

**"Google Forms처럼 쉽게, Notion처럼 강력하게"**

### 사용자 목표
- ✅ **10분 안에** 프로세스 생성
- ✅ **코딩 지식 불필요** (드래그앤드롭만)
- ✅ **즉시 공유** (JSON 파일 1개)

---

## 🏗️ 시스템 아키텍처

### 전체 구조
```
┌─────────────────────────────────────────────────────┐
│                프로세스 빌더 (Builder)                │
│  ┌────────────┬───────────────────┬───────────────┐  │
│  │  팔레트    │    캔버스         │  속성 편집기   │  │
│  │            │                   │               │  │
│  │ 📋 작업    │  [드롭 영역]      │  제목: ___    │  │
│  │ 🔀 분기    │                   │  설명: ___    │  │
│  │ 📎 파일    │   ┌─────────┐    │  체크리스트:  │  │
│  │            │   │ Step 1  │    │  - [ ] ___    │  │
│  │ (드래그)   │   └────┬────┘    │  - [ ] ___    │  │
│  │            │        │          │               │  │
│  │            │   ┌────▼────┐    │  [저장]       │  │
│  │            │   │ Step 2  │    │               │  │
│  └────────────┴───┴─────────┴────┴───────────────┘  │
│                                                       │
│  [미리보기] [저장 (.json)] [불러오기]                 │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ 기술 스택

### 프론트엔드
```typescript
// 드래그앤드롭 캔버스
- ReactFlow: 노드 기반 플로우 차트 (⭐ 핵심)
- @dnd-kit: 팔레트 드래그앤드롭

// UI 컴포넌트
- shadcn/ui: 기존 시스템 재사용
- Lucide Icons: 아이콘

// 상태 관리
- Zustand: 프로세스 상태 관리

// 파일 저장
- File System Access API: JSON 다운로드
```

### 데이터 구조
```typescript
// Process 인터페이스
interface Process {
  id: string                    // 'contract-process-v1.2'
  name: string                  // '계약 체결 절차'
  department: string            // '계약팀'
  createdBy: string             // '홍길동'
  version: string               // '1.2'
  createdAt: string             // ISO 8601
  steps: ProcessStep[]
}

// Step 인터페이스
interface ProcessStep {
  id: string                    // 'step-1'
  type: 'task' | 'branch' | 'file'
  title: string                 // '입찰 공고 작성'
  description: string           // 상세 설명
  checklist?: ChecklistItem[]   // 체크리스트
  files?: FileSlot[]            // 파일 슬롯
  ragQuery?: string             // RAG 질문 힌트
  branch?: BranchCondition      // 조건 분기
  nextSteps?: string[]          // 다음 단계 ID
}

// 체크리스트 아이템
interface ChecklistItem {
  text: string
  required?: boolean            // 필수 여부
}

// 파일 슬롯
interface FileSlot {
  name: string                  // '입찰 공고문'
  format: string                // 'PDF/DOCX'
  required?: boolean
}

// 조건 분기
interface BranchCondition {
  question: string              // '수정이 필요한가요?'
  yes: string                   // Yes → 다음 단계 ID
  no: string                    // No → 다음 단계 ID
}
```

---

## 🎨 UI 컴포넌트 설계

### 1️⃣ 프로세스 빌더 페이지

```typescript
// app/process-builder/page.tsx

'use client'

import { useState } from 'react'
import ReactFlow, { Node, Edge, Controls, Background } from 'reactflow'
import 'reactflow/dist/style.css'

export default function ProcessBuilderPage() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  return (
    <div className="flex h-screen">
      {/* 왼쪽: 팔레트 */}
      <ComponentPalette />

      {/* 중앙: 캔버스 */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => setSelectedNode(node)}
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>

      {/* 오른쪽: 속성 편집기 */}
      <PropertyEditor node={selectedNode} />
    </div>
  )
}
```

---

### 2️⃣ 컴포넌트 팔레트

```typescript
// components/process-builder/ComponentPalette.tsx

const ComponentPalette = () => {
  const nodeTypes = [
    {
      type: 'task',
      icon: '📋',
      label: '일반 작업',
      description: '체크리스트와 메모가 있는 작업'
    },
    {
      type: 'branch',
      icon: '🔀',
      label: '조건 분기',
      description: 'Yes/No 질문으로 분기'
    },
    {
      type: 'file',
      icon: '📎',
      label: '파일 첨부',
      description: '서류 업로드 단계'
    }
  ]

  return (
    <div className="w-64 border-r p-4 bg-gray-50">
      <h3 className="font-bold mb-4">단계 추가</h3>

      {nodeTypes.map((nodeType) => (
        <div
          key={nodeType.type}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('nodeType', nodeType.type)
          }}
          className="p-3 bg-white border rounded-lg mb-3 cursor-move hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{nodeType.icon}</span>
            <span className="font-medium">{nodeType.label}</span>
          </div>
          <p className="text-xs text-gray-600">{nodeType.description}</p>
        </div>
      ))}

      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          💡 단계를 캔버스에 드래그하여 프로세스를 만드세요
        </p>
      </div>
    </div>
  )
}
```

---

### 3️⃣ 속성 편집기

```typescript
// components/process-builder/PropertyEditor.tsx

const PropertyEditor = ({ node }: { node: Node | null }) => {
  if (!node) {
    return (
      <div className="w-80 border-l p-4 text-center text-gray-400">
        단계를 선택하면 속성을 편집할 수 있습니다
      </div>
    )
  }

  const [data, setData] = useState(node.data)

  return (
    <div className="w-80 border-l p-4 overflow-y-auto">
      <h3 className="font-bold mb-4">단계 편집</h3>

      {/* 제목 */}
      <div className="mb-4">
        <Label>제목</Label>
        <Input
          value={data.title || ''}
          onChange={(e) => setData({ ...data, title: e.target.value })}
          placeholder="예: 입찰 공고 작성"
        />
      </div>

      {/* 설명 */}
      <div className="mb-4">
        <Label>설명</Label>
        <Textarea
          value={data.description || ''}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          placeholder="이 단계에서 해야 할 일을 설명하세요"
          rows={3}
        />
      </div>

      {/* 체크리스트 */}
      <div className="mb-4">
        <Label className="flex items-center justify-between">
          <span>체크리스트</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addChecklistItem()}
          >
            + 추가
          </Button>
        </Label>

        {data.checklist?.map((item: ChecklistItem, index: number) => (
          <div key={index} className="flex gap-2 mb-2">
            <Input
              value={item.text}
              onChange={(e) => updateChecklistItem(index, e.target.value)}
              placeholder="체크리스트 항목"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeChecklistItem(index)}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>

      {/* 파일 슬롯 (type === 'file'일 때만) */}
      {node.type === 'file' && (
        <div className="mb-4">
          <Label>필요 서류</Label>
          {/* ... 파일 슬롯 편집 UI ... */}
        </div>
      )}

      {/* 조건 분기 (type === 'branch'일 때만) */}
      {node.type === 'branch' && (
        <div className="mb-4">
          <Label>분기 질문</Label>
          <Input
            value={data.branch?.question || ''}
            onChange={(e) => setData({
              ...data,
              branch: { ...data.branch, question: e.target.value }
            })}
            placeholder="예: 수정이 필요한가요?"
          />
        </div>
      )}

      {/* RAG 힌트 */}
      <div className="mb-4">
        <Label>RAG 질문 힌트</Label>
        <Input
          value={data.ragQuery || ''}
          onChange={(e) => setData({ ...data, ragQuery: e.target.value })}
          placeholder="예: 입찰 공고 작성 가이드라인"
        />
        <p className="text-xs text-gray-500 mt-1">
          이 단계에서 RAG 챗봇이 참고할 키워드
        </p>
      </div>

      {/* 저장 버튼 */}
      <Button className="w-full" onClick={() => saveNodeData(node.id, data)}>
        저장
      </Button>
    </div>
  )
}
```

---

### 4️⃣ 커스텀 노드 컴포넌트

```typescript
// components/process-builder/CustomNode.tsx

import { Handle, Position } from 'reactflow'

export const TaskNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 bg-white border-2 border-blue-500 rounded-lg shadow-md min-w-[200px]">
    <Handle type="target" position={Position.Top} />

    <div className="flex items-center gap-2 mb-2">
      <span className="text-xl">📋</span>
      <h3 className="font-semibold">{data.title || '제목 없음'}</h3>
    </div>

    <p className="text-xs text-gray-600 mb-2">
      {data.description || '설명 없음'}
    </p>

    {data.checklist?.length > 0 && (
      <div className="text-xs text-gray-500">
        ✓ {data.checklist.length}개 체크리스트
      </div>
    )}

    <Handle type="source" position={Position.Bottom} />
  </div>
)

export const BranchNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 bg-white border-2 border-yellow-500 rounded-lg shadow-md min-w-[200px]">
    <Handle type="target" position={Position.Top} />

    <div className="flex items-center gap-2 mb-2">
      <span className="text-xl">🔀</span>
      <h3 className="font-semibold">조건 분기</h3>
    </div>

    <p className="text-xs text-gray-600">
      {data.branch?.question || '질문을 입력하세요'}
    </p>

    {/* Yes/No 핸들 */}
    <Handle
      type="source"
      position={Position.Bottom}
      id="yes"
      style={{ left: '30%' }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      id="no"
      style={{ left: '70%' }}
    />
  </div>
)
```

---

## 💾 JSON 저장/불러오기

### 저장 기능

```typescript
// utils/process-export.ts

export function exportProcessToJSON(nodes: Node[], edges: Edge[]): Process {
  // ReactFlow 노드 → ProcessStep 변환
  const steps: ProcessStep[] = nodes.map(node => ({
    id: node.id,
    type: node.type as 'task' | 'branch' | 'file',
    title: node.data.title,
    description: node.data.description,
    checklist: node.data.checklist,
    files: node.data.files,
    ragQuery: node.data.ragQuery,
    branch: node.data.branch,
    nextSteps: edges
      .filter(edge => edge.source === node.id)
      .map(edge => edge.target)
  }))

  const process: Process = {
    id: `process-${Date.now()}`,
    name: '새 프로세스',
    department: '',
    createdBy: '',
    version: '1.0',
    createdAt: new Date().toISOString(),
    steps
  }

  return process
}

export function downloadJSON(process: Process) {
  const blob = new Blob([JSON.stringify(process, null, 2)], {
    type: 'application/json'
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${process.id}.json`
  a.click()
  URL.revokeObjectURL(url)
}
```

### 불러오기 기능

```typescript
export function importProcessFromJSON(json: string): { nodes: Node[], edges: Edge[] } {
  const process: Process = JSON.parse(json)

  // ProcessStep → ReactFlow 노드 변환
  const nodes: Node[] = process.steps.map((step, index) => ({
    id: step.id,
    type: step.type,
    position: { x: 250, y: index * 150 },  // 세로 배치
    data: {
      title: step.title,
      description: step.description,
      checklist: step.checklist,
      files: step.files,
      ragQuery: step.ragQuery,
      branch: step.branch
    }
  }))

  // 간선 생성
  const edges: Edge[] = []
  process.steps.forEach(step => {
    step.nextSteps?.forEach(targetId => {
      edges.push({
        id: `e-${step.id}-${targetId}`,
        source: step.id,
        target: targetId
      })
    })
  })

  return { nodes, edges }
}
```

---

## 🎯 사용 흐름 예시

### 1단계: 프로세스 생성
```
1. 프로세스 빌더 열기
2. "일반 작업" 드래그 → 캔버스
3. 노드 클릭 → 속성 편집
   - 제목: "입찰 공고 작성"
   - 설명: "입찰 공고문을 작성하고 예산을 확인합니다"
   - 체크리스트 추가:
     ☐ 입찰 공고문 작성
     ☐ 예산 범위 확인
4. "조건 분기" 드래그 → 연결
5. "저장" 버튼 → contract-process-v1.2.json
```

### 2단계: 공유
```
1. JSON 파일 다운로드
2. 파일 서버 업로드
   cp contract-process-v1.2.json //fileserver/shared/processes/
```

### 3단계: 실행
```
1. 다른 직원: JSON 파일 다운로드
2. 프로세스 실행기 열기
3. 파일 불러오기
4. 단계별 체크/메모
```

---

## 📊 개발 우선순위

### Phase 1: 핵심 기능 (1주)
- [x] ReactFlow 기본 캔버스
- [x] 드래그앤드롭 팔레트
- [x] 속성 편집기 (제목, 설명, 체크리스트)
- [x] JSON 저장/불러오기

### Phase 2: 고급 기능 (1주)
- [ ] 조건 분기 노드
- [ ] 파일 슬롯 노드
- [ ] RAG 힌트 입력
- [ ] 미리보기 기능

### Phase 3: UI/UX 개선 (3일)
- [ ] 노드 스타일링
- [ ] 자동 레이아웃
- [ ] 단축키 (Ctrl+S 저장 등)
- [ ] 튜토리얼

---

## 🧪 테스트 계획

### 사용성 테스트
```
목표: 비개발자가 10분 안에 프로세스 생성

테스트 시나리오:
1. 신입 직원 (IT 지식 없음)
2. 3단계 프로세스 생성
   - 입찰 공고 작성
   - 법무 검토
   - 계약 체결
3. 각 단계에 체크리스트 2개씩 추가
4. JSON 저장

성공 기준:
- 10분 이내 완료
- 도움 없이 완료
- JSON 파일 정상 생성
```

---

## 💡 참고 자료

### 유사 도구
- **Google Forms**: 드래그앤드롭 필드 추가
- **Notion**: 체크리스트, 파일 첨부
- **Trello**: 카드 기반 프로세스
- **Monday.com**: 시각적 워크플로우

### 기술 문서
- ReactFlow: https://reactflow.dev/
- shadcn/ui: https://ui.shadcn.com/

---

**작성자**: Claude Code
**다음 단계**: JSON_SCHEMA.json 참조
