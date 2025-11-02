#!/bin/bash

# sql.js WASM 파일 다운로드 및 설정 스크립트
# 사용법: bash scripts/download-sql-wasm.sh

set -e

echo "📥 sql.js WASM 파일 준비 중..."

# 디렉토리 생성
mkdir -p public/sql-wasm

# 현재 디렉토리 저장
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT/public/sql-wasm"

echo "📍 위치: $(pwd)"

# sql.js 버전 (최신 안정 버전)
SQL_JS_VERSION="1.8.0"
SQL_JS_CDN="https://sql.js.org/dist"

# 파일 목록
FILES=(
  "sql-wasm.js"
  "sql-wasm.wasm"
)

# 다운로드 시도 (curl 또는 wget)
for FILE in "${FILES[@]}"; do
  echo "📥 다운로드: $FILE"

  if command -v curl &> /dev/null; then
    curl -L -o "$FILE" "$SQL_JS_CDN/$FILE" || {
      echo "❌ curl 다운로드 실패: $FILE"
      exit 1
    }
  elif command -v wget &> /dev/null; then
    wget -O "$FILE" "$SQL_JS_CDN/$FILE" || {
      echo "❌ wget 다운로드 실패: $FILE"
      exit 1
    }
  else
    echo "❌ curl이나 wget이 필요합니다"
    exit 1
  fi

  # 파일 크기 확인
  if [ -f "$FILE" ]; then
    SIZE=$(du -h "$FILE" | cut -f1)
    echo "✅ 다운로드 완료: $FILE ($SIZE)"
  else
    echo "❌ 파일이 생성되지 않았습니다: $FILE"
    exit 1
  fi
done

echo ""
echo "✅ sql.js WASM 파일 준비 완료!"
echo "📍 위치: $PROJECT_ROOT/public/sql-wasm/"
echo ""
echo "📋 다음 단계:"
echo "   1. git add public/sql-wasm/"
echo "   2. npm run build"
echo "   3. 배포 테스트"
echo ""
