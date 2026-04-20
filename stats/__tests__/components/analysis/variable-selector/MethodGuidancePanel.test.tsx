import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MethodGuidancePanel } from '@/components/analysis/variable-selector/MethodGuidancePanel'
import { getMethodRequirements } from '@/lib/statistics/variable-requirements'
import type { StatisticalMethodRequirements } from '@/lib/statistics/variable-requirements'

type MockTerminology = {
  domain: string
  variables: {
    group: { title: string; description: string }
    dependent: { title: string; description: string }
    independent: { title: string; description: string }
    factor: { title: string; description: string }
    covariate: { title: string; description: string }
    time: { title: string; description: string }
    event: { title: string; description: string }
    pairedFirst: { title: string; description: string }
    pairedSecond: { title: string; description: string }
    correlation: { title: string; description: string }
  }
  selectorUI: {
    methodGuidance: {
      title: string
      dataFormat: string
      minSample: string
      variableRoles: string
      requiredRoles: string
      assumptions: string
      notes: string
      expectedColumns: string
      defaultSettings: string
      required: string
      optional: string
      noneRequiredRoles: string
      noAssumptions: string
      noExampleSchema: string
      noDefaultSettings: string
      translationPending: string
      defaultValue: string
      typeFormatSuffix: string
      singleVariableCount: string
      multipleVariableCount: (min: number, max?: number) => string
      yes: string
      no: string
      variableTypeLabels: Record<string, string>
      formatTypeLabels: Record<string, string>
    }
  }
}

function createTerminology(domain: 'aquaculture' | 'generic'): MockTerminology {
  if (domain === 'generic') {
    return {
      domain: 'generic',
      variables: {
        group: { title: 'Group Variable', description: 'Categorical grouping variable' },
        dependent: { title: 'Dependent Variable (Y)', description: 'Numeric outcome variable' },
        independent: { title: 'Independent Variable (X)', description: 'Predictor variable' },
        factor: { title: 'Factor', description: 'Categorical factor variable' },
        covariate: { title: 'Covariate', description: 'Continuous control variable' },
        time: { title: 'Time Variable', description: 'Time or sequence variable' },
        event: { title: 'Event Variable', description: 'Binary event variable' },
        pairedFirst: { title: 'Time 1 / Before', description: 'First measurement' },
        pairedSecond: { title: 'Time 2 / After', description: 'Second measurement' },
        correlation: { title: 'Numeric Variables', description: 'Select numeric variables to analyze' },
      },
      selectorUI: {
        methodGuidance: {
          title: 'Method Guide',
          dataFormat: 'Data format',
          minSample: 'Min sample',
          variableRoles: 'Variable roles',
          requiredRoles: 'Required roles',
          assumptions: 'Assumptions',
          notes: 'Notes',
          expectedColumns: 'Expected columns',
          defaultSettings: 'Default execution settings',
          required: 'Required',
          optional: 'Optional',
          noneRequiredRoles: 'No explicit roles required.',
        noAssumptions: 'No major assumptions are registered for this method.',
        noExampleSchema: 'No example schema is attached to this method yet.',
        noDefaultSettings: 'No default execution settings are registered for this method.',
        translationPending: 'Localized guidance is not available for this section yet.',
        defaultValue: 'Default',
          typeFormatSuffix: 'format',
          singleVariableCount: '1 variable',
          multipleVariableCount: (min: number, max?: number) =>
            max ? `${min}-${max} variables` : `${min}+ variables`,
          yes: 'Yes',
          no: 'No',
          variableTypeLabels: {
            continuous: 'Continuous',
            categorical: 'Categorical',
            binary: 'Binary',
            ordinal: 'Ordinal',
            date: 'Date/Time',
            count: 'Count',
          },
          formatTypeLabels: {
            wide: 'Wide',
            long: 'Long',
            both: 'Wide/Long',
          },
        },
      },
    }
  }

  return {
    domain: 'aquaculture',
    variables: {
      group: { title: '실험구 변수', description: '실험구 설명' },
      dependent: { title: '측정값 (Y)', description: '측정값 설명' },
      independent: { title: '요인 변수 (X)', description: '요인 설명' },
      factor: { title: '처리 조건', description: '처리 조건 설명' },
      covariate: { title: '공변량', description: '공변량 설명' },
      time: { title: '시간 변수', description: '시간 설명' },
      event: { title: '사건 변수', description: '사건 설명' },
      pairedFirst: { title: '처리 전', description: '처리 전 설명' },
      pairedSecond: { title: '처리 후', description: '처리 후 설명' },
      correlation: { title: '연속형 변수', description: '연속형 변수 설명' },
    },
    selectorUI: {
      methodGuidance: {
        title: '방법 안내',
        dataFormat: '데이터 형식',
        minSample: '최소 표본',
        variableRoles: '변수 역할',
        requiredRoles: '필요한 역할',
        assumptions: '가정',
        notes: '참고',
        expectedColumns: '예상 열 구성',
        defaultSettings: '기본 실행 설정',
        required: '필수',
        optional: '선택',
        noneRequiredRoles: '변수 역할이 필요하지 않습니다.',
        noAssumptions: '가정 없음',
        noExampleSchema: '예시 스키마 없음',
        noDefaultSettings: '기본 실행 설정 없음',
        translationPending: '선택한 언어용 안내는 아직 준비되지 않았습니다.',
        defaultValue: '기본값',
        typeFormatSuffix: '형식',
        singleVariableCount: '1개 변수',
        multipleVariableCount: (min: number, max?: number) =>
          `${min}${max ? `-${max}` : '+'}개 변수`,
        yes: '예',
        no: '아니오',
        variableTypeLabels: {
          continuous: '연속형',
          categorical: '범주형',
          binary: '이진형',
          ordinal: '서열형',
          date: '날짜/시간',
          count: '카운트',
        },
        formatTypeLabels: {
          wide: '와이드',
          long: '롱',
          both: '와이드/롱',
        },
      },
    },
  }
}

