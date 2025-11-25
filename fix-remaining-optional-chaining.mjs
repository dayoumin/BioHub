import { readFileSync, writeFileSync } from 'fs';

const files = [
  'statistical-platform/lib/services/ollama-recommender.ts',
  'statistical-platform/lib/services/pdf-report-service.ts'
];

files.forEach(filePath => {
  let content = readFileSync(filePath, 'utf8');

  // Pattern 1: assumptionResults.normality.shapiroWilk.pValue
  content = content.replace(
    /assumptionResults\.normality\.shapiroWilk\.pValue/g,
    '(assumptionResults.normality.shapiroWilk?.pValue ?? 0)'
  );

  // Pattern 2: assumptionResults.homogeneity.levene.pValue
  content = content.replace(
    /assumptionResults\.homogeneity\.levene\.pValue/g,
    '(assumptionResults.homogeneity.levene?.pValue ?? 0)'
  );

  // Pattern 3: norm.group1.statistic
  content = content.replace(
    /norm\.group1\.statistic/g,
    '(norm.group1?.statistic ?? 0)'
  );

  // Pattern 4: norm.group1.pValue
  content = content.replace(
    /norm\.group1\.pValue/g,
    '(norm.group1?.pValue ?? 0)'
  );

  // Pattern 5: norm.group2.statistic
  content = content.replace(
    /norm\.group2\.statistic/g,
    '(norm.group2?.statistic ?? 0)'
  );

  // Pattern 6: norm.group2.pValue
  content = content.replace(
    /norm\.group2\.pValue/g,
    '(norm.group2?.pValue ?? 0)'
  );

  writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Fixed: ${filePath}`);
});

console.log('\n✅ 모든 Optional chaining 적용 완료');
