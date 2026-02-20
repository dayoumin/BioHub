# 🎯 Grok 스타일 사이드바 재설계 - 전체 구현 계획

**작성일**: 2025-11-02
**예상 작업량**: ~9.5시간
**우선순위**: High (UI/UX 개선)

---

## 📌 목표

현재 챗봇 사이드바를 **Grok 스타일**로 재설계하여:
- 📁 **프로젝트 기반** 대화 조직화 (주제별 폴더)
- ⭐ **즐겨찾기** 섹션 (중요한 대화 상단 고정)
- 🔍 **검색 기능** (세션 & 프로젝트 통합 검색)
- 💬 **대화목록** (프로젝트 미속 히스토리)

---

## 📊 구조 설계

### 최종 UI 레이아웃

```
┌─────────────────────────────────┐
│ Header                          │
│ + 새 대화 | ⚙️ 설정            │
├─────────────────────────────────┤
│ Search                          │
│ 🔍 [    검색 입력창    ]        │
├─────────────────────────────────┤
│ Favorites                       │
│ ⭐ 즐겨찾기 (N개)              │
│  ├─ 📝 중요한 대화 1           │
│  └─ 📝 중요한 대화 2           │
├─────────────────────────────────┤
│ Projects                        │
│ 📁 프로젝트 (M개)              │
│  ├─ ▼ t-test 학습              │
│  │  ├─ 📝 대화 1               │
│  │  ├─ 📝 대화 2               │
│  │  └─ 📝 대화 3               │
│  ├─ ▼ ANOVA 분석               │
│  │  ├─ 📝 대화 4               │
│  │  └─ 📝 대화 5               │
│  └─ ▼ 회귀분석                 │
│     └─ 📝 대화 6               │
├─────────────────────────────────┤
│ History                         │
│ 💬 대화목록 (프로젝트 미속)    │
│  ├─ 📝 대화 7 (5일 전)         │
│  ├─ 📝 대화 8 (1주 전)         │
│  └─ 📝 대화 9 (2주 전)         │
├─────────────────────────────────┤
│ Footer                          │
│ 📦 보관함 (3개) [collapse]     │
└─────────────────────────────────┘
```

---

## 🗂️ 데이터 모델 설계

### 1. ChatProject 타입 (신규)

```typescript
// lib/types/chat.ts

export interface ChatProject {
  id: string                    // UUID
  name: string                  // "t-test 학습"
  description?: string          // 선택: 프로젝트 설명
  emoji?: string                // 선택: "📚" 등 시각화용
  color?: string                // 선택: "#FF5733" 등
  createdAt: number             // 생성 timestamp
  updatedAt: number             // 수정 timestamp
  isArchived: boolean           // 보관 여부
  isFavorite?: boolean          // 프로젝트 즐겨찾기 (선택)
}
```

### 2. ChatSession 타입 (확장)

```typescript
// lib/types/chat.ts - 기존 인터페이스 수정

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  projectId?: string            // 🆕 프로젝트 참조 (선택)
  createdAt: number
  updatedAt: number
  isFavorite: boolean           // 즐겨찾기
  isArchived: boolean
}
```

### 3. localStorage 저장소 구조

```javascript
// Key: 'chatbot_projects'
// Value: ChatProject[]
[
  {
    id: "proj-001",
    name: "t-test 학습",
    emoji: "📚",
    createdAt: 1735689600,
    updatedAt: 1735689600,
    isArchived: false
  },
  ...
]

// Key: 'chatbot_sessions'
// Value: ChatSession[]
[
  {
    id: "sess-001",
    title: "t-test 기초",
    projectId: "proj-001",      // 🆕
    isFavorite: true,
    isArchived: false,
    ...
  },
  ...
]

// 마이그레이션 완료 표시
// Key: 'chatbot_migrated_v2'
// Value: "true"
```

---

## 📋 Phase별 구현 계획

### Phase 1: 데이터 모델 (30분)

#### Step 1.1: 타입 정의 추가
**파일**: [lib/types/chat.ts](../lib/types/chat.ts)

