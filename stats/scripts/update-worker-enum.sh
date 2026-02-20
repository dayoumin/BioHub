#!/bin/bash

# PyodideWorker Enum 자동 변환 스크립트
# Worker 번호(1-4)를 PyodideWorker enum으로 변환

STATS_DIR="app/(dashboard)/statistics"
cd "$STATS_DIR" || exit 1

echo "=== PyodideWorker Enum 변환 시작 ==="
echo ""

# 이미 처리된 페이지 (descriptive, chi-square는 이미 enum 사용)
SKIP_PAGES="descriptive chi-square normality-test anova"

TOTAL=0
UPDATED=0
SKIPPED=0

for dir in */; do
  page="${dir%/}"

  # 건너뛸 페이지 확인
  if echo "$SKIP_PAGES" | grep -q "$page"; then
    echo "⏭️  $page (이미 완료)"
    ((SKIPPED++))
    continue
  fi

  if [ ! -f "$page/page.tsx" ]; then
    continue
  fi

  ((TOTAL++))

  # Worker 번호 확인
  if ! grep -q "callWorkerMethod" "$page/page.tsx"; then
    echo "⏭️  $page (callWorkerMethod 미사용)"
    ((SKIPPED++))
    continue
  fi

  # 이미 enum 사용 중인지 확인
  if grep -q "PyodideWorker\." "$page/page.tsx"; then
    echo "✅ $page (enum 이미 사용)"
    ((SKIPPED++))
    continue
  fi

  # Worker 번호 추출
  worker_num=$(grep -o "callWorkerMethod<[^>]*>(\s*[0-9]," "$page/page.tsx" 2>/dev/null | grep -o "(\s*[0-9]," | grep -o "[0-9]" | head -1)

  if [ -z "$worker_num" ]; then
    echo "⚠️  $page (Worker 번호 추출 실패)"
    continue
  fi

  # Worker 번호에 따른 enum 값
  case $worker_num in
    1) ENUM="PyodideWorker.Descriptive" ;;
    2) ENUM="PyodideWorker.Hypothesis" ;;
    3) ENUM="PyodideWorker.NonparametricAnova" ;;
    4) ENUM="PyodideWorker.RegressionAdvanced" ;;
    *) echo "⚠️  $page (잘못된 Worker 번호: $worker_num)"; continue ;;
  esac

  echo "🔄 $page (Worker $worker_num → $ENUM)"

  # 1. import 추가
  if ! grep -q "import.*PyodideWorker.*from.*pyodide-worker.enum" "$page/page.tsx"; then
    # 마지막 import 줄 찾기
    last_import_line=$(grep -n "^import " "$page/page.tsx" | tail -1 | cut -d: -f1)

    if [ -n "$last_import_line" ]; then
      sed -i "${last_import_line}a\\import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'" "$page/page.tsx"
    fi
  fi

  # 2. Worker 번호를 enum으로 변환 (여러 패턴 처리)
  # 패턴 1: }>(1, 'method'
  sed -i "s/}>\(\s*\)$worker_num,/}>\\1$ENUM,/g" "$page/page.tsx"

  # 패턴 2: }>(
  #          1,
  sed -i "s/}>\(\s*\)\n\(\s*\)$worker_num,/}>\\1\\n\\2$ENUM,/g" "$page/page.tsx"

  ((UPDATED++))
done

echo ""
echo "=== 완료 ==="
echo "총 페이지: $TOTAL"
echo "업데이트: $UPDATED"
echo "건너뜀: $SKIPPED"
