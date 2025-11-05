/**
 * 통계 페이지 변수 타입 표준화 스크립트
 *
 * 목적: Phase A-2-2 - 34개 페이지의 props 표준화 및 unknown 타입 제거
 *
 * 작업:
 * 1. 로컬 VariableSelection/Variables 인터페이스 제거
 * 2. types/statistics.ts의 표준 타입 import 추가
 * 3. 페이지별 특화 타입 적용
 */

const fs = require('fs')
const path = require('path')

// 표준 변수 타입 매핑 (types/statistics.ts 기반)
const STANDARD_TYPES = {
  // 기초 통계
  'descriptive': {
    variableType: 'DescriptiveVariables',
    import: 'DescriptiveVariables',
    props: 'all'
  },
  'frequency-table': {
    variableType: 'FrequencyTableVariables',
    import: 'FrequencyTableVariables',
    props: 'all'
  },

  // T-검정
  'one-sample-t': {
    variableType: 'OneSampleTVariables',
    import: 'OneSampleTVariables',
    props: 'dependent'
  },
  'welch-t': {
    variableType: 'WelchTVariables',
    import: 'WelchTVariables',
    props: 'dependent, groups'
  },

  // 분산분석
  'anova': {
    variableType: 'ANOVAVariables',
    import: 'ANOVAVariables',
    props: 'dependent, independent'
  },
  'two-way-anova': {
    variableType: 'TwoWayANOVAVariables',
    import: 'TwoWayANOVAVariables',
    props: 'dependent, independent'
  },
  'three-way-anova': {
    variableType: 'ThreeWayANOVAVariables',
    import: 'ThreeWayANOVAVariables',
    props: 'dependent, independent'
  },
  'repeated-measures': {
    variableType: 'RepeatedMeasuresVariables',
    import: 'RepeatedMeasuresVariables',
    props: 'dependent'
  },
  'ancova': {
    variableType: 'ANCOVAVariables',
    import: 'ANCOVAVariables',
    props: 'dependent, independent, covariates'
  },
  'manova': {
    variableType: 'MANOVAVariables',
    import: 'MANOVAVariables',
    props: 'dependent, independent'
  },

  // 상관분석
  'correlation': {
    variableType: 'CorrelationVariables',
    import: 'CorrelationVariables',
    props: 'all'
  },
  'partial-correlation': {
    variableType: 'PartialCorrelationVariables',
    import: 'PartialCorrelationVariables',
    props: 'all, location'
  },

  // 회귀분석
  'regression': {
    variableType: 'RegressionVariables',
    import: 'RegressionVariables',
    props: 'dependent, independent'
  },
  'stepwise': {
    variableType: 'StepwiseVariables',
    import: 'StepwiseVariables',
    props: 'dependent, independent'
  },
  'ordinal-regression': {
    variableType: 'OrdinalRegressionVariables',
    import: 'OrdinalRegressionVariables',
    props: 'dependent, independent'
  },
  'mixed-model': {
    variableType: 'MixedModelVariables',
    import: 'MixedModelVariables',
    props: 'dependent, independent'
  },

  // 카이제곱 검정
  'chi-square': {
    variableType: 'ChiSquareVariables',
    import: 'ChiSquareVariables',
    props: 'rows, columns'
  },
  'chi-square-goodness': {
    variableType: 'ChiSquareGoodnessVariables',
    import: 'ChiSquareGoodnessVariables',
    props: 'observed'
  },
  'chi-square-independence': {
    variableType: 'ChiSquareIndependenceVariables',
    import: 'ChiSquareIndependenceVariables',
    props: 'row, column'
  },
  'mcnemar': {
    variableType: 'McNemarVariables',
    import: 'McNemarVariables',
    props: 'groups'
  },

  // 비모수 검정
  'non-parametric': {
    variableType: 'NonParametricVariables',
    import: 'NonParametricVariables',
    props: 'dependent, groups'
  },
  'mann-whitney': {
    variableType: 'MannWhitneyVariables',
    import: 'MannWhitneyVariables',
    props: 'dependent, groups'
  },
  'kruskal-wallis': {
    variableType: 'KruskalWallisVariables',
    import: 'KruskalWallisVariables',
    props: 'dependent, groups'
  },
  'wilcoxon': {
    variableType: 'WilcoxonVariables',
    import: 'WilcoxonVariables',
    props: 'dependent'
  },
  'friedman': {
    variableType: 'FriedmanVariables',
    import: 'FriedmanVariables',
    props: 'dependent, conditions'
  },
  'sign-test': {
    variableType: 'SignTestVariables',
    import: 'SignTestVariables',
    props: 'dependent'
  },
  'runs-test': {
    variableType: 'RunsTestVariables',
    import: 'RunsTestVariables',
    props: 'data'
  },

  // 정규성 검정
  'normality-test': {
    variableType: 'NormalityTestVariables',
    import: 'NormalityTestVariables',
    props: 'all'
  },
  'ks-test': {
    variableType: 'KSTestVariables',
    import: 'KSTestVariables',
    props: 'data'
  },

  // 비율 검정
  'proportion-test': {
    variableType: 'ProportionTestVariables',
    import: 'ProportionTestVariables',
    props: 'groups'
  },

  // 생존분석
  'mann-kendall': {
    variableType: 'MannKendallVariables',
    import: 'MannKendallVariables',
    props: 'data'
  },

  // 신뢰도/타당도
  'reliability': {
    variableType: 'ReliabilityVariables',
    import: 'ReliabilityVariables',
    props: 'items'
  },

  // 다변량 분석
  'pca': {
    variableType: 'PCAVariables',
    import: 'PCAVariables',
    props: 'all'
  },
  'factor-analysis': {
    variableType: 'FactorAnalysisVariables',
    import: 'FactorAnalysisVariables',
    props: 'all'
  },
  'cluster': {
    variableType: 'ClusterVariables',
    import: 'ClusterVariables',
    props: 'all'
  },
  'discriminant': {
    variableType: 'DiscriminantVariables',
    import: 'DiscriminantVariables',
    props: 'dependent, independent'
  },

  // 실험설계
  'response-surface': {
    variableType: 'ResponseSurfaceVariables',
    import: 'ResponseSurfaceVariables',
    props: 'dependent, independent'
  },
  'dose-response': {
    variableType: 'DoseResponseVariables',
    import: 'DoseResponseVariables',
    props: 'dose, response'
  },
  'cross-tabulation': {
    variableType: 'CrossTabulationVariables',
    import: 'CrossTabulationVariables',
    props: 'row, column'
  },

  // 회귀진단
  'poisson': {
    variableType: 'PoissonVariables',
    import: 'PoissonVariables',
    props: 'dependent, independent'
  },

  // 시각화
  'means-plot': {
    variableType: 'MeansPlotVariables',
    import: 'MeansPlotVariables',
    props: 'dependent, groups'
  }
}

