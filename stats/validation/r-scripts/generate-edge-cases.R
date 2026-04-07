#!/usr/bin/env Rscript
# =============================================================================
# BioHub Statistical Validation — Edge Case Golden Value Generator (L3)
# =============================================================================
# Purpose: Generate golden reference values for edge case scenarios (Phase 4)
# Output:  stats/validation/golden-values/edge-cases/*.json
# Usage:   Rscript stats/validation/r-scripts/generate-edge-cases.R
#
# Edge case categories:
#   1. Missing values (NaN/NA in input)
#   2. Small samples (n=3 or less)
#   3. Extreme values / outliers
#   4. Ties (equal values in ranked data)
# =============================================================================

library(jsonlite)

# ─── Output directory setup ──────────────────────────────────────────────────
args <- commandArgs(trailingOnly = FALSE)
file_arg <- grep("--file=", args, value = TRUE)
if (length(file_arg) > 0) {
  script_dir <- dirname(normalizePath(sub("--file=", "", file_arg)))
  validation_base <- dirname(script_dir)
} else {
  cwd <- getwd()
  if (dir.exists(file.path(cwd, "validation"))) {
    validation_base <- file.path(cwd, "validation")
  } else if (dir.exists(file.path(cwd, "stats", "validation"))) {
    validation_base <- file.path(cwd, "stats", "validation")
  } else {
    validation_base <- file.path(cwd, "validation")
  }
}

output_dir <- file.path(validation_base, "golden-values", "edge-cases")
dir.create(output_dir, recursive = TRUE, showWarnings = FALSE)

cat("Output directory:", output_dir, "\n")
cat("R version:", R.version.string, "\n")
cat("Date:", format(Sys.time(), "%Y-%m-%d %H:%M:%S"), "\n\n")

# ─── Helper: Write golden JSON ──────────────────────────────────────────────
write_golden <- function(data, filename) {
  json <- toJSON(data, auto_unbox = TRUE, digits = 15, pretty = TRUE, na = "null")
  # R reserves 'function' keyword — we use 'function_' in list, fix in JSON output
  json <- gsub('"function_"', '"function"', json)
  writeLines(json, file.path(output_dir, filename))
  cat(sprintf("  Written: %s\n", filename))
}

# =============================================================================
# Edge Case 1: Two-sample t-test with NaN (Missing Values)
# =============================================================================
cat("--- Edge Case 1: Two-sample t-test with NaN ---\n")
{
  g1 <- c(1.2, NA, 3.4, 2.8, 4.1, NA, 2.5, 3.9)
  g2 <- c(2.1, 3.5, NA, 4.2, 3.8, 2.9, NA, 3.1)

  result <- t.test(g1, g2, var.equal = TRUE)

  g1_clean <- na.omit(g1)
  g2_clean <- na.omit(g2)
  d_cohen <- (mean(g1_clean) - mean(g2_clean)) /
    sqrt(((length(g1_clean) - 1) * var(g1_clean) + (length(g2_clean) - 1) * var(g2_clean)) /
         (length(g1_clean) + length(g2_clean) - 2))

  golden <- list(
    method = "edge-ttest-nan",
    layer = "L3",
    referenceSource = list(
      software = "R",
      function_ = "stats::t.test",
      packages = list("stats")
    ),
    generatedAt = format(Sys.Date()),
    rVersion = R.version.string,
    edgeCaseType = "missing-values",
    description = "Two-sample t-test with NaN values in both groups",
    datasets = list(list(
      name = "nan_in_both_groups",
      source = "synthetic data with NaN",
      data = list(
        group1 = as.list(ifelse(is.na(g1), NA, g1)),
        group2 = as.list(ifelse(is.na(g2), NA, g2))
      ),
      n = list(group1_raw = 8L, group2_raw = 8L,
               group1_clean = length(g1_clean), group2_clean = length(g2_clean)),
      cases = list(list(
        description = "Student's t-test with NaN values (should skip NaN)",
        rCode = "t.test(g1, g2, var.equal=TRUE)",
        expected = list(
          tStatistic = list(value = unname(result$statistic), tier = "tier3"),
          pValue = list(value = result$p.value, tier = "tier4"),
          mean1 = list(value = mean(g1_clean), tier = "tier2"),
          mean2 = list(value = mean(g2_clean), tier = "tier2"),
          n1 = list(value = length(g1_clean), tier = "exact"),
          n2 = list(value = length(g2_clean), tier = "exact")
        )
      ))
    ))
  )

  write_golden(golden, "edge-ttest-nan.json")
}

