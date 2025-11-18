# 배포 시나리오 가이드

**목적**: 통계 플랫폼의 2가지 배포 방식과 각 시나리오별 설정 방법

---

## 🎯 배포 시나리오 개요

이 프로젝트는 **2가지 배포 방식**을 지원합니다:

| 시나리오 | 대상 사용자 | 인터넷 | Pyodide 소스 | Ollama |
|---------|------------|--------|--------------|--------|
| **Vercel 클라우드 배포** | 일반 사용자 | ✅ 필요 | CDN (자동) | 선택 |
| **로컬 오프라인 배포** | 폐쇄망 환경 (군대/병원/연구소) | ❌ 불필요 | 로컬 번들 | 로컬 설치 |

---

## 📦 시나리오 1: Vercel 클라우드 배포

### 특징

- ✅ **CDN 자동 다운로드**: Pyodide를 CDN에서 자동으로 로드
- ✅ **백그라운드 로딩**: 앱 접속 시 자동으로 백그라운드에서 Pyodide 다운로드
- ✅ **통계 모듈 지연 로딩**: 통계 페이지 접속 시 필요한 모듈(SciPy, pandas 등)만 추가 다운로드
- ✅ **빌드 크기 절약**: 빌드 파일에 Pyodide가 포함되지 않아 ~50MB 유지
- 🟡 **Ollama 선택적**: RAG 기능 사용 시 별도 Ollama 서버 필요

### 환경변수 설정

#### 필수 환경변수 (없음)
- 기본 설정으로 바로 동작

#### 선택적 환경변수

**.env.local** (또는 Vercel 환경변수):
```bash
# Ollama 커스텀 엔드포인트 (RAG 기능 사용 시)
NEXT_PUBLIC_OLLAMA_ENDPOINT=https://your-ollama-server.com
```

### 빌드 및 배포

```bash
# 1. 프로젝트 루트에서
cd statistical-platform

# 2. 일반 빌드
npm run build

# 3. Vercel 배포
vercel deploy
```

### Pyodide 처리 방식

```typescript
// lib/services/pyodide-core.ts
const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide.js'

// 자동으로 CDN에서 로드 (NEXT_PUBLIC_PYODIDE_USE_LOCAL이 false인 경우)
```

**사용자 경험**:
1. 사용자가 통계 플랫폼 접속
2. 백그라운드에서 Pyodide CDN 로드 시작 (~200MB, 캐시됨)
3. 통계 페이지 접속 시 필요한 Python 패키지만 추가 다운로드
4. 이후 방문 시 브라우저 캐시로 빠른 로딩

### 장점
- ✅ 빌드 크기 작음 (~50MB)
- ✅ 배포 간편 (Vercel push만)
- ✅ CDN 글로벌 엣지 네트워크 활용
- ✅ 브라우저 캐시로 재방문 시 빠름

### 단점
- ❌ 첫 방문 시 Pyodide 로딩 시간 필요 (~200MB)
- ❌ 인터넷 필요
- ❌ RAG 기능 사용 시 로컬 Ollama 서버 + CORS 설정 필요

### RAG 기능 사용 시 (로컬 Ollama 연결)

**⚠️ 중요**: Vercel 배포 환경에서 RAG를 사용하려면 **사용자 PC에서 Ollama를 CORS 허용 모드로 실행**해야 합니다.

#### Windows 사용자

**PowerShell (관리자 권한)**:
```powershell
# 환경변수 설정 (세션 유지)
$env:OLLAMA_ORIGINS="https://stats-nifs.vercel.app,https://*.vercel.app"
ollama serve
```

**또는 시스템 환경변수 등록 (영구 설정)**:
1. `Win + X` → 시스템 → 고급 시스템 설정 → 환경 변수
2. 시스템 변수에서 `새로 만들기`:
   - 변수 이름: `OLLAMA_ORIGINS`
   - 변수 값: `https://stats-nifs.vercel.app,https://*.vercel.app`
3. Ollama 재시작

#### macOS/Linux 사용자

**터미널**:
```bash
# 환경변수 설정 후 Ollama 시작
OLLAMA_ORIGINS="https://stats-nifs.vercel.app,https://*.vercel.app" ollama serve
```

