import { readFileSync, writeFileSync } from 'fs';

const files = [
  'statistical-platform/lib/services/decision-tree-recommender.ts',
  'statistical-platform/lib/services/ollama-recommender.ts',
  'statistical-platform/lib/services/pdf-report-service.ts',
  'statistical-platform/components/smart-flow/steps/ResultsActionStep.tsx'
];

files.forEach(filePath => {
  let content = readFileSync(filePath, 'utf8');

  // Pattern 1: (pValue ?? 0).toFixed(3) in template literal
  // → pValue !== undefined ? pValue.toFixed(3) : 'N/A'

  // decision-tree-recommender: (p=${(normality.shapiroWilk?.pValue ?? 0).toFixed(3)})
  content = content.replace(
    /\(p=\$\{\(([^}]+\.pValue)\s*\?\?\s*0\)\.toFixed\((\d+)\)\}\)/g,
    '(p=${$1 !== undefined ? $1.toFixed($2) : \'N/A\'})'
  );

  // Pattern 2: assumptions array에서 pValue ?? 0
  // { name: '정규성', passed: true, pValue: normality.shapiroWilk?.pValue ?? 0 }
  // → pValue: normality.shapiroWilk?.pValue ?? NaN (NaN은 "데이터 없음"을 명확히 표시)
  content = content.replace(
    /(pValue:\s*)([^}]+\.pValue)\s*\?\?\s*0/g,
    '$1$2 ?? NaN'
  );

  // Pattern 3: ResultsActionStep 등에서 직접 표시
  // (p={(results.assumptions.normality.group1.pValue ?? 0).toFixed(3)})
  // → 조건부 렌더링으로 변경 필요 (별도 처리)

  writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Fixed: ${filePath}`);
});

console.log('\n✅ p-value 표시 수정 완료: 0 → N/A 또는 NaN');
