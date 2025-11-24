import { readFileSync, writeFileSync } from 'fs';

// 1. PurposeInputStep.tsx 수정
const purposeFile = 'd:/Projects/Statics/statistical-platform/components/smart-flow/steps/PurposeInputStep.tsx';
let purposeContent = readFileSync(purposeFile, 'utf8');

// col 타입 명시
purposeContent = purposeContent.replace(
  /const numericColumns = useMemo\(\(\) => \{\n    return validationResults\?\.columns\?\.filter\(\n      \(col\) => col\.type === 'numeric'/,
  `const numericColumns = useMemo(() => {
    return validationResults?.columns?.filter(
      (col): col is ColumnStatistics => col.type === 'numeric'`
);

purposeContent = purposeContent.replace(
  /const categoricalColumns = useMemo\(\(\) => \{\n    return validationResults\?\.columns\?\.filter\(\n      \(col\) => col\.type === 'categorical'/,
  `const categoricalColumns = useMemo(() => {
    return validationResults?.columns?.filter(
      (col): col is ColumnStatistics => col.type === 'categorical'`
);

writeFileSync(purposeFile, purposeContent, 'utf8');
console.log('✅ PurposeInputStep.tsx: col 타입 명시 완료');

// 2. decision-tree-recommender.ts 수정
const dtFile = 'd:/Projects/Statics/statistical-platform/lib/services/decision-tree-recommender.ts';
let dtContent = readFileSync(dtFile, 'utf8');

// detectedVariables 타입 수정 (uniqueValues의 null/undefined 필터링)
const oldDetectedVariables = `          detectedVariables: groupVariable ? {
            groupVariable: {
              name: groupVariable,
              uniqueValues: Array.from(new Set(data.map(row => row[groupVariable]))),
              count: groups
            }
          } : undefined,`;

const newDetectedVariables = `          detectedVariables: groupVariable ? {
            groupVariable: {
              name: groupVariable,
              uniqueValues: Array.from(new Set(data.map(row => row[groupVariable]))).filter(
                (v): v is string | number => v !== null && v !== undefined
              ),
              count: groups
            }
          } : undefined,`;

dtContent = dtContent.replace(oldDetectedVariables, newDetectedVariables);

writeFileSync(dtFile, dtContent, 'utf8');
console.log('✅ decision-tree-recommender.ts: detectedVariables 타입 수정 완료');

console.log('');
console.log('수정 완료:');
console.log('1. PurposeInputStep.tsx: col 파라미터 타입 가드 추가');
console.log('2. decision-tree-recommender.ts: uniqueValues null/undefined 필터링');
