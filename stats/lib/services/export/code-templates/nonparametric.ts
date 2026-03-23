/**
 * 비모수 검정 코드 템플릿 (3개)
 * - mann-whitney (독립 2그룹)
 * - wilcoxon (대응표본)
 * - kruskal-wallis (독립 3+그룹)
 */

import type { CodeTemplate } from '../code-template-types'
import { dep, group, safeRCol, safeRFormula, safePy, safePyCol, safeFileName } from './template-helpers'

// ─── Mann-Whitney U ───

export const mannWhitneyR: CodeTemplate = {
  methodId: 'mann-whitney',
  language: 'R',
  libraries: ['tidyverse'],
  generate: (input) => {
    const d = dep(input)
    const g = group(input)
    const alt = input.options.alternative
    return `library(tidyverse)

data <- read_csv("${safeFileName(input.dataFileName)}")

# Mann-Whitney U 검정
result <- wilcox.test(
  ${safeRFormula(d)} ~ ${safeRFormula(g)},
  data = data,
  alternative = "${alt}",
  exact = FALSE,
  correct = TRUE
)
print(result)

# 효과 크기 (r = Z / sqrt(N))
z <- qnorm(result$p.value / 2)
r_effect <- abs(z) / sqrt(nrow(data))
cat(sprintf("Effect size r: %.4f\\n", r_effect))`
  },
}

export const mannWhitneyPython: CodeTemplate = {
  methodId: 'mann-whitney',
  language: 'python',
  libraries: ['pandas', 'scipy'],
  generate: (input) => {
    const d = dep(input)
    const g = group(input)
    const alt = input.options.alternative
    return `import numpy as np
import pandas as pd
from scipy import stats

data = pd.read_csv("${safeFileName(input.dataFileName)}")

groups = data.groupby("${safePy(g)}")["${safePy(d)}"]
group_names = list(groups.groups.keys())
group1 = groups.get_group(group_names[0])
group2 = groups.get_group(group_names[1])

# Mann-Whitney U 검정
stat, p_value = stats.mannwhitneyu(group1, group2, alternative="${alt}")
print(f"U-statistic: {stat:.4f}")
print(f"p-value: {p_value:.4f}")

# 효과 크기 (r = Z / sqrt(N))
z = stats.norm.ppf(p_value / 2)
r_effect = abs(z) / np.sqrt(len(data))
print(f"Effect size r: {r_effect:.4f}")`
  },
}

// ─── Wilcoxon Signed-Rank ───

export const wilcoxonR: CodeTemplate = {
  methodId: 'wilcoxon',
  language: 'R',
  libraries: ['tidyverse'],
  generate: (input) => {
    const vars = input.variableMapping.variables ?? []
    const v1 = vars[0] ?? 'before'
    const v2 = vars[1] ?? 'after'
    const alt = input.options.alternative
    return `library(tidyverse)

data <- read_csv("${safeFileName(input.dataFileName)}")

# Wilcoxon 부호순위 검정
result <- wilcox.test(
  ${safeRCol('data', v1)}, ${safeRCol('data', v2)},
  paired = TRUE,
  alternative = "${alt}",
  exact = FALSE
)
print(result)

# 효과 크기 (r = Z / sqrt(N))
z <- qnorm(result$p.value / 2)
r_effect <- abs(z) / sqrt(nrow(data))
cat(sprintf("Effect size r: %.4f\\n", r_effect))`
  },
}

export const wilcoxonPython: CodeTemplate = {
  methodId: 'wilcoxon',
  language: 'python',
  libraries: ['pandas', 'scipy'],
  generate: (input) => {
    const vars = input.variableMapping.variables ?? []
    const v1 = vars[0] ?? 'before'
    const v2 = vars[1] ?? 'after'
    const alt = input.options.alternative
    return `import numpy as np
import pandas as pd
from scipy import stats

data = pd.read_csv("${safeFileName(input.dataFileName)}")

# Wilcoxon 부호순위 검정
stat, p_value = stats.wilcoxon(${safePyCol('data', v1)}, ${safePyCol('data', v2)}, alternative="${alt}")
print(f"W-statistic: {stat:.4f}")
print(f"p-value: {p_value:.4f}")

# 효과 크기 (r = Z / sqrt(N))
z = stats.norm.ppf(p_value / 2)
r_effect = abs(z) / np.sqrt(len(data))
print(f"Effect size r: {r_effect:.4f}")`
  },
}

// ─── Kruskal-Wallis ───

export const kruskalWallisR: CodeTemplate = {
  methodId: 'kruskal-wallis',
  language: 'R',
  libraries: ['tidyverse', 'FSA'],
  generate: (input) => {
    const d = dep(input)
    const g = group(input)
    return `library(tidyverse)
library(FSA)

data <- read_csv("${safeFileName(input.dataFileName)}")
data[[${JSON.stringify(g)}]] <- as.factor(data[[${JSON.stringify(g)}]])

# Kruskal-Wallis 검정
result <- kruskal.test(${safeRFormula(d)} ~ ${safeRFormula(g)}, data = data)
print(result)

# 사후검정 (Dunn's test)
dunnTest(${safeRFormula(d)} ~ ${safeRFormula(g)}, data = data, method = "bonferroni")

# 효과 크기 (Eta-squared H)
eta_sq_h <- (result$statistic - length(levels(data[[${JSON.stringify(g)}]])) + 1) / (nrow(data) - length(levels(data[[${JSON.stringify(g)}]])))
cat(sprintf("Eta-squared H: %.4f\\n", eta_sq_h))`
  },
}

export const kruskalWallisPython: CodeTemplate = {
  methodId: 'kruskal-wallis',
  language: 'python',
  libraries: ['pandas', 'scipy', 'scikit-posthocs'],
  generate: (input) => {
    const d = dep(input)
    const g = group(input)
    return `import pandas as pd
from scipy import stats
import scikit_posthocs as sp

data = pd.read_csv("${safeFileName(input.dataFileName)}")

# 그룹별 분리
groups = [grp["${safePy(d)}"].values for _, grp in data.groupby("${safePy(g)}")]

# Kruskal-Wallis 검정
h_stat, p_value = stats.kruskal(*groups)
print(f"H-statistic: {h_stat:.4f}")
print(f"p-value: {p_value:.4f}")

# 사후검정 (Dunn's test)
posthoc = sp.posthoc_dunn(data, val_col="${safePy(d)}", group_col="${safePy(g)}", p_adjust="bonferroni")
print("\\nPost-hoc (Dunn's test):")
print(posthoc)

# 효과 크기 (Eta-squared H)
k = ${safePyCol('data', g)}.nunique()
n = len(data)
eta_sq_h = (h_stat - k + 1) / (n - k)
print(f"\\nEta-squared H: {eta_sq_h:.4f}")`
  },
}
