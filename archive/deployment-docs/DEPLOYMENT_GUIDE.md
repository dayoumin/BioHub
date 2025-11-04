# 배포 가이드 - 전문가급 통계 분석 플랫폼 (내부망)

## 개요

이 가이드는 각 사용자가 자신의 개인 PC에서 **독립적으로** 통계 분석 플랫폼을 설치하고 운영하는 방법을 설명합니다.

**배포 구조**:
```
개인 PC
├── 📊 통계 앱 (HTML 정적 파일)
├── 🤖 Ollama (로컬 AI 서버)
│   ├── Docling 모델 (문서 분석)
│   ├── 임베딩 모델 (mxbai-embed-large)
│   └── 추론 모델 (deepseek-r1:7b 또는 qwen:7b)
└── 📁 로컬 데이터 저장소
```

---

## 시스템 요구사항

### 필수
- **Windows 10/11** 또는 **macOS/Linux**
- **메모리**: 최소 8GB RAM (Ollama 모델 실행 시 12GB 권장)
- **디스크**: 최소 20GB 여유 공간
  - 통계 앱: 500MB
  - Ollama 모델들: 15-20GB

### 선택사항
- 외부 인터넷 연결 (모델 초기 다운로드 시에만 필요)

---

## 설치 방법

### Step 1: 배포 패키지 준비

다음 항목을 받습니다:
```
deployment-package/
├── 📁 statistical-app/       # HTML 정적 파일
├── SETUP.md                   # 이 가이드
├── OLLAMA_SETUP.md            # Ollama 상세 가이드
└── models-list.txt            # 다운로드할 모델 목록
```

### Step 2: Ollama 설치

[OLLAMA_SETUP.md](OLLAMA_SETUP.md) 참고하여 설치합니다:

```bash
# Windows: ollama-0.x.x.exe 다운로드 및 실행
# macOS: brew install ollama
# Linux: curl https://ollama.ai/install.sh | sh
```

### Step 3: Ollama 모델 다운로드

터미널/명령 프롬프트에서:

```bash
# 1. Docling 모델 (문서 분석)
ollama pull docling

# 2. 임베딩 모델 (필수 - RAG 기능)
ollama pull mxbai-embed-large

# 3. 추론 모델 (선택 - AI 어시스턴트)
ollama pull deepseek-r1:7b
# 또는
ollama pull qwen:7b
```

**다운로드 크기**:
- docling: ~5GB
- mxbai-embed-large: ~700MB
- deepseek-r1:7b: ~5GB
- **총합**: ~10-15GB

**다운로드 확인**:
```bash
ollama list
```

### Step 4: 통계 앱 실행

1. 받은 `statistical-app/` 폴더를 원하는 위치에 저장
   ```
   C:\Users\[사용자명]\Desktop\statistical-app\
   ```

2. `index.html` 파일을 브라우저로 열기
   - **Chrome/Edge 권장** (최적 성능)
   - Firefox도 지원

3. 또는 간단한 웹서버로 실행:
   ```bash
   # Python 설치된 경우
   cd statistical-app
   python -m http.server 8000
   # 브라우저에서 http://localhost:8000 접속
   ```

### Step 5: Ollama 백그라운드 실행

Ollama는 자동으로 백그라운드에서 실행됩니다:
- Windows: 시스템 트레이에서 확인
- macOS: 상단 메뉴바에서 확인
- Linux: `ollama serve` 명령어로 수동 실행

**Ollama 상태 확인**:
```bash
curl http://localhost:11434/api/tags
```

응답 예:
```json
{
  "models": [
    {"name": "docling:latest"},
    {"name": "mxbai-embed-large:latest"},
    {"name": "deepseek-r1:7b:latest"}
  ]
}
```

---

## 기능별 설정

### ✅ 통계 분석 (즉시 사용 가능)
**아래 기능들은 Ollama 없이도 모두 정상 작동합니다**:
- 기술 통계량 (평균, 표준편차, 왜도 등)
- 가설 검정 (t-test, ANOVA, 카이제곱검정 등)
- 회귀 분석 (선형, 다중, 로지스틱)
- 비모수 검정 (Mann-Whitney, Kruskal-Wallis 등)
- 상관분석 및 주성분분석

**별도 설정 불필요** ✓

