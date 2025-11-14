const fs = require('fs');
const path = require('path');

const statsDir = path.join(__dirname, '../app/(dashboard)/statistics');
const results = {
  useParseFloat: [],
  typeofOnly: [],
  noConversion: [],
  total: 0
};

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(path.dirname(filePath));

  results.total++;

  if (content.includes('parseFloat') || content.includes('Number(')) {
    results.useParseFloat.push(fileName);
  } else if (content.match(/typeof.*===.*'number'.*&&.*!isNaN/)) {
    results.typeofOnly.push(fileName);
  } else if (content.includes('row[') && content.includes('map')) {
    results.noConversion.push(fileName);
  }
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const pagePath = path.join(fullPath, 'page.tsx');
      if (fs.existsSync(pagePath)) {
        analyzeFile(pagePath);
      }
    }
  });
}

scanDirectory(statsDir);

console.log('=== 데이터 추출 패턴 분석 ===\n');
console.log(`전체 통계 페이지: ${results.total}개\n`);
console.log(`✅ parseFloat/Number 사용 (${results.useParseFloat.length}개):`);
results.useParseFloat.slice(0, 10).forEach(f => console.log(`  - ${f}`));
if (results.useParseFloat.length > 10) console.log(`  ... 외 ${results.useParseFloat.length - 10}개`);

console.log(`\n⚠️ typeof만 사용 (${results.typeofOnly.length}개):`);
results.typeofOnly.forEach(f => console.log(`  - ${f}`));

console.log(`\n❓ 변환 없음 (${results.noConversion.length}개):`);
results.noConversion.slice(0, 10).forEach(f => console.log(`  - ${f}`));
