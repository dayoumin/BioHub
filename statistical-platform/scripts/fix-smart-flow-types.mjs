import { readFileSync, writeFileSync } from 'fs';

const filePath = 'd:/Projects/Statics/statistical-platform/app/smart-flow/page.tsx';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// bottomPreview 수정
const oldBottomPreview = `  // 하단 데이터 미리보기 Props
  const bottomPreview = uploadedData && uploadedData.data.length > 0 ? {
    data: uploadedData.data,
    fileName: uploadedData.fileName || 'uploaded_data.csv',
    maxRows: 100
  } : undefined`;

const newBottomPreview = `  // 하단 데이터 미리보기 Props
  const bottomPreview = uploadedData && uploadedData.length > 0 ? {
    data: uploadedData,
    fileName: uploadedFileName || 'uploaded_data.csv',
    maxRows: 100
  } : undefined`;

content = content.replace(oldBottomPreview, newBottomPreview);

// uploadedFileName 추가
const oldStore = `  const {
    currentStep,
    completedSteps,
    uploadedData,
    validationResults,
    selectedMethod,
    variableMapping,
    results,
    isLoading,
    error,
    setUploadedFile,
    setUploadedData,
    setValidationResults,
    setAnalysisPurpose,
    setSelectedMethod,
    setresults,
    setError,
    canProceedToNext,
    goToNextStep,
    goToPreviousStep,
    reset,
    navigateToStep,
    canNavigateToStep,
    loadHistoryFromDB
  } = useSmartFlowStore()`;

const newStore = `  const {
    currentStep,
    completedSteps,
    uploadedData,
    uploadedFileName,
    validationResults,
    selectedMethod,
    variableMapping,
    results,
    isLoading,
    error,
    setUploadedFile,
    setUploadedData,
    setValidationResults,
    setAnalysisPurpose,
    setSelectedMethod,
    setresults,
    setError,
    canProceedToNext,
    goToNextStep,
    goToPreviousStep,
    reset,
    navigateToStep,
    canNavigateToStep,
    loadHistoryFromDB
  } = useSmartFlowStore()`;

content = content.replace(oldStore, newStore);

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('✅ smart-flow/page.tsx 타입 수정 완료');