- [x] `ChatProject` 인터페이스 정의
- [x] `ChatSession`에 `projectId` 필드 추가
- [x] 타입 export

**체크리스트**:
```typescript
✅ ChatProject 기본 필드 (id, name, createdAt, etc)
✅ 선택 필드 (description, emoji, color, isFavorite)
✅ ChatSession에 projectId?: string 추가
✅ TypeScript 컴파일 에러 0
```

---

### Phase 2: 백엔드 - ChatStorage 확장 (2시간)

**파일**: [lib/services/chat-storage.ts](../lib/services/chat-storage.ts)

#### Step 2.1: 프로젝트 CRUD (30분)

```typescript
// ✅ 프로젝트 생성
static createProject(
  name: string,
  options?: { description?: string; emoji?: string; color?: string }
): ChatProject

// ✅ 모든 프로젝트 조회 (보관된 것 제외)
static getProjects(): ChatProject[]

// ✅ 프로젝트 수정
static updateProject(
  projectId: string,
  updates: Partial<Omit<ChatProject, 'id' | 'createdAt'>>
): ChatProject | null

// ✅ 프로젝트 삭제
// 주의: 해당 프로젝트 내 세션들은 projectId 제거 (root로 이동)
static deleteProject(projectId: string): void

// ✅ 프로젝트 보관/복구
static toggleProjectArchive(projectId: string): void
```

#### Step 2.2: 세션 관리 확장 (30분)

```typescript
// ✅ 세션을 프로젝트로 이동
static moveSessionToProject(
  sessionId: string,
  projectId: string | null  // null = root (프로젝트 없음)
): ChatSession | null

// ✅ 특정 프로젝트의 세션 조회
static getSessionsByProject(projectId: string): ChatSession[]

// ✅ 프로젝트 미속 세션 조회 (root)
static getUnorganizedSessions(): ChatSession[]

// ✅ 최근 대화순 정렬
static getSessionsByProject(projectId: string, sortBy: 'recent' | 'oldest' = 'recent'): ChatSession[]
```

#### Step 2.3: 검색 기능 (30분)

```typescript
// ✅ 세션 검색
static searchSessions(
  query: string,
  options?: { projectId?: string; limit?: number }
): ChatSession[]

// ✅ 프로젝트 검색
static searchProjects(query: string): ChatProject[]

// ✅ 통합 검색
static globalSearch(query: string): {
  projects: ChatProject[]
  sessions: ChatSession[]
}

// 구현 세부:
// - 제목/설명에서 부분 매칭 (case-insensitive)
// - 결과는 최신순 정렬
```

#### Step 2.4: 즐겨찾기 기능 (20분)

```typescript
// ✅ 세션 즐겨찾기 토글
static toggleFavorite(sessionId: string): void

// ✅ 즐겨찾기 세션 조회
static getFavoriteSessions(): ChatSession[]

// ✅ 프로젝트 즐겨찾기 토글
static toggleProjectFavorite(projectId: string): void

// ✅ 즐겨찾기 프로젝트 조회
static getFavoriteProjects(): ChatProject[]
```

#### Step 2.5: 마이그레이션 (10분)

```typescript
// ✅ 기존 데이터 → 새 구조로 변환
// - 기존 세션들에 projectId 설정 안 함 (undefined)
// - 마이그레이션 플래그 저장: 'chatbot_migrated_v2'
static migrateToNewStructure(): void {
  // 1. 마이그레이션 완료 여부 확인
  const isMigrated = localStorage.getItem('chatbot_migrated_v2') === 'true'
  if (isMigrated) return

  // 2. 기존 세션 로드
  const sessions = this.loadSessions()

  // 3. projectId 초기화 (이미 undefined이면 그대로)
  sessions.forEach(session => {
    if (!('projectId' in session)) {
      session.projectId = undefined
    }
  })

  // 4. 저장
  localStorage.setItem('chatbot_sessions', JSON.stringify(sessions))
  localStorage.setItem('chatbot_migrated_v2', 'true')
}
```

