# 프로세스 공유 가이드

**작성일**: 2024-11-18
**목적**: RAG DB와 동일한 방식으로 프로세스 JSON 공유

---

## 🎯 공유 방식 개요

**핵심 아이디어**: RAG DB 공유 방식을 그대로 적용

```
RAG DB 공유:
- rag.db (15MB) + vector-xxx.db (14.2MB) = 29.2MB
- 파일 서버 업로드 → 다른 직원 다운로드

프로세스 공유:
- process-xxx.json (2-10KB) ← RAG DB의 1/3000 크기!
- 파일 서버 업로드 → 다른 직원 다운로드 (동일)
```

---

## 📁 폴더 구조 (파일 서버)

### 옵션 1: 단순 구조 (권장)
```
//fileserver/shared/
├─ rag/                           # RAG DB
│  ├─ facility/
│  │  ├─ rag.db
│  │  ├─ vector-qwen3-0.6b.db
│  │  └─ metadata.json
│  └─ budget/
│     ├─ rag.db
│     ├─ vector-qwen3-0.6b.db
│     └─ metadata.json
│
└─ processes/                     # 프로세스 JSON ✨
   ├─ contract-process-v1.2.json
   ├─ facility-inspection-v2.0.json
   ├─ budget-planning-v1.0.json
   └─ process-registry.json       # 중앙 레지스트리
```

### 옵션 2: 부서별 구조
```
//fileserver/shared/
├─ contract/                      # 계약팀 폴더
│  ├─ rag/                        # RAG DB
│  │  ├─ rag.db
│  │  └─ vector-qwen3-0.6b.db
│  └─ processes/                  # 프로세스
│     ├─ contract-v1.2.json
│     └─ bidding-v1.0.json
│
├─ facility/                      # 시설팀 폴더
│  ├─ rag/
│  │  ├─ rag.db
│  │  └─ vector-qwen3-0.6b.db
│  └─ processes/
│     ├─ inspection-v2.0.json
│     └─ maintenance-v1.1.json
│
└─ registry.json                  # 전체 레지스트리
```

---

## 🔄 공유 워크플로우

### A. 담당자 (프로세스 생성 → 공유)

#### Step 1: 프로세스 생성
```bash
1. 프로세스 빌더 실행
2. 드래그앤드롭으로 단계 추가
3. "저장" 버튼 → contract-process-v1.2.json (2.3KB)
```

#### Step 2: 파일 서버 업로드
```bash
# Windows (탐색기)
1. contract-process-v1.2.json 복사
2. \\fileserver\shared\processes\ 폴더 열기
3. 붙여넣기

# Linux/Mac (명령줄)
cp contract-process-v1.2.json //fileserver/shared/processes/

# 또는 scp (원격 서버)
scp contract-process-v1.2.json user@fileserver:/shared/processes/
```

#### Step 3: 레지스트리 업데이트 (자동화 가능)
```bash
# 수동 방식
1. process-registry.json 다운로드
2. 새 프로세스 항목 추가:
   {
     "id": "contract-process-v1.2",
     "name": "계약 체결 절차",
     "department": "계약팀",
     "version": "1.2",
     "fileSize": "2.3 KB",
     "createdBy": "홍길동",
     "createdAt": "2024-11-18T09:00:00Z"
   }
3. 다시 업로드

# 자동화 스크립트 (향후)
node scripts/register-process.js contract-process-v1.2.json
```

---

### B. 직원 (프로세스 다운로드 → 사용)

#### Step 1: 레지스트리 확인 (UI)
```typescript
// 프로세스 브라우저 (설정 페이지)

<ProcessBrowser>
  <ProcessCard>
    <h3>계약 체결 절차 v1.2</h3>
    <p>계약팀 · 홍길동 · 2024-11-18</p>
    <p>3단계 · 2.3 KB</p>
    <Button>다운로드</Button>
  </ProcessCard>

  <ProcessCard>
    <h3>시설 점검 프로세스 v2.0</h3>
    <p>시설팀 · 김철수 · 2024-11-15</p>
    <p>5단계 · 3.1 KB</p>
    <Button>다운로드</Button>
  </ProcessCard>
</ProcessBrowser>
```

