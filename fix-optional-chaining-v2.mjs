import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/lib/services/decision-tree-recommender.ts';
let content = readFileSync(filePath, 'utf8');

// Pattern 1: .toFixed(3) 호출이 있는 경우
// normality.shapiroWilk!.pValue.toFixed(3)
// → (normality.shapiroWilk?.pValue ?? 0).toFixed(3)
content = content.replace(
  /normality\.shapiroWilk!\.pValue\.toFixed\((\d+)\)/g,
  '(normality.shapiroWilk?.pValue ?? 0).toFixed($1)'
);

content = content.replace(
  /normality\.kolmogorovSmirnov!\.pValue\.toFixed\((\d+)\)/g,
  '(normality.kolmogorovSmirnov?.pValue ?? 0).toFixed($1)'
);

content = content.replace(
  /homogeneity\.levene!\.pValue\.toFixed\((\d+)\)/g,
  '(homogeneity.levene?.pValue ?? 0).toFixed($1)'
);

content = content.replace(
  /homogeneity\.bartlett!\.pValue\.toFixed\((\d+)\)/g,
  '(homogeneity.bartlett?.pValue ?? 0).toFixed($1)'
);

// Pattern 2: .toFixed() 호출이 없는 경우 (단순 값 접근)
// normality.shapiroWilk!.pValue → normality.shapiroWilk?.pValue ?? 0
content = content.replace(
  /normality\.shapiroWilk!\.pValue(?!\.)/g,
  'normality.shapiroWilk?.pValue ?? 0'
);

content = content.replace(
  /normality\.kolmogorovSmirnov!\.pValue(?!\.)/g,
  'normality.kolmogorovSmirnov?.pValue ?? 0'
);

content = content.replace(
  /homogeneity\.levene!\.pValue(?!\.)/g,
  'homogeneity.levene?.pValue ?? 0'
);

content = content.replace(
  /homogeneity\.bartlett!\.pValue(?!\.)/g,
  'homogeneity.bartlett?.pValue ?? 0'
);

writeFileSync(filePath, content, 'utf8');
console.log('✅ decision-tree-recommender.ts: Optional chaining 적용 완료 (v2)');
