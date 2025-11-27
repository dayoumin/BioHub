import { readFileSync, writeFileSync } from 'fs';

const filePath = 'components/smart-flow/steps/DataExplorationStep.tsx';
let content = readFileSync(filePath, 'utf8');

// 깨진 한글 주석 수정 + 변수 추가
const oldCode = `  // ID ���� �÷��� ���� ����
  const numericColumnStats = useMemo(() => {
    if (!validationResults?.columnStats) return []
    return validationResults.columnStats.filter(col => col.type === 'numeric' && !col.idDetection?.isId)
  }, [validationResults])

  // 전체 변수 목록 (VariableGallery용)
  const allVariables = useMemo(() => {
    if (!validationResults?.columnStats) return []
    return validationResults.columnStats.filter(col => !col.idDetection?.isId)
  }, [validationResults])

  // 선택된 변수 상태 (VariableDetailPanel용)
  const [selectedVariable, setSelectedVariable] = useState<typeof allVariables[0] | null>(null)`;

const newCode = `  // ID 감지된 컬럼 제외한 수치형 컬럼 통계
  const numericColumnStats = useMemo(() => {
    if (!validationResults?.columnStats) return []
    return validationResults.columnStats.filter(col => col.type === 'numeric' && !col.idDetection?.isId)
  }, [validationResults])

  // 전체 변수 목록 (VariableGallery용)
  const allVariables = useMemo(() => {
    if (!validationResults?.columnStats) return []
    return validationResults.columnStats.filter(col => !col.idDetection?.isId)
  }, [validationResults])

  // 선택된 변수 상태 (VariableDetailPanel용)
  const [selectedVariable, setSelectedVariable] = useState<typeof allVariables[0] | null>(null)`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  writeFileSync(filePath, content, 'utf8');
  console.log('✅ DataExplorationStep.tsx 수정 완료');
} else {
  console.log('⚠️ 이미 수정되었거나 패턴이 다름');

  // 변수가 이미 추가되었는지 확인
  if (content.includes('const allVariables = useMemo') && content.includes('const [selectedVariable, setSelectedVariable]')) {
    console.log('✅ 변수가 이미 추가됨');
  } else {
    console.log('❌ 수동 확인 필요');
  }
}