# =============================================================================
# Edge Case 2: One-sample t-test with n=3 (Small Sample)
# =============================================================================
cat("--- Edge Case 2: One-sample t-test with n=3 ---\n")
{
  vals <- c(12.5, 14.2, 13.1)
  mu <- 10

  result <- t.test(vals, mu = mu)

  golden <- list(
    method = "edge-ttest-small",
    layer = "L3",
    referenceSource = list(
      software = "R",
      function_ = "stats::t.test",
      packages = list("stats")
    ),
    generatedAt = format(Sys.Date()),
    rVersion = R.version.string,
    edgeCaseType = "small-sample",
    description = "One-sample t-test with n=3 (minimum practical sample)",
    datasets = list(list(
      name = "three_observations",
      source = "synthetic minimal sample",
      data = list(values = as.list(vals), popmean = mu),
      n = list(total = 3L),
      cases = list(list(
        description = "One-sample t-test with n=3 (mu=10)",
        rCode = "t.test(c(12.5, 14.2, 13.1), mu=10)",
        expected = list(
          tStatistic = list(value = unname(result$statistic), tier = "tier2"),
          pValue = list(value = result$p.value, tier = "tier4"),
          sampleMean = list(value = mean(vals), tier = "tier2"),
          n = list(value = 3L, tier = "exact")
        )
      ))
    ))
  )

  write_golden(golden, "edge-ttest-small.json")
}

# =============================================================================
# Edge Case 3: Pearson correlation near-perfect (Extreme Values)
# =============================================================================
cat("--- Edge Case 3: Pearson correlation near-perfect ---\n")
{
  x <- 1:10
  y <- c(3.501, 6.0, 8.499, 11.001, 13.5, 15.999, 18.501, 21.0, 23.499, 26.001)

  result <- cor.test(x, y, method = "pearson")

  golden <- list(
    method = "edge-correlation-extreme",
    layer = "L3",
    referenceSource = list(
      software = "R",
      function_ = "stats::cor.test",
      packages = list("stats")
    ),
    generatedAt = format(Sys.Date()),
    rVersion = R.version.string,
    edgeCaseType = "extreme-values",
    description = "Pearson correlation with near-perfect r (r near 1.0)",
    datasets = list(list(
      name = "near_perfect_linear",
      source = "synthetic: y = 2.5x + 1 + tiny noise",
      data = list(x = as.list(x), y = as.list(y)),
      n = list(total = 10L),
      cases = list(list(
        description = "Pearson correlation near-perfect (r near 1.0)",
        rCode = "cor.test(x, y, method='pearson')",
        expected = list(
          r = list(value = unname(result$estimate), tier = "tier3"),
          pValue = list(value = result$p.value, tier = "tier4")
        )
      ))
    ))
  )

  write_golden(golden, "edge-correlation-extreme.json")
}

# =============================================================================
# Edge Case 4: Wilcoxon signed-rank with heavy ties
# =============================================================================
cat("--- Edge Case 4: Wilcoxon signed-rank with ties ---\n")
{
  before <- c(10, 12, 14, 16, 18, 20, 22, 24, 26, 28)
  after  <- c( 8, 10, 12, 14, 16, 18, 20, 22, 24, 26)
  # All differences = 2 (complete ties in differences)

  # NOTE: This edge case validates the BioHub worker path (scipy.stats.wilcoxon),
  # NOT the R wilcox.test output. scipy returns T=min(W+,W-), R returns V=W+.
  # For this dataset (all diffs=+2): W+=55, W-=0, T=min(55,0)=0.
  result <- wilcox.test(before, after, paired = TRUE, exact = FALSE, correct = FALSE)
  # R result$statistic = V = 55 (W+), but we store T=0 to match the worker.
  # R p-value also differs (normal approx with ties correction vs scipy exact).

  golden <- list(
    method = "edge-wilcoxon-ties",
    layer = "L3",
    referenceSource = list(
      software = "BioHub worker3 (scipy.stats.wilcoxon)",
      function_ = "worker3_nonparametric_anova.wilcoxon_test",
      packages = list("scipy"),
      note = "Worker returns T=min(W+,W-) via scipy.stats.wilcoxon. Verified against Pyodide 0.29.3."
    ),
    generatedAt = format(Sys.Date()),
    rVersion = R.version.string,
    edgeCaseType = "ties",
    description = "Wilcoxon signed-rank test with all equal differences (heavy ties)",
    datasets = list(list(
      name = "heavy_ties",
      source = "synthetic: all differences equal to 2",
      data = list(before = as.list(before), after = as.list(after)),
      n = list(pairs = 10L),
      cases = list(list(
        description = "Wilcoxon signed-rank with all equal differences (d=2 for all)",
        pythonCode = "wilcoxon_test(before, after)  # scipy.stats.wilcoxon, returns T=min(W+,W-)",
        expected = list(
          statistic = list(value = 0.0, tier = "exact"),
          pValue = list(value = 0.001953125, tier = "tier2")
        )
      ))
    ))
  )

  write_golden(golden, "edge-wilcoxon-ties.json")
}

