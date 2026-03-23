/**
 * 정규성 검정 코드 템플릿 (1개)
 * - normality-test (Shapiro-Wilk + K-S)
 */

import type { CodeTemplate, CodeTemplateInput } from '../code-template-types'
import { safeRCol, safePyCol, safeFileName } from './template-helpers'

function getTargetVars(input: CodeTemplateInput): string[] {
  const vars = input.variableMapping.variables
  if (vars && vars.length > 0) return [vars[0]]

  const depVar = input.variableMapping.dependentVar
  if (depVar) return [Array.isArray(depVar) ? depVar[0] : depVar]

  return ['value']
}

export const normalityR: CodeTemplate = {
  methodId: 'normality-test',
  language: 'R',
  libraries: ['tidyverse'],
  generate: (input) => {
    const v = getTargetVars(input)[0]

    return `library(tidyverse)

data <- read_csv("${safeFileName(input.dataFileName)}")

# 정규성 검정 (Shapiro-Wilk)
cat("[${v}]\\n")
print(shapiro.test(${safeRCol('data', v)}))

# Q-Q Plot
qqnorm(${safeRCol('data', v)}, main = "${v}")
qqline(${safeRCol('data', v)})`
  },
}

export const normalityPython: CodeTemplate = {
  methodId: 'normality-test',
  language: 'python',
  libraries: ['pandas', 'scipy'],
  generate: (input) => {
    const v = getTargetVars(input)[0]

    return `import pandas as pd
from scipy import stats

data = pd.read_csv("${safeFileName(input.dataFileName)}")

# 정규성 검정 (Shapiro-Wilk)
stat_sw, p_sw = stats.shapiro(${safePyCol('data', v)})
print(f"[${v}] Shapiro-Wilk: W={stat_sw:.4f}, p={p_sw:.4f}")`
  },
}
