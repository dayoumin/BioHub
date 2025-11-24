import { readFileSync, writeFileSync } from 'fs';

const filePath = 'd:/Projects/Statics/statistical-platform/components/smart-flow/steps/PurposeInputStep.tsx';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// 1. Import 추가
const oldImports = `import type { PurposeInputStepProps } from '@/types/smart-flow-navigation'
import type { AnalysisPurpose, AIRecommendation } from '@/types/smart-flow'`;

const newImports = `import type { PurposeInputStepProps } from '@/types/smart-flow-navigation'
import type { AnalysisPurpose, AIRecommendation, VariableSelection, ColumnStatistics } from '@/types/smart-flow'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'`;

content = content.replace(oldImports, newImports);

// 2. State 추가 (selectedPurpose 다음에)
const oldState = `  const [selectedPurpose, setSelectedPurpose] = useState<AnalysisPurpose | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)`;

const newState = `  const [selectedPurpose, setSelectedPurpose] = useState<AnalysisPurpose | null>(null)
  const [selectedGroupVariable, setSelectedGroupVariable] = useState<string | null>(null)
  const [selectedDependentVariable, setSelectedDependentVariable] = useState<string | null>(null)
  const [selectedVariables, setSelectedVariables] = useState<string[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)`;

content = content.replace(oldState, newState);

// 3. 변수 목록 계산 (dataProfile 다음에)
const insertAfter = `  }, [validationResults, data])`;

const variablesLists = `

  // 변수 목록 계산
  const numericColumns = useMemo(() => {
    return validationResults?.columns?.filter(
      (col): col is ColumnStatistics => col.type === 'numeric'
    ) || []
  }, [validationResults])

  const categoricalColumns = useMemo(() => {
    return validationResults?.columns?.filter(
      (col): col is ColumnStatistics => col.type === 'categorical'
    ) || []
  }, [validationResults])

  // 변수 선택 완료 여부
  const isVariableSelectionComplete = useMemo(() => {
    if (!selectedPurpose) return false

    switch (selectedPurpose) {
      case 'compare':
        return !!selectedGroupVariable && !!selectedDependentVariable
      case 'relationship':
        return selectedVariables.length >= 2
      case 'distribution':
        return true // 변수 선택 불필요
      case 'prediction':
        return selectedVariables.length >= 2
      case 'timeseries':
        return selectedVariables.length >= 1
      default:
        return false
    }
  }, [selectedPurpose, selectedGroupVariable, selectedDependentVariable, selectedVariables])`;

content = content.replace(insertAfter, insertAfter + variablesLists);

// 4. 변수 선택 핸들러 추가 (analyzeAndRecommend 전에)
const beforeAnalyze = `  // Phase 4-B: 하이브리드 AI 추천 (Ollama → DecisionTree 폴백)`;

const handlers = `  // 변수 선택 핸들러
  const handleGroupVariableChange = useCallback((value: string) => {
    setSelectedGroupVariable(value)
    setRecommendation(null) // 추천 초기화
  }, [])

  const handleDependentVariableChange = useCallback((value: string) => {
    setSelectedDependentVariable(value)
    setRecommendation(null) // 추천 초기화
  }, [])

  const handleVariablesChange = useCallback((variable: string, checked: boolean) => {
    setSelectedVariables(prev =>
      checked ? [...prev, variable] : prev.filter(v => v !== variable)
    )
    setRecommendation(null) // 추천 초기화
  }, [])

  // 변수 선택 완료 시 자동 AI 추천
  useEffect(() => {
    if (isVariableSelectionComplete && selectedPurpose && !isAnalyzing && !recommendation) {
      // 변수 선택 완료되면 자동으로 AI 추천 실행
      const timer = setTimeout(() => {
        analyzeAndRecommend(selectedPurpose)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isVariableSelectionComplete, selectedPurpose, isAnalyzing, recommendation])

  `;

content = content.replace(beforeAnalyze, handlers + beforeAnalyze);

// 5. 목적 선택 핸들러 수정 (변수 초기화 추가)
const oldHandlePurposeSelect = `  // 목적 선택 핸들러
  const handlePurposeSelect = useCallback(async (purpose: AnalysisPurpose) => {
    setSelectedPurpose(purpose)
    setRecommendation(null)
    setAnalysisError(false)

    logger.info('Analysis purpose selected', { purpose })

    // AI 분석 시작
    const result = await analyzeAndRecommend(purpose)`;

const newHandlePurposeSelect = `  // 목적 선택 핸들러
  const handlePurposeSelect = useCallback(async (purpose: AnalysisPurpose) => {
    setSelectedPurpose(purpose)
    setRecommendation(null)
    setAnalysisError(false)

    // 변수 선택 초기화
    setSelectedGroupVariable(null)
    setSelectedDependentVariable(null)
    setSelectedVariables([])

    logger.info('Analysis purpose selected', { purpose })

    // 분포 분석은 변수 선택 불필요 → 즉시 AI 추천
    if (purpose === 'distribution') {
      const result = await analyzeAndRecommend(purpose)`;

content = content.replace(oldHandlePurposeSelect, newHandlePurposeSelect);

// 6. 분포 분석이 아닌 경우 처리 추가
const oldAnalysisEnd = `    if (result === null) {
      // 에러 발생 시 사용자에게 알림
      logger.error('AI 추천 실패', { purpose })
      setAnalysisError(true)
    } else {
      setRecommendation(result)
      setAnalysisError(false)
    }
  }, [analyzeAndRecommend])`;

const newAnalysisEnd = `      if (result === null) {
        logger.error('AI 추천 실패', { purpose })
        setAnalysisError(true)
      } else {
        setRecommendation(result)
        setAnalysisError(false)
      }
    }
    // 다른 목적은 변수 선택 후 AI 추천 (useEffect에서 처리)
  }, [analyzeAndRecommend])`;

content = content.replace(oldAnalysisEnd, newAnalysisEnd);

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('✅ PurposeInputStep.tsx 수정 완료 (1/2: 상태 및 핸들러 추가)');
console.log('다음: UI 부분 추가 필요');
