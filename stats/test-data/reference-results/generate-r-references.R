# R 레퍼런스 결과 생성 스크립트
# 이 스크립트는 표준 데이터셋에 대한 R 계산 결과를 생성합니다.
# 결과는 JSON 형식으로 저장되어 JavaScript 테스트에서 비교 검증에 사용됩니다.

library(jsonlite)

# 작업 디렉토리 설정
setwd(dirname(rstudioapi::getActiveDocumentContext()$path))

# 결과 저장 리스트
results <- list()

# =============================================================================
# 1. T-TEST 레퍼런스
# =============================================================================

# 테스트 데이터
group1 <- c(1, 2, 3, 4, 5)
group2 <- c(2, 3, 4, 5, 6)

# 일표본 t-검정
results$ttest$one_sample <- list(
  test = "One Sample t-test",
  data = list(sample = group1, mu = 3),
  result = broom::tidy(t.test(group1, mu = 3))
)

# 독립표본 t-검정
results$ttest$independent <- list(
  test = "Independent t-test",
  data = list(group1 = group1, group2 = group2),
  result = broom::tidy(t.test(group1, group2, var.equal = TRUE))
)

# 대응표본 t-검정
results$ttest$paired <- list(
  test = "Paired t-test",
  data = list(before = group1, after = group2),
  result = broom::tidy(t.test(group1, group2, paired = TRUE))
)

# Welch t-검정
results$ttest$welch <- list(
  test = "Welch t-test",
  data = list(group1 = group1, group2 = group2),
  result = broom::tidy(t.test(group1, group2, var.equal = FALSE))
)

# =============================================================================
# 2. ANOVA 레퍼런스
# =============================================================================

# ANOVA 데이터
control <- c(23, 25, 24, 26, 27, 23, 24, 25, 28, 26)
treatment1 <- c(28, 30, 29, 31, 32, 30, 29, 31, 33, 30)
treatment2 <- c(35, 37, 36, 38, 39, 36, 35, 37, 40, 38)

# 데이터프레임 생성
anova_data <- data.frame(
  value = c(control, treatment1, treatment2),
  group = factor(rep(c("Control", "Treatment1", "Treatment2"), each = 10))
)

# 일원분산분석
anova_result <- aov(value ~ group, data = anova_data)
results$anova$one_way <- list(
  test = "One-way ANOVA",
  data = list(
    control = control,
    treatment1 = treatment1,
    treatment2 = treatment2
  ),
  result = broom::tidy(anova_result),
  summary = summary(anova_result)[[1]]
)

# Tukey HSD 사후검정
tukey_result <- TukeyHSD(anova_result)
results$anova$tukey_hsd <- list(
  test = "Tukey HSD",
  result = tukey_result$group
)

# =============================================================================
# 3. 상관분석 레퍼런스
# =============================================================================

