import { readFileSync, writeFileSync } from 'fs';

// 1. data-processing.ts 수정 - 결측값 자동 인식 로직 추가
const dataProcessingPath = 'statistical-platform/lib/data-processing.ts';
let dataProcessing = readFileSync(dataProcessingPath, 'utf8');

// 결측값 상수 및 헬퍼 함수 추가 (import 문 다음에)
const missingValuesCode = `
/**
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
}

`;

// import 문 끝 찾기 (export interface DataColumn 바로 앞에 삽입)
dataProcessing = dataProcessing.replace(
  "export interface DataColumn {",
  missingValuesCode + "export interface DataColumn {"
);

// analyzeColumnDataTypes 함수의 결측값 필터링 로직 수정
dataProcessing = dataProcessing.replace(
  "const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '')",
  "const nonNullValues = values.filter(v => !isMissingValue(v))"
);

// validateData 함수의 결측값 카운트 로직 수정
dataProcessing = dataProcessing.replace(
  "const missingCount = values.filter(v => v === null || v === undefined || v === '').length",
  "const missingCount = values.filter(v => isMissingValue(v)).length"
);

// uniqueValues 필터링도 수정
dataProcessing = dataProcessing.replace(
  "const uniqueValues = new Set(values.filter(v => v !== null && v !== undefined && v !== ''))",
  "const uniqueValues = new Set(values.filter(v => !isMissingValue(v)))"
);

writeFileSync(dataProcessingPath, dataProcessing, 'utf8');
console.log('✅ data-processing.ts 수정 완료');

// 2. DataUploadStep.tsx 도움말 문구 수정
const uploadStepPath = 'statistical-platform/components/smart-flow/steps/DataUploadStep.tsx';
let uploadStep = readFileSync(uploadStepPath, 'utf8');

// 결측값 도움말 문구 수정
uploadStep = uploadStep.replace(
  '결측값은 빈 셀로 표시해주세요',
  '결측값은 자동으로 인식됩니다 (빈 셀, NA, -, . 등)'
);

writeFileSync(uploadStepPath, uploadStep, 'utf8');
console.log('✅ DataUploadStep.tsx 도움말 수정 완료');

console.log('\n🎉 모든 수정 완료!');