**체크리스트**:
```
✅ 프로젝트 CRUD 메서드 (4개)
✅ 세션 관리 메서드 (3개)
✅ 검색 메서드 (3개)
✅ 즐겨찾기 메서드 (4개)
✅ 마이그레이션 스크립트
✅ 타입 안전성 (unknown → 타입 가드)
✅ 에러 처리 (null 체크)
✅ 단위 테스트
```

---

### Phase 3: 프론트엔드 - UI 구현 (3시간)

**파일**: [app/chatbot/page.tsx](../app/chatbot/page.tsx)

#### Step 3.1: 상태 관리 추가 (30분)

```typescript
// 기존 state
const [sessions, setSessions] = useState<ChatSession[]>([])
const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

// 🆕 추가 state
const [projects, setProjects] = useState<ChatProject[]>([])
const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
const [searchQuery, setSearchQuery] = useState('')
const [favorites, setFavorites] = useState<ChatSession[]>([])
```

#### Step 3.2: 사이드바 섹션 컴포넌트화 (1시간)

새 컴포넌트 생성:
- `components/chatbot/SidebarSearch.tsx` - 검색 입력
- `components/chatbot/FavoritesSection.tsx` - 즐겨찾기
- `components/chatbot/ProjectsSection.tsx` - 프로젝트 폴더
- `components/chatbot/HistorySection.tsx` - 대화목록
- `components/chatbot/SessionItem.tsx` - 세션 아이템

**각 컴포넌트 기능**:

```tsx
// SidebarSearch.tsx
- 검색 입력 + 실시간 필터링
- 검색 결과 표시

// FavoritesSection.tsx
- 즐겨찾기된 세션만 표시
- 세션 클릭 → 선택
- 우측 메뉴 → 별 제거

// ProjectsSection.tsx
- 프로젝트 목록
- 펼침/접힘 토글
- 프로젝트 우클릭 → 메뉴 (수정, 삭제, 보관)

// HistorySection.tsx
- 프로젝트 미속 세션 (root)
- 최신순 정렬
- 날짜별 그룹화 (선택사항)

// SessionItem.tsx
- 세션 제목 + 아바타
- Hover시 우측 메뉴 (별, 이동, 삭제)
- 클릭 → 선택
```

#### Step 3.3: 레이아웃 재구성 (1시간)

```tsx
// 사이드바 구조 재구성
<aside className="w-64 border-r flex flex-col">
  {/* Header */}
  <SidebarHeader />

  {/* Search */}
  <SidebarSearch
    value={searchQuery}
    onChange={setSearchQuery}
  />

  {/* ScrollArea */}
  <ScrollArea className="flex-1">
    {searchQuery ? (
      <SearchResults query={searchQuery} />
    ) : (
      <>
        <FavoritesSection
          favorites={favorites}
          onSelectSession={handleSelectSession}
        />
        <ProjectsSection
          projects={projects}
          expandedProjects={expandedProjects}
          onToggleProject={handleToggleProject}
          onSelectSession={handleSelectSession}
          onProjectAction={handleProjectAction}
        />
        <HistorySection
          sessions={unorganizedSessions}
          onSelectSession={handleSelectSession}
        />
      </>
    )}
  </ScrollArea>

  {/* Footer */}
  <SidebarFooter archivedCount={archivedSessions.length} />
</aside>
```

#### Step 3.4: 이벤트 핸들러 (30분)

```typescript
// 세션 선택
const handleSelectSession = useCallback((sessionId: string) => {
  setCurrentSessionId(sessionId)
  // RAG Chat Interface 로드
}, [])

// 프로젝트 펼침/접힘
const handleToggleProject = useCallback((projectId: string) => {
  setExpandedProjects(prev => {
    const next = new Set(prev)
    if (next.has(projectId)) next.delete(projectId)
    else next.add(projectId)
    return next
  })
}, [])

// 세션 이동
const handleMoveSession = useCallback((sessionId: string, projectId: string | null) => {
  ChatStorage.moveSessionToProject(sessionId, projectId)
  setSessions(ChatStorage.loadSessions())
}, [])

// 즐겨찾기 토글
const handleToggleFavorite = useCallback((sessionId: string) => {
  ChatStorage.toggleFavorite(sessionId)
  setFavorites(ChatStorage.getFavoriteSessions())
}, [])
```

