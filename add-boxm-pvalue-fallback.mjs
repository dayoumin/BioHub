// Add pValue fallback for Box's M test (mirroring Wilks' Lambda pattern)
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/lib/interpretation/engine.ts';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// Line 635 직후에 boxMSignificant 추가
const insertPoint = content.indexOf("    const wilksSignificant = wilksLambda?.significant ?? (wilksLambda?.pValue !== undefined && wilksLambda.pValue < 0.05)");

if (insertPoint === -1) {
  console.error('❌ 삽입 위치를 찾을 수 없습니다.');
  process.exit(1);
}

const endOfLine = content.indexOf('\n', insertPoint);

const newLine = `
    const boxMSignificant = boxM?.significant ?? (boxM?.pValue !== undefined && boxM.pValue < 0.05)`;

content = content.slice(0, endOfLine) + newLine + content.slice(endOfLine);

// boxM?.significant === true를 boxMSignificant로 교체 (4곳)
content = content.replace(/boxM\?\.significant === true/g, 'boxMSignificant');

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('✅ Box\'s M pValue fallback 추가 완료');
console.log('📍 변경 내역:');
console.log('  - Line 636: boxMSignificant 변수 추가 (Wilks Lambda 패턴 미러링)');
console.log('  - Line 644-648: boxM?.significant === true → boxMSignificant (4곳 교체)');
console.log('📍 효과:');
console.log('  - boxM.significant가 없어도 pValue < 0.05면 경고 표시');
console.log('  - Wilks Lambda와 동일한 패턴으로 일관성 확보');
