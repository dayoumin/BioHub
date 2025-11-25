import { readFileSync, writeFileSync } from 'fs';

// data-processing.ts - Set 최적화 적용
const filePath = 'statistical-platform/lib/data-processing.ts';
let content = readFileSync(filePath, 'utf8');

// 기존 MISSING_VALUE_PATTERNS 배열과 isMissingValue 함수를 Set 기반으로 교체
const oldCode = `/**
 * 결측값으로 인식할 패턴들
 * 다양한 소프트웨어에서 사용되는 결측값 표기 자동 지원
 */
const MISSING_VALUE_PATTERNS = [
  '',        // 빈 문자열
  'NA',      // R, pandas
  'N/A',     // Excel
  'na',
  'n/a',
  '-',       // 일반적인 표기
  '.',       // SAS, SPSS
  'NULL',    // 데이터베이스
  'null',
  'NaN',     // JavaScript, Python
  'nan',
  '#N/A',    // Excel 오류
  '#NA',
  'missing',
  'MISSING',
];

/**
 * 값이 결측값인지 판별
 */
function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number' && isNaN(value)) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return MISSING_VALUE_PATTERNS.includes(trimmed);
  }
  return false;
}`;

const newCode = `/**
 * 결측값으로 인식할 패턴들 (소문자 정규화)
 * 다양한 소프트웨어에서 사용되는 결측값 표기 자동 지원
 * - R, pandas: NA
 * - Excel: N/A, #N/A, #NA
 * - SAS, SPSS: .
 * - Database: NULL
 * - JavaScript, Python: NaN
 * - 일반: -, missing, 빈 문자열
 */
const MISSING_VALUE_SET = new Set([
  '',        // 빈 문자열
  'na',      // R, pandas (NA, na)
  'n/a',     // Excel (N/A, n/a)
  '-',       // 일반적인 표기
  '.',       // SAS, SPSS
  'null',    // 데이터베이스 (NULL, null)
  'nan',     // JavaScript, Python (NaN, nan)
  '#n/a',    // Excel 오류 (#N/A)
  '#na',     // Excel 오류 (#NA)
  'missing', // 일반 (missing, MISSING)
]);

/**
 * 값이 결측값인지 판별
 * O(1) 검색 + 대소문자 무시
 */
function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number' && isNaN(value)) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return MISSING_VALUE_SET.has(normalized);
  }
  return false;
}`;

content = content.replace(oldCode, newCode);

writeFileSync(filePath, content, 'utf8');
console.log('✅ data-processing.ts Set 최적화 완료');
