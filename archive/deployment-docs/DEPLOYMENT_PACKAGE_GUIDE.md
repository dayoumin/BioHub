# 배포 패키지 구성 가이드

이 문서는 개발자가 사용자를 위한 배포 패키지를 준비하는 방법을 설명합니다.

---

## 배포 패키지 구조

```
deployment-package/
├── README.txt                    # 시작 가이드 (간단)
├── SETUP.md                      # 주요 설치 가이드
├── OLLAMA_SETUP.md               # Ollama 상세 가이드
├── models-list.txt               # Ollama 모델 다운로드 명령어
│
├── 📁 statistical-app/           # 통계 앱 (HTML 정적 파일)
│   ├── index.html                # 메인 페이지
│   ├── _next/                    # Next.js 정적 파일
│   ├── rag-data/                 # RAG 데이터베이스
│   ├── test-data/                # 샘플 데이터
│   └── workers/                  # Pyodide 워커
│
└── 📁 quick-start/               # 빠른 시작 (선택)
    ├── start.bat (Windows)
    └── start.sh (macOS/Linux)
```

---

## Step 1: 빌드 생성

### 통계 앱 빌드
```bash
cd statistical-platform
npm install
npm run build
```

**출력**: `statistical-platform/out/` 폴더에 정적 HTML 파일 생성

---

## Step 2: 패키지 조립

### 폴더 구조 만들기
```bash
mkdir deployment-package
mkdir deployment-package/statistical-app
```

### 빌드 파일 복사
```bash
# Windows PowerShell
Copy-Item -Recurse statistical-platform\out\* deployment-package\statistical-app\

# Linux/macOS
cp -r statistical-platform/out/* deployment-package/statistical-app/
```

### 가이드 문서 복사
```bash
cp DEPLOYMENT_GUIDE.md deployment-package/SETUP.md
cp OLLAMA_SETUP.md deployment-package/
cp models-list.txt deployment-package/
```

---

## Step 3: 빠른 시작 스크립트 생성 (선택)

### Windows 버전 (start.bat)
```batch
@echo off
REM 통계 분석 플랫폼 실행 스크립트

echo.
echo ===================================
echo 통계 분석 플랫폼 시작
echo ===================================
echo.

REM 통계 앱 실행
cd /d "%~dp0statistical-app"

echo Ollama 상태 확인 중...
curl http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo.
    echo ⚠️  Ollama가 실행되지 않았습니다.
    echo 시작 메뉴에서 'Ollama'를 검색하여 실행해주세요.
    echo.
)

echo.
echo 📊 브라우저에서 http://localhost:8000 을 열어주세요.
echo.
echo Python 간단 웹서버 시작...
python -m http.server 8000

pause
```

**저장**: `deployment-package/start.bat`

### macOS/Linux 버전 (start.sh)
```bash
#!/bin/bash

echo ""
echo "==================================="
echo "통계 분석 플랫폼 시작"
echo "==================================="
echo ""

cd "$(dirname "$0")/statistical-app"

echo "Ollama 상태 확인 중..."
curl -s http://localhost:11434/api/tags > /dev/null
if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  Ollama가 실행되지 않았습니다."
    echo "터미널에서 'ollama serve' 를 실행해주세요."
    echo ""
fi

echo ""
echo "📊 브라우저에서 http://localhost:8000 을 열어주세요."
echo ""
echo "Python 간단 웹서버 시작..."
python3 -m http.server 8000
```

**저장**: `deployment-package/start.sh`

**권한 설정**:
```bash
chmod +x deployment-package/start.sh
```

---

## Step 4: README 작성

### deployment-package/README.txt
```text
========================================
전문가급 통계 분석 플랫폼
내부망 배포 패키지
========================================

📋 포함 항목:
- statistical-app/     : 통계 분석 애플리케이션 (HTML)
- SETUP.md            : 설치 가이드
- OLLAMA_SETUP.md     : Ollama 상세 가이드
- models-list.txt     : Ollama 모델 다운로드 명령어
- start.bat (Windows) : 빠른 시작 스크립트
- start.sh (macOS/Linux) : 빠른 시작 스크립트

🚀 빠른 시작:
1. SETUP.md 파일을 읽어주세요
2. Ollama 설치 (선택)
3. statistical-app/index.html 을 브라우저로 열기
   또는 start.bat/start.sh 실행

📖 상세 가이드:
- 설치 및 실행: SETUP.md
- Ollama 설정: OLLAMA_SETUP.md
- 모델 다운로드: models-list.txt

⚙️ 시스템 요구사항:
- Windows 10/11 또는 macOS/Linux
- 메모리: 최소 8GB RAM (권장: 12GB)
- 디스크: 최소 20GB 여유 공간

🎯 주요 기능:
✓ 기술 통계량 (별도 설정 불필요)
✓ 가설 검정 (별도 설정 불필요)
✓ 회귀 분석 (별도 설정 불필요)
✓ AI 어시스턴트 (Ollama 필요)
✓ 보고서 생성 (Ollama 필요)

질문 또는 문제가 있으면 담당자에게 연락하세요.
```

