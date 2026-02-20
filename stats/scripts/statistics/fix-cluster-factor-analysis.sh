#!/bin/bash
# cluster와 factor-analysis 페이지의 배열 접근을 객체 필드 접근으로 변경

cd "$(dirname "$0")/../.."

echo "=== cluster 페이지 수정 ==="

# cluster/page.tsx
sed -i 's/selectedVariables\.length/selectedVariables.all.length/g' app/\(dashboard\)/statistics/cluster/page.tsx
sed -i 's/selectedVariables\.filter/selectedVariables.all.filter/g' app/\(dashboard\)/statistics/cluster/page.tsx
sed -i 's/selectedVariables\.includes/selectedVariables.all.includes/g' app/\(dashboard\)/statistics/cluster/page.tsx
sed -i 's/selectedVariables\.join/selectedVariables.all.join/g' app/\(dashboard\)/statistics/cluster/page.tsx
sed -i 's/\.\.\. *selectedVariables/...selectedVariables.all/g' app/\(dashboard\)/statistics/cluster/page.tsx

echo "=== factor-analysis 페이지 수정 ==="

# factor-analysis/page.tsx
sed -i 's/selectedVariables\.length/selectedVariables.all.length/g' app/\(dashboard\)/statistics/factor-analysis/page.tsx
sed -i 's/selectedVariables\.filter/selectedVariables.all.filter/g' app/\(dashboard\)/statistics/factor-analysis/page.tsx
sed -i 's/selectedVariables\.includes/selectedVariables.all.includes/g' app/\(dashboard\)/statistics/factor-analysis/page.tsx
sed -i 's/selectedVariables\.join/selectedVariables.all.join/g' app/\(dashboard\)/statistics/factor-analysis/page.tsx
sed -i 's/\.\.\. *selectedVariables/...selectedVariables.all/g' app/\(dashboard\)/statistics/factor-analysis/page.tsx

echo "✅ 완료!"
