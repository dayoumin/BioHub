import { readFileSync, writeFileSync } from 'fs';

const filePath = 'd:\\Projects\\Statics\\statistical-platform\\lib\\stores\\smart-flow-store.ts';

console.log('📂 파일 읽기 중...');
let content = readFileSync(filePath, 'utf8');

// 1. canProceedToNext 수정 (7단계로 확장)
console.log('✅ Step 1: canProceedToNext 수정 (case 3-7 업데이트)');
const oldSwitch = `      canProceedToNext: () => {
        const state = get()
        switch (state.currentStep) {
          case 1: return state.uploadedFile !== null && state.uploadedData !== null
          case 2: return state.validationResults?.isValid === true
          case 3: return state.selectedMethod !== null
          case 4: return state.variableMapping !== null // 변수 선택 완료
          case 5: return false // 자동 진행
          case 6: return false // 마지막 단계
          default: return false
        }
      },`;

const newSwitch = `      canProceedToNext: () => {
        const state = get()
        switch (state.currentStep) {
          case 1: return state.uploadedFile !== null && state.uploadedData !== null
          case 2: return state.validationResults?.isValid === true
          case 3: return true // 데이터 탐색 (선택 사항, 항상 진행 가능)
          case 4: return state.selectedMethod !== null
          case 5: return state.variableMapping !== null // 변수 선택 완료
          case 6: return false // 자동 진행
          case 7: return false // 마지막 단계
          default: return false
        }
      },`;

content = content.replace(oldSwitch, newSwitch);

// 2. goToNextStep 수정 (< 6 → < 7)
console.log('✅ Step 2: goToNextStep 수정 (< 6 → < 7)');
const oldGoToNext = `      goToNextStep: () => {
        const state = get()
        if (state.currentStep < 6) {
          set({
            completedSteps: [...new Set([...state.completedSteps, state.currentStep])],
            currentStep: state.currentStep + 1
          })
        }
      },`;

const newGoToNext = `      goToNextStep: () => {
        const state = get()
        if (state.currentStep < 7) {
          set({
            completedSteps: [...new Set([...state.completedSteps, state.currentStep])],
            currentStep: state.currentStep + 1
          })
        }
      },`;

content = content.replace(oldGoToNext, newGoToNext);

console.log('💾 파일 저장 중...');
writeFileSync(filePath, content, 'utf8');

console.log('🎉 완료!');
console.log('');
console.log('📊 수정된 내용:');
console.log('  1. canProceedToNext: case 3-7 추가 (Step 3은 항상 진행 가능)');
console.log('  2. goToNextStep: 최대 단계 6 → 7로 변경');
console.log('');
console.log('🔍 변경 사항:');
console.log('  Step 3 (데이터 탐색): return true (선택 사항)');
console.log('  Step 4 (분석 목적): return selectedMethod !== null');
console.log('  Step 5 (변수 선택): return variableMapping !== null');
console.log('  Step 6 (분석 실행): return false (자동 진행)');
console.log('  Step 7 (결과 확인): return false (마지막 단계)');
