import { readFileSync, writeFileSync } from 'fs';

const filePath = 'statistical-platform/lib/interpretation/engine.ts';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// ===== formatPValue() Edge Case 방어 =====
const formatPValueWithGuard = `/**
 * p-value 포맷팅 (DRY 원칙)
 * @example formatPValue(0.0001) → "< 0.001"
 * @example formatPValue(0.0234) → "0.023"
 */
function formatPValue(p: number): string {
  // Edge case 방어: NaN, Infinity, 범위 벗어남
  if (!isFinite(p) || p < 0 || p > 1) return 'N/A'

  if (p < THRESHOLDS.P_VALUE.VERY_STRONG) return '< 0.001'
  return p.toFixed(3)
}`;

content = content.replace(
  /\/\*\*\s+\* p-value 포맷팅 \(DRY 원칙\)[^}]+}/,
  formatPValueWithGuard
);

// ===== formatPercent() Edge Case 방어 =====
const formatPercentWithGuard = `/**
 * 퍼센트 포맷팅
 * @example formatPercent(0.456, 1) → "45.6%"
 */
function formatPercent(value: number, decimals: number = 1): string {
  // Edge case 방어: NaN, Infinity
  if (!isFinite(value)) return 'N/A'

  // [0, 1] 범위로 클램핑 (R², 상관계수 등은 항상 이 범위)
  const clamped = Math.max(0, Math.min(1, value))
  return \`\${(clamped * 100).toFixed(decimals)}%\`
}`;

content = content.replace(
  /\/\*\*\s+\* 퍼센트 포맷팅[^}]+}/,
  formatPercentWithGuard
);

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('✅ 완료: UTF-8 인코딩 보존됨\n');
console.log('Edge Case 방어 코드 추가:');
console.log('1. formatPValue():');
console.log('   - !isFinite(p) → "N/A"');
console.log('   - p < 0 또는 p > 1 → "N/A"');
console.log('\n2. formatPercent():');
console.log('   - !isFinite(value) → "N/A"');
console.log('   - Math.max(0, Math.min(1, value)) 클램핑');
