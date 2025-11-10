# 오프라인 배포 체크리스트

**목적**: 인터넷이 안 되는 로컬 PC에서 통계 플랫폼이 완벽하게 동작하는지 검증

**배포 시나리오**:
- Ollama + 추론 모델: 사용자가 직접 로컬 PC에 설치
- 통계 플랫폼: HTML + JS 정적 파일로 배포 (USB 또는 내부 공유)

---

## 📋 체크리스트

### 1️⃣ 외부 의존성 분석 (CRITICAL)

| 컴포넌트 | 외부 의존성 | 오프라인 대응 | 상태 |
|---------|------------|--------------|------|
| **Pyodide** | CDN (jsdelivr) | ✅ 로컬 복사 (`public/pyodide/`) | ✅ 해결됨 |
| **Google Fonts** | `fonts.google.com` | ✅ `next/font/google` (자동 번들링) | ✅ 해결됨 |
| **통계 계산** | 없음 (브라우저) | - | ✅ OK |
| **RAG 임베딩** | Ollama (`localhost:11434`) | ⚠️ 사용자가 설치 필요 | ⚠️ 사용자 의존 |
| **RAG 추론** | Ollama (`localhost:11434`) | ⚠️ 사용자가 설치 필요 | ⚠️ 사용자 의존 |
| **Vector Store** | IndexedDB (브라우저) | - | ✅ OK |
| **SQL.js WASM** | 로컬 (`/sql-wasm/`) | ✅ 번들에 포함 | ✅ OK |
| **Plotly.js** | npm 패키지 | ✅ 번들에 포함 | ✅ OK |
| **shadcn/ui** | npm 패키지 | ✅ 번들에 포함 | ✅ OK |

---

### 2️⃣ 오프라인 동작 검증 항목

#### A. Pyodide (통계 계산 엔진)

**현재 상태**: ✅ 오프라인 지원 완료

**확인 방법**:
```bash
# 1. 환경 변수 설정
echo "NEXT_PUBLIC_PYODIDE_USE_LOCAL=true" > .env.local

# 2. Pyodide 다운로드 (인터넷 연결된 PC에서)
# https://github.com/pyodide/pyodide/releases/download/0.28.3/pyodide-0.28.3.tar.bz2

# 3. 압축 해제 후 복사
tar -xjf pyodide-0.28.3.tar.bz2
cp -r pyodide/* public/pyodide/

# 4. 빌드
npm run build

# 5. 오프라인 테스트
# - 인터넷 연결 끊기
# - npx serve out
# - 브라우저에서 통계 분석 실행
```

**기대 결과**:
- ✅ Pyodide 로컬 로드 성공
- ✅ NumPy, SciPy, Pandas 로드 성공
- ✅ 통계 분석 정상 실행

---

#### B. Google Fonts (UI)

**현재 상태**: ✅ 자동 해결됨

**설명**:
- Next.js의 `next/font/google`는 빌드 시 폰트를 자동으로 다운로드하여 번들에 포함
- `app/layout.tsx:2`에서 사용 중: `import { Inter } from "next/font/google"`
- 오프라인 환경에서도 폰트 정상 적용됨

**확인 방법**:
```bash
# 빌드 후 폰트 파일 확인
npm run build
ls -lh out/_next/static/media/  # Inter 폰트 파일 존재 확인
```

**기대 결과**:
- ✅ `out/_next/static/media/*.woff2` 파일 존재
- ✅ 오프라인에서도 폰트 정상 렌더링

---

#### C. RAG 시스템 (Ollama)

**현재 상태**: ⚠️ 사용자가 Ollama 설치 필요

**사용자에게 전달할 파일**:
1. **Ollama 설치 파일** (인터넷 연결된 PC에서 다운로드):
   - Windows: https://ollama.com/download/OllamaSetup.exe
   - Linux: https://ollama.com/download/ollama-linux-amd64

