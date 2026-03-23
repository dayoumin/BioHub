/**
 * ANOVA 코드 템플릿 (1개)
 * - anova (일원분산분석 + Tukey 사후검정)
 */

import type { CodeTemplate } from '../code-template-types'
import { dep, group, safeRFormula, safePy, safePyCol, safeFileName } from './template-helpers'

export const anovaR: CodeTemplate = {
  methodId: 'anova',
  language: 'R',
  libraries: ['tidyverse'],
  generate: (input) => {
    const d = dep(input)
    const g = group(input)
    return `library(tidyverse)

data <- read_csv("${safeFileName(input.dataFileName)}")
data[[${JSON.stringify(g)}]] <- as.factor(data[[${JSON.stringify(g)}]])

# 일원분산분석 (One-Way ANOVA)
model <- aov(${safeRFormula(d)} ~ ${safeRFormula(g)}, data = data)
summary(model)

# 사후검정 (Tukey HSD)
TukeyHSD(model)

# 효과 크기 (Eta-squared)
ss <- summary(model)[[1]]
eta_sq <- ss[["Sum Sq"]][1] / sum(ss[["Sum Sq"]])
cat(sprintf("Eta-squared: %.4f\\n", eta_sq))`
  },
}

export const anovaPython: CodeTemplate = {
  methodId: 'anova',
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

# 일원분산분석 (One-Way ANOVA)
f_stat, p_value = stats.f_oneway(*groups)
print(f"F-statistic: {f_stat:.4f}")
print(f"p-value: {p_value:.4f}")

# 사후검정 (Dunn's test)
posthoc = sp.posthoc_dunn(data, val_col="${safePy(d)}", group_col="${safePy(g)}", p_adjust="bonferroni")
print("\\nPost-hoc (Dunn's test):")
print(posthoc)

# 효과 크기 (Eta-squared)
grand_mean = ${safePyCol('data', d)}.mean()
ss_between = sum(len(grp) * (grp.mean() - grand_mean)**2 for _, grp in data.groupby("${safePy(g)}")["${safePy(d)}"])
ss_total = ((${safePyCol('data', d)} - grand_mean)**2).sum()
eta_sq = ss_between / ss_total
print(f"\\nEta-squared: {eta_sq:.4f}")`
  },
}
