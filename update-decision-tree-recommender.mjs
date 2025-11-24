import { readFileSync, writeFileSync } from 'fs';

const filePath = 'd:/Projects/Statics/statistical-platform/lib/services/decision-tree-recommender.ts';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// 1. Import에 VariableSelection 추가
const oldImports = `import type {
  AnalysisPurpose,
  AIRecommendation,
  StatisticalMethod,
  ValidationResults,
  DataRow,
  StatisticalAssumptions
} from '@/types/smart-flow'`;

const newImports = `import type {
  AnalysisPurpose,
  AIRecommendation,
  StatisticalMethod,
  ValidationResults,
  DataRow,
  StatisticalAssumptions,
  VariableSelection
} from '@/types/smart-flow'`;

content = content.replace(oldImports, newImports);

// 2. recommend 메서드 시그니처 변경
const oldSignature = `  /**
   * 메인 추천 함수 (assumptionResults 필요)
   */
  static recommend(
    purpose: AnalysisPurpose,
    assumptionResults: StatisticalAssumptions,
    validationResults: ValidationResults,
    data: DataRow[]
  ): AIRecommendation {`;

const newSignature = `  /**
   * 메인 추천 함수 (assumptionResults 필요)
   */
  static recommend(
    purpose: AnalysisPurpose,
    assumptionResults: StatisticalAssumptions,
    validationResults: ValidationResults,
    data: DataRow[],
    variableSelection?: VariableSelection
  ): AIRecommendation {`;

content = content.replace(oldSignature, newSignature);

// 3. 각 recommendFor* 메서드에 variableSelection 파라미터 전달
const oldCompareCall = `        case 'compare':
          return this.recommendForCompare(assumptionResults, validationResults, data)`;

const newCompareCall = `        case 'compare':
          return this.recommendForCompare(assumptionResults, validationResults, data, variableSelection)`;

content = content.replace(oldCompareCall, newCompareCall);

const oldRelationshipCall = `        case 'relationship':
          return this.recommendForRelationship(assumptionResults, validationResults, data)`;

const newRelationshipCall = `        case 'relationship':
          return this.recommendForRelationship(assumptionResults, validationResults, data, variableSelection)`;

content = content.replace(oldRelationshipCall, newRelationshipCall);

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('✅ DecisionTreeRecommender.recommend() 시그니처 변경 완료');
console.log('');
console.log('변경 사항:');
console.log('1. VariableSelection import 추가');
console.log('2. recommend() 메서드에 variableSelection?: VariableSelection 파라미터 추가');
console.log('3. recommendForCompare()와 recommendForRelationship()에 variableSelection 전달');
console.log('');
console.log('다음: recommendForCompare() 메서드 수정 필요');