2. **추론 모델** (인터넷 연결된 PC에서 다운로드):
   ```bash
   # 모델 다운로드 (인터넷 연결된 PC에서)
   ollama pull nomic-embed-text  # 임베딩 모델 (274 MB)
   ollama pull qwen2.5:3b        # 추론 모델 (1.9 GB)

   # 모델 파일 위치 확인
   # Windows: C:\Users\사용자\.ollama\models\
   # Linux: ~/.ollama/models/
   ```

3. **모델 파일 복사 방법**:
   ```bash
   # 인터넷 연결된 PC에서
   # Windows:
   xcopy /E /I "C:\Users\사용자\.ollama" "D:\ollama-models"

   # Linux/Mac:
   cp -r ~/.ollama ~/Desktop/ollama-models

   # USB로 오프라인 PC에 전달
   # 오프라인 PC에서:
   # Windows: D:\ollama-models → C:\Users\사용자\.ollama
   # Linux: ~/Desktop/ollama-models → ~/.ollama
   ```

**오프라인 PC 설정 순서**:
```bash
# 1. Ollama 설치 (인터넷 없이)
# OllamaSetup.exe 실행 (오프라인 설치 가능)

# 2. 모델 파일 복사
# USB에서 ~/.ollama/ 폴더로 복사

# 3. Ollama 서버 실행
ollama serve

# 4. 모델 확인
ollama list
# 출력:
# NAME                 ID              SIZE    MODIFIED
# nomic-embed-text     ...            274 MB   ...
# qwen2.5:3b           ...            1.9 GB   ...
```

**확인 방법**:
```bash
# Ollama 서버 동작 확인
curl http://localhost:11434/api/tags

# 기대 출력:
# {"models":[{"name":"nomic-embed-text:latest",...},{"name":"qwen2.5:3b",...}]}
```

---

#### D. Vector Store (SQLite + IndexedDB)

**현재 상태**: ✅ 완전 오프라인

**설명**:
- SQL.js: WASM 파일이 `public/sql-wasm/`에 포함되어 빌드 시 번들링됨
- IndexedDB: 브라우저 내장 기능 (인터넷 불필요)

**확인 방법**:
```bash
# SQL.js WASM 파일 확인
ls -lh public/sql-wasm/
# sql-wasm.js
# sql-wasm.wasm (1.2 MB)
```

---

### 3️⃣ 오프라인 배포 전 검증 절차

#### 단계 1: 개발 PC (인터넷 연결됨)

```bash
# 1. Pyodide 다운로드 및 복사
wget https://github.com/pyodide/pyodide/releases/download/0.28.3/pyodide-0.28.3.tar.bz2
tar -xjf pyodide-0.28.3.tar.bz2
cp -r pyodide/* statistical-platform/public/pyodide/

# 2. 환경 변수 설정
cd statistical-platform
echo "NEXT_PUBLIC_PYODIDE_USE_LOCAL=true" > .env.local

# 3. 빌드
npm run build

# 4. 빌드 결과 확인
ls -lh out/pyodide/  # Pyodide 파일 존재 확인 (~200 MB)
ls -lh out/sql-wasm/ # SQL.js WASM 파일 존재 확인

# 5. 로컬 테스트
cd out
npx serve .
# → http://localhost:3000

# 6. 인터넷 연결 끊고 재테스트
# - Wi-Fi 끄기
# - 브라우저 새로고침
# - 통계 분석 실행 확인
```

#### 단계 2: 사용자 PC (인터넷 차단 환경)

**전달할 파일 목록**:
1. `statistics-offline.zip` (~250 MB) - 빌드된 정적 파일
2. `OllamaSetup.exe` (~100 MB) - Ollama 설치 파일
3. `ollama-models.zip` (~2.2 GB) - 다운로드된 모델 파일
4. `README-OFFLINE.txt` - 설치 가이드

