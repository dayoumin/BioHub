# Ollama 모델 설치 가이드 (오프라인 배포)

**목적**: 인터넷이 없는 환경에서 Ollama 모델을 설치하는 방법

---

## 🎯 배경

- Ollama 모델은 **빠르게 발전**하고 있어 별도 제공
- 통계 플랫폼 빌드와 **독립적으로 관리**
- USB 또는 외장 하드를 통해 전달

---

## 📋 필요한 모델

### **필수 모델** (RAG 기능용)

| 모델 | 용도 | 크기 | 다운로드 |
|------|------|------|---------|
| `mxbai-embed-large` | 임베딩 (벡터 검색) | ~700MB | `ollama pull mxbai-embed-large` |

### **권장 모델** (AI 어시스턴트용)

| 모델 | 용도 | 크기 | 다운로드 |
|------|------|------|---------|
| `deepseek-r1:7b` | 고품질 추론 | ~5GB | `ollama pull deepseek-r1:7b` |
| `qwen2.5:3b` | 빠른 응답 | ~1.9GB | `ollama pull qwen2.5:3b` |
| `qwen3-embedding:0.6b` | 경량 임베딩 | ~400MB | `ollama pull qwen3-embedding:0.6b` |

---

## 🔧 방법 1: 인터넷 연결된 PC에서 준비

### **Step 1: 모델 다운로드** (인터넷 연결 필요)

```bash
# Ollama 설치 (아직 안 했다면)
# macOS: brew install ollama
# Linux: curl https://ollama.ai/install.sh | sh
# Windows: https://ollama.com/download

# Ollama 서버 시작
ollama serve

# 필수 모델 다운로드
ollama pull mxbai-embed-large

# 권장 모델 다운로드 (선택)
ollama pull deepseek-r1:7b
ollama pull qwen2.5:3b
```

### **Step 2: 모델 파일 위치 확인**

```bash
# 모델 파일 저장 위치
# macOS/Linux: ~/.ollama/models
# Windows: C:\Users\<사용자>\.ollama\models

# 모델 파일 확인
ls -lh ~/.ollama/models
```

### **Step 3: 모델 파일 복사**

#### **macOS/Linux**

```bash
# USB 마운트 확인
df -h

# 모델 복사 (예: USB가 /Volumes/USB에 마운트됨)
cp -r ~/.ollama/models /Volumes/USB/ollama-models
```

#### **Windows**

```cmd
REM USB 드라이브 확인 (예: E:\)

REM 모델 복사
xcopy /E /I "C:\Users\<사용자>\.ollama\models" "E:\ollama-models"
```

---

## 📥 방법 2: 오프라인 PC에서 복원

### **Step 1: Ollama 설치** (오프라인 설치 파일 필요)

```bash
# 인터넷 연결된 PC에서 미리 다운로드
# macOS: https://ollama.com/download/Ollama-darwin.zip
# Linux: https://ollama.com/download/ollama-linux-amd64
# Windows: https://ollama.com/download/OllamaSetup.exe

# USB로 전달 → 오프라인 PC에서 설치
```

### **Step 2: 모델 파일 복원**

#### **macOS/Linux**

```bash
# 홈 디렉토리에 .ollama 폴더 생성
mkdir -p ~/.ollama

# USB에서 모델 복사
cp -r /Volumes/USB/ollama-models ~/.ollama/models
```

#### **Windows**

```cmd
REM USB에서 모델 복사
xcopy /E /I "E:\ollama-models" "C:\Users\<사용자>\.ollama\models"
```

### **Step 3: Ollama 서버 시작**

```bash
ollama serve
```

### **Step 4: 모델 확인**

```bash
ollama list

# 출력 예:
# NAME                     ID              SIZE    MODIFIED
# mxbai-embed-large:latest ...            700 MB   ...
# deepseek-r1:7b:latest    ...            5.0 GB   ...
```

---

## 🧪 테스트

### **1. 임베딩 모델 테스트**

```bash
ollama run mxbai-embed-large "Hello, world!"
```

### **2. 추론 모델 테스트**

```bash
ollama run deepseek-r1:7b "t-test와 ANOVA의 차이점을 설명해줘"
```

### **3. 통계 플랫폼에서 테스트**

```bash
# 통계 플랫폼 실행 (오프라인 빌드 기준)
cd statistical-platform/out
python -m http.server 8000

# 또는 개발 서버 실행
cd statistical-platform
npm run dev

# 브라우저에서 http://localhost:8000 (또는 http://localhost:3000) 접속
# → RAG 테스트 페이지 (/rag-test) 접속
# → 모델 새로고침 버튼 클릭
# → mxbai-embed-large, deepseek-r1 표시 확인
```

---

## 🔄 모델 업데이트

새로운 모델이 출시되면:

```bash
# 인터넷 연결된 PC에서
ollama pull <새로운-모델>

# 모델 파일 다시 USB로 복사
cp -r ~/.ollama/models /Volumes/USB/ollama-models

# 오프라인 PC에서 복원
cp -r /Volumes/USB/ollama-models ~/.ollama/models

# Ollama 재시작
ollama serve
```

---

## 📂 파일 크기 참고

| 항목 | 크기 |
|------|------|
| **Ollama 설치 파일** | ~100MB |
| **mxbai-embed-large** | ~700MB |
| **deepseek-r1:7b** | ~5GB |
| **qwen2.5:3b** | ~1.9GB |
| **총합 (권장 구성)** | ~7.7GB |

**권장 USB 크기**: 16GB 이상

---

## ❓ 문제 해결

### **문제 1: Ollama 서버가 시작되지 않음**

```bash
# 포트 11434가 이미 사용 중인지 확인
lsof -i :11434  # macOS/Linux
netstat -an | find "11434"  # Windows

# 기존 프로세스 종료
pkill ollama  # macOS/Linux
taskkill /F /IM ollama.exe  # Windows
```

### **문제 2: 모델이 목록에 표시되지 않음**

```bash
# 모델 파일 위치 확인
ls -la ~/.ollama/models

# Ollama 서버 재시작
ollama serve
```

### **문제 3: 통계 플랫폼에서 모델 연결 실패**

```bash
# Ollama 서버 상태 확인
curl http://localhost:11434/api/tags

# 정상 응답:
# {"models":[{"name":"mxbai-embed-large:latest",...}]}
```

---

## 📝 요약

1. **인터넷 연결된 PC**: `ollama pull` → 모델 다운로드 → USB로 복사
2. **오프라인 PC**: USB에서 `~/.ollama/models`로 복사 → `ollama serve`
3. **통계 플랫폼**: RAG 테스트 페이지에서 모델 확인

**문의**: 새로운 모델 추천이 필요하면 프로젝트 관리자에게 연락하세요.

---

**작성일**: 2025-01-10
**버전**: 1.0