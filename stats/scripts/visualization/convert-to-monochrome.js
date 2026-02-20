/**
 * 컬러풀 색상을 모노크롬으로 일괄 치환
 */

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'generate-component-html.js');
let content = fs.readFileSync(inputFile, 'utf-8');

console.log('🎨 모노크롬 색상으로 치환 시작...\n');

// 치환 매핑
const replacements = [
  // 그래디언트 → 모노크롬 (긴 것부터 먼저)
  ['linear-gradient(135deg, #667eea 0%, #764ba2 100%)', '#1a1a1a'],
  ['linear-gradient(135deg, #10b981 0%, #059669 100%)', '#525252'],
  ['linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', '#525252'],
  ['linear-gradient(90deg, #10b981 0%, #667eea 100%)', '#525252'],
  ['linear-gradient(90deg, #667eea 0%, #764ba2 100%)', '#737373'],
  ['linear-gradient(135deg, #f7fafc 0%, #e2e8f0 100%)', '#fafafa'],
  ['linear-gradient(135deg, #f7fafc 0%, #ebf8ff 100%)', '#fafafa'],
  ['linear-gradient(135deg, #ebf8ff 0%, #f0fff4 100%)', '#ffffff'],
  ['linear-gradient(135deg, #f0fff4 0%, #ebf8ff 100%)', '#ffffff'],
  ['linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', '#404040'],
  ['linear-gradient(to right, var(--track-analysis-from), var(--track-analysis-to))', '#1a1a1a'],

  // 배경색
  ['#ebf8ff', '#f5f5f5'],
  ['#f0fff4', '#f5f5f5'],
  ['#fffaf0', '#f5f5f5'],
  ['#cbd5e0', '#e5e5e5'],
  ['#e2e8f0', '#e5e5e5'],

  // 테두리 색상
  ['border: 2px solid #10b981', 'border: 2px solid #525252'],
  ['border: 2px solid #667eea', 'border: 2px solid #1a1a1a'],
  ['border: 2px dashed #667eea', 'border: 2px dashed #e5e5e5'],
  ['border: 2px dashed #cbd5e0', 'border: 2px dashed #e5e5e5'],
  ['border: 1px solid #cbd5e0', 'border: 1px solid #e5e5e5'],
  ['border: 1px solid #e2e8f0', 'border: 1px solid #e5e5e5'],
  ['border-color: #667eea', 'border-color: #1a1a1a'],

  // 색상 키워드
  ['color: #667eea', 'color: #1a1a1a'],
  ['color: #2c5282', 'color: #1a1a1a'],
  ['color: #4299e1', 'color: #1a1a1a'],
  ['color: #a0aec0', 'color: #a3a3a3'],
  ['color: #047857', 'color: #525252'],
  ['color: #065f46', 'color: #1a1a1a'],
  ['color: #2d5a7b', 'color: #525252'],
  ['color: #22543d', 'color: #1a1a1a'],
  ['color: #7c2d12', 'color: #525252'],

  // Shadow
  ['rgba(102, 126, 234, 0.2)', 'rgba(0, 0, 0, 0.05)'],
  ['rgba(102, 126, 234, 0.3)', 'rgba(0, 0, 0, 0.08)'],
  ['rgba(16, 185, 129, 0.2)', 'rgba(0, 0, 0, 0.05)'],
  ['shadow-blue-500/20', 'rgba(0, 0, 0, 0.05)'],

  // 특정 16진수 색상
  ['#10b981', '#525252'],  // emerald (완료 상태)
  ['#059669', '#525252'],  // emerald dark
  ['#06b6d4', '#525252'],  // cyan
  ['#3b82f6', '#404040'],  // blue
  ['#8b5cf6', '#404040'],  // purple
  ['#667eea', '#1a1a1a'],  // custom blue
  ['#764ba2', '#1a1a1a'],  // custom purple
  ['#f7fafc', '#fafafa'],  // light gray
  ['#2d3748', '#fafafa'],  // dark gray (for code blocks)
];

let changeCount = 0;

replacements.forEach(([from, to]) => {
  const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const matches = content.match(regex);
  if (matches) {
    content = content.replace(regex, to);
    changeCount += matches.length;
    console.log(`✅ "${from}" → "${to}" (${matches.length}개)`);
  }
});

// 파일 저장
fs.writeFileSync(inputFile, content, 'utf-8');

console.log(`\n✅ 총 ${changeCount}개 색상 치환 완료!`);
console.log(`📂 파일: ${inputFile}`);