// 통계 페이지 디렉토리
const STATS_DIR = path.join(__dirname, '../../app/(dashboard)/statistics')

/**
 * 파일 내용에서 로컬 인터페이스 제거 및 표준 타입 import 추가
 */
function standardizeTypes(filePath, methodName) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const standardType = STANDARD_TYPES[methodName]

  if (!standardType) {
    console.log(`⚠️  ${methodName}: 표준 타입 매핑 없음 (건너뜀)`)
    return { modified: false }
  }

  let newContent = content
  let changes = []

  // 1. 로컬 VariableSelection/Variables 인터페이스 주석 처리 (안전하게)
  // 변수 관련 인터페이스만 정확히 매칭
  const variableInterfacePattern = /^(interface\s+(VariableSelection|SelectedVariables?|.*Variables)\s*\{[\s\S]*?^})/gm

  const matches = [...newContent.matchAll(variableInterfacePattern)]
  for (const match of matches) {
    const interfaceBlock = match[0]
    const interfaceName = match[2]

    // UploadedData, MethodInfo 등은 건너뜀 (변수 선택과 무관)
    const skipPatterns = ['UploadedData', 'MethodInfo', 'Results', 'Result', 'Options']
    if (skipPatterns.some(skip => interfaceName.includes(skip))) {
      continue
    }

    // 변수 관련 필드가 있는지 확인 (dependent, independent, groups, all, items 등)
    const hasVariableFields = /\b(dependent|independent|groups|all|items|conditions|covariates|location)\s*[:?]/.test(interfaceBlock)

    if (hasVariableFields) {
      // 주석 처리 (제거하지 않음)
      const commented = interfaceBlock.split('\n').map(line => `// ${line}`).join('\n')
      newContent = newContent.replace(interfaceBlock, `${commented}\n// → types/statistics.ts의 ${standardType.variableType} 사용`)
      changes.push(`${interfaceName} 주석 처리`)
    }
  }

  // 2. 표준 타입 import 추가 (이미 import 구문이 있는 경우)
  const importPattern = /import\s+\{([^}]+)\}\s+from\s+['"]@\/types\/statistics['"]/
  if (importPattern.test(newContent)) {
    // 기존 import에 추가
    newContent = newContent.replace(importPattern, (match, imports) => {
      const importList = imports.split(',').map(s => s.trim())
      if (!importList.includes(standardType.import)) {
        importList.push(standardType.import)
        changes.push(`${standardType.import} import 추가 (기존 import 확장)`)
      }
      return `import { ${importList.join(', ')} } from '@/types/statistics'`
    })
  } else {
    // 새로운 import 추가 (첫 번째 import 뒤에)
    const firstImportMatch = newContent.match(/^import\s+.+$/m)
    if (firstImportMatch) {
      const insertPosition = firstImportMatch.index + firstImportMatch[0].length
      const importStatement = `\nimport type { ${standardType.import} } from '@/types/statistics'`
      newContent = newContent.slice(0, insertPosition) + importStatement + newContent.slice(insertPosition)
      changes.push(`${standardType.import} import 추가 (새로운 import)`)
    }
  }

  // 3. useStatisticsPage 타입 파라미터 수정
  const hookPattern = /useStatisticsPage<([^>]+)>/
  if (hookPattern.test(newContent)) {
    newContent = newContent.replace(hookPattern, (match, typeParams) => {
      const params = typeParams.split(',').map(s => s.trim())
      // 두 번째 타입 파라미터를 표준 타입으로 교체
      if (params.length >= 2) {
        params[1] = standardType.variableType
        changes.push(`useStatisticsPage 타입 파라미터: ${standardType.variableType}`)
        return `useStatisticsPage<${params.join(', ')}>`
      }
      return match
    })
  }

  // 4. 변경 사항 확인
  if (changes.length === 0) {
    return { modified: false }
  }

  // 5. 파일 저장
  fs.writeFileSync(filePath, newContent, 'utf-8')

  return {
    modified: true,
    changes
  }
}

