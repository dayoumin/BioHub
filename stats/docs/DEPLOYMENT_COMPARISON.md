# 배포 방법 비교: HTML vs Vercel

**목적**: 두 가지 배포 방법의 장단점 비교

---

## 📊 비교 표

| 항목 | Vercel 배포 | HTML 정적 배포 |
|------|-------------|---------------|
| **빌드 크기** | ~50MB | ~250MB |
| **인터넷 필요** | ✅ 필요 (CDN) | ❌ 불필요 (오프라인) |
| **배포 속도** | ⚡ 빠름 (1분) | 🐢 느림 (수동) |
| **유지보수** | ✅ 자동 | ⚠️ 수동 |
| **비용** | 🆓 무료 | 🆓 무료 |
| **서버 필요** | ❌ 불필요 | ✅ 필요 (Nginx/Apache) |
| **HTTPS** | ✅ 자동 | ⚠️ 수동 설정 |
| **CDN** | ✅ 글로벌 | ❌ 없음 |
| **폐쇄망 지원** | ❌ 불가 | ✅ 가능 |

---

## 🚀 Vercel 배포

### 장점
1. **✅ 간편한 배포**
   ```bash
   npm run build
   vercel deploy --prod
   # → 1분 완료
   ```

2. **✅ 자동 HTTPS**
   - Let's Encrypt 인증서 자동 발급
   - https://your-project.vercel.app

3. **✅ 글로벌 CDN**
   - 전세계 엣지 서버
   - 빠른 로딩 속도

4. **✅ 무료 플랜**
   - 개인/소규모: 무료
   - 대역폭 제한: 100GB/월

5. **✅ 자동 업데이트**
   ```bash
   git push origin main
   # → Vercel 자동 배포
   ```

### 단점
1. **❌ 인터넷 필요**
   - Pyodide CDN (cdn.jsdelivr.net)
   - Vercel 서버 접속

2. **❌ 폐쇄망 불가**
   - 군대/병원 등 사용 불가

3. **❌ 제한적인 제어**
   - Vercel 서버 의존
   - 커스터마이징 제한

### 적합한 사용자
- ✅ 일반 사용자 (인터넷 O)
- ✅ 빠른 배포 원하는 사람
- ✅ 서버 관리 싫어하는 사람

### 배포 명령어
```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. 로그인
vercel login

# 3. 배포
vercel deploy --prod

# 결과: https://statistics-platform.vercel.app
```

---

## 🏠 HTML 정적 배포

### 장점
1. **✅ 완전 오프라인**
   - 인터넷 없이 동작
   - 폐쇄망 환경 가능

2. **✅ 완전한 제어**
   - 서버 직접 관리
   - 커스터마이징 자유

3. **✅ 보안 강화**
   - 외부 의존성 없음
   - 데이터 유출 걱정 없음

4. **✅ 속도 빠름** (로컬)
   - 로컬 네트워크 속도
   - CDN보다 빠를 수 있음

### 단점
1. **❌ 초기 설정 복잡**
   ```bash
   npm run setup:pyodide  # 200MB 다운로드
   npm run build:offline
   # → 서버 설정 필요
   ```

2. **❌ 빌드 크기 큼**
   - Pyodide 포함: 200MB
   - 총 크기: ~250MB

3. **❌ 수동 업데이트**
   ```bash
   git pull
   npm run build:offline
   sudo cp -r .next/static/* /var/www/html/
   sudo systemctl restart nginx
   ```

4. **❌ 서버 관리 필요**
   - Nginx/Apache 설정
   - SSL 인증서 수동 설치
   - 모니터링 직접 구축

### 적합한 사용자
- ✅ 폐쇄망 환경 (군대/병원/연구소)
- ✅ 완전한 제어 원하는 사람
- ✅ 보안 중시하는 조직

### 배포 명령어
```bash
# === 준비 단계 (외부 인터넷 연결 환경) ===

# 1. CDN 파일 다운로드
npm run setup:pyodide       # Pyodide (200MB)
npm run setup:sql-wasm      # SQL.js WASM (1MB)

# 2. Ollama 설치 파일 다운로드
# https://ollama.com/download

# 3. Ollama 모델 다운로드
ollama pull qwen3-embedding:0.6b  # 임베딩 모델 (~800MB)
ollama pull qwen3:4b              # 생성 모델 (~2.5GB)

# === 빌드 단계 ===

# 4. 오프라인 빌드
NEXT_PUBLIC_PYODIDE_USE_LOCAL=true npm run build

# 5. 정적 파일 생성
npm run export

# 6. 패키징 (USB 전달용)
zip -r statistics-platform.zip out/ public/pyodide/ public/sql-wasm/

# === 대상 환경 배포 (폐쇄망/오프라인) ===

# 7. USB에서 압축 해제
unzip statistics-platform.zip

# 8. 웹 서버 배포
sudo cp -r out/* /var/www/html/
sudo cp -r public/pyodide /var/www/html/
sudo cp -r public/sql-wasm /var/www/html/

# 9. Ollama 설치 (USB에서)
# Windows: OllamaSetup.exe 실행
# Mac: Ollama.dmg 실행
# Linux: sudo dpkg -i ollama.deb

# 10. 모델 파일 복사
# Windows: USB:\models\ → C:\Users\[사용자]\.ollama\models\
# Mac/Linux: cp -r /mnt/usb/models/* ~/.ollama/models/

# 11. Ollama 서비스 시작
ollama serve

# 12. Nginx 재시작
sudo systemctl restart nginx
```

