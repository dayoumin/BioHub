import { readFileSync, writeFileSync } from 'fs';

const filePath = 'd:\\Projects\\Statics\\statistical-platform\\components\\smart-flow\\steps\\DataExplorationStep.tsx';

console.log('📂 파일 읽기 중...');
let content = readFileSync(filePath, 'utf8');

// useMemo 종속성 배열 수정
console.log('✅ useMemo 종속성 배열 수정: getVariableData → getPairedData');

const oldDeps = `  }, [numericVariables, getVariableData])`;
const newDeps = `  }, [numericVariables, getPairedData])`;

content = content.replace(oldDeps, newDeps);

console.log('💾 파일 저장 중...');
writeFileSync(filePath, content, 'utf8');

console.log('🎉 완료!');
console.log('');
console.log('📊 수정된 내용:');
console.log('  - Line 212: [numericVariables, getVariableData] → [numericVariables, getPairedData]');
