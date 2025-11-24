import { readFileSync, writeFileSync } from 'fs';

const filePath = 'd:\\Projects\\Statics\\statistical-platform\\components\\smart-flow\\steps\\DataExplorationStep.tsx';

console.log('📂 파일 읽기 중...');
let content = readFileSync(filePath, 'utf8');

// Issue #7: 미사용 import 제거
console.log('✅ Issue #7: 미사용 logger import 제거');
const oldImport = `import { ValidationResults, DataRow } from '@/types/smart-flow'
import { logger } from '@/lib/utils/logger'`;

const newImport = `import { ValidationResults, DataRow } from '@/types/smart-flow'`;

content = content.replace(oldImport, newImport);

// Issue #6: useEffect 추가 (import 먼저)
console.log('✅ Issue #6: useEffect import 추가');
const oldReactImport = `import { memo, useState, useMemo, useCallback } from 'react'`;
const newReactImport = `import { memo, useState, useMemo, useCallback, useEffect } from 'react'`;

content = content.replace(oldReactImport, newReactImport);

// Issue #6: useState 초기값 빈 배열로 변경
console.log('✅ Issue #6: useState 초기값 → 빈 배열');
const oldState = `  // Scatterplot 구성 목록
  const [scatterplots, setScatterplots] = useState<ScatterplotConfig[]>(() => {
    // 초기값: 첫 2개 변수 자동 추가
    if (numericVariables.length >= 2) {
      return [{
        id: '1',
        xVariable: numericVariables[0],
        yVariables: [numericVariables[1]]
      }]
    }
    return []
  })`;

const newState = `  // Scatterplot 구성 목록
  const [scatterplots, setScatterplots] = useState<ScatterplotConfig[]>([])`;

content = content.replace(oldState, newState);

// Issue #6: useEffect 추가 (비동기 데이터 로딩 대응)
console.log('✅ Issue #6: useEffect 추가 (numericVariables 감지)');
const oldGetVariableDataRaw = `  // 변수 데이터 추출 (Raw - 필터링 없음, row index 유지)
  const getVariableDataRaw = useCallback((variableName: string): Array<number | null> => {`;

const newUseEffect = `  // 비동기 데이터 로딩 대응: numericVariables 업데이트 시 기본 산점도 추가
  useEffect(() => {
    if (numericVariables.length >= 2 && scatterplots.length === 0) {
      setScatterplots([{
        id: '1',
        xVariable: numericVariables[0],
        yVariables: [numericVariables[1]]
      }])
    }
  }, [numericVariables, scatterplots.length])

  // 변수 데이터 추출 (Raw - 필터링 없음, row index 유지)
  const getVariableDataRaw = useCallback((variableName: string): Array<number | null> => {`;

content = content.replace(oldGetVariableDataRaw, newUseEffect);

console.log('💾 파일 저장 중...');
writeFileSync(filePath, content, 'utf8');

console.log('🎉 완료!');
console.log('');
console.log('📊 수정된 내용:');
console.log('  Issue #6 (Medium): 비동기 데이터 로딩 대응');
console.log('    1. useState 초기값 → 빈 배열 []');
console.log('    2. useEffect 추가 → numericVariables 감지 시 기본 산점도 생성');
console.log('    3. scatterplots.length === 0 조건 → 한 번만 생성');
console.log('');
console.log('  Issue #7 (Low): 미사용 import 제거');
console.log('    - logger import 제거');
console.log('');
console.log('🔍 핵심 개선:');
console.log('  - validationResults가 늦게 도착해도 자동으로 기본 산점도 생성');
console.log('  - 불필요한 import 제거 (linter 경고 방지)');