let mockTerminology = createTerminology('aquaculture')

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => mockTerminology,
}))

vi.mock('@/lib/constants/statistical-methods', () => ({
  getMethodByIdOrAlias: (id: string) => (
    id === 'descriptive-stats'
      ? {
        id,
        description: 'Summary statistics for selected variables',
        koreanDescription: '평균, 표준편차, 분위수 등 요약',
      }
      : null
  ),
}))

describe('MethodGuidancePanel', () => {
  beforeEach(() => {
    mockTerminology = createTerminology('aquaculture')
  })

  it('renders localized section labels and option-aware default labels', () => {
    render(
      <MethodGuidancePanel methodRequirements={getMethodRequirements('two-sample-t')} />
    )

    expect(screen.getByText('방법 안내')).toBeInTheDocument()
    expect(screen.getByText('기본 실행 설정')).toBeInTheDocument()
    expect(screen.getByText('기본값 Student t-검정')).toBeInTheDocument()
    expect(screen.queryByText('Default true')).toBeNull()
    expect(screen.queryByText('Yes')).toBeNull()
  })

  it('renders variable count summary from terminology text helpers', () => {
    const methodRequirements: StatisticalMethodRequirements = {
      id: 'custom-correlation',
      name: 'Custom Correlation',
      category: 'correlation',
      description: 'Correlation helper',
      minSampleSize: 4,
      assumptions: [],
      variables: [
        {
          role: 'dependent',
          label: 'Analysis Variable',
          types: ['continuous'],
          required: true,
          multiple: true,
          minCount: 2,
          description: 'Select variables',
        },
      ],
      dataFormat: {
        type: 'wide',
        description: 'One row per observation',
        columns: [],
      },
      notes: [],
    }

    render(
      <MethodGuidancePanel methodRequirements={methodRequirements} />
    )

    expect(screen.getByText('2+개 변수 · 연속형')).toBeInTheDocument()
    expect(screen.getByText('와이드 형식')).toBeInTheDocument()
  })

  it('avoids rendering Korean registry copy in the generic domain', () => {
    mockTerminology = createTerminology('generic')

    render(
      <MethodGuidancePanel methodRequirements={getMethodRequirements('descriptive-stats')} />
    )

    expect(screen.getByText('Method Guide')).toBeInTheDocument()
    expect(screen.getByText('Summary statistics for selected variables')).toBeInTheDocument()
    expect(screen.queryByText('평균, 표준편차, 분위수 등 요약')).toBeNull()
    expect(screen.queryByText('연속형 변수')).toBeNull()
    expect(screen.getByText('Localized guidance is not available for this section yet.')).toBeInTheDocument()
  })

  it('falls back to generic labels for unsupported roles and unmapped option defaults', () => {
    mockTerminology = createTerminology('generic')

    const methodRequirements: StatisticalMethodRequirements = {
      id: 'generic-fallbacks',
      name: 'Generic Fallbacks',
      category: 'anova',
      description: 'Fallback helper',
      minSampleSize: 5,
      assumptions: [],
      variables: [
        {
          role: 'within',
          label: '개체내 요인',
          types: ['categorical'],
          required: true,
          multiple: false,
          description: '반복측정 요인',
        },
      ],
      notes: [],
      dataFormat: {
        type: 'wide',
        description: 'One row per observation',
        columns: [],
      },
      settings: {
        modelType: {
          label: '모형 유형',
          description: '모형의 형태를 선택합니다.',
          options: [
            { value: 'growth', label: '지수 성장/감소', description: '성장/감소 패턴' },
            { value: 'both', label: '둘 다', description: '둘 다 확인' },
          ],
          default: 'both',
        },
      },
    }

    render(
      <MethodGuidancePanel methodRequirements={methodRequirements} />
    )

    expect(screen.getByText('Within-subject Factor')).toBeInTheDocument()
    expect(screen.getByText('Repeated-measures factor defined within each subject.')).toBeInTheDocument()
    expect(screen.getByText('Model Type')).toBeInTheDocument()
    expect(screen.getByText('Default Both')).toBeInTheDocument()
    expect(screen.getByText('Configures model type.')).toBeInTheDocument()
    expect(screen.queryByText('개체내 요인')).toBeNull()
    expect(screen.queryByText('지수 성장/감소')).toBeNull()
  })

  it('renders terminology-backed empty states when guidance metadata is absent', () => {
    const methodRequirements: StatisticalMethodRequirements = {
      id: 'empty-guidance',
      name: 'Empty Guidance',
      category: 'descriptive',
      description: 'Empty guidance helper',
      minSampleSize: 1,
      assumptions: [],
      variables: [],
      dataFormat: {
        type: 'wide',
        description: 'One row per observation',
        columns: [],
      },
      notes: [],
      settings: {},
    }

    render(
      <MethodGuidancePanel methodRequirements={methodRequirements} />
    )

    expect(screen.getByText('변수 역할이 필요하지 않습니다.')).toBeInTheDocument()
    expect(screen.getByText('가정 없음')).toBeInTheDocument()
    expect(screen.getByText('예시 스키마 없음')).toBeInTheDocument()
    expect(screen.getByText('기본 실행 설정 없음')).toBeInTheDocument()
  })
})
