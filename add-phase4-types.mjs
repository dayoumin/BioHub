// Add Phase 4 missing type fields to types/smart-flow.ts
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/types/smart-flow.ts';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// log_likelihood?: number 바로 뒤에 추가 (line 351 직후)
const insertPoint = content.indexOf("    log_likelihood?: number  // Log-likelihood");

if (insertPoint === -1) {
  console.error('❌ 삽입 위치를 찾을 수 없습니다.');
  process.exit(1);
}

const endOfLine = content.indexOf('\n', insertPoint);

const newFields = `
    // Discriminant Analysis
    wilksLambda?: {
      pValue?: number
      significant?: boolean
    }
    boxM?: {
      pValue?: number
      significant?: boolean
    }
    accuracy?: number
    // Dose-Response Analysis
    hill_slope?: number
    // Response Surface Methodology
    selectedFunctions?: string[]
    // Effect Size (ANOVA, ANCOVA, etc.)
    effectSize?: number | { value: number; interpretation: string; type: string }`;

content = content.slice(0, endOfLine) + newFields + content.slice(endOfLine);

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('✅ Phase 4 타입 필드 추가 완료');
console.log('📍 추가된 필드:');
console.log('  - wilksLambda (Discriminant Analysis)');
console.log('  - boxM (Discriminant Analysis)');
console.log('  - accuracy (Discriminant Analysis)');
console.log('  - hill_slope (Dose-Response)');
console.log('  - selectedFunctions (Response Surface)');
console.log('  - effectSize (ANOVA, ANCOVA)');
