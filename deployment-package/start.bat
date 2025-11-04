@echo off
REM ============================================
REM 통계 분석 플랫폼 실행 스크립트 (Windows)
REM ============================================
REM 이 파일은 자동으로 앱을 실행합니다

setlocal enabledelayedexpansion

cls
echo.
echo ============================================
echo   통계 분석 플랫폼 시작
echo ============================================
echo.

REM 스크립트가 있는 폴더로 이동
cd /d "%~dp0"

REM Python 설치 확인
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ⚠️  Python이 설치되지 않았습니다.
    echo.
    echo 해결 방법:
    echo 1. Python 설치: https://www.python.org/downloads/
    echo 2. 설치 시 "Add Python to PATH" 체크
    echo 3. 이 파일을 다시 실행
    echo.
    pause
    exit /b 1
)

REM statistical-app 폴더로 이동
cd /d "%~dp0statistical-app"

REM Ollama 상태 확인 (선택사항)
echo [1/3] Ollama 상태 확인 중...
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo.
    echo ℹ️  Ollama가 실행되지 않았습니다.
    echo    AI 어시스턴트는 사용할 수 없습니다.
    echo.
    echo    나중에 Ollama를 설치하려면:
    echo    1. https://ollama.ai 방문
    echo    2. "Download for Windows" 클릭
    echo    3. OllamaSetup.exe 실행
    echo.
) else (
    echo    ✓ Ollama 준비 완료 (AI 어시스턴트 사용 가능)
)

REM 포트 확인
echo [2/3] 포트 상태 확인 중...
netstat -an 2>nul | find ":8000 " >nul
if errorlevel 1 (
    echo    ✓ 포트 8000 준비 완료
) else (
    echo.
    echo ⚠️  포트 8000이 이미 사용 중입니다.
    echo    다른 포트로 실행합니다 (8001)...
    echo.
)

REM 웹서버 시작
echo [3/3] 웹서버 시작 중...
echo.
echo ============================================
echo   브라우저 열기
echo ============================================
echo.
echo 📊 아래 주소를 브라우저에 입력하세요:
echo    http://localhost:8000
echo.
echo Chrome 또는 Edge 권장합니다.
echo.
echo (또는 자동으로 열려면 다음 명령어 사용:
echo  start http://localhost:8000)
echo.
echo ============================================
echo.
echo 웹서버 실행 중...
echo 종료하려면 Ctrl+C를 누르세요.
echo.

REM Python HTTP 서버 실행
python -m http.server 8000

REM 서버가 종료된 경우
echo.
echo 웹서버가 종료되었습니다.
pause
