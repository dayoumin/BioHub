/**
 * 정규성 검정 코드 템플릿 (1개)
 * - normality-test (Shapiro-Wilk + K-S)
 */

import type { CodeTemplate, CodeTemplateInput } from '../code-template-types'
import { safeRCol, safePyCol, safeFileName } from './template-helpers'

function getTargetVars(input: CodeTemplateInput): string[] {
  const vars = input.variableMapping.variables
  if (vars && vars.length > 0) return vars

  const depVar = input.variableMapping.dependentVar
  if (depVar) return Array.isArray(depVar) ? depVar : [depVar]

  return ['value']
}

export const normalityR: CodeTemplate = {
  methodId: 'normality-test',
  language: 'R',
  libraries: ['tidyverse'],
  generate: (input) => {
    const vars = getTargetVars(input)
    const varBlocks = vars.map((v) => `
# --- ${v} ---
cat("\\n[${v}]\\n")
shapiro.test(${safeRCol('data', v)})
ks.test(${safeRCol('data', v)}, "pnorm", mean(${safeRCol('data', v)}), sd(${safeRCol('data', v)}))`).join('\n')

    return `library(tidyverse)

data <- read_csv("${safeFileName(input.dataFileName)}")

# 정규성 검정 (Shapiro-Wilk + Kolmogorov-Smirnov)
${varBlocks.trim()}

# Q-Q Plot
${vars.map((v) => `qqnorm(${safeRCol('data', v)}, main = "${v}"); qqline(${safeRCol('data', v)})`).join('\n')}`
  },
}

export const normalityPython: CodeTemplate = {
  methodId: 'normality-test',
  language: 'python',
  libraries: ['pandas', 'scipy'],
  generate: (input) => {
    const vars = getTargetVars(input)
    const varBlocks = vars.map((v) => `
# --- ${v} ---
stat_sw, p_sw = stats.shapiro(${safePyCol('data', v)})
print(f"[${v}] Shapiro-Wilk: W={stat_sw:.4f}, p={p_sw:.4f}")

stat_ks, p_ks = stats.kstest(${safePyCol('data', v)}, "norm",
                              args=(${safePyCol('data', v)}.mean(), ${safePyCol('data', v)}.std()))
print(f"[${v}] K-S test: D={stat_ks:.4f}, p={p_ks:.4f}")`).join('\n')

    return `import pandas as pd
from scipy import stats

data = pd.read_csv("${safeFileName(input.dataFileName)}")

# 정규성 검정 (Shapiro-Wilk + Kolmogorov-Smirnov)
${varBlocks.trim()}`
  },
}
