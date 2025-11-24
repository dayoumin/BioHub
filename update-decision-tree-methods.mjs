import { readFileSync, writeFileSync } from 'fs';

const filePath = 'd:/Projects/Statics/statistical-platform/lib/services/decision-tree-recommender.ts';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// 1. recommendForCompare 시그니처 변경
const oldCompareSignature = `  private static recommendForCompare(
    assumptionResults: StatisticalAssumptions,
    validationResults: ValidationResults,
    data: DataRow[]
  ): AIRecommendation {`;

const newCompareSignature = `  private static recommendForCompare(
    assumptionResults: StatisticalAssumptions,
    validationResults: ValidationResults,
    data: DataRow[],
    variableSelection?: VariableSelection
  ): AIRecommendation {`;

content = content.replace(oldCompareSignature, newCompareSignature);

// 2. recommendForRelationship 시그니처 변경
const oldRelationshipSignature = `  private static recommendForRelationship(
    assumptionResults: StatisticalAssumptions,
    validationResults: ValidationResults,
    data: DataRow[]
  ): AIRecommendation {`;

const newRelationshipSignature = `  private static recommendForRelationship(
    assumptionResults: StatisticalAssumptions,
    validationResults: ValidationResults,
    data: DataRow[],
    variableSelection?: VariableSelection
  ): AIRecommendation {`;

content = content.replace(oldRelationshipSignature, newRelationshipSignature);

// 3. recommendForCompare에서 사용자 선택 변수 우선 사용
const oldGroupVariableLogic = `    // 그룹 개수 파악
    const groupVariable = this.findGroupVariable(validationResults, data)
    const groups = groupVariable ?
      new Set(data.map(row => row[groupVariable])).size : 0`;

const newGroupVariableLogic = `    // 그룹 개수 파악 (사용자 선택 변수 우선)
    const groupVariable = variableSelection?.groupVariable || this.findGroupVariable(validationResults, data)
    const groups = groupVariable ?
      new Set(data.map(row => row[groupVariable])).size : 0

    logger.info('[DecisionTree] recommendForCompare', {
      userSelectedGroup: variableSelection?.groupVariable,
      autoDetectedGroup: this.findGroupVariable(validationResults, data),
      finalGroupVariable: groupVariable,
      groups
    })`;

content = content.replace(oldGroupVariableLogic, newGroupVariableLogic);

// 4. detectedVariables 정보 추가 (2-group 비교 케이스에만)
const oldTTestReturn = `        return this.addExpectedKeywords({
          method: {
            id: 'independent-t-test',
            name: '독립표본 t-검정',
            description: '두 독립 그룹 간 평균 차이를 검정합니다.',
            category: 't-test',
            requirements: {
              minSampleSize: 30,
              assumptions: ['정규성', '등분산성', '독립성']
            }
          },
          confidence: 0.92,`;

const newTTestReturn = `        return this.addExpectedKeywords({
          method: {
            id: 'independent-t-test',
            name: '독립표본 t-검정',
            description: '두 독립 그룹 간 평균 차이를 검정합니다.',
            category: 't-test',
            requirements: {
              minSampleSize: 30,
              assumptions: ['정규성', '등분산성', '독립성']
            }
          },
          confidence: 0.92,
          detectedVariables: groupVariable ? {
            groupVariable: {
              name: groupVariable,
              uniqueValues: Array.from(new Set(data.map(row => row[groupVariable]))),
              count: groups
            }
          } : undefined,`;

content = content.replace(oldTTestReturn, newTTestReturn);

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('✅ DecisionTreeRecommender 메서드 수정 완료');
console.log('');
console.log('변경 사항:');
console.log('1. recommendForCompare() 시그니처에 variableSelection 추가');
console.log('2. recommendForRelationship() 시그니처에 variableSelection 추가');
console.log('3. 사용자 선택 그룹 변수 우선 사용 (자동 감지는 fallback)');
console.log('4. detectedVariables 정보 추가 (t-test 추천 시)');
console.log('');
console.log('다음: PurposeInputStep에서 recommend() 호출 시 variableSelection 전달');