**또는 영구 설정 (~/.bashrc 또는 ~/.zshrc)**:
```bash
export OLLAMA_ORIGINS="https://stats-nifs.vercel.app,https://*.vercel.app"
```

#### CORS 설정 확인

```bash
# Ollama가 CORS를 허용하는지 테스트
curl -H "Origin: https://stats-nifs.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS http://localhost:11434/api/tags
```

**정상 응답 예시**:
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://stats-nifs.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

#### 사용자 가이드 메시지

앱 접속 시 Ollama가 감지되지 않으면 자동으로 표시되는 안내:

```
🔍 RAG 기능을 사용하려면 로컬 Ollama가 필요합니다

1. Ollama 설치: https://ollama.com
2. 환경변수 설정:
   Windows: $env:OLLAMA_ORIGINS="https://stats-nifs.vercel.app"
   macOS/Linux: OLLAMA_ORIGINS="https://stats-nifs.vercel.app" ollama serve
3. 필수 모델 다운로드: ollama pull mxbai-embed-large
```

---

## 🖥️ 시나리오 2: 로컬 오프라인 배포

### 특징

- ✅ **완전 오프라인**: 인터넷 없이 모든 기능 동작
- ✅ **빌드에 Pyodide 포함**: 200MB Pyodide가 빌드 파일에 번들됨
- ✅ **즉시 사용 가능**: 첫 실행부터 통계 분석 바로 가능
- ✅ **로컬 Ollama**: RAG 기능도 로컬에서 완전 동작
- 🟡 **빌드 크기 증가**: ~250MB (Pyodide 200MB + 앱 50MB)

### 사전 준비 (개발자 PC, 인터넷 연결 필요)

#### 1. Pyodide 다운로드

```bash
cd statistical-platform

# Pyodide 200MB 다운로드 (public/pyodide/에 저장)
npm run setup:pyodide
```

**출력 예시**:
```
📦 Pyodide 다운로드 및 설치 (오프라인 배포용)
📌 버전: v0.28.3
📥 다운로드 시작: ...
   진행률: 100% (50.00 MB / 50.00 MB)
✅ Pyodide 설치 완료!
```

#### 2. Ollama 모델 준비 (RAG 기능 사용 시)

**참고**: [deployment-package/OLLAMA_MODEL_SETUP.md](../../deployment-package/OLLAMA_MODEL_SETUP.md)

```bash
# Ollama 서버 시작
ollama serve

# 필수 모델 다운로드 (~700MB)
ollama pull mxbai-embed-large

# 선택 모델 다운로드
ollama pull deepseek-r1:7b  # ~5GB
```

### 환경변수 설정

**.env.local**:
```bash
# Pyodide 로컬 사용 (필수)
NEXT_PUBLIC_PYODIDE_USE_LOCAL=true

# Ollama 로컬 엔드포인트 (기본값이므로 생략 가능)
# NEXT_PUBLIC_OLLAMA_ENDPOINT=http://localhost:11434
```

### 빌드 및 배포

```bash
cd statistical-platform

# 방법 1: build:offline 스크립트 사용 (환경변수 자동 설정)
npm run build:offline

# 방법 2: 환경변수 직접 설정 후 일반 빌드
# .env.local에 NEXT_PUBLIC_PYODIDE_USE_LOCAL=true 설정 후
npm run build
```

**빌드 결과 확인**:
```bash
# 빌드 폴더 확인
ls -lh out/

# Pyodide 포함 확인
ls -lh out/pyodide/

# 빌드 크기 확인
du -sh out/
# → 약 250MB (Pyodide 200MB + 앱 50MB)
```

### 배포 패키지 구성

**USB/외장 하드로 전달할 파일**:

```
배포 패키지/
├── statistical-platform/
│   └── out/                      # 빌드 결과 (~250MB)
│       ├── index.html
│       ├── _next/
│       └── pyodide/              # Pyodide 번들 (200MB)
│           ├── pyodide.js
│           ├── pyodide.asm.wasm
│           └── packages/
├── ollama-models/                # Ollama 모델 (~2.2GB, 별도)
│   ├── mxbai-embed-large/
│   └── deepseek-r1/
└── deployment-guide.pdf          # 설치 가이드
```

### 오프라인 PC에서 실행

#### 1. 통계 플랫폼 실행

