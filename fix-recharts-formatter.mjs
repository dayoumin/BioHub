import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/components/smart-flow/ResultsVisualization.tsx';
let content = readFileSync(filePath, 'utf8');

// Fix: formatter 타입을 올바르게 수정
// Before: formatter: (value: number) => value.toFixed(2)
// After: formatter: (label) => typeof label === 'number' ? label.toFixed(2) : String(label)

content = content.replace(
  /formatter: \(value: number\) => value\.toFixed\(2\)/g,
  "formatter: (label) => typeof label === 'number' ? label.toFixed(2) : String(label)"
);

writeFileSync(filePath, content, 'utf8');
console.log('✅ Recharts LabelFormatter 타입 에러 수정 완료');
