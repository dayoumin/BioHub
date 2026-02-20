/**
 * 도움말 데이터 (구조화)
 * 검색 가능한 형태로 모든 도움말 콘텐츠 정의
 */

import type { HelpData, HelpCategory } from './types'

export const HELP_CATEGORIES: { id: HelpCategory; label: string; icon: string }[] = [
  { id: 'guide', label: '사용 가이드', icon: 'BookOpen' },
  { id: 'faq', label: 'FAQ', icon: 'HelpCircle' },
  { id: 'shortcuts', label: '단축키', icon: 'Keyboard' },
  { id: 'variables', label: '변수 선택', icon: 'FileText' },
  { id: 'data-format', label: '데이터 형식', icon: 'Database' },
]

export const HELP_DATA: HelpData = {
  categories: HELP_CATEGORIES,
  sections: [
    // ===== 사용 가이드 =====
    {
      id: 'guide-start',
      category: 'guide',
      title: '통계 분석 시작하기',
      description: '원하는 분석 방법을 선택하고 데이터를 업로드하세요',
      items: [
        {
          id: 'guide-method-selection',
          category: 'guide',
          title: '분석 방법 선택',
          content: '홈 화면에서 원하는 통계 분석 방법을 선택합니다. 회귀분석, ANOVA, 상관분석 등 다양한 방법을 제공합니다.',
          keywords: ['분석', '방법', '선택', '회귀', 'ANOVA', '상관', '시작', '홈'],
        },
        {
          id: 'guide-data-upload',
          category: 'guide',
          title: '데이터 업로드',
          content: 'CSV, Excel, SPSS 파일을 업로드할 수 있습니다. 드래그 앤 드롭 또는 클릭하여 파일을 선택하세요.',
          keywords: ['데이터', '업로드', '파일', 'CSV', 'Excel', 'SPSS', '드래그', '드롭'],
        },
      ],
    },
    {
      id: 'guide-analysis',
      category: 'guide',
      title: '변수 선택 및 분석',
      description: '분석에 사용할 변수를 선택하고 옵션을 설정하세요',
      items: [
        {
          id: 'guide-variable-selection',
          category: 'guide',
          title: '독립변수/종속변수 선택',
          content: '업로드한 데이터의 변수 중에서 분석에 사용할 변수를 선택합니다.',
          keywords: ['변수', '선택', '독립', '종속', '설정'],
        },
        {
          id: 'guide-run-analysis',
          category: 'guide',
          title: '분석 실행',
          content: '모든 설정이 완료되면 "분석 시작" 버튼을 클릭하여 분석을 실행합니다.',
          keywords: ['분석', '실행', '시작', '버튼', '클릭'],
        },
      ],
    },
    {
      id: 'guide-results',
      category: 'guide',
      title: '결과 확인 및 내보내기',
      description: '분석 결과를 확인하고 필요한 형식으로 내보내세요',
      items: [
        {
          id: 'guide-interpretation',
          category: 'guide',
          title: '결과 해석',
          content: '통계량, p-value, 그래프 등을 확인하고 결과를 해석합니다.',
          keywords: ['결과', '해석', '통계량', 'p-value', '그래프', '유의수준'],
        },
        {
          id: 'guide-export',
          category: 'guide',
          title: '결과 내보내기',
          content: '결과를 PDF, Excel, 이미지 등 다양한 형식으로 내보낼 수 있습니다.',
          keywords: ['내보내기', 'PDF', 'Excel', '이미지', '저장', '다운로드'],
        },
      ],
    },

    // ===== FAQ =====
    {
      id: 'faq-general',
      category: 'faq',
      title: '일반 질문',
      items: [
        {
          id: 'faq-file-formats',
          category: 'faq',
          title: '어떤 파일 형식을 지원하나요?',
          content: 'CSV (.csv), Excel (.xlsx, .xls), SPSS (.sav), TSV (.tsv), HWP (.hwp) 파일을 지원합니다.',
          keywords: ['파일', '형식', '지원', 'CSV', 'Excel', 'SPSS', 'TSV', 'HWP', '확장자'],
        },
        {
          id: 'faq-data-security',
          category: 'faq',
          title: '데이터는 안전하게 보관되나요?',
          content: '업로드한 데이터는 브라우저의 로컬 스토리지에만 저장되며, 서버로 전송되지 않습니다. 브라우저를 닫으면 데이터가 삭제됩니다.',
          keywords: ['데이터', '보안', '안전', '저장', '로컬', '서버', '삭제', '개인정보'],
        },
        {
          id: 'faq-save-results',
          category: 'faq',
          title: '분석 결과를 저장할 수 있나요?',
          content: '네, 분석 결과를 PDF, Excel, 이미지 등의 형식으로 내보낼 수 있습니다. 각 결과 페이지에서 "내보내기" 버튼을 클릭하세요.',
          keywords: ['저장', '결과', '내보내기', 'PDF', 'Excel', '이미지'],
        },
        {
          id: 'faq-chatbot',
          category: 'faq',
          title: 'AI 챗봇은 어떻게 사용하나요?',
          content: '상단 헤더의 챗봇 아이콘을 클릭하면 우측에 챗봇 패널이 열립니다. 통계 분석 관련 질문을 자유롭게 입력하세요.',
          keywords: ['AI', '챗봇', '질문', '도움', '헤더', '아이콘'],
        },
        {
          id: 'faq-missing-values',
          category: 'faq',
          title: '결측값은 어떻게 처리하나요?',
          content: '결측값은 자동으로 인식됩니다. 빈 셀, NA, N/A, -, ., NULL, NaN, #N/A, missing 등 다양한 형식을 지원합니다. R, Excel, SPSS, SAS 등에서 내보낸 데이터를 그대로 사용할 수 있습니다.',
          keywords: ['결측값', 'NA', 'NULL', 'NaN', '빈셀', '결측', 'missing', 'SPSS', 'R', 'Excel'],
        },
      ],
    },

    // ===== 단축키 =====
    {
      id: 'shortcuts-general',
      category: 'shortcuts',
      title: '일반',
      items: [
        {
          id: 'shortcut-help',
          category: 'shortcuts',
          title: '도움말 열기',
          content: 'F1',
          keywords: ['도움말', 'F1', '단축키'],
        },
        {
          id: 'shortcut-settings',
          category: 'shortcuts',
          title: '설정 열기',
          content: 'Ctrl + ,',
          keywords: ['설정', 'Ctrl', '단축키'],
        },
        {
          id: 'shortcut-chatbot',
          category: 'shortcuts',
          title: 'AI 챗봇 열기',
          content: 'Ctrl + K',
          keywords: ['챗봇', 'AI', 'Ctrl', 'K', '단축키'],
        },
      ],
    },
    {
      id: 'shortcuts-analysis',
      category: 'shortcuts',
      title: '분석 화면',
      items: [
        {
          id: 'shortcut-prev-step',
          category: 'shortcuts',
          title: '이전 단계로 이동',
          content: 'Ctrl + ←',
          keywords: ['이전', '단계', '이동', 'Ctrl', '화살표', '단축키'],
        },
        {
          id: 'shortcut-next-step',
          category: 'shortcuts',
          title: '다음 단계로 이동',
          content: 'Ctrl + →',
          keywords: ['다음', '단계', '이동', 'Ctrl', '화살표', '단축키'],
        },
        {
          id: 'shortcut-run-analysis',
          category: 'shortcuts',
          title: '분석 시작',
          content: 'Ctrl + Enter',
          keywords: ['분석', '시작', '실행', 'Ctrl', 'Enter', '단축키'],
        },
      ],
    },

    // ===== 변수 선택 =====
    {
      id: 'variables-roles',
      category: 'variables',
      title: '변수 역할 이해하기',
      description: '통계 분석에서 변수는 역할에 따라 구분됩니다',
      items: [
        {
          id: 'variable-dependent',
          category: 'variables',
          title: '종속변수 (Dependent Variable)',
          description: '설명하려는 대상 (결과, Y)',
          content: '예: 넙치 체중, 시험 점수, 수확량',
          keywords: ['종속변수', 'Y', '결과', '반응변수', 'dependent', '체중', '점수'],
        },
        {
          id: 'variable-independent',
          category: 'variables',
          title: '독립변수 (Independent Variable)',
          description: '설명에 사용하는 변수 (원인, X)',
          content: '예: 사료 종류, 학습 시간, 비료량',
          keywords: ['독립변수', 'X', '원인', '설명변수', 'independent', '사료', '시간'],
        },
        {
          id: 'variable-factor',
          category: 'variables',
          title: '요인 (Factor)',
          description: '그룹을 구분하는 범주형 변수 (ANOVA, t-검정)',
          content: '예: 사료 종류 (A, B, C), 성별 (남/여)',
          keywords: ['요인', 'factor', '그룹', '범주형', 'ANOVA', 't-검정', '성별'],
        },
      ],
    },
    {
      id: 'variables-types',
      category: 'variables',
      title: '변수 타입 구분',
      description: '데이터의 성질에 따른 분류',
      items: [
        {
          id: 'variable-type-continuous',
          category: 'variables',
          title: '연속형 (Continuous)',
          content: '실수값 (예: 체중 150.5g)',
          keywords: ['연속형', 'continuous', '실수', '숫자', '수치형'],
        },
        {
          id: 'variable-type-categorical',
          category: 'variables',
          title: '범주형 (Categorical)',
          content: '문자열 (예: 사료 종류 A, B, C)',
          keywords: ['범주형', 'categorical', '문자열', '그룹', '카테고리'],
        },
        {
          id: 'variable-type-binary',
          category: 'variables',
          title: '이진형 (Binary)',
          content: '2개 값 (예: 성별 남/여)',
          keywords: ['이진형', 'binary', '이분형', '0', '1', '참', '거짓'],
        },
      ],
    },

    // ===== 데이터 형식 =====
    {
      id: 'data-format-files',
      category: 'data-format',
      title: '지원 파일 형식',
      description: '업로드 가능한 데이터 형식',
      items: [
        {
          id: 'format-csv',
          category: 'data-format',
          title: 'CSV (.csv)',
          content: '가장 권장되는 형식입니다. 대부분의 통계 소프트웨어와 호환됩니다.',
          keywords: ['CSV', '파일', '형식', '권장', '호환'],
        },
        {
          id: 'format-excel',
          category: 'data-format',
          title: 'Excel (.xlsx, .xls)',
          content: 'Microsoft Excel 파일을 직접 업로드할 수 있습니다.',
          keywords: ['Excel', '엑셀', 'xlsx', 'xls', 'Microsoft'],
        },
        {
          id: 'format-spss',
          category: 'data-format',
          title: 'SPSS (.sav)',
          content: 'SPSS 데이터 파일을 지원합니다.',
          keywords: ['SPSS', 'sav', '통계', 'IBM'],
        },
      ],
    },
    {
      id: 'data-format-structure',
      category: 'data-format',
      title: '데이터 구조: Wide vs Long',
      description: '통계 방법에 따라 다른 형식 필요',
      items: [
        {
          id: 'format-wide',
          category: 'data-format',
          title: 'Wide Format (넓은 형식)',
          description: '각 개체가 1개 행, 반복 측정은 여러 열',
          content: 'id, pre_score, post_score 형태. 대응표본 t-검정, MANOVA에 사용.',
          keywords: ['wide', '넓은', '형식', '열', '대응표본', 't-검정', 'MANOVA'],
        },
        {
          id: 'format-long',
          category: 'data-format',
          title: 'Long Format (긴 형식)',
          description: '각 측정값이 1개 행, 개체가 여러 행으로 반복',
          content: 'id, time_point, score 형태. 반복측정 ANOVA, 혼합모형에 사용.',
          keywords: ['long', '긴', '형식', '행', '반복측정', 'ANOVA', '혼합모형'],
        },
      ],
    },
    {
      id: 'data-format-rules',
      category: 'data-format',
      title: 'CSV 파일 작성 규칙',
      items: [
        {
          id: 'rule-header',
          category: 'data-format',
          title: '첫 번째 행은 변수명 (필수)',
          content: '첫 번째 행에는 각 열의 변수명(헤더)이 있어야 합니다.',
          keywords: ['헤더', '변수명', '첫번째', '행', '열이름'],
        },
        {
          id: 'rule-encoding',
          category: 'data-format',
          title: '인코딩은 UTF-8 (한글 사용 시)',
          content: '한글이 포함된 파일은 UTF-8 인코딩으로 저장해야 합니다.',
          keywords: ['인코딩', 'UTF-8', '한글', '문자', '깨짐'],
        },
        {
          id: 'rule-variable-name',
          category: 'data-format',
          title: '변수명에 공백 사용 금지',
          content: '변수명에는 공백 대신 언더스코어(_)를 사용하세요.',
          keywords: ['변수명', '공백', '언더스코어', '_', '규칙'],
        },
        {
          id: 'rule-missing',
          category: 'data-format',
          title: '결측값 표기',
          content: '결측값은 자동 인식됩니다: 빈 셀, NA, N/A, -, ., NULL, NaN, #N/A, missing',
          keywords: ['결측값', 'NA', '빈칸', 'NULL', 'missing', '결측'],
        },
      ],
    },
  ],
}

/**
 * 모든 도움말 항목을 평면화한 배열 반환
 */
export function getAllHelpItems() {
  return HELP_DATA.sections.flatMap(section => section.items)
}

/**
 * 카테고리별 도움말 섹션 반환
 */
export function getHelpSectionsByCategory(category: HelpCategory) {
  return HELP_DATA.sections.filter(section => section.category === category)
}