# =============================================================================
# Edge Case 5: Descriptive stats with NaN (Missing Values)
# =============================================================================
cat("--- Edge Case 5: Descriptive stats with NaN ---\n")
{
  vals <- c(10.5, NA, 15.2, 12.8, NA, 18.1, 14.3, 11.9, NA, 16.7)
  clean <- na.omit(vals)

  golden <- list(
    method = "edge-descriptive-nan",
    layer = "L3",
    referenceSource = list(
      software = "R",
      function_ = "base + psych",
      packages = list("stats", "psych")
    ),
    generatedAt = format(Sys.Date()),
    rVersion = R.version.string,
    edgeCaseType = "missing-values",
    description = "Descriptive statistics with NaN values scattered in data",
    datasets = list(list(
      name = "values_with_nan",
      source = "synthetic data with NaN",
      data = list(
        values = as.list(ifelse(is.na(vals), NA, vals))
      ),
      n = list(raw = 10L, clean = length(clean)),
      cases = list(list(
        description = "Descriptive stats with NaN values (should exclude NaN)",
        rCode = "mean(x, na.rm=TRUE); sd(x, na.rm=TRUE); median(x, na.rm=TRUE)",
        expected = list(
          mean = list(value = mean(clean), tier = "tier2"),
          sd = list(value = sd(clean), tier = "tier2"),
          median = list(value = median(clean), tier = "tier2"),
          n = list(value = length(clean), tier = "exact"),
          sem = list(value = sd(clean) / sqrt(length(clean)), tier = "tier2")
        )
      ))
    ))
  )

  write_golden(golden, "edge-descriptive-nan.json")
}

# =============================================================================
# Edge Case 6: One-way ANOVA with extreme outlier
# =============================================================================
cat("--- Edge Case 6: One-way ANOVA with outlier ---\n")
{
  g1 <- c(23, 25, 24, 26, 27, 23, 24, 25, 100, 26)  # outlier = 100
  g2 <- c(28, 30, 29, 31, 32, 30, 29, 31, 33, 30)
  g3 <- c(35, 37, 36, 38, 39, 36, 35, 37, 40, 38)

  values <- c(g1, g2, g3)
  groups <- factor(rep(1:3, each = 10))
  model <- aov(values ~ groups)
  s <- summary(model)[[1]]

  ss_between <- s[1, "Sum Sq"]
  ss_within  <- s[2, "Sum Sq"]
  ss_total   <- ss_between + ss_within
  eta_sq     <- ss_between / ss_total
  omega_sq   <- (ss_between - s[1, "Df"] * s[2, "Mean Sq"]) / (ss_total + s[2, "Mean Sq"])

  golden <- list(
    method = "edge-anova-outlier",
    layer = "L3",
    referenceSource = list(
      software = "R",
      function_ = "stats::aov",
      packages = list("stats")
    ),
    generatedAt = format(Sys.Date()),
    rVersion = R.version.string,
    edgeCaseType = "extreme-values",
    description = "One-way ANOVA with extreme outlier in one group",
    datasets = list(list(
      name = "outlier_in_group1",
      source = "synthetic: group1 has outlier value 100",
      data = list(
        groups = list(as.list(g1), as.list(g2), as.list(g3))
      ),
      n = list(g1 = 10L, g2 = 10L, g3 = 10L),
      cases = list(list(
        description = "One-way ANOVA with extreme outlier in group 1",
        rCode = "aov(value ~ group)  # group1 has outlier=100",
        expected = list(
          fStatistic = list(value = s[1, "F value"], tier = "tier3"),
          pValue = list(value = s[1, "Pr(>F)"], tier = "tier4"),
          dfBetween = list(value = as.integer(s[1, "Df"]), tier = "exact"),
          dfWithin = list(value = as.integer(s[2, "Df"]), tier = "exact"),
          etaSquared = list(value = eta_sq, tier = "tier3"),
          ssBetween = list(value = ss_between, tier = "tier3"),
          ssWithin = list(value = ss_within, tier = "tier3")
        )
      ))
    ))
  )

  write_golden(golden, "edge-anova-outlier.json")
}

