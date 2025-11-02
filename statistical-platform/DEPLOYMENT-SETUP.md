# 📦 배포 환경 설정 가이드

**목적**: sql.js WASM 파일 공급 및 스트리밍 API 최적화

---

## 🚀 **Step 1: sql.js WASM 파일 준비** (필수)

### **문제**
- 오프라인 환경에서 RAG 초기화 실패
- `public/sql-wasm/` 폴더가 없음

### **해결 방법**

#### **Option A: 자동 다운로드 스크립트 (권장)**

**Linux/Mac:**
```bash
cd statistical-platform
bash scripts/download-sql-wasm.sh
```

**Windows (PowerShell):**
```powershell
cd statistical-platform
powershell -ExecutionPolicy Bypass -File scripts/download-sql-wasm.ps1
```

**Node.js (크로스 플랫폼):**
```bash
cd statistical-platform
node -e "require('child_process').execSync('curl -L -o public/sql-wasm/sql-wasm.js https://sql.js.org/dist/sql-wasm.js'); require('child_process').execSync('curl -L -o public/sql-wasm/sql-wasm.wasm https://sql.js.org/dist/sql-wasm.wasm');"
```

#### **Option B: 수동 다운로드**

1. 폴더 생성:
```bash
mkdir -p public/sql-wasm
```

