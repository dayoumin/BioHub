// Fix Discriminant Analysis data access to support both structures
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/lib/interpretation/engine.ts';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// Line 620-624: Update data access to support both structures
const oldCode = `    const accuracy = discriminantInfo?.accuracy
    const numFunctions = discriminantInfo?.selectedFunctions
    const totalVariance = discriminantInfo?.totalVariance
    const wilksLambda = discriminantInfo?.equalityTests?.wilksLambda
    const boxM = discriminantInfo?.equalityTests?.boxM`;

const newCode = `    // Support both structures: discriminantInfo.equalityTests and direct additional fields
    const accuracy = discriminantInfo?.accuracy ?? results.additional?.accuracy
    const numFunctions = discriminantInfo?.selectedFunctions ?? results.additional?.selectedFunctions
    const totalVariance = discriminantInfo?.totalVariance
    const wilksLambda = discriminantInfo?.equalityTests?.wilksLambda ?? results.additional?.wilksLambda
    const boxM = discriminantInfo?.equalityTests?.boxM ?? results.additional?.boxM`;

content = content.replace(oldCode, newCode);

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('✅ Discriminant Analysis 데이터 접근 수정 완료');
console.log('📍 변경 내역:');
console.log('  - accuracy: discriminantInfo 또는 additional에서 조회');
console.log('  - wilksLambda: equalityTests 또는 additional에서 조회');
console.log('  - boxM: equalityTests 또는 additional에서 조회');
console.log('  - numFunctions: discriminantInfo 또는 additional에서 조회');
