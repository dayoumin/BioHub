#!/bin/bash

# ============================================
# 통계 분석 플랫폼 실행 스크립트 (macOS/Linux)
# ============================================

clear

echo ""
echo "============================================"
echo "   통계 분석 플랫폼 시작"
echo "============================================"
echo ""

# 스크립트가 있는 폴더로 이동
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Python 설치 확인
if ! command -v python3 &> /dev/null; then
    echo ""
    echo "⚠️  Python 3이 설치되지 않았습니다."
    echo ""
    echo "해결 방법:"
    echo "macOS: brew install python3"
    echo "Linux (Ubuntu/Debian): sudo apt-get install python3"
    echo "Linux (CentOS/RHEL): sudo yum install python3"
    echo ""
    exit 1
fi

# statistical-app 폴더로 이동
cd "$SCRIPT_DIR/statistical-app"

# Ollama 상태 확인 (선택사항)
echo "[1/3] Ollama 상태 확인 중..."
curl -s http://localhost:11434/api/tags > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo ""
    echo "ℹ️  Ollama가 실행되지 않았습니다."
    echo "    AI 어시스턴트는 사용할 수 없습니다."
    echo ""
    echo "    나중에 Ollama를 설치하려면:"
    echo "    1. https://ollama.ai 방문"
    echo "    2. 설치 안내 따라 설치"
    echo "    3. ollama serve 명령어 실행"
    echo ""
else
    echo "    ✓ Ollama 준비 완료 (AI 어시스턴트 사용 가능)"
fi

# 포트 확인
echo "[2/3] 포트 상태 확인 중..."

# macOS와 Linux 구분
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    lsof -i :8000 > /dev/null 2>&1
else
    # Linux
    netstat -tuln 2>/dev/null | grep ":8000 " > /dev/null
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "⚠️  포트 8000이 이미 사용 중입니다."
    echo "    다른 포트로 실행합니다 (8001)..."
    echo ""
    PORT=8001
else
    echo "    ✓ 포트 8000 준비 완료"
    PORT=8000
fi

# 웹서버 시작
echo "[3/3] 웹서버 시작 중..."
echo ""
echo "============================================"
echo "   브라우저 열기"
echo "============================================"
echo ""
echo "📊 아래 주소를 브라우저에 입력하세요:"
echo "    http://localhost:$PORT"
echo ""
echo "Chrome 또는 Safari 권장합니다."
echo ""
echo "============================================"
echo ""
echo "웹서버 실행 중..."
echo "종료하려면 Ctrl+C를 누르세요."
echo ""

# Python HTTP 서버 실행
python3 -m http.server $PORT

# 서버가 종료된 경우
echo ""
echo "웹서버가 종료되었습니다."