**README-OFFLINE.txt 내용**:
```
=== 통계 플랫폼 오프라인 설치 가이드 ===

1단계: Ollama 설치
  1. OllamaSetup.exe 실행
  2. 기본 설정으로 설치 진행

2단계: 모델 파일 복사
  1. ollama-models.zip 압축 해제
  2. .ollama 폴더를 사용자 홈 디렉토리로 복사
     Windows: C:\Users\사용자\.ollama
     Linux: ~/.ollama

3단계: Ollama 서버 실행
  1. 명령 프롬프트 또는 터미널 열기
  2. 명령 실행: ollama serve
  3. 서버 실행 확인: http://localhost:11434 접속

4단계: 통계 플랫폼 실행
  1. statistics-offline.zip 압축 해제
  2. out 폴더로 이동
  3. 명령 실행: npx serve .
     (또는 index.html 더블 클릭)
  4. 브라우저에서 http://localhost:3000 접속

5단계: 동작 확인
  - CSV 파일 업로드 테스트
  - 통계 분석 실행 테스트
  - AI 챗봇 테스트 (우측 하단 아이콘)

문제 발생 시:
  - Ollama 서버 재시작: Ctrl+C 후 ollama serve
  - 브라우저 캐시 삭제: Ctrl+Shift+Delete
```

---

### 4️⃣ 오프라인 배포 최종 체크리스트

#### 개발자 (빌드 전)
- [ ] Pyodide 다운로드 및 `public/pyodide/` 복사
- [ ] `.env.local` 파일 생성 (`NEXT_PUBLIC_PYODIDE_USE_LOCAL=true`)
- [ ] **오프라인 빌드 실행**: `npm run build:offline`
- [ ] **빌드 검증**: `npm run verify:offline`
- [ ] `out/pyodide/` 폴더 존재 확인 (~200 MB)
- [ ] `out/sql-wasm/` 폴더 존재 확인

**빌드 검증 스크립트**:
```bash
# 오프라인 빌드 (환경 변수 자동 설정)
npm run build:offline

# 빌드 결과 검증
npm run verify:offline
```

**기대 출력**:
```
🔍 오프라인 빌드 검증 시작...

✅ out/ 디렉토리 존재 확인

📁 필수 디렉토리 확인:
  ✅ pyodide (198.5 MB)
  ✅ sql-wasm (1.2 MB)
  ✅ _next/static (45.3 MB)

📄 필수 파일 확인:
  ✅ index.html (12.3 KB)
  ✅ pyodide/pyodide.js (156.7 KB)
  ✅ pyodide/pyodide.asm.wasm (50.2 MB)
  ✅ sql-wasm/sql-wasm.js (45.6 KB)
  ✅ sql-wasm/sql-wasm.wasm (1.1 MB)

📦 통계 패키지 확인 (선택):
  ✅ pyodide/packages/numpy.js (15.2 MB)
  ✅ pyodide/packages/scipy.js (28.7 MB)
  ✅ pyodide/packages/pandas.js (19.8 MB)
  ✅ pyodide/packages/statsmodels.js (9.3 MB)

⚙️  환경 변수 확인:
  ✅ NEXT_PUBLIC_PYODIDE_USE_LOCAL=true

📊 빌드 크기:
  총 크기: 245.8 MB
  ✅ Pyodide 로컬 번들링 확인 (200MB 이상)

═══════════════════════════════════════
✅ 오프라인 빌드 검증 완료!

다음 단계:
  1. out/ 폴더를 ZIP으로 압축
  2. Ollama + 모델 파일 준비
  3. USB로 전달
═══════════════════════════════════════
```

#### 개발자 (빌드 후)
- [ ] 인터넷 연결 끊고 로컬 테스트
- [ ] 통계 분석 10개 실행 테스트
- [ ] Pyodide 로드 시간 확인 (< 5초)
- [ ] 브라우저 콘솔 에러 없음 확인
- [ ] ZIP 압축 (`statistics-offline.zip`)

#### 사용자 (배포 후)
- [ ] Ollama 설치 완료
- [ ] 모델 파일 복사 완료 (nomic-embed-text, qwen2.5)
- [ ] `ollama serve` 실행 확인
- [ ] `http://localhost:11434` 접속 확인
- [ ] 통계 플랫폼 압축 해제
- [ ] `npx serve out` 실행
- [ ] CSV 업로드 테스트
- [ ] 통계 분석 실행 테스트
- [ ] AI 챗봇 테스트

