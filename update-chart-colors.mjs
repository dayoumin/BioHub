import { readFileSync, writeFileSync } from 'fs';

console.log('=== 차트 색상을 디자인 시스템으로 통합 ===\n');

// 1. SimpleBoxPlot 색상 업데이트
const boxPlotPath = 'statistical-platform/components/charts/simple-boxplot.tsx';
let boxPlotContent = readFileSync(boxPlotPath, 'utf8');

// Box 색상: #8884d8 → hsl(var(--info))
boxPlotContent = boxPlotContent.replace(
  /fill="#8884d8"/g,
  'fill="hsl(var(--info))"'
);
boxPlotContent = boxPlotContent.replace(
  /stroke="#8884d8"/g,
  'stroke="hsl(var(--info))"'
);

// Median 선 색상: #ff7300 → hsl(var(--warning))
boxPlotContent = boxPlotContent.replace(
  /stroke="#ff7300"/g,
  'stroke="hsl(var(--warning))"'
);

// Outlier 색상: #ff4444, #cc0000 → hsl(var(--error))
boxPlotContent = boxPlotContent.replace(
  /fill="#ff4444"/g,
  'fill="hsl(var(--error))"'
);
boxPlotContent = boxPlotContent.replace(
  /stroke="#cc0000"/g,
  'stroke="hsl(var(--error))"'
);

// Label 색상: #666 → hsl(var(--muted-foreground))
boxPlotContent = boxPlotContent.replace(
  /fill="#666"/g,
  'fill="hsl(var(--muted-foreground))"'
);

// Median label 색상: #ff7300 → hsl(var(--warning))
boxPlotContent = boxPlotContent.replace(
  /fill="#ff7300"/g,
  'fill="hsl(var(--warning))"'
);

// Variable name 색상: #333 → hsl(var(--foreground))
boxPlotContent = boxPlotContent.replace(
  /fill="#333"/g,
  'fill="hsl(var(--foreground))"'
);

writeFileSync(boxPlotPath, boxPlotContent, 'utf8');
console.log('✅ SimpleBoxPlot 색상 업데이트 완료');
console.log('   - Box: hsl(var(--info)) (Slate Blue)');
console.log('   - Median: hsl(var(--warning)) (Amber)');
console.log('   - Outliers: hsl(var(--error)) (Rose)');
console.log('   - Labels: hsl(var(--muted-foreground))');

// 2. Histogram 색상 확인 (이미 Recharts 사용 중)
console.log('\n📊 Histogram은 Recharts 기본 색상 사용 (변경 불필요)');
console.log('   - color prop으로 커스터마이징 가능 (#8884d8 기본값)');
