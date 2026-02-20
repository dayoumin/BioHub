# 회사 배포 가이드 (Company Deployment Guide)

**대상**: 회사 서버 관리자 / DevOps 팀
**목적**: 통계 플랫폼을 회사 환경에 배포하기 위한 체크리스트

---

## 📋 배포 전 준비사항

### 1. 환경변수 설정 (필수)

회사 서버에 다음 환경변수를 설정해야 합니다:

#### Vercel 클라우드 배포 (인터넷 연결 가능)
```bash
# Vercel Dashboard → Settings → Environment Variables
NEXT_PUBLIC_PYODIDE_USE_WORKER=true
NEXT_PUBLIC_ENABLE_STREAMING=true
```

#### 로컬 서버 배포 (Node.js)
```bash
# 서버에 .env.local 파일 생성
cp .env.local.example .env.local

# 내용:
NEXT_PUBLIC_PYODIDE_USE_WORKER=true
NEXT_PUBLIC_ENABLE_STREAMING=true
```

#### HTML 정적 배포 (폐쇄망 환경)
```bash
# 빌드 시점에 환경변수 주입 (배포 후 .env.local 불필요)
NEXT_PUBLIC_PYODIDE_USE_WORKER=true \
NEXT_PUBLIC_ENABLE_STREAMING=true \
NEXT_PUBLIC_PYODIDE_USE_LOCAL=true \
npm run build
```

---

## 🚀 배포 시나리오별 가이드

### 시나리오 1: Vercel 클라우드 배포 (권장)

**장점**: 자동 배포, CDN, 무료 HTTPS
**단점**: 인터넷 연결 필수

