/**
 * ANOVA 코드 템플릿 (1개)
 * - anova (일원분산분석 + Tukey 사후검정)
 */

import type { CodeTemplate } from '../code-template-types'
import { dep, group, safeRFormula, safePy, safePyCol, safeFileName, safeRString } from './template-helpers'

export const anovaR: CodeTemplate = {
  methodId: 'anova',
  language: 'R',
  libraries: ['tidyverse'],
  generate: (input) => {
    const d = dep(input)
    const g = group(input)
    const isWelch = input.options.testVariant === 'welch'
    const requestedPostHocMethod = input.options.postHocMethod
    const postHocMethod = isWelch && requestedPostHocMethod === 'tukey'
      ? 'games-howell'
      : requestedPostHocMethod ?? (isWelch ? 'games-howell' : 'tukey')
    const analysisBlock = isWelch
      ? `library(rstatix)
welch_result <- welch_anova_test(data, ${safeRFormula(d)} ~ ${safeRFormula(g)})
print(welch_result)`
      : `model <- aov(${safeRFormula(d)} ~ ${safeRFormula(g)}, data = data)
summary(model)`
    const postHocBlock = postHocMethod === 'games-howell'
      ? `# 사후검정 (Games-Howell)
library(rstatix)
print(games_howell_test(data, ${safeRFormula(d)} ~ ${safeRFormula(g)}))`
      : postHocMethod === 'bonferroni'
        ? `# 사후검정 (Bonferroni)
print(pairwise.t.test(data[[${safeRString(d)}]], data[[${safeRString(g)}]], p.adjust.method = "bonferroni"))`
        : `# 사후검정 (Tukey HSD)
print(TukeyHSD(model))`
    const effectSizeBlock = `model <- aov(${safeRFormula(d)} ~ ${safeRFormula(g)}, data = data)
ss <- summary(model)[[1]]
eta_sq <- ss[["Sum Sq"]][1] / sum(ss[["Sum Sq"]])
cat(sprintf("Eta-squared: %.4f\\n", eta_sq))`
    return `library(tidyverse)

data <- read_csv("${safeFileName(input.dataFileName)}")
data[[${safeRString(g)}]] <- as.factor(data[[${safeRString(g)}]])

# 일원분산분석 (${isWelch ? 'Welch ANOVA' : 'One-Way ANOVA'})
${analysisBlock}

${postHocBlock}

# 효과 크기 (Eta-squared)
${effectSizeBlock}`
  },
}

export const anovaPython: CodeTemplate = {
  methodId: 'anova',
  language: 'python',
  libraries: ['pandas', 'scipy', 'statsmodels', 'pingouin'],
  generate: (input) => {
    const d = dep(input)
    const g = group(input)
    const isWelch = input.options.testVariant === 'welch'
    const requestedPostHocMethod = input.options.postHocMethod
    const postHocMethod = isWelch && requestedPostHocMethod === 'tukey'
      ? 'games-howell'
      : requestedPostHocMethod ?? (isWelch ? 'games-howell' : 'tukey')
    const imports = postHocMethod === 'tukey'
      ? 'from statsmodels.stats.multicomp import pairwise_tukeyhsd'
      : 'import pingouin as pg'
    const analysisBlock = isWelch
      ? `welch_result = pg.welch_anova(data=data, dv="${safePy(d)}", between="${safePy(g)}")
print(welch_result)
f_stat = welch_result["F"].iloc[0]
p_value = welch_result["p-unc"].iloc[0]`
      : `f_stat, p_value = stats.f_oneway(*groups)`
    const postHocBlock = postHocMethod === 'games-howell'
      ? `# 사후검정 (Games-Howell)
posthoc = pg.pairwise_gameshowell(data=data, dv="${safePy(d)}", between="${safePy(g)}")
print("\\nPost-hoc (Games-Howell):")
print(posthoc)`
      : postHocMethod === 'bonferroni'
        ? `# 사후검정 (Bonferroni)
posthoc = pg.pairwise_tests(data=data, dv="${safePy(d)}", between="${safePy(g)}", padjust="bonf")
print("\\nPost-hoc (Bonferroni):")
print(posthoc)`
        : `# 사후검정 (Tukey HSD)
posthoc = pairwise_tukeyhsd(endog=data["${safePy(d)}"], groups=data["${safePy(g)}"], alpha=${(1 - input.options.confidenceLevel).toFixed(2)})
print("\\nPost-hoc (Tukey HSD):")
print(posthoc.summary())`
    return `import pandas as pd
from scipy import stats
${imports}

data = pd.read_csv("${safeFileName(input.dataFileName)}")

# 그룹별 분리
groups = [grp["${safePy(d)}"].values for _, grp in data.groupby("${safePy(g)}")]

# 일원분산분석 (${isWelch ? 'Welch ANOVA' : 'One-Way ANOVA'})
${analysisBlock}
print(f"F-statistic: {f_stat:.4f}")
print(f"p-value: {p_value:.4f}")

${postHocBlock}

# 효과 크기 (Eta-squared)
grand_mean = ${safePyCol('data', d)}.mean()
ss_between = sum(len(grp) * (grp.mean() - grand_mean)**2 for _, grp in data.groupby("${safePy(g)}")["${safePy(d)}"])
ss_total = ((${safePyCol('data', d)} - grand_mean)**2).sum()
eta_sq = ss_between / ss_total
print(f"\\nEta-squared: {eta_sq:.4f}")`
  },
}