---

## Step 5: 패키지 압축

### 전체 패키지 압축
```bash
# Windows (PowerShell)
Compress-Archive -Path deployment-package -DestinationPath statistical-platform-deploy.zip

# Linux/macOS
zip -r statistical-platform-deploy.zip deployment-package/
```

**결과 파일**: `statistical-platform-deploy.zip`

**크기**: 약 500MB (통계 앱) + Ollama 모델 제외

### 부분 배포 (앱만)
Ollama를 별도 설치하도록 할 경우:
```bash
# statistical-app 폴더만 압축
zip -r statistical-app-only.zip deployment-package/statistical-app/
```

**크기**: 약 500MB

---

## Step 6: 배포 확인 체크리스트

배포 전 다음을 확인하세요:

### 파일 확인
- [ ] `deployment-package/statistical-app/index.html` 존재
- [ ] `deployment-package/SETUP.md` 존재
- [ ] `deployment-package/OLLAMA_SETUP.md` 존재
- [ ] `deployment-package/models-list.txt` 존재
- [ ] `deployment-package/start.bat` 존재 (Windows)
- [ ] `deployment-package/start.sh` 존재 (macOS/Linux)

### 기능 확인
```bash
# 1. HTML 파일이 정상인지 확인
cd deployment-package/statistical-app
python -m http.server 8000
# → 브라우저에서 http://localhost:8000 접속 시 앱 로드 확인

# 2. Pyodide 작동 확인
# → 기술 통계량 계산 시도 → 결과 표시 확인

# 3. 필수 파일 포함 확인
# → test-data/ 폴더에 샘플 CSV 존재 확인
```

### 문서 확인
- [ ] SETUP.md: Step 1-5까지 명확한가?
- [ ] OLLAMA_SETUP.md: 모든 OS 지원하는가?
- [ ] models-list.txt: 올바른 명령어인가?

---

## Step 7: 사용자에게 배포

### 배포 방법 옵션

#### 옵션 1: 전체 패키지 제공
```
statistical-platform-deploy.zip 전달
→ 사용자가 압축 해제 후 SETUP.md 따라 설치
```

#### 옵션 2: 앱만 제공 + Ollama 별도 안내
```
1. statistical-app-only.zip 전달
2. OLLAMA_SETUP.md 전달 (옵션)
→ 사용자가 앱은 즉시 사용,
  필요 시 Ollama 설치
```

#### 옵션 3: 내부 공유 폴더
```
내부 공유 드라이브\statistical-platform\
├── statistical-app/
├── SETUP.md
├── OLLAMA_SETUP.md
└── models-list.txt
```

---

## 업데이트 배포

새 버전 배포 시:

### 변경사항 확인
```bash
git log --oneline | head -10
```

### 빌드 재생성
```bash
cd statistical-platform
npm install
npm run build
```

### 패키지 업데이트
```bash
# 기존 statistical-app 폴더 삭제
rm -r deployment-package/statistical-app

# 새 빌드 복사
cp -r statistical-platform/out/* deployment-package/statistical-app/

# 재압축
zip -r statistical-platform-deploy-v2.zip deployment-package/
```

### 버전 관리
패키지 이름에 버전 추가:
```
statistical-platform-deploy-v1.0.0.zip
statistical-platform-deploy-v1.1.0.zip
statistical-platform-deploy-v2.0.0.zip
```

---

## 문제 해결

### 빌드 실패
```bash
cd statistical-platform
rm -r .next out node_modules
npm install
npm run build
```

### 파일 손상
```bash
# 전체 폴더 다시 생성
rm -r deployment-package
# Step 2부터 재시작
```

### 사용자 문제 보고
```
수집 정보:
1. 어떤 파일을 실행했는가? (index.html, start.bat 등)
2. 어떤 에러가 표시되었는가?
3. 브라우저 콘솔 에러 (F12 → Console 탭)
4. Ollama 모델이 설치되어 있는가?
```

---

## 보안 고려사항

### 내부망 배포
- 외부 인터넷 연결 불필요 ✓
- 개인정보는 로컬에만 저장됨 ✓
- 중앙 서버 연결 없음 ✓

### 주의사항
- Ollama 모델 다운로드는 인터넷 필요 (초기 설치 시만)
- 로컬 저장 데이터는 PC 삭제 시 사라짐
- 백업 필요 시 별도 저장

---

## 배포 체크리스트

```bash
# 최종 배포 전 실행
./deployment-package/start.bat  # Windows
./deployment-package/start.sh   # macOS/Linux

# 브라우저에서 확인:
# 1. 페이지 로드됨 ✓
# 2. 샘플 데이터 로드 가능 ✓
# 3. 기본 통계 계산 가능 ✓
# 4. UI 모두 표시됨 ✓
```

---

**생성일**: 2025-11-04
**버전**: 0.1.0
**다음 배포**: [버전 업데이트 필요 시 날짜 추가]