**배포 절차**:
1. Vercel 계정 생성 (https://vercel.com)
2. GitHub 저장소 연결
3. Environment Variables 설정:
   ```
   NEXT_PUBLIC_PYODIDE_USE_WORKER=true
   NEXT_PUBLIC_ENABLE_STREAMING=true
   ```
4. Deploy 버튼 클릭
5. 배포 완료 (자동 HTTPS 적용)

**예상 배포 시간**: 5분
**예상 빌드 크기**: ~50MB (Pyodide CDN 사용)

---

### 시나리오 2: 로컬 Node.js 서버 (회사 내부망)

**장점**: 회사 내부망에서 독립 실행
**단점**: Node.js 런타임 필요

**배포 절차**:
1. **서버 환경 준비**:
   ```bash
   # Node.js 18+ 설치 확인
   node --version  # v18.0.0 이상
   npm --version   # v9.0.0 이상
   ```

2. **프로젝트 배포**:
   ```bash
   # 1. 소스코드 복사
   cd /var/www/statistics-platform
   git clone https://github.com/your-repo/statistics.git .

   # 2. 의존성 설치
   cd stats
   npm install

   # 3. 환경변수 설정
   cp .env.local.example .env.local
   # .env.local 파일 수정:
   # NEXT_PUBLIC_PYODIDE_USE_WORKER=true
   # NEXT_PUBLIC_ENABLE_STREAMING=true

   # 4. 빌드
   npm run build

   # 5. 서버 시작
   npm start
   # → http://localhost:3000 에서 실행
   ```

3. **Nginx 리버스 프록시 설정** (옵션):
   ```nginx
   # /etc/nginx/sites-available/statistics
   server {
       listen 80;
       server_name statistics.company.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **PM2로 프로세스 관리** (권장):
   ```bash
   # PM2 설치
   npm install -g pm2

   # 서버 시작
   pm2 start npm --name "statistics" -- start

   # 부팅 시 자동 시작
   pm2 startup
   pm2 save
   ```

**예상 배포 시간**: 30분
**예상 서버 리소스**: CPU 1 Core, RAM 2GB

---

### 시나리오 3: HTML 정적 배포 (폐쇄망 환경) ⭐ 권장

**장점**: 완전 오프라인, 빠른 로딩, 간단한 배포
**단점**: 빌드 크기 큼 (~250MB)

**배포 절차**:

1. **로컬 개발 환경에서 빌드** (인터넷 연결 필요):
   ```bash
   # 1. Pyodide 다운로드 (200MB, 최초 1회)
   npm run setup:pyodide

   # 2. 환경변수와 함께 빌드
   NEXT_PUBLIC_PYODIDE_USE_WORKER=true \
   NEXT_PUBLIC_ENABLE_STREAMING=true \
   NEXT_PUBLIC_PYODIDE_USE_LOCAL=true \
   npm run build

   # 결과: out/ 폴더 생성 (약 250MB)
   ```

2. **out/ 폴더를 회사 서버로 복사**:
   ```bash
   # 방법 1: USB
   cp -r out/ /media/usb/statistics-platform/

   # 방법 2: SCP (내부망)
   scp -r out/ admin@company-server:/var/www/statistics/

   # 방법 3: ZIP 압축 후 전송
   zip -r statistics-platform.zip out/
   # → 회사 서버에서 압축 해제
   ```

3. **회사 서버에서 배포** (Nginx 예시):
   ```bash
   # 1. Nginx 설치 확인
   nginx -v

   # 2. 파일 복사
   sudo cp -r out/* /var/www/html/statistics/

   # 3. Nginx 설정
   sudo nano /etc/nginx/sites-available/statistics
   ```

   ```nginx
   server {
       listen 80;
       server_name statistics.company.com;
       root /var/www/html/statistics;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # MIME 타입 설정 (중요!)
       location ~* \.(wasm|data)$ {
           types {
               application/wasm wasm;
               application/octet-stream data;
           }
       }
   }
   ```

   ```bash
   # 4. Nginx 재시작
   sudo ln -s /etc/nginx/sites-available/statistics /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **접속 확인**:
   ```
   http://statistics.company.com
   또는
   http://192.168.1.100/statistics
   ```

**예상 배포 시간**: 15분 (파일 복사 시간 제외)
**예상 디스크 용량**: 250MB

---

## ✅ 배포 후 검증 체크리스트

### 1. 기본 기능 테스트
- [ ] 페이지 정상 로딩 (http://your-server/statistics)
- [ ] 통계 페이지 접근 (예: Independent T-test)
- [ ] 데이터 업로드 기능 동작

### 2. Pyodide Web Worker 확인
- [ ] 브라우저 개발자 도구(F12) → Console 열기
- [ ] 다음 메시지 확인:
  ```
  [PyodideCore] Initializing with Web Worker mode
  [PyodideCore] Worker initialized successfully
  ```
- [ ] ❌ 만약 "Main Thread mode" 표시 시 → 환경변수 미적용 (재빌드 필요)

### 3. 통계 계산 테스트
- [ ] Independent T-test 페이지 열기
- [ ] 샘플 데이터 입력
- [ ] "분석" 버튼 클릭
- [ ] 결과 표시 확인 (p-value, 그래프 등)
- [ ] 분석 중 UI 블로킹 없음 확인 (마우스 이동 가능)

### 4. RAG 채팅 테스트 (옵션)
- [ ] 좌측 패널 또는 플로팅 버튼으로 채팅 열기
- [ ] 질문 입력 (예: "t-test의 가정은?")
- [ ] 응답 생성 확인

**참고**: RAG 채팅은 **Ollama 서버가 설치된 경우**에만 작동합니다.
Ollama 미설치 시 "Ollama 서버에 연결할 수 없습니다" 메시지 표시 (정상 동작).

### 5. 동시 실행 테스트 (중요!)
- [ ] 통계 분석 시작 (예: One-way ANOVA)
- [ ] 분석 진행 중 채팅 열기
- [ ] 채팅에 질문 입력
- [ ] **둘 다 동시 동작** 확인 (Web Worker 활성화 시)

---

## 🔧 트러블슈팅

### 문제 1: "Failed to load Pyodide" 에러

**원인**: 오프라인 환경에서 Pyodide CDN 접근 실패

**해결**:
1. 빌드 시 `NEXT_PUBLIC_PYODIDE_USE_LOCAL=true` 환경변수 추가
2. `npm run setup:pyodide` 실행 확인
3. `public/pyodide/` 폴더 존재 확인 (200MB)

---

### 문제 2: 통계 분석 중 화면 멈춤

**원인**: Web Worker 미활성화 (Main Thread 사용)

**해결**:
1. 브라우저 콘솔에서 "Main Thread mode" 메시지 확인
2. 빌드 시 환경변수 확인:
   ```bash
   # Vercel: Dashboard에서 설정
   # Node.js: .env.local 파일 확인
   # HTML: 빌드 명령어에 환경변수 포함
   NEXT_PUBLIC_PYODIDE_USE_WORKER=true npm run build
   ```
3. 재빌드 후 재배포

---

### 문제 3: Nginx에서 404 에러

**원인**: Next.js 라우팅 미설정

**해결**:
```nginx
# Nginx 설정에 추가
location / {
    try_files $uri $uri/ /index.html;  # ← 이 줄 추가
}
```

---

### 문제 4: WASM 파일 로딩 실패

**원인**: MIME 타입 미설정

**해결**:
```nginx
# Nginx 설정에 추가
location ~* \.(wasm|data)$ {
    types {
        application/wasm wasm;
        application/octet-stream data;
    }
}
```

---

## 📞 지원 및 문의

**기술 지원**:
- GitHub Issues: https://github.com/your-repo/statistics/issues
- 이메일: support@company.com

**문서 버전**: 1.0.0 (2025-11-16)

---

## 부록: 환경변수 전체 목록

| 변수명 | 필수 | 기본값 | 설명 |
|--------|------|--------|------|
| `NEXT_PUBLIC_PYODIDE_USE_WORKER` | ✅ | `false` | Web Worker 사용 (true 권장) |
| `NEXT_PUBLIC_ENABLE_STREAMING` | ✅ | `false` | RAG 스트리밍 활성화 |
| `NEXT_PUBLIC_PYODIDE_USE_LOCAL` | 🟡 | `false` | 오프라인 배포 시 true |
| `NEXT_PUBLIC_OLLAMA_ENDPOINT` | 🟡 | `http://localhost:11434` | Ollama 서버 주소 |

**범례**:
- ✅ 필수: 모든 배포 시나리오에서 필요
- 🟡 선택: 특정 시나리오에서만 필요