### ⚙️ RAG 어시스턴트 (선택 - Ollama 필요)
AI 기반 분석 해석 및 보고서 생성이 필요한 경우:

**필수 모델**:
- `mxbai-embed-large` (임베딩)

**선택 모델** (하나 이상):
- `deepseek-r1:7b` (고품질 추론, 권장)
- `qwen:7b` (빠른 응답)
- `docling` (PDF/문서 처리)

---

## Ollama 모델 설정 (상세)

### 모델별 사양

| 모델 | 용도 | 크기 | 메모리 | 시간 |
|------|------|------|--------|------|
| **mxbai-embed-large** | 임베딩 (필수) | 700MB | 2GB | 2-3분 |
| **docling** | 문서 분석 | 5GB | 3GB | 10-15분 |
| **deepseek-r1:7b** | 추론 (권장) | 5GB | 8GB | 15-20분 |
| **qwen:7b** | 추론 (빠름) | 5GB | 8GB | 15-20분 |

### 설치 순서 (권장)

```bash
# 1단계: 필수 임베딩 모델
ollama pull mxbai-embed-large

# 2단계: 추론 모델 (선택 중 1개)
ollama pull deepseek-r1:7b    # 또는
ollama pull qwen:7b

# 3단계: 문서 처리 (선택)
ollama pull docling
```

### 다운로드 확인
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

### 모델 제거 (필요 시)
```bash
ollama rm deepseek-r1:7b
```

### 모델 업데이트
```bash
ollama pull deepseek-r1:7b --latest
```

---

## 사용 방법

### 데이터 업로드
1. 왼쪽 사이드바에서 **Data Input** 클릭
2. CSV 파일 선택 또는 드래그 앤 드롭
3. 데이터 프리뷰 확인 후 **Upload** 클릭

### 통계 분석
1. 왼쪽 메뉴에서 분석 유형 선택
   - Descriptive Statistics
   - Hypothesis Tests
   - Regression & Correlation
   - Advanced Analysis
2. 필요한 변수 선택
3. **Analyze** 클릭
4. 결과 및 시각화 확인

### RAG 어시스턴트 (Ollama 설정 후)
1. 오른쪽 하단 **Chat** 버튼 클릭
2. 분석 결과에 대해 질문
3. AI가 통계 해석 및 가이드 제공

---

## 문제 해결

### 포트 3000이 이미 사용 중인 경우
```bash
npm run dev -- -p 3001
```
브라우저에서 `http://localhost:3001` 접속

### Ollama 모델이 다운로드되지 않는 경우
1. Ollama가 실행 중인지 확인:
   ```bash
   curl http://localhost:11434/api/tags
   ```
2. 네트워크 연결 확인
3. 관리자 권한으로 터미널 재실행

### 데이터 분석이 느린 경우
- 샘플 크기가 큰 경우 시간 소요 (정상)
- 브라우저 개발자 도구 (F12) → Console 탭에서 에러 확인

### RAG 어시스턴트가 응답하지 않는 경우
```bash
ollama list  # 모델 설치 확인
ollama serve # 수동 실행
```

---

## 성능 최적화

### 메모리 부족 시
1. 브라우저 탭 수 최소화
2. 다른 응용 프로그램 종료
3. 데이터 크기 줄이기 (샘플링 사용)

### 느린 모델 응답 시
- RAG 어시스턴트 비활성화
- 더 가벼운 Ollama 모델 사용:
  ```bash
  ollama pull deepseek-r1:1.5b
  ```

---

## 업데이트 및 유지보수

### 버전 확인
`Settings` → `About`에서 앱 버전 확인

### 주기적 정리
```bash
# 캐시 삭제
rm -r statistical-platform/.next

# 재설치 (문제 발생 시)
rm -r node_modules
npm install
```

---

## 지원 및 피드백

### 버그 보고
- 현상: 어떤 작업을 할 때 발생했는지
- 환경: Windows/macOS, Node.js 버전
- 스크린샷: 에러 메시지 캡처
- 이메일로 보고

### 기능 제안
사용 중 필요한 기능이 있으면 알려주세요.

---

## 라이선스 및 주의사항

- 개인 연구용 사용 권장
- 상용 사용 시 협의 필요

---

**최종 업데이트**: 2025-11-04
**버전**: 0.1.0