2. 파일 다운로드:
   - [sql-wasm.js](https://sql.js.org/dist/sql-wasm.js) → `public/sql-wasm/sql-wasm.js`
   - [sql-wasm.wasm](https://sql.js.org/dist/sql-wasm.wasm) → `public/sql-wasm/sql-wasm.wasm`

3. 파일 검증:
```bash
ls -lh public/sql-wasm/
# 예상: 각 파일 ~1.5MB
```

### **배포 시 확인**

```bash
# git에 포함되는지 확인
git status public/sql-wasm/

# 빌드에 포함되는지 확인
npm run build
ls -la .next/static/sql-wasm/

# 또는 최종 배포 파일에 포함되는지 확인
cat .next/BUILD_ID  # 빌드 ID 기록
```

---

## ⚙️ **Step 2: 스트리밍 API 최적화**

### **문제**
- 정적 배포 시 `/api/rag/stream` 엔드포인트가 없음
- 매 호출마다 404 에러 발생 후 비스트리밍 모드로 폴백
- 사용자가 "생각 중..." 으로 느껴짐

### **해결: 환경변수 기반 제어**

#### **개발 환경 (.env.local)**

```bash
NEXT_PUBLIC_ENABLE_STREAMING=true
```

**효과**:
- ✅ `/api/rag/stream` 사용 (빠른 스트리밍)
- ✅ 로컬에서 완전한 RAG 기능

#### **프로덕션 환경 정적 배포 (.env.production)**

```bash
NEXT_PUBLIC_ENABLE_STREAMING=false
```

**효과**:
- ✅ `/api/rag/stream` 호출 시도 안 함 (404 방지)
- ✅ 초기 응답(`initialResponse.answer`)으로 완전한 답변 제공
- ✅ 콘솔 에러 없음

#### **Docker/K8s 환경 (선택)**

```dockerfile
# Dockerfile
ENV NEXT_PUBLIC_ENABLE_STREAMING=true  # 또는 false
RUN npm run build
```

또는 런타임에:
```bash
docker run -e NEXT_PUBLIC_ENABLE_STREAMING=false ...
```

---

## 📋 **배포 체크리스트**

### **오프라인 배포 (로컬 Ollama)**

```bash
□ public/sql-wasm/ 폴더 생성
□ sql-wasm.js, sql-wasm.wasm 다운로드
□ .env.production 파일 확인 (NEXT_PUBLIC_ENABLE_STREAMING=false)
□ npm run build 성공
□ .next/static/ 에 sql-wasm 파일 포함 확인
□ 오프라인 환경에서 RAG 테스트
  - 옛날(처음 로드): SQL.js 초기화 확인
  - 채팅: 답변이 정상적으로 나오는지 확인
```

### **온라인 배포 (CDN/Server)**

```bash
□ .env.production 파일 확인 (배포 방식에 따라)
  - 별도 API 서버 있음: NEXT_PUBLIC_ENABLE_STREAMING=true
  - 정적 배포만: NEXT_PUBLIC_ENABLE_STREAMING=false
□ sql-wasm 파일 포함 확인 (권장)
□ npm run build 성공
□ 스트리밍 테스트 (또는 폴백 테스트)
□ 콘솔 에러 확인 (404가 없어야 함)
```

---

## 🔧 **환경변수 상세 설명**

### `NEXT_PUBLIC_ENABLE_STREAMING`

| 값 | 환경 | 동작 | 장점 | 단점 |
|---|------|------|------|------|
| **true** | 개발 (로컬 Next.js) | /api/rag/stream 사용 | 빠른 응답 | API 필요 |
| **false** | 정적 배포 | initialResponse 사용 | 404 없음 | 약간 느림 |

### 우선순위 결정 트리

```
배포 방식?
├─ Next.js 서버 + /api/rag/stream 구현
│  └─ true (스트리밍 사용)
├─ 정적 HTML (CDN/S3/GitHub Pages)
│  └─ false (스트리밍 비활성화)
└─ Docker + 커스텀 API 서버
   └─ true (API 프록시로 /api/rag/stream 제공)
```

---

## ✅ **검증 방법**

### **sql.js 파일 확인**

```bash
# 파일 존재 여부
test -f public/sql-wasm/sql-wasm.js && echo "✅ js 파일 OK"
test -f public/sql-wasm/sql-wasm.wasm && echo "✅ wasm 파일 OK"

# 빌드 후 포함 확인
npm run build
test -d .next/static && echo "✅ 빌드 완료"

# 브라우저 DevTools에서 확인
# Network 탭 → sql-wasm 검색 → 상태 200 (정상)
```

### **스트리밍 최적화 확인**

```bash
# 환경변수 확인
grep NEXT_PUBLIC_ENABLE_STREAMING .env.production

# 콘솔 에러 확인
npm run dev
# 브라우저 DevTools → Console 탭
# "POST /api/rag/stream 404" 에러 없어야 함
```

---

## 🚨 **문제 해결**

### **문제: 오프라인에서 RAG 작동 안 함**

```bash
# 1. sql-wasm 파일 확인
ls -la public/sql-wasm/
# sql-wasm.js, sql-wasm.wasm 모두 있는지 확인

# 2. 빌드 재시도
rm -rf .next
npm run build

# 3. 파일 크기 확인 (0 바이트면 다운로드 실패)
du -h public/sql-wasm/sql-wasm.*
```

### **문제: 콘솔에 404 에러**

```bash
# .env.production 확인
cat .env.production
# NEXT_PUBLIC_ENABLE_STREAMING=false 이어야 함

# npm run build로 재빌드 (환경변수 반영)
npm run build

# 캐시 삭제 (브라우저)
# DevTools → Application → Clear site data
```

### **문제: "생각 중..." 이 오래 걸림**

```bash
# 정적 배포에서는 정상
# (스트리밍 없이 초기 응답을 받기 때문)

# 만약 Next.js 서버라면:
# 1. /api/rag/stream 엔드포인트 확인
# 2. NEXT_PUBLIC_ENABLE_STREAMING=true 확인
```

---

## 📚 **관련 문서**

- [DEPLOYMENT-ISSUES.md](DEPLOYMENT-ISSUES.md) - 배포 이슈 분석
- [FINAL-CODE-REVIEW.md](FINAL-CODE-REVIEW.md) - 최종 코드 리뷰

---

## 🎯 **배포 명령어 요약**

```bash
# 1️⃣ sql.js 파일 준비
bash scripts/download-sql-wasm.sh  # Linux/Mac
# 또는
powershell -ExecutionPolicy Bypass -File scripts/download-sql-wasm.ps1  # Windows

# 2️⃣ 파일 git에 추가
git add public/sql-wasm/
git commit -m "chore: sql.js WASM 파일 추가"

# 3️⃣ 환경변수 설정
cat .env.production  # 확인: NEXT_PUBLIC_ENABLE_STREAMING=false

# 4️⃣ 빌드
npm run build

# 5️⃣ 배포
npm run start  # 또는 정적 파일 배포 (CDN 등)
```

---

**Generated**: 2025-11-02
**Status**: ✅ **배포 준비 완료**