---

### 5️⃣ 알려진 제한사항

#### ⚠️ Service Worker CORS 이슈 (해결됨)

**문제**: Service Worker가 `localhost:11434` 요청을 차단
**해결**: [sw.js:69-72](../public/sw.js#L69-L72)에 localhost 우회 로직 추가

```javascript
// localhost 요청은 Service Worker가 개입하지 않음
if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
  return // 브라우저가 직접 처리
}
```

#### ⚠️ 브라우저 호환성

| 브라우저 | Pyodide | Ollama | IndexedDB | 상태 |
|---------|---------|--------|----------|------|
| Chrome | ✅ | ✅ | ✅ | ✅ 권장 |
| Edge | ✅ | ✅ | ✅ | ✅ 권장 |
| Firefox | ✅ | ⚠️ Mixed Content 설정 필요 | ✅ | ⚠️ 가능 |
| Safari | ✅ | ❌ localhost CORS 제한 | ✅ | ❌ 비권장 |

**Firefox 설정** (Mixed Content 허용):
```
1. about:config 접속
2. security.mixed_content.block_active_content → false
```

---

### 6️⃣ 파일 크기 최적화 (선택)

**현재 크기**:
- `statistics-offline.zip`: ~250 MB
- Ollama 모델: ~2.2 GB

**최적화 방법**:

#### Option 1: Pyodide 필수 패키지만 포함
```bash
# 필수 패키지만 복사 (200 MB → 75 MB)
mkdir -p public/pyodide/packages
cp pyodide/pyodide.js public/pyodide/
cp pyodide/pyodide.asm.wasm public/pyodide/
cp pyodide/python_stdlib.zip public/pyodide/
cp pyodide/packages.json public/pyodide/

for pkg in numpy scipy pandas statsmodels; do
  cp pyodide/packages/${pkg}.* public/pyodide/packages/
done
```

#### Option 2: 더 작은 Ollama 모델 사용
```bash
# qwen2.5:3b (1.9 GB) → qwen2.5:1.5b (0.9 GB)
ollama pull qwen2.5:1.5b
```

---

### 7️⃣ 문제 해결 (Troubleshooting)

#### 문제 1: Pyodide 로드 실패
**증상**: `Error: Failed to load pyodide.js`

**해결**:
1. `out/pyodide/pyodide.js` 파일 존재 확인
2. `.env.local` 파일 확인: `NEXT_PUBLIC_PYODIDE_USE_LOCAL=true`
3. 브라우저 콘솔에서 경로 확인

#### 문제 2: Ollama 연결 실패
**증상**: `Failed to fetch http://localhost:11434`

**해결**:
1. `ollama serve` 실행 확인
2. `curl http://localhost:11434/api/tags` 테스트
3. 방화벽 확인 (11434 포트 열기)

#### 문제 3: 모델 로드 실패
**증상**: `Error: model 'qwen2.5' not found`

**해결**:
1. `ollama list` 명령으로 모델 확인
2. `.ollama/models/` 폴더에 모델 파일 존재 확인
3. 모델 재다운로드 또는 파일 복사 재시도

---

## 📝 결론

### ✅ 오프라인 배포 가능 여부: **YES**

**조건**:
1. ✅ Pyodide를 로컬에 포함 (`NEXT_PUBLIC_PYODIDE_USE_LOCAL=true`)
2. ✅ Google Fonts 자동 번들링 (`next/font/google`)
3. ⚠️ 사용자가 Ollama + 모델 직접 설치

**배포 크기**:
- 통계 플랫폼: ~250 MB
- Ollama 설치 파일: ~100 MB
- Ollama 모델: ~2.2 GB
- **총합**: ~2.55 GB

**USB 전달 가능**: ✅ YES (8 GB USB 권장)

---

**문서 버전**: 1.0
**작성일**: 2025-11-10
**작성자**: Claude Code
**관련 문서**: [OFFLINE_DEPLOYMENT_GUIDE.md](OFFLINE_DEPLOYMENT_GUIDE.md)