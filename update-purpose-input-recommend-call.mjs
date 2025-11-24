import { readFileSync, writeFileSync } from 'fs';

const filePath = 'd:/Projects/Statics/statistical-platform/components/smart-flow/steps/PurposeInputStep.tsx';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// DecisionTreeRecommender.recommend() 호출 시 variableSelection 전달
const oldRecommendCall = `      \\ Step 2: DecisionTree 폴백
      setAiProgress(80)
      const decisionTreeResult = DecisionTreeRecommender.recommend(
        purpose,
        assumptionResults,
        validationResults,
        data
      )`;

const newRecommendCall = `      \\ Step 2: DecisionTree 폴백
      setAiProgress(80)

      // 변수 선택 정보 구성
      const variableSelection: VariableSelection | undefined = (() => {
        if (purpose === 'compare') {
          return {
            purpose,
            groupVariable: selectedGroupVariable || undefined,
            dependentVariable: selectedDependentVariable || undefined
          }
        } else if (purpose === 'relationship' || purpose === 'prediction' || purpose === 'timeseries') {
          return {
            purpose,
            variables: selectedVariables.length > 0 ? selectedVariables : undefined
          }
        }
        return undefined
      })()

      const decisionTreeResult = DecisionTreeRecommender.recommend(
        purpose,
        assumptionResults,
        validationResults,
        data,
        variableSelection
      )`;

content = content.replace(oldRecommendCall, newRecommendCall);

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('✅ PurposeInputStep.tsx 수정 완료 (variableSelection 전달)');
console.log('');
console.log('변경 사항:');
console.log('1. DecisionTreeRecommender.recommend() 호출 시 variableSelection 전달');
console.log('2. 목적별로 적절한 variableSelection 객체 구성');
console.log('   - compare: groupVariable + dependentVariable');
console.log('   - relationship/prediction/timeseries: variables');
console.log('   - distribution: undefined (변수 선택 불필요)');
