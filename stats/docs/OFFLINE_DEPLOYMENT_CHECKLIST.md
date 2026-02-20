# 오프라인 배포 수동 검증 가이드

**목적**: RAG 시스템 개선 사항 (2025-01-10)에 대한 수동 검증 절차

**작업 내용**:
1. ✅ rag-test 페이지 환경변수 지원 추가
2. ✅ Pyodide 자동 다운로드 스크립트 작성
3. ✅ Ollama 모델 복원 가이드 작성

---

## 📋 수동 검증 체크리스트

### **1️⃣ rag-test 환경변수 동작 확인**

#### **Step 1: 기본값 확인** (환경변수 없을 때)

```bash
cd stats

# 환경변수 없이 개발 서버 실행
npm run dev
```

**검증**:
1. 브라우저에서 `http://localhost:3000/rag-test` 접속
2. "모델 새로고침" 버튼 클릭
3. 개발자 도구 (F12) → Network 탭 확인
4. ✅ `http://localhost:11434/api/tags` 요청 확인

#### **Step 2: 환경변수 확인** (커스텀 엔드포인트)

```bash
# .env.local 파일 생성
echo "NEXT_PUBLIC_OLLAMA_ENDPOINT=https://test-ollama.com" > .env.local

# 개발 서버 재시작
npm run dev
```

**검증**:
1. 브라우저 새로고침
2. "모델 새로고침" 버튼 클릭
3. Network 탭 확인
4. ✅ `https://test-ollama.com/api/tags` 요청 확인

**정리**:
```bash
# 환경변수 제거
rm .env.local
```

---

### **2️⃣ Pyodide 다운로드 스크립트 확인**

#### **Step 1: Pyodide 폴더 삭제** (테스트 환경 준비)

```bash
# ⚠️ 주의: 이미 Pyodide가 설치되어 있다면 백업 권장
cd stats

# 백업 (선택)
mv public/pyodide public/pyodide-backup

# 또는 삭제
rm -rf public/pyodide
```

#### **Step 2: 스크립트 실행**

```bash
# Pyodide 다운로드 스크립트 실행
npm run setup:pyodide
```

**기대 출력**:
```
═══════════════════════════════════════════════════════
  📦 Pyodide 다운로드 및 설치 (오프라인 배포용)
═══════════════════════════════════════════════════════

📌 버전: v0.28.3
📌 URL: https://github.com/pyodide/pyodide/releases/download/v0.28.3/pyodide-v0.28.3.tar.bz2
📌 출력 경로: D:\Projects\Statics\stats\public\pyodide

✅ 디렉토리 생성: .../.temp
📥 다운로드 시작: ...
   진행률: 5% (...)
   진행률: 10% (...)
   ...
✅ 다운로드 완료: 50.00 MB

📦 압축 해제 중: ...
✅ 압축 해제 완료

✅ 폴더 이름 변경: pyodide-v0.28.3 → pyodide

🗑️  임시 파일 정리 중...
✅ 디렉토리 삭제: .../.temp

✅ Pyodide 설치 완료!

📂 설치된 파일:
   - pyodide.js (156.70 KB)
   - pyodide.asm.wasm (50.20 MB)
   - packages/ (150.00 MB)
   - ...

📊 총 크기: 200.50 MB

📋 다음 단계:
   1. 환경 변수 설정:
      echo "NEXT_PUBLIC_PYODIDE_USE_LOCAL=true" > .env.local

   2. 빌드:
      npm run build
      (또는 npm run build:offline)

   3. 빌드 검증:
      npm run verify:offline

═══════════════════════════════════════════════════════
```

**검증**:
```bash
# 파일 확인
ls -lh public/pyodide/

# 필수 파일 존재 확인
[ -f public/pyodide/pyodide.js ] && echo "✅ pyodide.js 존재"
[ -f public/pyodide/pyodide.asm.wasm ] && echo "✅ pyodide.asm.wasm 존재"
```

#### **Step 3: 중복 실행 확인**

```bash
# 다시 실행
npm run setup:pyodide
```

**기대 출력**:
```
✅ Pyodide가 이미 설치되어 있습니다.

📂 설치된 파일:
   - pyodide.js (156.70 KB)
   - pyodide.asm.wasm (50.20 MB)
   ...

📊 총 크기: 200.50 MB

💡 재설치하려면 public/pyodide/ 폴더를 먼저 삭제하세요.
```

**검증**:
- ✅ 재다운로드 하지 않음
- ✅ 기존 파일 유지됨

---

### **3️⃣ 오프라인 빌드 전체 워크플로우**

#### **Step 1: 환경 설정**

```bash
cd stats

# Pyodide 로컬 사용 설정
echo "NEXT_PUBLIC_PYODIDE_USE_LOCAL=true" > .env.local
```

#### **Step 2: 오프라인 빌드**

```bash
# 방법 1: build:offline 스크립트 사용 (환경변수 자동 설정)
npm run build:offline

# 방법 2: 일반 빌드 (.env.local 사용)
npm run build
```