```bash
# out/ 폴더로 이동
cd statistical-platform/out

# 로컬 서버 실행
python -m http.server 8000

# 또는
npx serve .
```

#### 2. Ollama 모델 복원 (RAG 기능 사용 시)

```bash
# macOS/Linux
cp -r ollama-models ~/.ollama/models

# Windows
xcopy /E /I "ollama-models" "C:\Users\<사용자>\.ollama\models"

# Ollama 서버 시작
ollama serve
```

#### 3. 브라우저 접속

```
http://localhost:8000
```

### Pyodide 처리 방식

```typescript
// lib/services/pyodide-core.ts
const PYODIDE_LOCAL = '/pyodide/pyodide.js'

// NEXT_PUBLIC_PYODIDE_USE_LOCAL=true인 경우 로컬 경로 사용
```

**사용자 경험**:
1. 사용자가 통계 플랫폼 접속
2. 로컬 `/pyodide/pyodide.js`에서 즉시 로드 (캐시 필요 없음)
3. 통계 페이지 접속 시 즉시 분석 가능 (다운로드 없음)
4. 완전 오프라인 동작

### 장점
- ✅ 완전 오프라인 동작
- ✅ 첫 실행부터 즉시 사용 가능
- ✅ 인터넷 없이 모든 기능 동작
- ✅ 네트워크 지연 없음

### 단점
- ❌ 빌드 크기 큼 (~250MB)
- ❌ 사전 준비 필요 (Pyodide + Ollama 모델 다운로드)
- ❌ USB/외장 하드로 전달 필요

---

## 🔄 배포 시나리오 비교표

| 항목 | Vercel 클라우드 | 로컬 오프라인 | 임베디드 데스크탑 앱 |
|------|----------------|--------------|-------------------|
| **빌드 크기** | ~50MB | ~250MB | ~300MB (앱 + Pyodide) |
| **Pyodide 소스** | CDN (자동) | 로컬 번들 | 로컬 번들 |
| **Worker 코드** | public/workers/python | public/workers/python | worker-codes.js (내장) |
| **첫 로딩 시간** | ~10초 (다운로드) | ~1초 (즉시) | ~1초 (즉시) |
| **인터넷 필요** | ✅ 필요 | ❌ 불필요 | ❌ 불필요 |
| **Ollama 설정** | 선택 (RAG) | 로컬 설치 | 로컬 설치 |
| **배포 방법** | Vercel push | USB/하드 | 실행 파일 (.exe/.dmg) |
| **업데이트** | 자동 (Vercel) | 수동 (재배포) | 수동 (재빌드) |
| **대상 사용자** | 일반 사용자 | 폐쇄망 환경 | 데스크탑 앱 필요 사용자 |
| **Worker 동기화** | 불필요 | 불필요 | **필수** (embed-python-workers.js) |

---

## 🛠️ 환경변수 설정 가이드

### Vercel 클라우드 배포

**.env.local** (또는 Vercel Dashboard):
```bash
# Ollama 커스텀 엔드포인트 (선택)
NEXT_PUBLIC_OLLAMA_ENDPOINT=https://your-ollama-server.com
```

### 로컬 오프라인 배포

**.env.local**:
```bash
# Pyodide 로컬 사용 (필수)
NEXT_PUBLIC_PYODIDE_USE_LOCAL=true

# Ollama 로컬 엔드포인트 (기본값, 생략 가능)
# NEXT_PUBLIC_OLLAMA_ENDPOINT=http://localhost:11434
```

---

## 📋 빌드 명령어 요약

### Vercel 클라우드 배포
```bash
npm run build
vercel deploy
```

### 로컬 오프라인 배포
```bash
# 사전 준비
npm run setup:pyodide          # Pyodide 다운로드 (200MB)
ollama pull mxbai-embed-large  # Ollama 모델 다운로드

# 빌드
npm run build:offline          # 환경변수 자동 설정 + 빌드

# 또는
echo "NEXT_PUBLIC_PYODIDE_USE_LOCAL=true" > .env.local
npm run build
```

---

## 🧪 배포 검증

### Vercel 클라우드 배포 검증

```bash
# 1. 브라우저에서 Vercel URL 접속
# 2. 개발자 도구 (F12) → Network 탭
# 3. 통계 페이지 접속
# 4. ✅ cdn.jsdelivr.net/pyodide 요청 확인
```