#### Step 2: 다운로드
```typescript
// UI에서 "다운로드" 버튼 클릭

async function downloadProcess(processId: string) {
  const url = `//fileserver/shared/processes/${processId}.json`
  const response = await fetch(url)
  const json = await response.text()

  // 로컬 스토리지에 저장
  localStorage.setItem(`process-${processId}`, json)

  // 또는 파일 다운로드
  const blob = new Blob([json], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${processId}.json`
  a.click()
}
```

#### Step 3: 실행
```typescript
// 프로세스 실행기에서 불러오기

<ProcessRunner>
  <Button onClick={loadProcess}>
    프로세스 불러오기
  </Button>

  // 파일 선택 → JSON 파싱 → 실행
</ProcessRunner>
```

---

## 📋 프로세스 레지스트리 (process-registry.json)

### 스키마
```json
{
  "version": "1.0",
  "updated": "2024-11-18T15:00:00Z",
  "processes": [
    {
      "id": "contract-process-v1.2",
      "name": "계약 체결 절차",
      "department": "계약팀",
      "version": "1.2",
      "createdBy": "홍길동",
      "createdAt": "2024-11-18T09:00:00Z",
      "filePath": "/processes/contract-process-v1.2.json",
      "fileSize": "2.3 KB",
      "stepCount": 3,
      "description": "입찰 공고부터 계약 체결까지",
      "tags": ["계약", "입찰", "법무"],
      "downloads": 42,
      "rating": 4.5,
      "changelog": [
        {
          "version": "1.2",
          "date": "2024-11-18",
          "changes": ["법무 검토 조건 분기 추가"]
        }
      ]
    },
    {
      "id": "facility-inspection-v2.0",
      "name": "시설 점검 프로세스",
      "department": "시설팀",
      "version": "2.0",
      "createdBy": "김철수",
      "createdAt": "2024-11-15T10:00:00Z",
      "filePath": "/processes/facility-inspection-v2.0.json",
      "fileSize": "3.1 KB",
      "stepCount": 5,
      "description": "월간 시설 점검 체크리스트",
      "tags": ["시설", "안전", "점검"],
      "downloads": 28,
      "rating": 4.8
    }
  ]
}
```

---

## 🔄 버전 관리

### Semantic Versioning 적용
```
v1.0 → v1.1 → v2.0

- Major (v2.0): 프로세스 구조 대폭 변경 (호환 불가)
- Minor (v1.1): 단계 추가/수정 (호환 가능)
- Patch (v1.0.1): 오타 수정, 설명 보완
```

### 파일명 규칙
```bash
{department}-{process-name}-v{version}.json

예시:
- contract-process-v1.2.json
- facility-inspection-v2.0.json
- budget-planning-v1.0.1.json
```

### 변경 이력 기록
```json
{
  "id": "contract-process-v1.2",
  "changelog": [
    {
      "version": "1.2",
      "date": "2024-11-18",
      "changes": [
        "법무 검토 단계에 조건 분기 추가",
        "예산 증빙 서류 필수화"
      ],
      "author": "홍길동"
    },
    {
      "version": "1.1",
      "date": "2024-11-10",
      "changes": ["체크리스트 항목 추가"],
      "author": "김철수"
    },
    {
      "version": "1.0",
      "date": "2024-11-01",
      "changes": ["초기 버전"],
      "author": "홍길동"
    }
  ]
}
```

---

## 🤝 협업 시나리오

### 시나리오 1: 부서 내 공유
```
계약팀 홍길동:
1. 계약 프로세스 v1.0 생성 → 공유

계약팀 김철수:
2. v1.0 다운로드 → 사용하다가 개선점 발견
3. v1.0 수정 → v1.1로 저장 → 다시 공유

계약팀 이영희:
4. v1.1 다운로드 → 최신 버전 사용
```

### 시나리오 2: 부서 간 참고
```
계약팀:
- contract-process-v1.2.json (계약 절차)

시설팀:
- contract-process-v1.2.json 다운로드
- "시설 공사 계약" 프로세스 만들 때 참고
- 일부 단계 재사용 (법무 검토, 예산 승인)
- facility-construction-v1.0.json 생성
```

---

## 🔐 접근 제어 (선택)

### 파일 서버 권한 설정
```bash
# Windows 파일 서버 (SMB)
\\fileserver\shared\processes\

권한 설정:
- 모든 직원: 읽기 ✅
- 부서 담당자: 읽기 + 쓰기 ✅
- IT 관리자: 전체 제어 ✅
```

### 프로세스별 접근 제어 (메타데이터)
```json
{
  "id": "contract-process-v1.2",
  "access": {
    "public": true,                // 전체 공개
    "allowedDepartments": [        // 특정 부서만 (public=false 시)
      "계약팀",
      "법무팀"
    ]
  }
}
```

---

## 📊 다운로드 통계 (선택)

### 사용 현황 추적
```json
{
  "id": "contract-process-v1.2",
  "stats": {
    "downloads": 42,
    "views": 128,
    "lastDownloadedAt": "2024-11-18T14:30:00Z",
    "topUsers": [
      { "name": "김철수", "downloads": 5 },
      { "name": "이영희", "downloads": 3 }
    ]
  }
}
```

### UI 표시
```
📊 인기 프로세스

1. 계약 체결 절차 v1.2        ⬇️ 42회
2. 시설 점검 프로세스 v2.0     ⬇️ 28회
3. 예산 편성 가이드 v1.0       ⬇️ 15회
```

---

## 🚀 자동화 스크립트

### 1️⃣ 프로세스 업로드 스크립트
```bash
#!/bin/bash
# scripts/upload-process.sh

PROCESS_FILE=$1
FILESERVER="//fileserver/shared/processes/"

# 메타데이터 검증
echo "📋 메타데이터 검증 중..."
node scripts/validate-process.js "$PROCESS_FILE"

if [ $? -ne 0 ]; then
  echo "❌ 검증 실패"
  exit 1
fi

# 파일 서버 업로드
echo "📤 업로드 중..."
cp "$PROCESS_FILE" "$FILESERVER"

# 레지스트리 업데이트
echo "📝 레지스트리 업데이트 중..."
node scripts/register-process.js "$PROCESS_FILE"

echo "✅ 업로드 완료!"
```

### 2️⃣ 프로세스 다운로드 스크립트
```bash
#!/bin/bash
# scripts/download-process.sh

PROCESS_ID=$1
FILESERVER="//fileserver/shared/processes/"

# 레지스트리에서 메타데이터 확인
echo "📋 프로세스 정보 확인 중..."
curl "$FILESERVER/process-registry.json" | jq ".processes[] | select(.id==\"$PROCESS_ID\")"

read -p "다운로드하시겠습니까? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  curl "$FILESERVER/$PROCESS_ID.json" -o "./$PROCESS_ID.json"
  echo "✅ 다운로드 완료: ./$PROCESS_ID.json"
fi
```

---

## 📱 UI 통합 (설정 페이지)

### 프로세스 브라우저
```typescript
// app/(dashboard)/settings/page.tsx - 프로세스 탭

<TabsContent value="processes">
  <Card>
    <CardHeader>
      <CardTitle>프로세스 라이브러리</CardTitle>
      <CardDescription>
        파일 서버에서 공유된 프로세스를 다운로드하세요
      </CardDescription>
    </CardHeader>
    <CardContent>
      {/* 검색 */}
      <Input
        placeholder="프로세스 검색..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* 프로세스 목록 */}
      <div className="grid gap-4 mt-4">
        {filteredProcesses.map((process) => (
          <ProcessCard
            key={process.id}
            process={process}
            onDownload={() => downloadProcess(process.id)}
          />
        ))}
      </div>

      {/* 내 프로세스 업로드 */}
      <div className="mt-6">
        <Button onClick={uploadProcess}>
          <Upload className="mr-2" />
          내 프로세스 공유하기
        </Button>
      </div>
    </CardContent>
  </Card>
</TabsContent>
```

---

## 🎯 최종 체크리스트

### 담당자 (프로세스 생성자)
- [ ] 프로세스 빌더에서 프로세스 생성
- [ ] 메타데이터 입력 (부서, 버전, 설명)
- [ ] JSON 파일 저장
- [ ] 파일 서버 업로드
- [ ] 레지스트리 업데이트

### 직원 (프로세스 사용자)
- [ ] 설정 페이지 → 프로세스 탭 열기
- [ ] 필요한 프로세스 검색
- [ ] 다운로드 버튼 클릭
- [ ] 프로세스 실행기에서 불러오기
- [ ] 단계별 체크/메모

### IT 관리자 (선택)
- [ ] 파일 서버 폴더 권한 설정
- [ ] 레지스트리 자동 업데이트 스크립트
- [ ] 백업 정책 (주 1회)
- [ ] 사용 통계 모니터링

---

**작성자**: Claude Code
**관련 문서**: [multi-tenant-rag/SHARING_GUIDE.md](../multi-tenant-rag/SHARING_GUIDE.md) (RAG DB 공유 방식)
