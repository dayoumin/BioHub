import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/lib/services/decision-tree-recommender.ts';
let content = readFileSync(filePath, 'utf8');

// Pattern 1: normality.shapiroWilk!.pValue → normality.shapiroWilk?.pValue ?? 0
content = content.replace(
  /normality\.shapiroWilk!\.pValue/g,
  'normality.shapiroWilk?.pValue ?? 0'
);

// Pattern 2: homogeneity.levene!.pValue → homogeneity.levene?.pValue ?? 0
content = content.replace(
  /homogeneity\.levene!\.pValue/g,
  'homogeneity.levene?.pValue ?? 0'
);

// Pattern 3: normality.kolmogorovSmirnov!.pValue → normality.kolmogorovSmirnov?.pValue ?? 0
content = content.replace(
  /normality\.kolmogorovSmirnov!\.pValue/g,
  'normality.kolmogorovSmirnov?.pValue ?? 0'
);

// Pattern 4: homogeneity.bartlett!.pValue → homogeneity.bartlett?.pValue ?? 0
content = content.replace(
  /homogeneity\.bartlett!\.pValue/g,
  'homogeneity.bartlett?.pValue ?? 0'
);

writeFileSync(filePath, content, 'utf8');
console.log('✅ decision-tree-recommender.ts: Optional chaining 적용 완료');