### 로컬 오프라인 배포 검증

**참고**: [OFFLINE_DEPLOYMENT_CHECKLIST.md](OFFLINE_DEPLOYMENT_CHECKLIST.md)

```bash
# 1. 인터넷 연결 끊기 (Wi-Fi OFF)
# 2. 로컬 서버 실행
cd out
python -m http.server 8000

# 3. 브라우저에서 http://localhost:8000 접속
# 4. CSV 업로드 → 통계 분석 실행
# 5. ✅ 오프라인 상태에서 정상 동작 확인
```

---

## ❓ FAQ

### Q1: Vercel 배포에서도 Pyodide를 로컬 번들로 사용할 수 있나요?

A: 가능하지만 권장하지 않습니다.
- Vercel 빌드 크기 제한 (100MB)을 초과할 수 있음
- CDN이 더 빠르고 효율적임
- 브라우저 캐시로 재방문 시 빠름

### Q2: 로컬 오프라인 배포에서 Ollama 없이 사용 가능한가요?

A: 가능합니다.
- RAG 기능(AI 어시스턴트, 문서 검색)만 사용 불가
- 통계 분석 기능은 Pyodide만으로 완전히 동작

### Q3: 환경변수를 설정하지 않으면 어떻게 되나요?

A: 기본값으로 동작합니다.
- `NEXT_PUBLIC_PYODIDE_USE_LOCAL`: 기본값 `false` (CDN 사용)
- `NEXT_PUBLIC_OLLAMA_ENDPOINT`: 기본값 `http://localhost:11434`

### Q4: 오프라인 배포 패키지 크기는 얼마나 되나요?

A:
- **통계 플랫폼**: ~250MB (Pyodide 포함)
- **Ollama 모델**: ~2.2GB (mxbai-embed-large + deepseek-r1:7b)
- **총합**: ~2.5GB
- **권장 USB**: 8GB 이상

---

## 🚀 시나리오 3: 임베디드 데스크탑 앱 (Tauri)

### 특징

- ✅ **Python Worker 코드 내장**: deployment-package의 Worker 파일을 JavaScript로 변환
- ✅ **file:// 프로토콜 지원**: 로컬 파일 시스템에서 동작
- ✅ **데스크탑 앱 배포**: Windows/macOS/Linux 실행 파일
- ✅ **Pyodide 통합**: 로컬 Pyodide와 내장 Worker 코드 사용
- 🔧 **Worker 동기화 필요**: Python 파일 수정 시 재빌드 필요

### 사전 준비 (Worker 동기화)

**중요**: deployment-package의 Worker 파일이 최신 버전인지 확인!

```bash
# 1. deployment-package Worker 파일 동기화 확인
cd statistical-platform

# MD5 해시 비교 (Windows)
for %f in (worker1-descriptive.py worker2-hypothesis.py worker3-nonparametric-anova.py worker4-regression-advanced.py) do (
  certutil -hashfile "public/workers/python/%f" MD5
  certutil -hashfile "../deployment-package/statistical-app/workers/python/%f" MD5
)

# MD5 해시 비교 (Linux/macOS)
for file in worker1-descriptive.py worker2-hypothesis.py worker3-nonparametric-anova.py worker4-regression-advanced.py; do
  md5sum "public/workers/python/$file"
  md5sum "../deployment-package/statistical-app/workers/python/$file"
done

# 2. 해시가 일치하지 않으면 동기화
cp public/workers/python/*.py ../deployment-package/statistical-app/workers/python/
```

### Worker 코드 내장화 (필수)

**언제 실행**: Worker Python 파일 수정 시마다 필수!

```bash
# embedded-statistical-app 폴더로 이동
cd embedded-statistical-app/build

# Python Worker 코드를 JavaScript로 변환
node embed-python-workers.js
```

**실행 결과**:
```
🚀 Python Worker 코드 내장화 시작...
✅ Worker 1 코드 로드 완료
✅ Worker 2 코드 로드 완료
✅ Worker 3 코드 로드 완료
✅ Worker 4 코드 로드 완료
✅ Python Worker 내장화 완료!
📁 출력 파일: embedded-statistical-app/src/workers/worker-codes.js
📊 내장된 Worker 수: 4
```

