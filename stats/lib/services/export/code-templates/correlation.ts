/**
 * 상관분석 코드 템플릿 (1개)
 * - correlation (Pearson/Spearman)
 */

import type { CodeTemplate, CodeTemplateInput } from '../code-template-types'
import { safeRCol, safePyCol, safeFileName, safeRString } from './template-helpers'

function getVarPair(input: CodeTemplateInput): [string, string] {
  const vars = input.variableMapping.variables
  if (vars && vars.length >= 2) return [vars[0], vars[1]]

  const depVar = input.variableMapping.dependentVar
  const indVar = input.variableMapping.independentVar
  const x = Array.isArray(indVar) ? indVar[0] : indVar
  const y = Array.isArray(depVar) ? depVar[0] : depVar
  return [x ?? 'x', y ?? 'y']
}

export const correlationR: CodeTemplate = {
  methodId: 'correlation',
  language: 'R',
  libraries: ['tidyverse'],
  generate: (input) => {
    const [x, y] = getVarPair(input)
    const cl = input.options.confidenceLevel
    return `library(tidyverse)

data <- read_csv("${safeFileName(input.dataFileName)}")

# Pearson 상관분석
pearson <- cor.test(${safeRCol('data', x)}, ${safeRCol('data', y)},
                    method = "pearson",
                    conf.level = ${cl})
print(pearson)

# Spearman 상관분석
spearman <- cor.test(${safeRCol('data', x)}, ${safeRCol('data', y)},
                     method = "spearman")
print(spearman)

# Kendall 상관분석
kendall <- cor.test(${safeRCol('data', x)}, ${safeRCol('data', y)},
                    method = "kendall")
print(kendall)

# 산점도
ggplot(data, aes(x = .data[[${safeRString(x)}]], y = .data[[${safeRString(y)}]])) +
  geom_point() +
  geom_smooth(method = "lm", se = TRUE) +
  theme_minimal()`
  },
}

export const correlationPython: CodeTemplate = {
  methodId: 'correlation',
  language: 'python',
  libraries: ['pandas', 'scipy'],
  generate: (input) => {
    const [x, y] = getVarPair(input)
    return `import pandas as pd
from scipy import stats

data = pd.read_csv("${safeFileName(input.dataFileName)}")

# Pearson 상관분석
r_pearson, p_pearson = stats.pearsonr(${safePyCol('data', x)}, ${safePyCol('data', y)})
print(f"Pearson r: {r_pearson:.4f}, p-value: {p_pearson:.4f}")

# Spearman 상관분석
r_spearman, p_spearman = stats.spearmanr(${safePyCol('data', x)}, ${safePyCol('data', y)})
print(f"Spearman rho: {r_spearman:.4f}, p-value: {p_spearman:.4f}")

# Kendall 상관분석
r_kendall, p_kendall = stats.kendalltau(${safePyCol('data', x)}, ${safePyCol('data', y)})
print(f"Kendall tau: {r_kendall:.4f}, p-value: {p_kendall:.4f}")`
  },
}
