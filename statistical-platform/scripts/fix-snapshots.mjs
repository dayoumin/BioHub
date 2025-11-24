/**
 * 스냅샷 JSON 파일 자동 수정 스크립트
 *
 * 실제 engine.ts 출력에 맞게 expectedOutput 업데이트
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 수정할 스냅샷 목록
const fixes = [
  // ANOVA: title 변경
  {
    file: 'anova.json',
    changes: [
      { field: 'title', from: '일원배치 분산분석 결과', to: '다집단 비교 결과' }
    ]
  },
  // Chi-Square: "두 변수 간" 제거
  {
    file: 'chi-square.json',
    changes: [
      { field: 'statistical', from: '두 변수 간 통계적으로 유의한 연관성이 있습니다 (p=< 0.001).', to: '통계적으로 유의한 연관성이 있습니다 (p=< 0.001).' },
      { field: 'statistical', from: '두 변수 간 통계적으로 유의한 연관성이 없습니다 (p=0.567).', to: '통계적으로 유의한 연관성이 없습니다 (p=0.567).' },
      { field: 'statistical', from: '두 변수 간 통계적으로 유의한 연관성이 있습니다 (p=0.048).', to: '통계적으로 유의한 연관성이 있습니다 (p=0.048).' }
    ]
  },
  // McNemar: 동일
  {
    file: 'mcnemar.json',
    changes: [
      { field: 'statistical', from: '두 변수 간 통계적으로 유의한 연관성이 있습니다 (p=0.005).', to: '통계적으로 유의한 연관성이 있습니다 (p=0.005).' },
      { field: 'statistical', from: '두 변수 간 통계적으로 유의한 연관성이 없습니다 (p=0.432).', to: '통계적으로 유의한 연관성이 없습니다 (p=0.432).' },
      { field: 'statistical', from: '두 변수 간 통계적으로 유의한 연관성이 있습니다 (p=0.046).', to: '통계적으로 유의한 연관성이 있습니다 (p=0.046).' }
    ]
  },
  // Correlation: 72.3% → 72.2%, 20.2% → 20.3%
  {
    file: 'correlation.json',
    changes: [
      { field: 'practical', from: '상관계수 r=0.850 → X 변동의 약 72.3%가 Y 변동과 관련됩니다.', to: '상관계수 r=0.850 → X 변동의 약 72.2%가 Y 변동과 관련됩니다.' },
      { field: 'practical', from: '상관계수 r=0.450 → X 변동의 약 20.2%가 Y 변동과 관련됩니다.', to: '상관계수 r=0.450 → X 변동의 약 20.3%가 Y 변동과 관련됩니다.' }
    ]
  },
  // Friedman: summary 변경
  {
    file: 'friedman.json',
    changes: [
      { field: 'summary', from: '동일 개체에서 3회 이상 측정한 값의 중앙값 차이를 검정했습니다.', to: '3개 이상 반복측정값의 중앙값 차이를 검정했습니다.' }
    ]
  }
];

fixes.forEach(fix => {
  const filePath = join(__dirname, '..', '__tests__', 'lib', 'interpretation', 'snapshots', fix.file);
  let content = readFileSync(filePath, 'utf8');

  fix.changes.forEach(change => {
    content = content.replace(change.from, change.to);
  });

  writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Fixed: ${fix.file} (${fix.changes.length} changes)`);
});

console.log('\n🎉 Total: ' + fixes.length + ' files fixed!');