**검증**:
```bash
# 빌드 결과 확인
ls -lh out/

# Pyodide 포함 확인
ls -lh out/pyodide/

# 빌드 크기 확인
du -sh out/
# → 약 250MB (Pyodide 포함)
```

#### **Step 3: 오프라인 테스트**

```bash
# 인터넷 연결 끊기 (Wi-Fi OFF)

# 로컬 서버 실행
cd out
python -m http.server 8000

# 또는
npx serve .
```

**검증**:
1. 브라우저에서 `http://localhost:8000` 접속
2. CSV 파일 업로드
3. 통계 분석 실행 (예: t-test)
4. ✅ Pyodide 로드 성공 확인
5. ✅ 통계 결과 출력 확인

**콘솔 확인** (F12 → Console):
```
[Pyodide] Loading from /pyodide/pyodide.js
[Pyodide] Loaded successfully
```

---

### **4️⃣ Ollama 모델 복원 테스트**

**참고 문서**: [deployment-package/OLLAMA_MODEL_SETUP.md](../deployment-package/OLLAMA_MODEL_SETUP.md)

#### **Step 1: 모델 다운로드** (인터넷 연결 필요)

```bash
# Ollama 서버 시작
ollama serve

# 필수 모델 다운로드
ollama pull mxbai-embed-large

# 선택 모델 다운로드
ollama pull deepseek-r1:7b
```

#### **Step 2: 모델 위치 확인**

```bash
# macOS/Linux
ls -lh ~/.ollama/models/

# Windows
dir C:\Users\<사용자>\.ollama\models
```

#### **Step 3: 통계 플랫폼에서 확인**

```bash
# 개발 서버 실행
npm run dev
```

**검증**:
1. 브라우저에서 `http://localhost:3000/rag-test` 접속
2. "모델 새로고침" 버튼 클릭
3. ✅ mxbai-embed-large 표시 확인
4. ✅ deepseek-r1:7b 표시 확인 (설치했다면)

---

## ✅ 최종 검증 체크리스트

- [ ] **rag-test 환경변수**: 기본값 + 커스텀 엔드포인트 모두 동작
- [ ] **Pyodide 다운로드**: 스크립트로 200MB 다운로드 성공
- [ ] **Pyodide 중복 방지**: 이미 존재 시 건너뛰기
- [ ] **오프라인 빌드**: `out/` 폴더에 Pyodide 포함 (250MB)
- [ ] **오프라인 실행**: 인터넷 없이 통계 분석 정상 동작
- [ ] **Ollama 모델**: rag-test 페이지에서 모델 목록 표시

---

## 🐛 문제 해결

### **문제 1: Pyodide 다운로드 실패**

**증상**: `HTTP 404: ...` 또는 `Network error`

**해결**:
1. 인터넷 연결 확인
2. GitHub 접속 가능 여부 확인
3. 방화벽 설정 확인
4. 수동 다운로드:
   ```bash
   # 브라우저에서 직접 다운로드
   # https://github.com/pyodide/pyodide/releases/download/v0.28.3/pyodide-v0.28.3.tar.bz2

   # 압축 해제
   tar -xjf pyodide-v0.28.3.tar.bz2

   # 복사
   cp -r pyodide public/
   ```

### **문제 2: 압축 해제 실패 (Windows)**

**증상**: `tar 명령어를 찾을 수 없습니다`

**해결**:
- Windows 10 이상: Windows Update 실행 (tar 자동 설치)
- 또는 7-Zip 사용:
  1. https://www.7-zip.org/ 다운로드
  2. pyodide-v0.28.3.tar.bz2 우클릭 → 7-Zip → 압축 풀기
  3. `public/` 폴더로 복사

### **문제 3: 오프라인 빌드에서 Pyodide 로드 실패**

**증상**: `Failed to load pyodide.js`

**해결**:
1. `.env.local` 확인:
   ```bash
   cat .env.local
   # → NEXT_PUBLIC_PYODIDE_USE_LOCAL=true 있어야 함
   ```

2. `public/pyodide/` 폴더 확인:
   ```bash
   ls public/pyodide/pyodide.js
   ```

3. 빌드 재실행:
   ```bash
   rm -rf .next out
   npm run build:offline
   ```

---

## 📝 결론

**자동 테스트**:
- ✅ rag-test 환경변수 테스트 (6/6 통과)
- ✅ download-pyodide 테스트 (11/11 통과)

**수동 검증**:
- 이 가이드의 모든 체크리스트 완료 시 배포 준비 완료

**배포 준비 완료 조건**:
1. ✅ Pyodide 로컬 다운로드 완료 (200MB)
2. ✅ 오프라인 빌드 성공 (250MB)
3. ✅ 인터넷 없이 통계 분석 정상 동작
4. ✅ Ollama 모델 복원 가능 (별도 전달)

---

**문서 버전**: 1.0
**작성일**: 2025-01-10
**관련 작업**: RAG 시스템 배포 개선
