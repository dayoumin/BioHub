/**
 * UI 텍스트 상수
 * 모든 사용자 인터페이스 텍스트를 중앙 관리
 */

export const UI_TEXT = {
  // 공통
  common: {
    next: '다음 단계',
    previous: '이전 단계',
    complete: '완료',
    cancel: '취소',
    save: '저장',
    loading: '처리 중...',
    error: '오류',
    warning: '경고',
    info: '정보',
    success: '성공'
  },

  // Step 1: 데이터 업로드
  dataUpload: {
    title: '데이터 업로드',
    description: '분석할 파일을 선택하세요',
    dropzone: {
      instruction: '파일을 드래그하여 놓거나 클릭하여 선택하세요',
      acceptedFormats: 'CSV, Excel 파일 지원',
      maxSize: {
        csv: 'CSV: 최대 100MB',
        excel: 'Excel: 최대 20MB'
      }
    },
    processing: '파일을 분석하고 있습니다...',
    memoryWarning: {
      title: '메모리 사용량 높음',
      description: '브라우저 메모리 사용량이 높습니다. 다른 탭을 닫거나 더 작은 데이터셋을 사용해주세요.'
    },
    help: {
      title: '💡 도움말',
      items: [
        '첫 번째 행은 변수명(헤더)이어야 합니다',
        'CSV: 최대 100MB | Excel: 최대 20MB',
        'Excel 파일의 경우 여러 시트가 있으면 선택할 수 있습니다',
        '대용량 파일은 자동으로 청크 단위로 처리됩니다',
        '결측값은 빈 셀로 표시해주세요'
      ]
    }
  },

  // Step 2: 데이터 검증
  dataValidation: {
    title: 'Step 2: 데이터 확인',
    tabs: {
      profile: '데이터 프로파일',
      distribution: '분포 진단',
      roadmap: '분석 로드맵'
    },
    summary: {
      noErrors: '데이터 검증 완료',
      hasWarnings: '데이터 검증 완료 (경고 있음)',
      hasErrors: '데이터 검증 실패',
      stats: {
        totalRows: '총 행 수',
        totalColumns: '총 열 수',
        numericColumns: '수치형 변수',
        categoricalColumns: '범주형 변수'
      }
    },
    pyodide: {
      loading: 'Python 통계 엔진을 초기화하는 중입니다... (첫 실행 시 3-5초 소요)',
      error: '통계 엔진 오류'
    },
    autoProgress: {
      enabled: '자동 진행',
      disabled: '수동 진행 모드',
      countdown: (seconds: number) => `${seconds}초 후 자동 진행`,
      pause: '일시정지',
      resume: '계속',
      turnOff: '자동 진행 끄기'
    }
  },

  // Step 3: 분석 목표 설정
  purposeInput: {
    title: 'Step 3: 분석 목표 설정',
    question: '무엇을 알고 싶으신가요? (선택사항)',
    placeholder: '예: 남녀 간 키 차이가 있는지 알고 싶어요...',
    aiRecommend: {
      show: 'AI 추천 방법 보기',
      hide: 'AI 추천 방법 숨기기',
      title: '🤖 데이터 특성 기반 추천'
    },
    variableMapping: {
      title: '🎯 변수 자동 매핑',
      hide: '숨기기',
      labels: {
        dependent: '종속변수',
        independent: '독립변수',
        group: '그룹변수',
        time: '시간변수',
        variables: '변수목록'
      },
      help: '자동 매핑된 변수는 분석 시 기본값으로 사용됩니다. 필요시 Step 4에서 수정할 수 있습니다.'
    },
    methodSelection: {
      selected: '선택된 방법',
      requirements: '요구사항',
      minSampleSize: (n: number) => `최소 ${n}개 샘플 필요`,
      requirementNotMet: '요구사항 미충족'
    },
    noDataWarning: '데이터 검증이 완료되지 않았습니다. 일부 추천 기능이 제한될 수 있습니다.'
  },

  // Step 4: 분석 수행
  analysisExecution: {
    title: 'Step 4: 분석 수행',
    stages: {
      preparing: '분석 준비 중...',
      checkingAssumptions: '통계적 가정 검정 중...',
      analyzing: '데이터 분석 중...',
      calculating: '통계량 계산 중...',
      generating: '결과 생성 중...',
      complete: '분석 완료!'
    },
    assumptions: {
      title: '가정 검정 결과',
      allMet: '모든 가정 충족',
      violations: '가정 위반 사항'
    },
    controls: {
      pause: '일시정지',
      resume: '계속',
      cancel: '취소'
    },
    info: {
      selectedMethod: '선택된 방법',
      dataSize: '데이터 크기',
      confidenceLevel: '신뢰수준',
      engine: '통계 엔진'
    }
  },

  // Step 5: 결과 해석
  resultsAction: {
    title: 'Step 5: 결과 해석',
    actions: {
      newAnalysis: '새 분석 시작',
      exportPDF: 'PDF로 내보내기',
      exportExcel: 'Excel로 내보내기'
    }
  },

  // 에러 메시지
  errors: {
    fileUpload: '파일 업로드 중 오류가 발생했습니다',
    unsupportedFormat: '지원하지 않는 파일 형식입니다',
    fileTooLarge: '파일 크기가 너무 큽니다',
    dataValidation: '데이터 검증 중 오류가 발생했습니다',
    analysis: '분석 중 오류가 발생했습니다',
    unexpectedError: '예기치 않은 오류가 발생했습니다'
  }
} as const

// 타입 추출
export type UITextKeys = typeof UI_TEXT