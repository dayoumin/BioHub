import { readFileSync, writeFileSync } from 'fs';

const filePath = 'd:\\Projects\\Statics\\statistical-platform\\components\\smart-flow\\steps\\DataExplorationStep.tsx';

console.log('📂 파일 읽기 중...');
let content = readFileSync(filePath, 'utf8');

// Issue #5: Row-wise pairwise deletion
console.log('✅ Issue #5: Row-wise pairwise deletion 구현');

// 1. getVariableData를 getVariableDataRaw로 변경 (raw data 반환)
const oldGetVariableData = `  // 변수 데이터 추출 (Null/NaN 필터링)
  const getVariableData = useCallback((variableName: string): number[] => {
    return data
      .map(row => row[variableName])
      .filter(v => v !== null && v !== undefined && v !== '')
      .map(Number)
      .filter(v => !isNaN(v))
  }, [data])`;

const newGetVariableData = `  // 변수 데이터 추출 (Raw - 필터링 없음, row index 유지)
  const getVariableDataRaw = useCallback((variableName: string): Array<number | null> => {
    return data.map(row => {
      const val = row[variableName]
      if (val === null || val === undefined || val === '') return null
      const num = Number(val)
      return isNaN(num) ? null : num
    })
  }, [data])

  // Row-wise pairwise deletion: X와 Y 모두 valid한 행만 유지
  const getPairedData = useCallback((var1: string, var2: string): { x: number[]; y: number[] } => {
    const raw1 = getVariableDataRaw(var1)
    const raw2 = getVariableDataRaw(var2)

    const paired: { x: number; y: number }[] = []
    for (let i = 0; i < Math.min(raw1.length, raw2.length); i++) {
      if (raw1[i] !== null && raw2[i] !== null) {
        paired.push({ x: raw1[i]!, y: raw2[i]! })
      }
    }

    return {
      x: paired.map(p => p.x),
      y: paired.map(p => p.y)
    }
  }, [getVariableDataRaw])`;

content = content.replace(oldGetVariableData, newGetVariableData);

// 2. calculateCorrelation 간소화 (이미 paired data 받음)
const oldCalculateCorrelation = `function calculateCorrelation(x: number[], y: number[]): { r: number; r2: number; n: number } {
  // Pairwise deletion: x와 y 길이 맞추기
  const n = Math.min(x.length, y.length)
  if (n < 2) return { r: 0, r2: 0, n: 0 }

  // x와 y를 같은 길이로 슬라이스
  const xPaired = x.slice(0, n)
  const yPaired = y.slice(0, n)

  const sumX = xPaired.reduce((sum, val) => sum + val, 0)
  const sumY = yPaired.reduce((sum, val) => sum + val, 0)
  const sumXY = xPaired.reduce((sum, val, i) => sum + val * yPaired[i], 0)
  const sumXX = xPaired.reduce((sum, val) => sum + val * val, 0)
  const sumYY = yPaired.reduce((sum, val) => sum + val * val, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))

  const r = denominator === 0 ? 0 : numerator / denominator
  const r2 = r * r

  return { r, r2, n }
}`;

const newCalculateCorrelation = `function calculateCorrelation(x: number[], y: number[]): { r: number; r2: number; n: number } {
  // x와 y는 이미 row-wise paired (길이 동일 보장)
  const n = x.length
  if (n < 2 || x.length !== y.length) return { r: 0, r2: 0, n: 0 }

  const sumX = x.reduce((sum, val) => sum + val, 0)
  const sumY = y.reduce((sum, val) => sum + val, 0)
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
  const sumXX = x.reduce((sum, val) => sum + val * val, 0)
  const sumYY = y.reduce((sum, val) => sum + val * val, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))

  const r = denominator === 0 ? 0 : numerator / denominator
  const r2 = r * r

  return { r, r2, n }
}`;

content = content.replace(oldCalculateCorrelation, newCalculateCorrelation);

// 3. 상관계수 행렬 계산 부분 수정
const oldCorrelationMatrix = `        const var1 = numericVariables[i]
        const var2 = numericVariables[j]
        const data1 = getVariableData(var1)
        const data2 = getVariableData(var2)
        const { r, r2 } = calculateCorrelation(data1, data2)`;

const newCorrelationMatrix = `        const var1 = numericVariables[i]
        const var2 = numericVariables[j]
        const { x: data1, y: data2 } = getPairedData(var1, var2)
        const { r, r2 } = calculateCorrelation(data1, data2)`;

content = content.replace(oldCorrelationMatrix, newCorrelationMatrix);

// 4. Scatterplot 렌더링 부분 수정
const oldScatterRender = `                  {config.yVariables.map(yVar => {
                    const xData = getVariableData(config.xVariable)
                    const yData = getVariableData(yVar)
                    const minLength = Math.min(xData.length, yData.length)
                    const scatterData = Array.from({ length: minLength }, (_, i) => ({
                      x: xData[i],
                      y: yData[i]
                    }))
                    const { r, r2 } = calculateCorrelation(xData, yData)`;

const newScatterRender = `                  {config.yVariables.map(yVar => {
                    const { x: xData, y: yData } = getPairedData(config.xVariable, yVar)
                    const scatterData = xData.map((x, i) => ({ x, y: yData[i] }))
                    const { r, r2 } = calculateCorrelation(xData, yData)`;

content = content.replace(oldScatterRender, newScatterRender);

// 5. 표본 크기 계산 수정
const oldSampleSize = `                            <div>
                              <span className="font-medium">표본 크기 (n):</span> {minLength}
                            </div>`;

const newSampleSize = `                            <div>
                              <span className="font-medium">표본 크기 (n):</span> {xData.length}
                            </div>`;

content = content.replace(oldSampleSize, newSampleSize);

console.log('💾 파일 저장 중...');
writeFileSync(filePath, content, 'utf8');

console.log('🎉 완료!');
console.log('');
console.log('📊 수정된 내용:');
console.log('  1. getVariableDataRaw: 행 인덱스 유지 (null 포함)');
console.log('  2. getPairedData: Row-wise pairwise deletion');
console.log('  3. calculateCorrelation: 간소화 (이미 paired)');
console.log('  4. 상관계수 행렬: getPairedData 사용');
console.log('  5. Scatterplot: getPairedData 사용');
console.log('');
console.log('🔍 핵심 개선:');
console.log('  - X[i]와 Y[i]가 같은 행의 데이터임을 보장');
console.log('  - Missing value가 있어도 행 정렬 유지');
console.log('  - 정확한 Pearson r 계산');