/**
 * 모든 통계 페이지 처리
 */
function processAllPages() {
  console.log('='.repeat(80))
  console.log('📋 Phase A-2-2: 통계 페이지 변수 타입 표준화')
  console.log('='.repeat(80))
  console.log()

  const methods = Object.keys(STANDARD_TYPES)
  let processed = 0
  let modified = 0
  let skipped = 0

  const results = []

  for (const method of methods) {
    const pagePath = path.join(STATS_DIR, method, 'page.tsx')

    if (!fs.existsSync(pagePath)) {
      skipped++
      results.push({ method, status: 'skip', reason: '파일 없음' })
      continue
    }

    processed++
    const result = standardizeTypes(pagePath, method)

    if (result.modified) {
      modified++
      results.push({
        method,
        status: 'success',
        changes: result.changes
      })
    } else {
      results.push({
        method,
        status: 'no-change',
        reason: '변경 사항 없음'
      })
    }
  }

  // 결과 출력
  console.log('📊 처리 결과:')
  console.log('-'.repeat(80))

  for (const result of results) {
    if (result.status === 'success') {
      console.log(`✅ ${result.method}:`)
      result.changes.forEach(change => console.log(`   - ${change}`))
    } else if (result.status === 'skip') {
      console.log(`⏭️  ${result.method}: ${result.reason}`)
    } else {
      console.log(`ℹ️  ${result.method}: ${result.reason}`)
    }
  }

  console.log()
  console.log('='.repeat(80))
  console.log('📈 통계:')
  console.log(`   처리: ${processed}개`)
  console.log(`   수정: ${modified}개`)
  console.log(`   건너뜀: ${skipped}개`)
  console.log(`   성공률: ${((modified / processed) * 100).toFixed(1)}%`)
  console.log('='.repeat(80))
}

// 실행
try {
  processAllPages()
  console.log()
  console.log('✅ Phase A-2-2 완료!')
} catch (error) {
  console.error('❌ 오류 발생:', error.message)
  process.exit(1)
}