**체크리스트**:
```
✅ 5개 서브컴포넌트 생성
✅ 사이드바 레이아웃 재구성
✅ 검색 필터링 로직
✅ 이벤트 핸들러 구현
✅ 반응형 디자인
✅ 접근성 (a11y)
```

---

### Phase 4: 모달/다이얼로그 (1.5시간)

#### Step 4.1: 프로젝트 생성/수정 모달 (30분)

**파일**: `components/chatbot/ProjectDialog.tsx`

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogTitle>
      {isEditing ? '프로젝트 수정' : '새 프로젝트 생성'}
    </DialogTitle>
    <DialogBody>
      <div className="space-y-4">
        {/* 이름 입력 */}
        <div>
          <Label>프로젝트 이름</Label>
          <Input
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="예: t-test 학습"
          />
        </div>

        {/* 설명 입력 */}
        <div>
          <Label>설명 (선택사항)</Label>
          <Textarea
            value={projectDescription}
            onChange={e => setProjectDescription(e.target.value)}
            placeholder="이 프로젝트에 대한 설명"
          />
        </div>

        {/* 이모지 선택 */}
        <div>
          <Label>이모지 (선택사항)</Label>
          <EmojiPicker
            value={projectEmoji}
            onChange={setProjectEmoji}
          />
        </div>

        {/* 색상 선택 */}
        <div>
          <Label>색상 (선택사항)</Label>
          <ColorPicker
            value={projectColor}
            onChange={setProjectColor}
          />
        </div>
      </div>
    </DialogBody>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>취소</Button>
      <Button onClick={handleSave}>
        {isEditing ? '수정' : '생성'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Step 4.2: 세션 이동 모달 (30분)

**파일**: `components/chatbot/MoveSessionDialog.tsx`

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogTitle>"{sessionTitle}"을(를) 이동</DialogTitle>
    <DialogBody>
      <div className="space-y-2">
        {/* Root */}
        <div
          className={cn(
            'p-3 rounded cursor-pointer hover:bg-muted',
            selectedProjectId === null && 'bg-primary/10'
          )}
          onClick={() => setSelectedProjectId(null)}
        >
          ☐ 프로젝트 없음 (Root)
        </div>

        {/* Projects */}
        {projects.map(project => (
          <div
            key={project.id}
            className={cn(
              'p-3 rounded cursor-pointer hover:bg-muted',
              selectedProjectId === project.id && 'bg-primary/10'
            )}
            onClick={() => setSelectedProjectId(project.id)}
          >
            {project.emoji} {project.name}
          </div>
        ))}
      </div>
    </DialogBody>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>취소</Button>
      <Button onClick={handleMove}>이동</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Step 4.3: 삭제 확인 모달 (30분)

```tsx
<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
  <AlertDialogContent>
    <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
    <AlertDialogDescription>
      "{itemName}"을(를) 삭제하면 복구할 수 없습니다.
      {itemType === 'project' && ' 하위 세션들은 프로젝트 없음으로 이동합니다.'}
    </AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel>취소</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive" onClick={handleDelete}>
        삭제
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**체크리스트**:
```
✅ 프로젝트 모달 구현
✅ 이동 모달 구현
✅ 삭제 확인 모달 구현
✅ Form 검증 (이름 필수)
✅ 이모지/색상 선택기 (shadcn 라이브러리 활용)
```

---

### Phase 5: 상태 관리 & 성능 (1시간)

#### Step 5.1: 상태 구조화

```typescript
interface SidebarState {
  // 데이터
  projects: ChatProject[]
  sessions: ChatSession[]
  favorites: ChatSession[]

  // UI 상태
  expandedProjects: Set<string>
  searchQuery: string
  filterMode: 'all' | 'favorites'

  // 모달 상태
  projectDialogOpen: boolean
  moveDialogOpen: boolean
  deleteDialogOpen: boolean
}
```

#### Step 5.2: 낙관적 업데이트

```typescript
// 프로젝트 생성
const handleCreateProject = async (name: string) => {
  // 1. 즉시 UI 업데이트 (낙관적)
  const newProject = ChatStorage.createProject(name)
  setProjects(prev => [newProject, ...prev])

  // 2. localStorage 저장 (동기)
  // 3. 실패 시 롤백 (에러 처리)
}
```

#### Step 5.3: 캐싱 전략

```typescript
// useEffect: 초기 로드 시에만 실행
useEffect(() => {
  const projects = ChatStorage.getProjects()
  const sessions = ChatStorage.loadSessions()
  const favorites = ChatStorage.getFavoriteSessions()

  setProjects(projects)
  setSessions(sessions)
  setFavorites(favorites)
}, []) // 의존성 배열 빈 상태
```

**체크리스트**:
```
✅ 상태 구조 정의
✅ 낙관적 업데이트 (즉시 반영)
✅ 에러 처리 (실패 시 롤백)
✅ 성능 최적화 (useCallback)
✅ 메모리 누수 방지 (cleanup)
```

---

### Phase 6: 통합 & 테스트 (2시간)

#### Step 6.1: 마이그레이션 스크립트 (20분)

- 앱 첫 로드 시 마이그레이션 자동 실행
- 기존 사용자 데이터 보존
- 버전 체크 후 한 번만 실행

#### Step 6.2: 단위 테스트 (40분)

**파일**: `__tests__/services/chat-storage-projects.test.ts`

```typescript
describe('ChatStorage - Projects', () => {
  it('프로젝트 생성', () => {
    const project = ChatStorage.createProject('Test Project')
    expect(project.name).toBe('Test Project')
    expect(project.id).toBeDefined()
  })

  it('프로젝트 조회', () => {
    ChatStorage.createProject('Project 1')
    ChatStorage.createProject('Project 2')
    const projects = ChatStorage.getProjects()
    expect(projects).toHaveLength(2)
  })

  it('세션 이동', () => {
    const project = ChatStorage.createProject('Test')
    const session = ChatStorage.createNewSession()
    ChatStorage.moveSessionToProject(session.id, project.id)
    const updated = ChatStorage.loadSession(session.id)
    expect(updated?.projectId).toBe(project.id)
  })

  it('검색', () => {
    ChatStorage.createProject('Test-ABC')
    ChatStorage.createProject('Test-XYZ')
    const results = ChatStorage.searchProjects('ABC')
    expect(results).toHaveLength(1)
  })
})
```

#### Step 6.3: 통합 테스트 (60분)

**테스트 시나리오**:

1. **프로젝트 생성 & 세션 이동**
   - 새 프로젝트 생성 → UI에 즉시 표시
   - 세션을 프로젝트로 이동 → 폴더 안에 표시

2. **검색 필터링**
   - 검색어 입력 → 매칭되는 세션/프로젝트만 표시
   - 검색어 제거 → 전체 구조 복원

3. **즐겨찾기**
   - 세션 별 클릭 → 즐겨찾기 추가
   - 즐겨찾기 섹션에 표시

4. **프로젝트 관리**
   - 프로젝트 삭제 → 하위 세션 root로 이동
   - 프로젝트 보관 → 보관함 섹션 표시

5. **마이그레이션**
   - 기존 데이터 로드 → 자동 마이그레이션
   - 데이터 무결성 확인

**체크리스트**:
```
✅ 프로젝트 CRUD 테스트
✅ 세션 이동 테스트
✅ 검색 기능 테스트
✅ 즐겨찾기 토글 테스트
✅ UI 상호작용 테스트 (클릭, 펼침 등)
✅ 마이그레이션 테스트
✅ 에러 케이스 테스트
✅ 모든 테스트 통과 (npm test)
```

---

## 📈 작업량 추정

| Phase | Step | 예상 시간 | 상태 |
|-------|------|----------|------|
| 1 | 타입 정의 | 30분 | 📋 대기 |
| 2 | CRUD | 30분 | 📋 대기 |
| 2 | 세션 관리 | 30분 | 📋 대기 |
| 2 | 검색 | 30분 | 📋 대기 |
| 2 | 즐겨찾기 | 20분 | 📋 대기 |
| 2 | 마이그레이션 | 10분 | 📋 대기 |
| 3 | 상태 관리 | 30분 | 📋 대기 |
| 3 | 컴포넌트화 | 1시간 | 📋 대기 |
| 3 | 레이아웃 | 1시간 | 📋 대기 |
| 3 | 이벤트 핸들러 | 30분 | 📋 대기 |
| 4 | 프로젝트 모달 | 30분 | 📋 대기 |
| 4 | 이동 모달 | 30분 | 📋 대기 |
| 4 | 삭제 모달 | 30분 | 📋 대기 |
| 5 | 상태 구조화 | 20분 | 📋 대기 |
| 5 | 최적화 | 40분 | 📋 대기 |
| 6 | 마이그레이션 스크립트 | 20분 | 📋 대기 |
| 6 | 단위 테스트 | 40분 | 📋 대기 |
| 6 | 통합 테스트 | 60분 | 📋 대기 |
| **Total** | | **~9.5시간** | |

---

## 🎯 우선순위

### 필수 (Phase 1-3)
- [ ] 타입 정의 확장
- [ ] ChatStorage 핵심 메서드 (CRUD, 이동)
- [ ] 사이드바 기본 레이아웃
- [ ] 검색 기능
- [ ] 상태 관리

### 중요 (Phase 4-5)
- [ ] 프로젝트/이동 모달
- [ ] 성능 최적화
- [ ] 접근성 개선

### 선택 (Phase 6)
- [ ] 마이그레이션 스크립트
- [ ] 단위/통합 테스트
- [ ] 컨텍스트 메뉴 (우클릭)

---

## 📝 주의사항

### 데이터 무결성
- ✅ 프로젝트 삭제 시 하위 세션 orphan 방지 (projectId = undefined)
- ✅ 세션 삭제 시 favorites 배열에서도 제거
- ✅ 타입 안전성 (unknown → 타입 가드)

### 성능
- ✅ 불필요한 재렌더링 최소화 (useCallback)
- ✅ 큰 리스트는 가상화 고려 (1000+ 세션)
- ✅ localStorage 접근 최소화 (캐싱)

### UX
- ✅ 낙관적 업데이트 (즉시 반영)
- ✅ 오류 시 롤백 (사용자 혼란 방지)
- ✅ 로딩 상태 표시
- ✅ 확인 모달로 실수 방지

### 마이그레이션
- ✅ 기존 사용자 데이터 보존
- ✅ 버전 체크로 중복 실행 방지
- ✅ 콘솔 로그로 디버깅

---

## 🔗 관련 파일

**생성할 파일**:
- [x] `components/chatbot/SidebarSearch.tsx`
- [x] `components/chatbot/FavoritesSection.tsx`
- [x] `components/chatbot/ProjectsSection.tsx`
- [x] `components/chatbot/HistorySection.tsx`
- [x] `components/chatbot/SessionItem.tsx`
- [x] `components/chatbot/ProjectDialog.tsx`
- [x] `components/chatbot/MoveSessionDialog.tsx`
- [x] `__tests__/services/chat-storage-projects.test.ts`
- [x] `__tests__/chatbot/sidebar-integration.test.ts`

**수정할 파일**:
- [x] `lib/types/chat.ts` - ChatProject + ChatSession 확장
- [x] `lib/services/chat-storage.ts` - 메서드 추가
- [x] `app/chatbot/page.tsx` - 사이드바 재구성

---

## ✅ 완료 기준

- [ ] 모든 Phase 1-3 구현 완료
- [ ] TypeScript 컴파일 에러 0
- [ ] 수동 테스트 성공 (프로젝트 CRUD, 검색, 즐겨찾기)
- [ ] UI 반응 성공 (펼침/접힘, 이동, 삭제)
- [ ] 마이그레이션 정상 작동
- [ ] 기존 기능 영향 없음 (RAG 채팅)

---

## 📅 일정

**계획**: 2025-11-03 ~ 2025-11-05
**소요 시간**: 약 3일 (하루 3-4시간)

---

**작성자**: Claude
**최종 수정**: 2025-11-02
