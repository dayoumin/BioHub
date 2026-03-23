/**
 * 회귀분석 코드 템플릿 (1개)
 * - regression (단순/다중 선형회귀)
 */

import type { CodeTemplate, CodeTemplateInput } from '../code-template-types'
import { dep, safeRFormula, safePy, safePyCol, safeFileName } from './template-helpers'

function indVars(input: CodeTemplateInput): string[] {
  const v = input.variableMapping.independentVar
  if (Array.isArray(v)) return v
  if (typeof v === 'string') return [v]
  const d = dep(input, 'y')
  return (input.variableMapping.variables ?? []).filter((c) => c !== d)
}

export const regressionR: CodeTemplate = {
  methodId: 'regression',
  language: 'R',
  libraries: ['tidyverse'],
  generate: (input) => {
    const y = dep(input, 'y')
    const xs = indVars(input)
    const formula = `${safeRFormula(y)} ~ ${xs.map(safeRFormula).join(' + ')}`
    return `library(tidyverse)

data <- read_csv("${safeFileName(input.dataFileName)}")

# 선형회귀 분석
model <- lm(${formula}, data = data)
summary(model)

# 신뢰구간
confint(model, level = ${input.options.confidenceLevel})

# 잔차 진단
par(mfrow = c(2, 2))
plot(model)`
  },
}

export const regressionPython: CodeTemplate = {
  methodId: 'regression',
  language: 'python',
  libraries: ['pandas', 'statsmodels'],
  generate: (input) => {
    const y = dep(input, 'y')
    const xs = indVars(input)
    const xCols = xs.map((v) => `"${safePy(v)}"`).join(', ')
    return `import pandas as pd
import statsmodels.api as sm

data = pd.read_csv("${safeFileName(input.dataFileName)}")

X = data[[${xCols}]]
X = sm.add_constant(X)
y = ${safePyCol('data', y)}

# 선형회귀 분석 (OLS)
model = sm.OLS(y, X).fit()
print(model.summary())

# 신뢰구간
print(f"\\nConfidence intervals ({input.options.confidenceLevel * 100:.0f}%):")
print(model.conf_int(alpha=${(1 - input.options.confidenceLevel).toFixed(2)}))`
  },
}
