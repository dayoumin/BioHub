# 회사 환경 배포 가이드

**목적**: 폐쇄망/방화벽 환경에서 안전하게 배포하기

---

## 🏢 회사 환경별 배포 방법

### 시나리오 A: 인터넷 접속 가능 (일반 회사)

#### 배포 방법: Vercel (권장)
```bash
# 1. Vercel 배포
vercel deploy --prod

# 2. 환경변수 설정 (선택)
NEXT_PUBLIC_OLLAMA_ENDPOINT=http://localhost:11434
```

**장점**:
- ✅ CDN으로 Pyodide 자동 다운로드
- ✅ 빌드 크기 작음 (~50MB)
- ✅ 배포 간편

**단점**:
- ⚠️ Ollama는 로컬에서만 실행 가능 (방화벽 차단 가능)

**해결책**: Ollama 없이도 사용 가능
```typescript
// Ollama 미설치 시 → 경고만 표시, 기능은 작동
if (ollamaStatus === 'unavailable') {
  // 통계 계산은 정상 작동 (Pyodide)
  // RAG 챗봇만 비활성화
}
```

---

### 시나리오 B: 폐쇄망 환경 (군대/병원/연구소)

#### 배포 방법: 로컬 HTML 빌드
```bash
# 1. 오프라인 빌드
npm run build:offline

# 2. 결과물 복사
cp -r .next/static/* /path/to/deploy/
cp -r public/* /path/to/deploy/
```

**필수 준비**:
1. ✅ Pyodide 다운로드 (200MB)
   ```bash
   npm run setup:pyodide
   ```

2. ✅ Ollama 모델 다운로드 (선택)
   ```bash
   ollama pull qwen3-embedding:0.6b
   ollama pull qwen3:4b
   ```

3. ✅ 환경변수 설정
   ```bash
   NEXT_PUBLIC_PYODIDE_USE_LOCAL=true
   ```

**장점**:
- ✅ 완전 오프라인 동작
- ✅ 인터넷 없이 모든 기능 사용

**단점**:
- ⚠️ 초기 다운로드 큼 (~250MB)

---

## 🔒 보안 고려사항

### 1. 방화벽 규칙

#### Vercel 배포 시
```
허용 필요:
- *.vercel.app (배포 도메인)
- cdn.jsdelivr.net (Pyodide CDN)

차단 가능:
- localhost:11434 (Ollama - 선택)
```

#### 로컬 배포 시
```
차단 가능:
- 모든 외부 URL (완전 오프라인)
```

### 2. 데이터 저장

**모든 데이터는 브라우저에만 저장됩니다**:
```
localStorage:
  - 챗봇 세션 (chat-sessions)
  - 설정 (chat-settings)

IndexedDB:
  - RAG 문서 (documents, embeddings)
  - SQLite DB (vector-store)
```

**서버에 전송되는 데이터**: 없음 ✅

### 3. Ollama 보안

**Ollama는 로컬에서만 실행**:
```
localhost:11434 (외부 접근 불가)
```

**방화벽 설정**:
```bash
# Ollama 외부 접근 차단 (기본값)
netsh advfirewall firewall add rule ^
  name="Block Ollama External" ^
  dir=in ^
  action=block ^
  protocol=TCP ^
  localport=11434
```

---

## 🧪 회사에서 테스트하기

### Step 1: 로컬 테스트
```bash
# 1. 개발 서버 실행
npm run dev

# 2. 브라우저 테스트
http://localhost:3005
```

### Step 2: 빌드 테스트
```bash
# 1. 프로덕션 빌드
npm run build

# 2. 프로덕션 서버 실행
npm start

# 3. 브라우저 테스트
http://localhost:3000
```

### Step 3: 오프라인 테스트
```bash
# 1. 네트워크 비활성화
# Wi-Fi/이더넷 끄기

# 2. 오프라인 빌드
NEXT_PUBLIC_PYODIDE_USE_LOCAL=true npm run build

# 3. 테스트
npm start
```

---

## 📦 배포 체크리스트