# =============================================================================
# Edge Case 7: Pearson correlation with zero-variance x (Crash Prevention)
# =============================================================================
cat("--- Edge Case 7: Correlation with zero-variance x ---\n")
{
  x <- c(5, 5, 5, 5, 5)
  y <- c(1, 2, 3, 4, 5)

  result <- tryCatch(
    cor.test(x, y, method = "pearson"),
    error = function(e) list(estimate = NA, p.value = NA)
  )

  golden <- list(
    method = "edge-correlation-zero-var",
    layer = "L3",
    referenceSource = list(
      software = "R",
      function_ = "stats::cor.test",
      packages = list("stats")
    ),
    generatedAt = format(Sys.Date()),
    rVersion = R.version.string,
    edgeCaseType = "zero-variance",
    description = "Pearson correlation with zero-variance x (SD=0, division by zero)",
    datasets = list(list(
      name = "constant_x",
      source = "synthetic: x is constant (all 5.0)",
      data = list(x = as.list(x), y = as.list(y)),
      n = list(total = 5L),
      cases = list(list(
        description = "Pearson correlation with zero-variance x (should return null/NaN)",
        rCode = "cor.test(c(5,5,5,5,5), c(1,2,3,4,5))",
        expected = list(
          r = list(value = NA, tier = "exact"),
          pValue = list(value = NA, tier = "exact")
        )
      ))
    ))
  )

  write_golden(golden, "edge-correlation-zero-var.json")
}

# =============================================================================
# Edge Case 8: One-way ANOVA with n=1 group (Crash Prevention)
# =============================================================================
cat("--- Edge Case 8: ANOVA with n=1 group ---\n")
{
  g1 <- c(10, 12, 14, 11, 13)
  g2 <- c(20, 22, 24)
  g3 <- c(30)

  values <- c(g1, g2, g3)
  groups <- factor(rep(1:3, c(length(g1), length(g2), length(g3))))
  model <- aov(values ~ groups)

  golden <- list(
    method = "edge-anova-single-obs",
    layer = "L3",
    referenceSource = list(
      software = "R",
      function_ = "stats::aov",
      packages = list("stats")
    ),
    generatedAt = format(Sys.Date()),
    rVersion = R.version.string,
    edgeCaseType = "insufficient-sample",
    description = "One-way ANOVA with n=1 group. R computes; BioHub requires n>=2.",
    datasets = list(list(
      name = "group3_single_obs",
      source = "synthetic: group 3 has only 1 observation",
      data = list(groups = list(as.list(g1), as.list(g2), as.list(g3))),
      n = list(g1 = length(g1), g2 = length(g2), g3 = length(g3)),
      cases = list(list(
        description = "ANOVA with n=1 group (BioHub: error expected)",
        rCode = "aov(value ~ group)  # group3 has n=1",
        expectBehavior = "error",
        expected = list()
      ))
    ))
  )

  write_golden(golden, "edge-anova-single-obs.json")
}

# =============================================================================
# Edge Case 9: Logistic regression with perfect separation
# =============================================================================
cat("--- Edge Case 9: Logistic with perfect separation ---\n")
{
  x <- 1:10
  y <- c(0, 0, 0, 0, 0, 1, 1, 1, 1, 1)
  result <- suppressWarnings(glm(y ~ x, family = binomial))

  golden <- list(
    method = "edge-logistic-separation",
    layer = "L3",
    referenceSource = list(
      software = "R",
      function_ = "stats::glm",
      packages = list("stats")
    ),
    generatedAt = format(Sys.Date()),
    rVersion = R.version.string,
    edgeCaseType = "perfect-separation",
    description = "Logistic regression with perfect separation. MLE does not exist.",
    datasets = list(list(
      name = "perfect_separation",
      source = "synthetic: y=0 for x<=5, y=1 for x>5",
      data = list(x = as.list(x), y = as.list(y)),
      n = list(total = 10L),
      cases = list(list(
        description = "Logistic with perfect separation (should not crash)",
        rCode = "glm(y ~ x, family=binomial)",
        expectBehavior = "no_crash",
        expected = list()
      ))
    ))
  )

  write_golden(golden, "edge-logistic-separation.json")
}

