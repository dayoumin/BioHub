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
- ❌ RAG 기능 사용 시 별도 Ollama 서버 필요

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

| 항목 | Vercel 클라우드 | 로컬 오프라인 |
|------|----------------|--------------|
| **빌드 크기** | ~50MB | ~250MB |
| **Pyodide 소스** | CDN (자동) | 로컬 번들 |
| **첫 로딩 시간** | ~10초 (Pyodide 다운로드) | ~1초 (즉시) |
| **인터넷 필요** | ✅ 필요 | ❌ 불필요 |
| **Ollama 설정** | 선택 (RAG 사용 시) | 로컬 설치 |
| **배포 방법** | Vercel push | USB/외장 하드 |
| **업데이트** | 자동 (Vercel) | 수동 (재배포) |
| **대상 사용자** | 일반 사용자 | 폐쇄망 환경 |

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

## 📚 관련 문서

- **[OFFLINE_DEPLOYMENT_CHECKLIST.md](OFFLINE_DEPLOYMENT_CHECKLIST.md)**: 오프라인 배포 수동 검증 가이드
- **[OLLAMA_MODEL_SETUP.md](../../deployment-package/OLLAMA_MODEL_SETUP.md)**: Ollama 모델 복원 가이드
- **[AI-CODING-RULES.md](AI-CODING-RULES.md)**: AI 코딩 규칙 (개발자용)

---

**작성일**: 2025-01-10
**버전**: 1.0
**관련 작업**: RAG 시스템 배포 개선