### Vercel 배포 전
- [ ] package.json 정리 (불필요한 의존성 제거)
- [ ] 환경변수 확인 (.env.production)
- [ ] 빌드 성공 확인 (`npm run build`)
- [ ] TypeScript 에러 0개 (`npx tsc --noEmit`)
- [ ] 테스트 통과 (`npm test`)

### 로컬 HTML 배포 전
- [ ] Pyodide 다운로드 (`npm run setup:pyodide`)
- [ ] 오프라인 빌드 성공 (`npm run build:offline`)
- [ ] 네트워크 비활성화 테스트
- [ ] 모든 기능 동작 확인

### 회사 환경 배포 전
- [ ] IT 부서 승인 (방화벽 규칙)
- [ ] 보안 정책 확인 (브라우저 제한, 포트 차단 등)
- [ ] 사용자 교육 자료 준비
- [ ] 긴급 연락처 공유

---

## ⚠️ 회사 환경에서 발생 가능한 문제

### 문제 1: Ollama 연결 실패
**증상**: "RAG 챗봇을 사용하려면 Ollama 설치가 필요합니다"

**원인**:
- 방화벽이 localhost:11434 차단
- Ollama 미설치

**해결**:
```bash
# 방화벽 예외 추가
# IT 부서에 요청: localhost:11434 허용

# 또는 Ollama 없이 사용
# → 통계 계산만 가능, RAG 챗봇 비활성화
```

### 문제 2: Pyodide 로딩 실패
**증상**: "Pyodide를 로드할 수 없습니다"

**원인**:
- CDN 차단 (cdn.jsdelivr.net)
- 방화벽 정책

**해결**:
```bash
# 로컬 Pyodide 사용
NEXT_PUBLIC_PYODIDE_USE_LOCAL=true
npm run setup:pyodide
npm run build
```

### 문제 3: CORS 에러
**증상**: "Cross-Origin Request Blocked"

**원인**:
- 브라우저 보안 정책
- 프록시 서버

**해결**:
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ]
  },
}
```

---

## 🚀 배포 시나리오별 명령어

### 시나리오 1: Vercel (인터넷 O)
```bash
# 배포
vercel deploy --prod

# 확인
https://your-project.vercel.app
```

### 시나리오 2: 로컬 서버 (인터넷 X)
```bash
# 빌드
NEXT_PUBLIC_PYODIDE_USE_LOCAL=true npm run build:offline

# 실행
npm start

# 확인
http://localhost:3000
```

### 시나리오 3: 정적 HTML (폐쇄망)
```bash
# 정적 빌드
npm run build
npm run export

# 배포
cp -r out/* /var/www/html/

# 확인
http://your-server/
```

---

## 📞 회사 IT 부서 요청 사항

### 방화벽 예외 요청
```
담당자: [IT 부서]
요청 사항:

1. CDN 허용 (선택):
   - cdn.jsdelivr.net (Pyodide)

2. 로컬 포트 허용 (선택):
   - localhost:11434 (Ollama)

3. 브라우저 기능 허용:
   - localStorage
   - IndexedDB
   - WebAssembly
```

### 브라우저 정책 확인
```
필수 기능:
- ✅ localStorage (세션 저장)
- ✅ IndexedDB (문서 저장)
- ✅ WebAssembly (통계 계산)

차단 시 영향:
- ❌ localStorage 차단 → 세션 저장 불가
- ❌ IndexedDB 차단 → RAG 문서 저장 불가
- ❌ WASM 차단 → 통계 계산 불가
```

---

## 🎯 권장 배포 방법

### 일반 회사 (인터넷 O)
```
1순위: Vercel 배포
  → 간편, CDN 활용, 무료

2순위: Docker 컨테이너
  → 사내 서버, 확장성
```

### 폐쇄망 회사 (인터넷 X)
```
1순위: 로컬 HTML 빌드
  → 완전 오프라인

2순위: 사내 서버 배포
  → Nginx/Apache
```

---

**Updated**: 2025-11-16
**Author**: Claude Code
**Version**: 1.0
