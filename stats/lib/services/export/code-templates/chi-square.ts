/**
 * 카이제곱 검정 코드 템플릿 (2개)
 * - chi-square-independence (독립성 검정)
 * - chi-square-goodness (적합도 검정)
 */

import type { CodeTemplate } from '../code-template-types'
import { dep, group, safeRCol, safePy, safePyCol, safeFileName } from './template-helpers'

// ─── 카이제곱 독립성 검정 ───

export const chiSquareIndependenceR: CodeTemplate = {
  methodId: 'chi-square-independence',
  language: 'R',
  libraries: ['tidyverse'],
  generate: (input) => {
    const v1 = dep(input, 'var1')
    const v2 = group(input, 'var2')
    return `library(tidyverse)

data <- read_csv("${safeFileName(input.dataFileName)}")

# 분할표
ct <- table(${safeRCol('data', v1)}, ${safeRCol('data', v2)})
print(ct)

# 카이제곱 독립성 검정
result <- chisq.test(ct)
print(result)

# 기대 빈도
cat("\\nExpected frequencies:\\n")
print(result$expected)

# 효과 크기 (Cramér's V)
n <- sum(ct)
k <- min(nrow(ct), ncol(ct))
cramers_v <- sqrt(result$statistic / (n * (k - 1)))
cat(sprintf("\\nCramér's V: %.4f\\n", cramers_v))`
  },
}

export const chiSquareIndependencePython: CodeTemplate = {
  methodId: 'chi-square-independence',
  language: 'python',
  libraries: ['pandas', 'scipy'],
  generate: (input) => {
    const v1 = dep(input, 'var1')
    const v2 = group(input, 'var2')
    return `import numpy as np
import pandas as pd
from scipy import stats

data = pd.read_csv("${safeFileName(input.dataFileName)}")

# 분할표
ct = pd.crosstab(${safePyCol('data', v1)}, ${safePyCol('data', v2)})
print("Contingency table:")
print(ct)

# 카이제곱 독립성 검정
chi2, p_value, dof, expected = stats.chi2_contingency(ct)
print(f"\\nChi-square: {chi2:.4f}")
print(f"p-value: {p_value:.4f}")
print(f"df: {dof}")

print("\\nExpected frequencies:")
print(pd.DataFrame(expected, index=ct.index, columns=ct.columns).round(2))

# 효과 크기 (Cramér's V)
n = ct.values.sum()
k = min(ct.shape)
cramers_v = np.sqrt(chi2 / (n * (k - 1)))
print(f"\\nCramér's V: {cramers_v:.4f}")`
  },
}

// ─── 카이제곱 적합도 검정 ───

export const chiSquareGoodnessR: CodeTemplate = {
  methodId: 'chi-square-goodness',
  language: 'R',
  libraries: ['tidyverse'],
  generate: (input) => {
    const v = dep(input, 'category')
    return `library(tidyverse)

data <- read_csv("${safeFileName(input.dataFileName)}")

# 관찰 빈도
observed <- table(${safeRCol('data', v)})
print(observed)

# 카이제곱 적합도 검정 (균등분포 기대)
result <- chisq.test(observed)
print(result)

# 기대 빈도
cat("\\nExpected frequencies:\\n")
print(result$expected)`
  },
}

export const chiSquareGoodnessPython: CodeTemplate = {
  methodId: 'chi-square-goodness',
  language: 'python',
  libraries: ['pandas', 'scipy'],
  generate: (input) => {
    const v = dep(input, 'category')
    return `import pandas as pd
from scipy import stats

data = pd.read_csv("${safeFileName(input.dataFileName)}")

# 관찰 빈도
observed = ${safePyCol('data', v)}.value_counts().sort_index()
print("Observed frequencies:")
print(observed)

# 카이제곱 적합도 검정 (균등분포 기대)
chi2, p_value = stats.chisquare(observed)
print(f"\\nChi-square: {chi2:.4f}")
print(f"p-value: {p_value:.4f}")`
  },
}
