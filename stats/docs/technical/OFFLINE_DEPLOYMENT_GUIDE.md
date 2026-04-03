# 오프라인 / 회사 환경 배포 가이드

폐쇄망(인터넷 차단) 또는 회사 내부망 환경에서 통계 플랫폼을 배포하는 방법입니다.

> **참고**: MVP 운영 배포는 Cloudflare Pages (`wrangler.toml`) 사용.
> 이 문서는 기업 납품 / 폐쇄망 시나리오 검토용입니다.

---

## 📋 목차

1. [배포 방식 선택](#1-배포-방식-선택)
2. [Pyodide 오프라인 준비](#2-pyodide-오프라인-준비)
3. [시나리오 A: HTML 정적 배포 (폐쇄망)](#3-시나리오-a-html-정적-배포-폐쇄망)
4. [시나리오 B: 내부망 Node.js 서버](#4-시나리오-b-내부망-nodejs-서버)
5. [배포 후 검증](#5-배포-후-검증)
6. [트러블슈팅](#6-트러블슈팅)
7. [보안 고려사항](#7-보안-고려사항)
8. [FAQ](#8-faq)

---

## 1. 배포 방식 선택

| 항목 | HTML 정적 배포 | Node.js 서버 배포 |
|------|--------------|-----------------|
| **대상** | 완전 폐쇄망 (USB 전달) | 회사 내부망 서버 |
| **인터넷** | 불필요 | 불필요 |
| **서버 필요** | ❌ (Nginx/Apache) | ✅ (Node.js 18+) |
| **파일 크기** | ~250 MB (Pyodide 포함) | ~250 MB |
| **업데이트** | ZIP 재전달 | git pull + 재빌드 |
| **권장** | 군대/병원/연구소 | 회사 내부 서버 |

---

## 2. Pyodide 오프라인 준비

인터넷 연결된 PC에서 먼저 실행.

### 2-1. 자동 다운로드 (권장)

```bash
cd stats
pnpm setup:pyodide
```

### 2-2. 수동 다운로드

```bash
# Pyodide v0.28.3 다운로드
wget https://github.com/pyodide/pyodide/releases/download/0.28.3/pyodide-0.28.3.tar.bz2
tar -xjf pyodide-0.28.3.tar.bz2

# 프로젝트에 복사
mkdir -p stats/public/pyodide
cp -r pyodide/* stats/public/pyodide/
```

**생성 구조** (약 200 MB):
```
public/pyodide/
├── pyodide.js           # 진입점
├── pyodide.asm.wasm     # Python 런타임 (50 MB)
├── python_stdlib.zip    # 표준 라이브러리
├── packages.json
└── packages/
    ├── numpy.*          # 15 MB
    ├── scipy.*          # 30 MB
    ├── pandas.*         # 20 MB
    └── statsmodels.*    # 10 MB
```

### 2-3. 환경변수 설정

`.env.local`:
```bash
NEXT_PUBLIC_PYODIDE_USE_LOCAL=true
NEXT_PUBLIC_PYODIDE_LOCAL_PATH=/pyodide/
```

---

## 3. 시나리오 A: HTML 정적 배포 (폐쇄망)

### 빌드

```bash
cd stats
pnpm build
# → out/ 폴더 생성 (~250 MB)
```

### 배포

```bash
# Nginx 예시
sudo cp -r out/* /var/www/html/statistics/
```

```nginx
# /etc/nginx/sites-available/statistics
server {
    listen 80;
    server_name statistics.company.com;
    root /var/www/html/statistics;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # WASM MIME 타입 (필수)
    location ~* \.(wasm|data)$ {
        types {
            application/wasm wasm;
            application/octet-stream data;
        }
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/statistics /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

### 사용자 전달 (USB)

```bash
zip -r statistics-offline.zip out/
# → USB로 전달 → 압축 해제 → index.html 실행
```

**CORS 문제 발생 시** (file:// 직접 실행): `run.bat` 동봉
```bat
@echo off
cd out
npx serve .
```

---

## 4. 시나리오 B: 내부망 Node.js 서버

### 서버 준비

```bash
# Node.js 18+ 확인
node --version

# 프로젝트 복사
cd /var/www/statistics-platform
git clone https://github.com/your-repo/biohub.git .
cd stats
pnpm install
```

### 빌드 및 실행

```bash
pnpm build
pnpm start
# → http://localhost:3000
```

### Nginx 리버스 프록시

```nginx
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

### PM2로 프로세스 관리

```bash
npm install -g pm2
pm2 start npm --name "statistics" -- start
pm2 startup && pm2 save
```

---

## 5. 배포 후 검증

- [ ] 페이지 정상 로딩
- [ ] 브라우저 콘솔에서 Pyodide 로드 확인
  ```
  [Pyodide CDN] 오프라인 모드 활성화: /pyodide/
  [Pyodide Loader] Pyodide 초기화 완료 (local)
  ```
- [ ] CSV 파일 업로드 정상
- [ ] 통계 분석 실행 정상 (t-test 등)
- [ ] 인터넷 연결 끊고 재테스트

---

## 6. 트러블슈팅

### Pyodide 로드 실패
```
Error: Failed to load pyodide.js from /pyodide/pyodide.js
```
→ `out/pyodide/` 폴더 및 `pyodide.js` 존재 확인

### 패키지 로드 실패
```
Error: Could not load package 'numpy'
```
→ `out/pyodide/packages/numpy.*` 파일 확인

### Nginx 404 에러
→ `try_files $uri $uri/ /index.html;` 설정 확인

### WASM 로딩 실패
→ Nginx MIME 타입 설정 확인 (`application/wasm wasm`)

### 화면 멈춤 (통계 분석 중)
→ Web Worker 미활성화. 브라우저 콘솔 확인 후 재빌드:
```bash
NEXT_PUBLIC_PYODIDE_USE_WORKER=true pnpm build
```

---

## 7. 보안 고려사항

### 데이터 저장 위치

**모든 데이터는 브라우저에만 저장 (서버 전송 없음)**:
```
localStorage  : 설정, 세션
IndexedDB     : 분석 히스토리
```

### 브라우저 정책 (IT 부서 확인 사항)

```
필수 기능:
- ✅ WebAssembly  (통계 계산 — 차단 시 핵심 기능 마비)
- ✅ IndexedDB    (분석 히스토리)
- ✅ localStorage (설정 저장)
```

### IT 부서 방화벽 예외 요청 템플릿

```
요청 사항 (브라우저 정책):
1. WebAssembly(WASM) 실행 허용
2. IndexedDB 허용
3. localStorage 허용

요청 사항 (CDN — 오프라인 빌드 시 불필요):
4. cdn.jsdelivr.net 허용 (Pyodide, 온라인 모드 시만 필요)
```

---

## 8. FAQ

### Q. Pyodide 버전 업데이트 방법?
`public/pyodide/` 덮어쓰기 후 재빌드.

### Q. 필수 패키지만 포함 가능한가?

```bash
# 최소 구성 (~75 MB)
for pkg in numpy scipy pandas statsmodels; do
  cp pyodide/packages/${pkg}.* public/pyodide/packages/
done
```

### Q. 업데이트 전달 방법?
재빌드 후 ZIP 재전달. 자동 업데이트 불가 (오프라인 환경 특성).

---

**문서 버전**: 2.0 (2026-02-24, OFFLINE + COMPANY 가이드 통합)