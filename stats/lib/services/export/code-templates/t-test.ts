/**
 * T-Test 계열 코드 템플릿 (3개)
 * - t-test (독립표본)
 * - paired-t (대응표본)
 * - one-sample-t (단일표본)
 */

import type { CodeTemplate } from '../code-template-types'
import { dep, group, safeRCol, safeRFormula, safePy, safePyCol, safeFileName } from './template-helpers'

// ─── 독립표본 t-검정 ───

export const tTestR: CodeTemplate = {
  methodId: 't-test',
  language: 'R',
  libraries: ['tidyverse', 'effsize'],
  generate: (input) => {
    const d = dep(input)
    const g = group(input)
    const alt = input.options.alternative
    const cl = input.options.confidenceLevel
    return `library(tidyverse)
library(effsize)

data <- read_csv("${safeFileName(input.dataFileName)}")

# 독립표본 t-검정
result <- t.test(
  ${safeRFormula(d)} ~ ${safeRFormula(g)},
  data = data,
  alternative = "${alt}",
  conf.level = ${cl}
)
print(result)

# 효과 크기 (Cohen's d)
cohen.d(${safeRFormula(d)} ~ ${safeRFormula(g)}, data = data)`
  },
}

export const tTestPython: CodeTemplate = {
  methodId: 't-test',
  language: 'python',
  libraries: ['pandas', 'scipy'],
  generate: (input) => {
    const d = dep(input)
    const g = group(input)
    const alt = input.options.alternative
    return `import pandas as pd
from scipy import stats

data = pd.read_csv("${safeFileName(input.dataFileName)}")

groups = data.groupby("${safePy(g)}")["${safePy(d)}"]
group_names = list(groups.groups.keys())
group1 = groups.get_group(group_names[0])
group2 = groups.get_group(group_names[1])

# 독립표본 t-검정
stat, p_value = stats.ttest_ind(group1, group2, alternative="${alt}")
print(f"t-statistic: {stat:.4f}")
print(f"p-value: {p_value:.4f}")

# 효과 크기 (Cohen's d)
n1, n2 = len(group1), len(group2)
pooled_std = ((group1.std()**2 * (n1-1) + group2.std()**2 * (n2-1)) / (n1+n2-2)) ** 0.5
cohens_d = (group1.mean() - group2.mean()) / pooled_std
print(f"Cohen's d: {cohens_d:.4f}")`
  },
}

// ─── 대응표본 t-검정 ───

export const pairedTR: CodeTemplate = {
  methodId: 'paired-t',
  language: 'R',
  libraries: ['tidyverse', 'effsize'],
  generate: (input) => {
    const vars = input.variableMapping.variables ?? []
    const v1 = vars[0] ?? 'before'
    const v2 = vars[1] ?? 'after'
    const alt = input.options.alternative
    const cl = input.options.confidenceLevel
    return `library(tidyverse)
library(effsize)

data <- read_csv("${safeFileName(input.dataFileName)}")

# 대응표본 t-검정
result <- t.test(
  ${safeRCol('data', v1)}, ${safeRCol('data', v2)},
  paired = TRUE,
  alternative = "${alt}",
  conf.level = ${cl}
)
print(result)

# 효과 크기 (Cohen's d)
cohen.d(${safeRCol('data', v1)}, ${safeRCol('data', v2)}, paired = TRUE)`
  },
}

export const pairedTPython: CodeTemplate = {
  methodId: 'paired-t',
  language: 'python',
  libraries: ['pandas', 'scipy'],
  generate: (input) => {
    const vars = input.variableMapping.variables ?? []
    const v1 = vars[0] ?? 'before'
    const v2 = vars[1] ?? 'after'
    const alt = input.options.alternative
    return `import pandas as pd
from scipy import stats

data = pd.read_csv("${safeFileName(input.dataFileName)}")

# 대응표본 t-검정
stat, p_value = stats.ttest_rel(${safePyCol('data', v1)}, ${safePyCol('data', v2)}, alternative="${alt}")
print(f"t-statistic: {stat:.4f}")
print(f"p-value: {p_value:.4f}")

# 효과 크기 (Cohen's d)
diff = ${safePyCol('data', v1)} - ${safePyCol('data', v2)}
cohens_d = diff.mean() / diff.std()
print(f"Cohen's d: {cohens_d:.4f}")`
  },
}

// ─── 단일표본 t-검정 ───

export const oneSampleTR: CodeTemplate = {
  methodId: 'one-sample-t',
  language: 'R',
  libraries: ['tidyverse'],
  generate: (input) => {
    const d = dep(input)
    const mu = input.options.testValue ?? 0
    const alt = input.options.alternative
    const cl = input.options.confidenceLevel
    return `library(tidyverse)

data <- read_csv("${safeFileName(input.dataFileName)}")

# 단일표본 t-검정
result <- t.test(
  ${safeRCol('data', d)},
  mu = ${mu},
  alternative = "${alt}",
  conf.level = ${cl}
)
print(result)

# 효과 크기 (Cohen's d)
cohens_d <- (mean(${safeRCol('data', d)}) - ${mu}) / sd(${safeRCol('data', d)})
cat(sprintf("Cohen's d: %.4f\\n", cohens_d))`
  },
}

export const oneSampleTPython: CodeTemplate = {
  methodId: 'one-sample-t',
  language: 'python',
  libraries: ['pandas', 'scipy'],
  generate: (input) => {
    const d = dep(input)
    const mu = input.options.testValue ?? 0
    const alt = input.options.alternative
    return `import pandas as pd
from scipy import stats

data = pd.read_csv("${safeFileName(input.dataFileName)}")

# 단일표본 t-검정
stat, p_value = stats.ttest_1samp(${safePyCol('data', d)}, popmean=${mu}, alternative="${alt}")
print(f"t-statistic: {stat:.4f}")
print(f"p-value: {p_value:.4f}")

# 효과 크기 (Cohen's d)
cohens_d = (${safePyCol('data', d)}.mean() - ${mu}) / ${safePyCol('data', d)}.std()
print(f"Cohen's d: {cohens_d:.4f}")`
  },
}