**📦 전달 파일 구성** (USB/네트워크 드라이브):
```
statistics-platform/
├── statistics-platform.zip       # 웹 앱 (250MB)
├── OllamaSetup.exe               # Ollama 설치 파일 (Windows)
├── Ollama.dmg                    # Ollama 설치 파일 (Mac)
├── ollama.deb                    # Ollama 설치 파일 (Linux)
└── models/                       # Ollama 모델 파일
    ├── qwen3-embedding:0.6b/     # 임베딩 모델 (~800MB)
    └── qwen3:4b/                 # 생성 모델 (~2.5GB)

총 크기: ~3.5GB
```

---

## 🎯 배포 방법 선택 가이드

### 질문 1: 인터넷 접속 가능한가?
```
YES → Vercel 배포 (권장)
NO  → HTML 정적 배포
```

### 질문 2: 폐쇄망 환경인가?
```
YES → HTML 정적 배포 (필수)
NO  → Vercel 배포
```

### 질문 3: 서버 관리 경험이 있는가?
```
YES → HTML 정적 배포 (선택 가능)
NO  → Vercel 배포 (권장)
```

### 질문 4: 보안이 최우선인가?
```
YES → HTML 정적 배포 (외부 의존성 없음)
NO  → Vercel 배포 (편리함 우선)
```

---

## 📦 실제 배포 예시

### 예시 1: 개인 사용자 (Vercel)
```bash
# 상황: 개인 연구용, 인터넷 O
# 선택: Vercel

# 배포
vercel deploy --prod

# 결과
https://statistics-platform.vercel.app
```

### 예시 2: 대학 연구실 (HTML + Nginx)
```bash
# 상황: 연구실 서버, 인터넷 O, 자체 도메인
# 선택: HTML 정적 배포

# 배포
npm run build:offline
sudo cp -r out/* /var/www/html/

# 결과
https://stats.university.edu
```

### 예시 3: 군부대 (HTML + USB)
```bash
# 상황: 폐쇄망, 인터넷 X
# 선택: HTML 정적 배포 (USB 이동)

# 외부에서 빌드
npm run setup:pyodide
npm run build:offline
zip -r statistics-platform.zip out/

# USB 복사 → 내부망 서버 배포
unzip statistics-platform.zip
cp -r out/* /var/www/html/
```

---

## ⚙️ 환경변수 설정

### Vercel 배포 시
```bash
# .env.production
NEXT_PUBLIC_OLLAMA_ENDPOINT=http://localhost:11434  # 선택
NEXT_PUBLIC_ENABLE_STREAMING=true
NEXT_PUBLIC_PYODIDE_USE_LOCAL=false  # CDN 사용
```

### HTML 정적 배포 시
```bash
# .env.production
NEXT_PUBLIC_PYODIDE_USE_LOCAL=true  # 로컬 사용
NEXT_PUBLIC_ENABLE_STREAMING=true
NEXT_PUBLIC_OLLAMA_ENDPOINT=http://localhost:11434  # 선택
```

---

## 🔧 서버 설정 (HTML 배포)

### Nginx 설정
```nginx
# /etc/nginx/sites-available/statistics

server {
    listen 80;
    server_name stats.example.com;

    root /var/www/html/statistics;
    index index.html;

    # Pyodide WASM 파일
    location /pyodide/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # sql-wasm 파일
    location /sql-wasm/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Next.js 정적 파일
    location /_next/static/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # SPA 라우팅
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Apache 설정
```apache
# /etc/apache2/sites-available/statistics.conf

<VirtualHost *:80>
    ServerName stats.example.com
    DocumentRoot /var/www/html/statistics

    # Pyodide 캐싱
    <Directory /var/www/html/statistics/pyodide>
        Header set Cache-Control "public, max-age=31536000, immutable"
    </Directory>

    # WASM MIME 타입
    AddType application/wasm .wasm

    # SPA 라우팅
    <Directory /var/www/html/statistics>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted

        RewriteEngine On
        RewriteBase /
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

---

## 📊 비용 비교

### Vercel
```
무료 플랜:
- 대역폭: 100GB/월
- 빌드: 6000분/월
- 프로젝트: 무제한

Pro 플랜 ($20/월):
- 대역폭: 1TB/월
- 빌드: 24000분/월
- 팀 협업
```

### HTML 정적 배포
```
서버 비용:
- AWS EC2 t3.micro: $0.0104/시간 (~$7.5/월)
- DigitalOcean: $5/월
- 자체 서버: $0 (전기세만)

초기 비용:
- 도메인: $10/년
- SSL: $0 (Let's Encrypt)
```

---

## 🎉 최종 추천

### 개인/소규모 → Vercel ✨
```
이유:
- 무료
- 간편
- 자동 업데이트
- HTTPS 자동
```

### 회사/조직 → HTML 정적 배포 🏢
```
이유:
- 완전한 제어
- 보안 강화
- 폐쇄망 지원
- 커스터마이징
```

### 두 가지 모두 유지 → 하이브리드 🎯
```
상황별 선택:
- 외부 사용자: Vercel
- 내부 사용자: HTML (사내 서버)
```

---

**Updated**: 2025-11-16
**Author**: Claude Code
**Version**: 1.0