**생성 파일**:
- `embedded-statistical-app/src/workers/worker-codes.js` (~90KB)
  - deployment-package의 Worker 1-4 Python 코드가 JavaScript 문자열로 변환됨
  - Pyodide가 이 문자열을 직접 실행

### 동작 원리

```javascript
// embed-python-workers.js 동작 순서
1. deployment-package/workers/python/*.py 읽기
2. Python 코드를 JSON 문자열로 변환
3. embedded-statistical-app/src/workers/worker-codes.js 생성
   └─ export const WORKER_CODES = { "1": "...", "2": "...", ... }

// 런타임 동작
Pyodide → worker-codes.js에서 Python 코드 가져오기 → exec() 실행
```

### 빌드 및 실행

```bash
# 1. Worker 코드 내장화 (위 참조)
cd embedded-statistical-app/build
node embed-python-workers.js

# 2. Tauri 앱 빌드
cd ..
npm run tauri build

# 3. 실행 파일 위치
# Windows: src-tauri/target/release/statistical-platform.exe
# macOS: src-tauri/target/release/bundle/dmg/
# Linux: src-tauri/target/release/bundle/appimage/
```

### 주의 사항

#### 1. Worker 파일 수정 시 반드시 재실행

```bash
# ❌ 잘못된 워크플로우
1. public/workers/python/worker1-descriptive.py 수정
2. Tauri 앱 빌드
→ 구버전 Worker 코드가 포함됨 (worker-codes.js가 업데이트 안됨)

# ✅ 올바른 워크플로우
1. public/workers/python/worker1-descriptive.py 수정
2. deployment-package로 동기화
3. node embed-python-workers.js 실행 ← 필수!
4. Tauri 앱 빌드
```

#### 2. deployment-package 동기화 확인

**언제 확인**: Worker Python 파일 수정 후

```bash
# 자동 테스트로 확인
cd statistical-platform
npm test __tests__/workers/python-json-serialization.test.ts

# 테스트 통과 = deployment-package 동기화 완료
```

#### 3. 내장 코드 검증

```bash
# worker-codes.js에 _safe_bool() 포함 확인
grep "_safe_bool" embedded-statistical-app/src/workers/worker-codes.js

# 출력 없음 = 구버전, embed-python-workers.js 재실행 필요
```

### 배포 체크리스트

```bash
# ☑️ 1. deployment-package Worker 동기화 확인
md5sum public/workers/python/*.py
md5sum ../deployment-package/statistical-app/workers/python/*.py

# ☑️ 2. Worker 코드 내장화
cd embedded-statistical-app/build
node embed-python-workers.js

# ☑️ 3. _safe_bool() 포함 확인
grep -c "_safe_bool" ../src/workers/worker-codes.js
# → 4 (Worker 1-4 각각 1개씩 정의)

# ☑️ 4. Tauri 앱 빌드
cd ..
npm run tauri build

# ☑️ 5. 실행 파일 테스트
# Windows: src-tauri/target/release/statistical-platform.exe 실행
# macOS: src-tauri/target/release/bundle/dmg/ 실행
# Linux: src-tauri/target/release/bundle/appimage/ 실행
```

### 장점
- ✅ 네이티브 데스크탑 앱
- ✅ file:// 프로토콜 지원
- ✅ Pyodide + Worker 코드 통합
- ✅ 설치 파일 배포 가능

### 단점
- ❌ Worker 수정 시마다 재빌드 필요
- ❌ 동기화 수동 관리 필요
- ❌ 빌드 시간 증가 (Tauri 컴파일)

---

## 📚 관련 문서

- **[OFFLINE_DEPLOYMENT_CHECKLIST.md](OFFLINE_DEPLOYMENT_CHECKLIST.md)**: 오프라인 배포 수동 검증 가이드
- **[OLLAMA_MODEL_SETUP.md](../../deployment-package/OLLAMA_MODEL_SETUP.md)**: Ollama 모델 복원 가이드
- **[AI-CODING-RULES.md](AI-CODING-RULES.md)**: AI 코딩 규칙 (개발자용)

---

**작성일**: 2025-01-10
**업데이트**: 2025-11-18 (임베디드 앱 섹션 추가)
**버전**: 1.1
**관련 작업**: RAG 시스템 배포 개선 + Worker JSON 직렬화 수정
