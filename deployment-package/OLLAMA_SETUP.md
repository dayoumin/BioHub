# Ollama 설치 및 모델 관리 가이드

## 개요

Ollama는 로컬 PC에서 AI 모델을 간단하게 설치하고 실행할 수 있는 도구입니다.

**특징**:
- 인터넷 없이 로컬에서 실행 (개인정보 보호)
- 빠른 응답 (외부 API 불필요)
- GPU 자동 활용 (NVIDIA, AMD, Apple Silicon 지원)

---

## OS별 설치 가이드

### Windows

#### 1단계: 다운로드
1. [Ollama 공식 웹사이트](https://ollama.ai) 방문
2. **"Download for Windows"** 클릭
3. `OllamaSetup.exe` 다운로드 (약 250MB)

#### 2단계: 설치
1. 다운로드된 `OllamaSetup.exe` 실행
2. 설치 마법사 따라가기 (기본 설정 유지)
3. 설치 완료 후 자동으로 실행됨
4. 시스템 트레이(하단 오른쪽)에서 Ollama 아이콘 확인

#### 3단계: 확인
1. 명령 프롬프트(cmd) 또는 PowerShell 열기
2. 다음 명령어 실행:
   ```bash
   ollama --version
   ```
3. 버전 정보가 표시되면 설치 완료

**문제 발생 시**:
```bash
# Ollama 상태 확인
ollama list

# 수동 실행
ollama serve
```

---

### macOS

#### 1단계: Homebrew 설치 (필요 시)
Homebrew가 설치되지 않은 경우:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### 2단계: Ollama 설치
터미널에서:
```bash
brew install ollama
```

#### 3단계: Ollama 시작
```bash
brew services start ollama
```

#### 4단계: 확인
```bash
ollama --version
```

**자동 시작 설정**:
```bash
brew services start ollama  # 자동 시작 활성화
brew services stop ollama   # 자동 시작 비활성화
```

---

### Linux (Ubuntu/Debian)

#### 1단계: 설치
터미널에서:
```bash
curl https://ollama.ai/install.sh | sh
```

#### 2단계: Ollama 시작
```bash
sudo systemctl start ollama
```

#### 3단계: 자동 시작 설정
```bash
sudo systemctl enable ollama
```

#### 4단계: 확인
```bash
ollama --version
```

**참고**: Linux에서는 `ollama serve` 명령어로 수동 실행 가능

---

### GPU 가속 설정 (선택)

Ollama는 자동으로 GPU를 감지하여 사용합니다.

#### NVIDIA GPU
```bash
# CUDA 지원 확인
ollama list
# GPU 사용 중이면 "GPU memory" 표시됨
```

#### AMD GPU
```bash
# ROCm 자동 설정됨
export HSA_OVERRIDE_GFX_VERSION=gfx1030  # 필요 시
ollama serve
```

#### Apple Silicon (M1/M2/M3)
- 자동으로 GPU 활용됨
- 별도 설정 불필요

---

## 모델 다운로드

### 기본 명령어

```bash
# 모델 다운로드
ollama pull <모델명>

# 다운로드한 모델 실행
ollama run <모델명>

# 설치된 모델 확인
ollama list

# 모델 삭제
ollama rm <모델명>
```

### 추천 모델 세트

#### 최소 구성 (필수)
```bash
ollama pull mxbai-embed-large      # 임베딩 모델 (700MB)
```

#### 표준 구성 (권장)
```bash
ollama pull mxbai-embed-large      # 임베딩 (700MB)
ollama pull deepseek-r1:7b         # 추론 (5GB)
```

#### 완전 구성 (모든 기능)
```bash
ollama pull mxbai-embed-large      # 임베딩 (700MB)
ollama pull deepseek-r1:7b         # 추론 (5GB)
ollama pull docling                # 문서 처리 (5GB)
```

---

## 모델 상세 정보

### 임베딩 모델

#### mxbai-embed-large (권장)
- **용도**: 텍스트 임베딩 (RAG 기능 필수)
- **크기**: 700MB
- **메모리**: 2GB
- **다운로드 시간**: 2-3분
- **설명**: 고품질 임베딩, 모든 언어 지원

```bash
ollama pull mxbai-embed-large
```

#### 더 작은 모델
```bash
# 빠른 임베딩 (384MB)
ollama pull all-minilm
```

---

### 추론 모델

#### deepseek-r1:7b (권장)
- **용도**: 분석 해석, 보고서 생성
- **크기**: 5GB
- **메모리**: 8GB
- **다운로드 시간**: 15-20분
- **특징**: 고품질 한글 지원, 수학/코드 우수

```bash
ollama pull deepseek-r1:7b
```

#### deepseek-r1:1.5b (가벼움)
- **크기**: 1.5GB
- **메모리**: 4GB
- **다운로드 시간**: 5-10분
- **특징**: 빠른 응답, 메모리 절약

```bash
ollama pull deepseek-r1:1.5b
```

#### qwen:7b (빠름)
- **크기**: 5GB
- **메모리**: 8GB
- **다운로드 시간**: 15-20분
- **특징**: 빠른 응답, 중국어 최적화

```bash
ollama pull qwen:7b
```

#### llama2:7b (범용)
- **크기**: 4GB
- **메모리**: 8GB
- **다운로드 시간**: 10-15분
- **특징**: 안정적, 영문 우수

```bash
ollama pull llama2:7b
```

---

### 문서 처리 모델

#### docling
- **용도**: PDF, Word, 이미지 텍스트 추출
- **크기**: 5GB
- **메모리**: 3GB
- **다운로드 시간**: 10-15분

```bash
ollama pull docling
```

---

## 모델 관리

### 설치된 모델 확인
```bash
ollama list
```

출력 예:
```
NAME                      ID              SIZE      MODIFIED
mxbai-embed-large         bcfbf821ffed    700 MB    1 hour ago
deepseek-r1:7b            abc123def456    5.0 GB    30 min ago
docling                   xyz789abc123    5.0 GB    15 min ago
```

### 모델 테스트 실행
```bash
ollama run deepseek-r1:7b
# 대화형 환경에서 모델 테스트
# 종료: Ctrl+D (Linux/Mac) 또는 Ctrl+Z (Windows)
```

### 모델 삭제
```bash
ollama rm deepseek-r1:7b
```

### 모델 업데이트
```bash
ollama pull deepseek-r1:7b --latest
```

### 모델 정보 확인
```bash
ollama show deepseek-r1:7b
```

---

## 성능 최적화

### 메모리 할당
기본적으로 Ollama는 시스템 메모리의 50%까지 사용합니다.

**조정 방법**:

**Windows**:
1. 시스템 트레이 → Ollama 우클릭 → Settings
2. Memory 슬라이더 조정

**macOS/Linux**:
```bash
# 환경변수로 메모리 제한 (GB 단위)
export OLLAMA_MAX_LOADED_MODELS=1
export OLLAMA_NUM_GPU=1  # GPU 활용 제한
```

### 빠른 응답
```bash
# 가장 가벼운 모델 사용
ollama pull deepseek-r1:1.5b
```

### 고품질 응답
```bash
# 더 큰 모델 사용 (메모리 16GB 필요)
ollama pull deepseek-r1:32b
```

---

## API 호출 (개발자용)

통계 앱은 자동으로 다음 엔드포인트를 사용합니다:

```bash
# 임베딩 API
curl http://localhost:11434/api/embed \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mxbai-embed-large",
    "prompt": "안녕하세요"
  }'

# 생성 API
curl http://localhost:11434/api/generate \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-r1:7b",
    "prompt": "분석 결과를 요약해주세요",
    "stream": false
  }'
```

---

## 문제 해결

### 다운로드 속도 느림
1. 인터넷 연결 확인
2. Wi-Fi 대신 유선 연결 사용
3. 다른 다운로드 일시 중지

### 모델 로드 실패
```bash
# 1. Ollama 재시작
ollama serve

# 2. 모델 다시 다운로드
ollama rm deepseek-r1:7b
ollama pull deepseek-r1:7b
```

### 메모리 부족 에러
```bash
# 더 작은 모델로 변경
ollama rm deepseek-r1:7b
ollama pull deepseek-r1:1.5b

# 또는 다른 모델 삭제
ollama rm docling
```

### GPU가 인식되지 않음
```bash
# GPU 사용 강제 활성화
export CUDA_VISIBLE_DEVICES=0  # NVIDIA
export HIP_VISIBLE_DEVICES=0   # AMD
ollama serve
```

### 포트 11434 이미 사용 중
```bash
# 다른 포트로 실행
OLLAMA_HOST=0.0.0.0:11435 ollama serve
```

---

## 권장 설정

### 일반 사용자
```bash
ollama pull mxbai-embed-large
ollama pull deepseek-r1:7b
```

### 메모리 제한 (8GB RAM)
```bash
ollama pull mxbai-embed-large
ollama pull deepseek-r1:1.5b
```

### 메모리 풍부 (16GB+ RAM)
```bash
ollama pull mxbai-embed-large
ollama pull deepseek-r1:32b
ollama pull docling
```

---

## 추가 자료

- **공식 사이트**: https://ollama.ai
- **모델 라이브러리**: https://ollama.ai/library
- **GitHub 저장소**: https://github.com/ollama/ollama
- **Discord 커뮤니티**: https://discord.gg/ollama

---

**최종 업데이트**: 2025-11-04
**Ollama 권장 버전**: 0.4.x 이상