x <- c(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
y <- c(2.1, 3.9, 6.2, 7.8, 10.1, 11.9, 14.2, 15.8, 18.1, 19.9)

# Pearson 상관계수
pearson_result <- cor.test(x, y, method = "pearson")
results$correlation$pearson <- list(
  test = "Pearson correlation",
  data = list(x = x, y = y),
  result = list(
    estimate = pearson_result$estimate[[1]],
    p.value = pearson_result$p.value,
    conf.int = pearson_result$conf.int,
    statistic = pearson_result$statistic[[1]]
  )
)

# Spearman 상관계수
spearman_result <- cor.test(x, y, method = "spearman")
results$correlation$spearman <- list(
  test = "Spearman correlation",
  data = list(x = x, y = y),
  result = list(
    estimate = spearman_result$estimate[[1]],
    p.value = spearman_result$p.value,
    statistic = spearman_result$statistic[[1]]
  )
)

# =============================================================================
# 4. 회귀분석 레퍼런스
# =============================================================================

# 단순선형회귀
lm_result <- lm(y ~ x)
results$regression$simple <- list(
  test = "Simple Linear Regression",
  data = list(x = x, y = y),
  result = list(
    coefficients = coef(lm_result),
    r.squared = summary(lm_result)$r.squared,
    adj.r.squared = summary(lm_result)$adj.r.squared,
    f.statistic = summary(lm_result)$fstatistic[1],
    p.value = pf(
      summary(lm_result)$fstatistic[1],
      summary(lm_result)$fstatistic[2],
      summary(lm_result)$fstatistic[3],
      lower.tail = FALSE
    )
  )
)

# =============================================================================
# 5. 정규성 검정 레퍼런스
# =============================================================================

# Shapiro-Wilk 검정
shapiro_result <- shapiro.test(group1)
results$normality$shapiro <- list(
  test = "Shapiro-Wilk Test",
  data = group1,
  result = list(
    statistic = shapiro_result$statistic[[1]],
    p.value = shapiro_result$p.value
  )
)

# =============================================================================
# 6. 비모수 검정 레퍼런스
# =============================================================================

# Mann-Whitney U 검정
wilcox_result <- wilcox.test(group1, group2)
results$nonparametric$mann_whitney <- list(
  test = "Mann-Whitney U Test",
  data = list(group1 = group1, group2 = group2),
  result = list(
    statistic = wilcox_result$statistic[[1]],
    p.value = wilcox_result$p.value
  )
)

# Wilcoxon 부호순위 검정
wilcox_paired <- wilcox.test(group1, group2, paired = TRUE)
results$nonparametric$wilcoxon <- list(
  test = "Wilcoxon Signed-Rank Test",
  data = list(group1 = group1, group2 = group2),
  result = list(
    statistic = wilcox_paired$statistic[[1]],
    p.value = wilcox_paired$p.value
  )
)

# Kruskal-Wallis 검정
kruskal_result <- kruskal.test(
  list(control, treatment1, treatment2)
)
results$nonparametric$kruskal <- list(
  test = "Kruskal-Wallis Test",
  data = list(
    group1 = control,
    group2 = treatment1,
    group3 = treatment2
  ),
  result = list(
    statistic = kruskal_result$statistic[[1]],
    p.value = kruskal_result$p.value,
    df = kruskal_result$parameter[[1]]
  )
)

# =============================================================================
# 7. 카이제곱 검정 레퍼런스
# =============================================================================

# 분할표 데이터
contingency_table <- matrix(
  c(20, 15, 10,
    25, 20, 5,
    15, 25, 10),
  nrow = 3, byrow = TRUE
)

chi_result <- chisq.test(contingency_table)
results$chi_square <- list(
  test = "Chi-square Test",
  data = contingency_table,
  result = list(
    statistic = chi_result$statistic[[1]],
    p.value = chi_result$p.value,
    df = chi_result$parameter[[1]]
  )
)

# =============================================================================
# 8. 효과크기 계산
# =============================================================================

library(effectsize)

# Cohen's d
cohens_d <- effectsize::cohens_d(group1, group2)
results$effect_sizes$cohens_d <- list(
  test = "Cohen's d",
  data = list(group1 = group1, group2 = group2),
  result = list(
    estimate = cohens_d$Cohens_d,
    ci_lower = cohens_d$CI_low,
    ci_upper = cohens_d$CI_high
  )
)

# Eta-squared for ANOVA
eta_sq <- effectsize::eta_squared(anova_result)
results$effect_sizes$eta_squared <- list(
  test = "Eta-squared",
  result = list(
    estimate = eta_sq$Eta2,
    ci_lower = eta_sq$CI_low,
    ci_upper = eta_sq$CI_high
  )
)

# =============================================================================
# JSON 파일로 저장
# =============================================================================

# 결과를 pretty JSON으로 저장
json_output <- toJSON(results, pretty = TRUE, auto_unbox = TRUE)
write(json_output, "r_reference_results.json")

# 각 카테고리별로 별도 파일로도 저장
for (category in names(results)) {
  category_json <- toJSON(results[[category]], pretty = TRUE, auto_unbox = TRUE)
  filename <- paste0("r_reference_", category, ".json")
  write(category_json, filename)
}

# 완료 메시지
cat("R 레퍼런스 결과가 생성되었습니다:\n")
cat("- 전체 결과: r_reference_results.json\n")
cat("- 카테고리별 파일: r_reference_*.json\n")
cat("\n정확도 검증 기준: 0.0001 이내 오차\n")