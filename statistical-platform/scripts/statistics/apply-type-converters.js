/**
 * 타입 변환 함수 적용 스크립트
 *
 * 26개 페이지에 타입 변환 로직 추가
 * 패턴: VariableSelector onVariablesSelected prop에 변환 함수 삽입
 */

const fs = require('fs')
const path = require('path')

const STATS_DIR = path.join(__dirname, '../../app/(dashboard)/statistics')

// 페이지별 변환 함수 매핑
const CONVERSIONS = {
  'chi-square-independence': {
    type: 'ChiSquareIndependenceVariables',
    converter: 'toChiSquareIndependenceVariables',
    import: `import { toChiSquareIndependenceVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'friedman': {
    type: 'FriedmanVariables',
    converter: 'toFriedmanVariables',
    import: `import { toFriedmanVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'kruskal-wallis': {
    type: 'KruskalWallisVariables',
    converter: 'toKruskalWallisVariables',
    import: `import { toKruskalWallisVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'mann-whitney': {
    type: 'MannWhitneyVariables',
    converter: 'toMannWhitneyVariables',
    import: `import { toMannWhitneyVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'manova': {
    type: 'MANOVAVariables',
    converter: 'toMANOVAVariables',
    import: `import { toMANOVAVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'mixed-model': {
    type: 'MixedModelVariables',
    converter: 'toMixedModelVariables',
    import: `import { toMixedModelVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'partial-correlation': {
    type: 'PartialCorrelationVariables',
    converter: 'toPartialCorrelationVariables',
    import: `import { toPartialCorrelationVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'wilcoxon': {
    type: 'WilcoxonVariables',
    converter: 'toWilcoxonVariables',
    import: `import { toWilcoxonVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'correlation': {
    type: 'CorrelationVariables',
    converter: 'toCorrelationVariables',
    import: `import { toCorrelationVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'discriminant': {
    type: 'DiscriminantVariables',
    converter: 'toDiscriminantVariables',
    import: `import { toDiscriminantVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'frequency-table': {
    type: 'FrequencyTableVariables',
    converter: 'toFrequencyTableVariables',
    import: `import { toFrequencyTableVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'ks-test': {
    type: 'KSTestVariables',
    converter: 'toKSTestVariables',
    import: `import { toKSTestVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'non-parametric': {
    type: 'NonParametricVariables',
    converter: 'toNonParametricVariables',
    import: `import { toNonParametricVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'normality-test': {
    type: 'NormalityTestVariables',
    converter: 'toNormalityTestVariables',
    import: `import { toNormalityTestVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'one-sample-t': {
    type: 'OneSampleTVariables',
    converter: 'toOneSampleTVariables',
    import: `import { toOneSampleTVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'pca': {
    type: 'PCAVariables',
    converter: 'toPCAVariables',
    import: `import { toPCAVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'proportion-test': {
    type: 'ProportionTestVariables',
    converter: 'toProportionTestVariables',
    import: `import { toProportionTestVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'regression': {
    type: 'RegressionVariables',
    converter: 'toRegressionVariables',
    import: `import { toRegressionVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'reliability': {
    type: 'ReliabilityVariables',
    converter: 'toReliabilityVariables',
    import: `import { toReliabilityVariables, type VariableAssignment } from '@/types/statistics-converters'`
  },
  'welch-t': {
    type: 'WelchTVariables',
    converter: 'toWelchTVariables',
    import: `import { toWelchTVariables, type VariableAssignment } from '@/types/statistics-converters'`
  }
}

console.log('='.repeat(80))
console.log('🔧 타입 변환 함수 적용')
console.log('='.repeat(80))
console.log()

let totalFixed = 0

for (const [method, config] of Object.entries(CONVERSIONS)) {
  const filePath = path.join(STATS_DIR, method, 'page.tsx')

  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  ${method}: 파일 없음`)
    continue
  }

  let content = fs.readFileSync(filePath, 'utf-8')
  let modified = false

  // 1. Import 추가 (이미 있으면 스킵)
  if (!content.includes(config.converter)) {
    // 기존 import 줄 찾기
    const importLines = content.split('\n')
    let insertIndex = -1

    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i].includes(`import type { ${config.type} }`) ||
          importLines[i].includes(`from '@/types/statistics'`)) {
        insertIndex = i + 1
        break
      }
    }

    if (insertIndex > 0) {
      importLines.splice(insertIndex, 0, config.import)
      content = importLines.join('\n')
      modified = true
    }
  }

  // 2. onVariablesSelected 패턴 찾아서 변환 로직 추가
  // 패턴 A: actions.setSelectedVariables 직접 전달
  const pattern1 = /onVariablesSelected=\{actions\.setSelectedVariables\}/g
  if (pattern1.test(content)) {
    content = content.replace(
      pattern1,
      `onVariablesSelected={(vars: VariableAssignment) => {
          const typedVars = ${config.converter}(vars)
          actions.setSelectedVariables?.(typedVars)
        }}`
    )
    modified = true
  }

  // 패턴 B: handler 함수 사용
  const pattern2 = /onVariablesSelected=\{handle.*Selection\}/g
  if (pattern2.test(content) && !modified) {
    // handler 함수 내부 수정 필요 (수동 처리)
    console.log(`ℹ️  ${method}: 수동 수정 필요 (handler 패턴)`)
    continue
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`✅ ${method}: 타입 변환 추가`)
    totalFixed++
  } else {
    console.log(`ℹ️  ${method}: 변경 없음`)
  }
}

console.log()
console.log('='.repeat(80))
console.log(`📊 완료: ${totalFixed}개 페이지 수정`)
console.log('남은 작업: handler 패턴 페이지는 수동 수정 필요')
console.log('='.repeat(80))