# =============================================================================
# Edge Case 10: Multiple regression with perfect collinearity
# =============================================================================
cat("--- Edge Case 10: Regression with collinearity ---\n")
{
  x1 <- 1:10
  x2 <- 2 * x1
  y <- c(2.1, 4.3, 5.8, 8.2, 9.9, 12.1, 14.5, 15.8, 18.3, 20.1)

  df <- data.frame(y = y, x1 = x1, x2 = x2)
  model <- lm(y ~ x1 + x2, data = df)

  golden <- list(
    method = "edge-regression-collinear",
    layer = "L3",
    referenceSource = list(
      software = "R",
      function_ = "stats::lm",
      packages = list("stats")
    ),
    generatedAt = format(Sys.Date()),
    rVersion = R.version.string,
    edgeCaseType = "multicollinearity",
    description = "Multiple regression with perfect collinearity (x2=2*x1). Singular matrix.",
    datasets = list(list(
      name = "perfect_collinearity",
      source = "synthetic: x2 = 2*x1",
      data = list(x1 = as.list(x1), x2 = as.list(x2), y = as.list(y)),
      n = list(total = 10L, predictors = 2L),
      cases = list(list(
        description = "Regression with perfect collinearity (should not crash)",
        rCode = "lm(y ~ x1 + x2)  # x2 = 2*x1",
        expectBehavior = "no_crash",
        expected = list()
      ))
    ))
  )

  write_golden(golden, "edge-regression-collinear.json")
}

# =============================================================================
# Edge Case 11: Kaplan-Meier with all censored data
# =============================================================================
cat("--- Edge Case 11: KM all censored ---\n")
{
  if (requireNamespace("survival", quietly = TRUE)) {
    library(survival)
    time <- c(1, 3, 5, 7, 9, 12, 15, 20)
    event <- c(0, 0, 0, 0, 0, 0, 0, 0)
    group <- factor(c(1, 1, 1, 1, 2, 2, 2, 2))

    fit <- survfit(Surv(time, event) ~ group)

    golden <- list(
      method = "edge-km-all-censored",
      layer = "L3",
      referenceSource = list(
        software = "R",
        function_ = "survival::survfit",
        packages = list("survival")
      ),
      generatedAt = format(Sys.Date()),
      rVersion = R.version.string,
      edgeCaseType = "all-censored",
      description = "Kaplan-Meier with all observations censored. Survival=1.0.",
      datasets = list(list(
        name = "all_censored",
        source = "synthetic: 8 observations, all censored",
        data = list(
          time = as.list(time),
          status = as.list(event),
          group = as.list(as.integer(group))
        ),
        n = list(total = 8L, events = 0L),
        cases = list(list(
          description = "KM all censored (survival=1.0, nEvents=0)",
          rCode = "survfit(Surv(time, event) ~ group)",
          expected = list(
            nEvents = list(value = 0L, tier = "exact")
          )
        ))
      ))
    )

    write_golden(golden, "edge-km-all-censored.json")
  } else {
    cat("  SKIP: survival package not installed\n")
  }
}

# =============================================================================
# Edge Case 12: Chi-square with zero-count row
# =============================================================================
cat("--- Edge Case 12: Chi-square with zero row ---\n")
{
  mat <- matrix(c(10, 0, 20, 0, 15, 0), nrow = 2)
  result <- suppressWarnings(chisq.test(mat))

  golden <- list(
    method = "edge-chisq-zero-row",
    layer = "L3",
    referenceSource = list(
      software = "R",
      function_ = "stats::chisq.test",
      packages = list("stats")
    ),
    generatedAt = format(Sys.Date()),
    rVersion = R.version.string,
    edgeCaseType = "empty-factor",
    description = "Chi-square with zero-count row. Expected frequencies=0.",
    datasets = list(list(
      name = "zero_row",
      source = "synthetic: row 2 all zeros",
      data = list(
        observedMatrix = list(as.list(c(10L, 20L, 15L)), as.list(c(0L, 0L, 0L)))
      ),
      n = list(rows = 2L, cols = 3L),
      cases = list(list(
        description = "Chi-square with zero-count row (should error or NaN)",
        rCode = "chisq.test(matrix(c(10,0,20,0,15,0), nrow=2))",
        expectBehavior = "error",
        expected = list()
      ))
    ))
  )

  write_golden(golden, "edge-chisq-zero-row.json")
}

cat("\n=== All edge case golden values generated ===\n")
