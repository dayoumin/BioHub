#!/usr/bin/env Rscript
# =============================================================================
# BioHub Statistical Validation — R Reference Value Generator
# =============================================================================
# Purpose: Generate golden reference values for 46 statistical methods + 4 data tools
# Output:  stats/validation/golden-values/r-reference/*.json
#          stats/validation/golden-values/nist/*.json
# Usage:   Rscript stats/validation/r-scripts/generate-references.R
# =============================================================================

# ─── Required Packages ───────────────────────────────────────────────────────
required_pkgs <- c(
  "jsonlite",       # JSON output
  "car",            # Type II ANOVA
  "MASS",           # ordinal regression (polr), LDA
  "survival",       # Kaplan-Meier, Cox
  "pROC",           # ROC curves
  "pwr",            # power analysis
  "psych",          # factor analysis, reliability
  "ppcor",          # partial correlation
  "tseries",        # ADF stationarity test
  "trend",          # Mann-Kendall test
  "drc",            # dose-response curves
  "lme4"            # mixed models
)

# Optional packages (not all systems have these)
optional_pkgs <- c(
  "RVAideMemoire",  # Cochran Q test
  "rsm",            # response surface
  "randtests"       # runs test
)

missing_pkgs <- required_pkgs[!sapply(required_pkgs, requireNamespace, quietly = TRUE)]
if (length(missing_pkgs) > 0) {
  cat("Installing missing required packages:", paste(missing_pkgs, collapse = ", "), "\n")
  install.packages(missing_pkgs, repos = "https://cloud.r-project.org")
}

missing_opt <- optional_pkgs[!sapply(optional_pkgs, requireNamespace, quietly = TRUE)]
if (length(missing_opt) > 0) {
  cat("Installing missing optional packages:", paste(missing_opt, collapse = ", "), "\n")
  tryCatch(
    install.packages(missing_opt, repos = "https://cloud.r-project.org"),
    error = function(e) cat("Warning: some optional packages failed to install\n")
  )
}

library(jsonlite)

# ─── Output directory setup ──────────────────────────────────────────────────
# Determine script location
args <- commandArgs(trailingOnly = FALSE)
file_arg <- grep("--file=", args, value = TRUE)
if (length(file_arg) > 0) {
  script_dir <- dirname(normalizePath(sub("--file=", "", file_arg)))
  validation_base <- dirname(script_dir)
} else {
  # Fallback: assume cwd is stats/ or project root
  cwd <- getwd()
  if (dir.exists(file.path(cwd, "validation"))) {
    validation_base <- file.path(cwd, "validation")
  } else if (dir.exists(file.path(cwd, "stats", "validation"))) {
    validation_base <- file.path(cwd, "stats", "validation")
  } else {
    validation_base <- file.path(cwd, "validation")
  }
}

# Navigate to golden-values directories
validation_root <- file.path(validation_base, "golden-values", "r-reference")
nist_root <- file.path(validation_base, "golden-values", "nist")
dir.create(validation_root, recursive = TRUE, showWarnings = FALSE)
dir.create(nist_root, recursive = TRUE, showWarnings = FALSE)

cat("Output directory:", validation_root, "\n")
cat("NIST directory:", nist_root, "\n")
cat("R version:", R.version.string, "\n")
cat("Date:", format(Sys.time(), "%Y-%m-%d %H:%M:%S"), "\n\n")

# ─── Helper: Write golden value JSON ─────────────────────────────────────────
write_golden <- function(method_id, layer, ref_source, datasets, output_dir = validation_root) {
  golden <- list(
    method = method_id,
    layer = layer,
    referenceSource = ref_source,
    generatedAt = format(Sys.Date(), "%Y-%m-%d"),
    rVersion = R.version.string,
    datasets = datasets
  )

  filepath <- file.path(output_dir, paste0(method_id, ".json"))
  write_json(golden, filepath, pretty = TRUE, auto_unbox = TRUE, digits = 15)
  cat("[OK]", method_id, "->", basename(filepath), "\n")
}

# ─── Helper: safe numeric extraction ─────────────────────────────────────────
safe_num <- function(x) {
  if (is.null(x) || length(x) == 0) return(NA)
  if (is.nan(x) || is.infinite(x)) return(as.character(x))
  as.numeric(x)
}

# =============================================================================
# SECTION 1: T-TESTS (4 methods)
# =============================================================================
cat("=== T-TESTS ===\n")

# --- Data: BioHub 독립표본t검정_암수차이.csv equivalent ---
# Using known data for reproducibility
male   <- c(45.2, 42.1, 48.3, 44.7, 46.8, 43.5, 47.2, 41.9, 49.1, 44.3, 46.5, 42.8, 47.9, 43.1, 45.6)
female <- c(38.7, 41.2, 39.5, 40.8, 37.3, 42.1, 38.9, 41.5, 39.2, 40.3, 37.8, 41.8, 39.7, 40.1, 38.5)

# --- two-sample-t ---
t_eq <- t.test(male, female, var.equal = TRUE)
cohens_d_pooled <- {
  n1 <- length(male); n2 <- length(female)
  s_pooled <- sqrt(((n1 - 1) * var(male) + (n2 - 1) * var(female)) / (n1 + n2 - 2))
  (mean(male) - mean(female)) / s_pooled
}
write_golden("two-sample-t", "L2",
  list(software = "R", `function` = "stats::t.test", packages = list("stats")),
  list(list(
    name = "male_vs_female_weight",
    source = "BioHub test-data equivalent",
    data = list(group1 = male, group2 = female),
    n = list(group1 = length(male), group2 = length(female)),
    cases = list(list(
      description = "Student's t-test (equal variance assumed)",
      rCode = "t.test(male, female, var.equal=TRUE)",
      expected = list(
        tStatistic = list(value = safe_num(t_eq$statistic), tier = "tier2"),
        df = list(value = safe_num(t_eq$parameter), tier = "exact"),
        pValue = list(value = safe_num(t_eq$p.value), tier = "tier2"),
        meanDiff = list(value = safe_num(mean(male) - mean(female)), tier = "tier3"),
        ci95Lower = list(value = safe_num(t_eq$conf.int[1]), tier = "tier3"),
        ci95Upper = list(value = safe_num(t_eq$conf.int[2]), tier = "tier3"),
        cohensD = list(value = safe_num(cohens_d_pooled), tier = "tier2"),
        mean1 = list(value = safe_num(mean(male)), tier = "tier2"),
        mean2 = list(value = safe_num(mean(female)), tier = "tier2"),
        n1 = list(value = length(male), tier = "exact"),
        n2 = list(value = length(female), tier = "exact")
      )
    ))
  ))
)

# --- welch-t ---
t_welch <- t.test(male, female)  # R default = Welch
write_golden("welch-t", "L2",
  list(software = "R", `function` = "stats::t.test", packages = list("stats")),
  list(list(
    name = "male_vs_female_weight_welch",
    source = "BioHub test-data equivalent",
    data = list(group1 = male, group2 = female),
    n = list(group1 = length(male), group2 = length(female)),
    cases = list(list(
      description = "Welch's t-test (unequal variance)",
      rCode = "t.test(male, female)",
      expected = list(
        tStatistic = list(value = safe_num(t_welch$statistic), tier = "tier2"),
        df = list(value = safe_num(t_welch$parameter), tier = "tier2"),
        pValue = list(value = safe_num(t_welch$p.value), tier = "tier2"),
        n1 = list(value = length(male), tier = "exact"),
        n2 = list(value = length(female), tier = "exact")
      )
    ))
  ))
)

# --- one-sample-t ---
one_sample_data <- c(23.1, 25.4, 22.8, 24.6, 23.9, 25.1, 24.3, 22.5, 24.8, 23.7)
t_one <- t.test(one_sample_data, mu = 24)
write_golden("one-sample-t", "L2",
  list(software = "R", `function` = "stats::t.test", packages = list("stats")),
  list(list(
    name = "one_sample_mu24",
    source = "synthetic data",
    data = list(values = one_sample_data, popmean = 24),
    n = list(total = length(one_sample_data)),
    cases = list(list(
      description = "One-sample t-test (mu=24)",
      rCode = "t.test(data, mu=24)",
      expected = list(
        tStatistic = list(value = safe_num(t_one$statistic), tier = "tier2"),
        df = list(value = safe_num(t_one$parameter), tier = "exact"),
        pValue = list(value = safe_num(t_one$p.value), tier = "tier2"),
        sampleMean = list(value = safe_num(mean(one_sample_data)), tier = "tier2"),
        n = list(value = length(one_sample_data), tier = "exact")
      )
    ))
  ))
)

# --- paired-t ---
before <- c(120, 115, 130, 125, 140, 118, 135, 122, 128, 133)
after  <- c(115, 110, 122, 118, 132, 112, 128, 116, 120, 126)
t_paired <- t.test(before, after, paired = TRUE)
write_golden("paired-t", "L2",
  list(software = "R", `function` = "stats::t.test", packages = list("stats")),
  list(list(
    name = "before_after_treatment",
    source = "synthetic paired data",
    data = list(before = before, after = after),
    n = list(pairs = length(before)),
    cases = list(list(
      description = "Paired t-test (before vs after)",
      rCode = "t.test(before, after, paired=TRUE)",
      expected = list(
        tStatistic = list(value = safe_num(t_paired$statistic), tier = "tier2"),
        df = list(value = safe_num(t_paired$parameter), tier = "exact"),
        pValue = list(value = safe_num(t_paired$p.value), tier = "tier2"),
        meanDiff = list(value = safe_num(mean(before - after)), tier = "tier2"),
        nPairs = list(value = length(before), tier = "exact")
      )
    ))
  ))
)

# =============================================================================
# SECTION 2: ANOVA (6 methods)
# =============================================================================
cat("\n=== ANOVA ===\n")

# --- one-way-anova ---
g1 <- c(23, 25, 24, 26, 27, 23, 24, 25, 28, 26)
g2 <- c(28, 30, 29, 31, 32, 30, 29, 31, 33, 30)
g3 <- c(35, 37, 36, 38, 39, 36, 35, 37, 40, 38)
anova_df <- data.frame(
  value = c(g1, g2, g3),
  group = factor(rep(c("A", "B", "C"), each = 10))
)
anova_fit <- aov(value ~ group, data = anova_df)
anova_summary <- summary(anova_fit)[[1]]
all_vals <- c(g1, g2, g3)
grand_mean <- mean(all_vals)
ss_between <- sum(c(length(g1), length(g2), length(g3)) *
  (c(mean(g1), mean(g2), mean(g3)) - grand_mean)^2)
ss_total <- sum((all_vals - grand_mean)^2)
ss_within <- ss_total - ss_between
eta_sq <- ss_between / ss_total
df_b <- 2; df_w <- length(all_vals) - 3
ms_w <- ss_within / df_w
omega_sq <- (ss_between - df_b * ms_w) / (ss_total + ms_w)

write_golden("one-way-anova", "L1+L2",
  list(software = "R", `function` = "stats::aov", packages = list("stats")),
  list(list(
    name = "three_group_comparison",
    source = "synthetic three-group data",
    data = list(groups = list(g1, g2, g3)),
    n = list(g1 = 10, g2 = 10, g3 = 10),
    cases = list(list(
      description = "One-way ANOVA (3 groups)",
      rCode = "summary(aov(value ~ group, data=d))",
      expected = list(
        fStatistic = list(value = safe_num(anova_summary$`F value`[1]), tier = "tier2"),
        pValue = list(value = safe_num(anova_summary$`Pr(>F)`[1]), tier = "tier2"),
        dfBetween = list(value = df_b, tier = "exact"),
        dfWithin = list(value = df_w, tier = "exact"),
        etaSquared = list(value = safe_num(eta_sq), tier = "tier2"),
        omegaSquared = list(value = safe_num(omega_sq), tier = "tier2"),
        ssBetween = list(value = safe_num(ss_between), tier = "tier2"),
        ssWithin = list(value = safe_num(ss_within), tier = "tier2"),
        ssTotal = list(value = safe_num(ss_total), tier = "tier2")
      )
    ))
  ))
)

# --- two-way-anova (Type II) ---
library(car)
tw_df <- ToothGrowth
tw_df$dose <- factor(tw_df$dose)
tw_fit <- lm(len ~ supp * dose, data = tw_df)
tw_anova <- car::Anova(tw_fit, type = 2)

write_golden("two-way-anova", "L2",
  list(software = "R", `function` = "car::Anova", packages = list("car", "stats")),
  list(list(
    name = "ToothGrowth",
    data = list(
      value = tw_df$len,
      factor1 = as.character(tw_df$supp),
      factor2 = as.character(tw_df$dose)
    ),
    source = "R datasets::ToothGrowth",
    n = list(total = nrow(tw_df)),
    cases = list(list(
      description = "Two-way ANOVA Type II (supp x dose)",
      rCode = "car::Anova(lm(len ~ supp * dose, data=ToothGrowth), type=2)",
      expected = list(
        factor1 = list(
          fStatistic = list(value = safe_num(tw_anova$`F value`[1]), tier = "tier2"),
          pValue = list(value = safe_num(tw_anova$`Pr(>F)`[1]), tier = "tier2"),
          df = list(value = safe_num(tw_anova$Df[1]), tier = "exact")
        ),
        factor2 = list(
          fStatistic = list(value = safe_num(tw_anova$`F value`[2]), tier = "tier2"),
          pValue = list(value = safe_num(tw_anova$`Pr(>F)`[2]), tier = "tier2"),
          df = list(value = safe_num(tw_anova$Df[2]), tier = "exact")
        ),
        interaction = list(
          fStatistic = list(value = safe_num(tw_anova$`F value`[3]), tier = "tier2"),
          pValue = list(value = safe_num(tw_anova$`Pr(>F)`[3]), tier = "tier2"),
          df = list(value = safe_num(tw_anova$Df[3]), tier = "exact")
        ),
        residual = list(
          df = list(value = safe_num(tw_anova$Df[4]), tier = "exact")
        )
      )
    ))
  ))
)

# --- repeated-measures-anova ---
rm_data <- data.frame(
  subject = factor(rep(1:10, each = 3)),
  time = factor(rep(c("T1", "T2", "T3"), 10)),
  value = c(
    5.2, 6.1, 7.3, 4.8, 5.9, 7.1, 5.5, 6.4, 7.6, 4.9, 6.2, 7.4,
    5.1, 5.8, 7.0, 5.3, 6.3, 7.5, 4.7, 5.7, 6.9, 5.4, 6.5, 7.7,
    5.0, 6.0, 7.2, 5.6, 6.6, 7.8
  )
)
rm_fit <- aov(value ~ time + Error(subject/time), data = rm_data)
rm_summary <- summary(rm_fit)$`Error: subject:time`[[1]]

write_golden("repeated-measures-anova", "L2",
  list(software = "R", `function` = "stats::aov + Error()", packages = list("stats")),
  list(list(
    name = "repeated_measures_3_timepoints",
    source = "synthetic repeated measures",
    n = list(subjects = 10, timepoints = 3),
    cases = list(list(
      description = "Repeated measures ANOVA (3 timepoints)",
      rCode = "aov(value ~ time + Error(subject/time), data=d)",
      expected = list(
        fStatistic = list(value = safe_num(rm_summary$`F value`[1]), tier = "tier2"),
        pValue = list(value = safe_num(rm_summary$`Pr(>F)`[1]), tier = "tier2"),
        dfTime = list(value = safe_num(rm_summary$Df[1]), tier = "exact"),
        dfError = list(value = safe_num(rm_summary$Df[2]), tier = "exact")
      )
    ))
  ))
)

# --- ancova (Type II) ---
set.seed(42)
ancova_df <- data.frame(
  y = c(rnorm(15, 50, 5), rnorm(15, 55, 5)),
  group = factor(rep(c("Control", "Treatment"), each = 15)),
  covariate = rnorm(30, 40, 8)
)
ancova_fit <- lm(y ~ group + covariate, data = ancova_df)
ancova_table <- car::Anova(ancova_fit, type = 2)

write_golden("ancova", "L2",
  list(software = "R", `function` = "car::Anova", packages = list("car", "stats")),
  list(list(
    name = "ancova_two_groups",
    source = "synthetic with covariate (seed=42)",
    data = list(
      y = ancova_df$y,
      group = as.character(ancova_df$group),
      covariate = ancova_df$covariate
    ),
    n = list(total = 30),
    cases = list(list(
      description = "ANCOVA Type II (group + covariate)",
      rCode = "car::Anova(lm(y ~ group + covariate, data=d), type=2)",
      expected = list(
        group = list(
          fStatistic = list(value = safe_num(ancova_table$`F value`[1]), tier = "tier2"),
          pValue = list(value = safe_num(ancova_table$`Pr(>F)`[1]), tier = "tier2"),
          df = list(value = safe_num(ancova_table$Df[1]), tier = "exact")
        ),
        covariate = list(
          fStatistic = list(value = safe_num(ancova_table$`F value`[2]), tier = "tier2"),
          pValue = list(value = safe_num(ancova_table$`Pr(>F)`[2]), tier = "tier2"),
          df = list(value = safe_num(ancova_table$Df[2]), tier = "exact")
        ),
        residual = list(
          df = list(value = safe_num(ancova_table$Df[3]), tier = "exact")
        )
      )
    ))
  ))
)

# --- manova ---
iris_manova <- summary(manova(cbind(Sepal.Length, Sepal.Width) ~ Species, data = iris))
pillai <- iris_manova$stats

write_golden("manova", "L2",
  list(software = "R", `function` = "stats::manova", packages = list("stats")),
  list(list(
    name = "iris_manova",
    source = "R datasets::iris",
    n = list(total = 150),
    cases = list(list(
      description = "MANOVA (Sepal.Length + Sepal.Width ~ Species)",
      rCode = "summary(manova(cbind(Sepal.Length, Sepal.Width) ~ Species, data=iris))",
      expected = list(
        pillaiTrace = list(value = safe_num(pillai["Species", "Pillai"]), tier = "tier3"),
        approxF = list(value = safe_num(pillai["Species", "approx F"]), tier = "tier3"),
        numDf = list(value = safe_num(pillai["Species", "num Df"]), tier = "exact"),
        denDf = list(value = safe_num(pillai["Species", "den Df"]), tier = "exact"),
        pValue = list(value = safe_num(pillai["Species", "Pr(>F)"]), tier = "tier2")
      )
    ))
  ))
)

# --- mixed-model ---
library(lme4)
sleep_fit <- lmer(Reaction ~ Days + (1 | Subject), data = sleepstudy)
sleep_coef <- fixef(sleep_fit)
sleep_vc <- as.data.frame(VarCorr(sleep_fit))

write_golden("mixed-model", "L2",
  list(software = "R", `function` = "lme4::lmer", packages = list("lme4")),
  list(list(
    name = "sleepstudy",
    source = "lme4::sleepstudy",
    n = list(total = nrow(sleepstudy)),
    data = list(
      Reaction = sleepstudy$Reaction,
      Days = sleepstudy$Days,
      Subject = as.character(sleepstudy$Subject)
    ),
    cases = list(list(
      description = "Mixed model: Reaction ~ Days + (1|Subject)",
      rCode = "lmer(Reaction ~ Days + (1|Subject), data=sleepstudy)",
      expected = list(
        interceptFixed = list(value = safe_num(sleep_coef["(Intercept)"]), tier = "tier3"),
        slopeDays = list(value = safe_num(sleep_coef["Days"]), tier = "tier3"),
        randomInterceptSD = list(value = safe_num(sleep_vc$sdcor[1]), tier = "tier3"),
        residualSD = list(value = safe_num(sleep_vc$sdcor[2]), tier = "tier3")
      )
    ))
  ))
)

# =============================================================================
# SECTION 3: NONPARAMETRIC (11 methods)
# =============================================================================
cat("\n=== NONPARAMETRIC ===\n")

# --- mann-whitney ---
mw <- wilcox.test(male, female, exact = FALSE, correct = FALSE)
write_golden("mann-whitney", "L2",
  list(software = "R", `function` = "stats::wilcox.test", packages = list("stats")),
  list(list(
    name = "male_vs_female",
    source = "same as t-test data",
    n = list(group1 = length(male), group2 = length(female)),
    cases = list(list(
      description = "Mann-Whitney U (two-sided, no continuity correction)",
      rCode = "wilcox.test(male, female, exact=FALSE, correct=FALSE)",
      expected = list(
        statistic = list(value = safe_num(mw$statistic), tier = "tier2"),
        pValue = list(value = safe_num(mw$p.value), tier = "tier2")
      )
    ))
  ))
)

# --- wilcoxon-signed-rank ---
wx <- wilcox.test(before, after, paired = TRUE, exact = FALSE, correct = FALSE)
write_golden("wilcoxon-signed-rank", "L2",
  list(software = "R", `function` = "stats::wilcox.test", packages = list("stats")),
  list(list(
    name = "before_after",
    source = "same as paired-t data",
    n = list(pairs = length(before)),
    cases = list(list(
      description = "Wilcoxon signed-rank (paired, no exact, no correction)",
      rCode = "wilcox.test(before, after, paired=TRUE, exact=FALSE, correct=FALSE)",
      expected = list(
        statistic = list(value = safe_num(wx$statistic), tier = "tier2"),
        pValue = list(value = safe_num(wx$p.value), tier = "tier2")
      )
    ))
  ))
)

# --- kruskal-wallis ---
kw <- kruskal.test(Ozone ~ Month, data = airquality[!is.na(airquality$Ozone), ])
write_golden("kruskal-wallis", "L2",
  list(software = "R", `function` = "stats::kruskal.test", packages = list("stats")),
  list(list(
    name = "airquality_ozone",
    source = "R datasets::airquality",
    n = list(total = sum(!is.na(airquality$Ozone))),
    data = list(
      Ozone = airquality$Ozone[!is.na(airquality$Ozone)],
      Month = airquality$Month[!is.na(airquality$Ozone)]
    ),
    cases = list(list(
      description = "Kruskal-Wallis (Ozone by Month)",
      rCode = "kruskal.test(Ozone ~ Month, data=airquality)",
      expected = list(
        statistic = list(value = safe_num(kw$statistic), tier = "tier2"),
        pValue = list(value = safe_num(kw$p.value), tier = "tier2"),
        df = list(value = safe_num(kw$parameter), tier = "exact")
      )
    ))
  ))
)

# --- friedman ---
friedman_data <- matrix(c(
  7, 5, 3,
  8, 6, 4,
  6, 4, 2,
  9, 7, 5,
  7, 5, 4,
  8, 6, 3,
  6, 5, 2,
  9, 7, 6,
  7, 4, 3,
  8, 6, 5
), nrow = 10, byrow = TRUE)
fr <- friedman.test(friedman_data)
write_golden("friedman", "L2",
  list(software = "R", `function` = "stats::friedman.test", packages = list("stats")),
  list(list(
    name = "blocked_design",
    source = "synthetic blocked data",
    data = list(matrix = as.list(as.data.frame(t(friedman_data)))),
    n = list(subjects = 10, treatments = 3),
    cases = list(list(
      description = "Friedman test (10 subjects x 3 treatments)",
      rCode = "friedman.test(matrix)",
      expected = list(
        statistic = list(value = safe_num(fr$statistic), tier = "tier2"),
        pValue = list(value = safe_num(fr$p.value), tier = "tier2"),
        df = list(value = safe_num(fr$parameter), tier = "exact")
      )
    ))
  ))
)

# --- sign-test (via binom.test) ---
sign_pos <- sum(before > after)
sign_n <- sum(before != after)
st <- binom.test(sign_pos, sign_n, p = 0.5)
write_golden("sign-test", "L2",
  list(software = "R", `function` = "stats::binom.test", packages = list("stats")),
  list(list(
    name = "before_after_sign",
    source = "same as paired-t data",
    n = list(pairs = length(before)),
    cases = list(list(
      description = "Sign test (before > after count, exact binomial)",
      rCode = "binom.test(sum(before > after), sum(before != after), p=0.5)",
      expected = list(
        pValue = list(value = safe_num(st$p.value), tier = "tier2"),
        nPositive = list(value = sign_pos, tier = "exact"),
        nNegative = list(value = sum(before < after), tier = "exact"),
        nTies = list(value = sum(before == after), tier = "exact")
      )
    ))
  ))
)

# --- mcnemar ---
mcnemar_table <- matrix(c(20, 5, 10, 15), nrow = 2,
  dimnames = list(Before = c("Pos", "Neg"), After = c("Pos", "Neg")))
mc <- mcnemar.test(mcnemar_table, correct = FALSE)
write_golden("mcnemar", "L2",
  list(software = "R", `function` = "stats::mcnemar.test", packages = list("stats")),
  list(list(
    name = "before_after_binary",
    source = "synthetic 2x2 paired table",
    data = list(table = list(c(20, 5), c(10, 15))),
    n = list(total = 50),
    cases = list(list(
      description = "McNemar test (no continuity correction)",
      rCode = "mcnemar.test(matrix(c(20,5,10,15), nrow=2), correct=FALSE)",
      expected = list(
        chiSquare = list(value = safe_num(mc$statistic), tier = "tier2"),
        pValue = list(value = safe_num(mc$p.value), tier = "tier2"),
        df = list(value = safe_num(mc$parameter), tier = "exact")
      )
    ))
  ))
)

# --- cochran-q ---
cochran_data <- matrix(c(
  1, 1, 0,
  1, 0, 0,
  1, 1, 1,
  0, 0, 0,
  1, 1, 0,
  1, 0, 1,
  0, 1, 0,
  1, 1, 1,
  1, 0, 0,
  0, 1, 0,
  1, 1, 0,
  1, 0, 1
), nrow = 12, byrow = TRUE)

# Manual Cochran Q calculation (for portability)
k <- ncol(cochran_data)
N <- nrow(cochran_data)
Tj <- colSums(cochran_data)
Li <- rowSums(cochran_data)
Q_stat <- (k - 1) * (k * sum(Tj^2) - sum(Tj)^2) / (k * sum(Li) - sum(Li^2))
Q_pval <- 1 - pchisq(Q_stat, df = k - 1)

write_golden("cochran-q", "L2",
  list(software = "R", `function` = "manual Cochran Q", packages = list("stats")),
  list(list(
    name = "binary_repeated_measures",
    source = "synthetic binary repeated measures",
    data = list(matrix = as.list(as.data.frame(t(cochran_data)))),
    n = list(subjects = N, treatments = k),
    cases = list(list(
      description = "Cochran's Q test (12 subjects x 3 treatments)",
      rCode = "Manual Q = (k-1)(k*sum(Tj^2) - (sum(Tj))^2) / (k*sum(Li) - sum(Li^2))",
      expected = list(
        qStatistic = list(value = safe_num(Q_stat), tier = "tier2"),
        pValue = list(value = safe_num(Q_pval), tier = "tier2"),
        df = list(value = k - 1, tier = "exact")
      )
    ))
  ))
)

# --- binomial-test ---
bt <- binom.test(35, 100, p = 0.3)
write_golden("binomial-test", "L2",
  list(software = "R", `function` = "stats::binom.test", packages = list("stats")),
  list(list(
    name = "success_rate",
    source = "synthetic count data",
    n = list(successes = 35, total = 100),
    cases = list(list(
      description = "Binomial test (35/100, H0: p=0.3)",
      rCode = "binom.test(35, 100, p=0.3)",
      expected = list(
        pValue = list(value = safe_num(bt$p.value), tier = "tier2"),
        proportion = list(value = safe_num(bt$estimate), tier = "tier2"),
        ci95Lower = list(value = safe_num(bt$conf.int[1]), tier = "tier3"),
        ci95Upper = list(value = safe_num(bt$conf.int[2]), tier = "tier3")
      )
    ))
  ))
)

# --- runs-test ---
runs_data <- c(1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1)
# Manual runs test (z-approximation)
n1_runs <- sum(runs_data == 1)
n0_runs <- sum(runs_data == 0)
n_total_runs <- length(runs_data)
runs_count <- 1 + sum(diff(runs_data) != 0)
mu_R <- 1 + 2 * n1_runs * n0_runs / n_total_runs
var_R <- (2 * n1_runs * n0_runs * (2 * n1_runs * n0_runs - n_total_runs)) /
  (n_total_runs^2 * (n_total_runs - 1))
z_runs <- (runs_count - mu_R) / sqrt(var_R)
p_runs <- 2 * pnorm(-abs(z_runs))

write_golden("runs-test", "L2",
  list(software = "R", `function` = "manual runs test (z-approx)", packages = list("stats")),
  list(list(
    name = "binary_sequence",
    source = "synthetic binary data",
    data = list(sequence = runs_data),
    n = list(total = n_total_runs, ones = n1_runs, zeros = n0_runs),
    cases = list(list(
      description = "Runs test (z-approximation)",
      rCode = "Manual z = (R - mu_R) / sqrt(var_R)",
      expected = list(
        nRuns = list(value = runs_count, tier = "exact"),
        zStatistic = list(value = safe_num(z_runs), tier = "tier2"),
        pValue = list(value = safe_num(p_runs), tier = "tier2")
      )
    ))
  ))
)

# --- kolmogorov-smirnov ---
set.seed(123)
ks_data1 <- rnorm(50, mean = 0, sd = 1)
ks_data2 <- rnorm(50, mean = 0.5, sd = 1)
ks_two <- ks.test(ks_data1, ks_data2)
ks_one <- ks.test(ks_data1, "pnorm", mean(ks_data1), sd(ks_data1))

write_golden("kolmogorov-smirnov", "L2",
  list(software = "R", `function` = "stats::ks.test", packages = list("stats")),
  list(list(
    name = "two_sample_normal",
    source = "synthetic normal data (seed=123)",
    data = list(sample1 = ks_data1, sample2 = ks_data2),
    n = list(n1 = 50, n2 = 50),
    cases = list(
      list(
        description = "Two-sample KS test",
        rCode = "ks.test(data1, data2)",
        expected = list(
          statistic = list(value = safe_num(ks_two$statistic), tier = "tier2"),
          pValue = list(value = safe_num(ks_two$p.value), tier = "tier2")
        )
      ),
      list(
        description = "One-sample KS test (normality)",
        rCode = "ks.test(data1, 'pnorm', mean(data1), sd(data1))",
        expected = list(
          statistic = list(value = safe_num(ks_one$statistic), tier = "tier2"),
          pValue = list(value = safe_num(ks_one$p.value), tier = "tier2")
        )
      )
    )
  ))
)

# --- mood-median ---
mood_g1 <- c(2, 3, 4, 5, 6)
mood_g2 <- c(7, 8, 9, 10, 11)
mood_g3 <- c(4, 5, 6, 7, 8)
all_mood <- c(mood_g1, mood_g2, mood_g3)
grand_median <- median(all_mood)
group_factor <- factor(rep(1:3, each = 5))
# Manual median test (chi-square on above/below median)
above <- tapply(all_mood > grand_median, group_factor, sum)
below <- tapply(all_mood <= grand_median, group_factor, sum)
mood_table <- rbind(above, below)
mood_chi <- chisq.test(mood_table, correct = FALSE)

write_golden("mood-median", "L2",
  list(software = "R", `function` = "manual median test (chisq)", packages = list("stats")),
  list(list(
    name = "three_groups",
    source = "synthetic three-group data",
    data = list(g1 = mood_g1, g2 = mood_g2, g3 = mood_g3),
    n = list(g1 = 5, g2 = 5, g3 = 5),
    cases = list(list(
      description = "Mood's median test (3 groups)",
      rCode = "chisq.test(contingency of above/below grand median, correct=FALSE)",
      expected = list(
        chiSquare = list(value = safe_num(mood_chi$statistic), tier = "tier2"),
        pValue = list(value = safe_num(mood_chi$p.value), tier = "tier2"),
        grandMedian = list(value = safe_num(grand_median), tier = "tier2")
      )
    ))
  ))
)

# =============================================================================
# SECTION 4: CORRELATION (2 methods)
# =============================================================================
cat("\n=== CORRELATION ===\n")

# --- pearson-correlation (includes Spearman + Kendall) ---
cor_x <- c(10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38)
cor_y <- c(22.1, 24.5, 27.2, 28.8, 31.4, 33.9, 35.6, 38.2, 39.5, 42.1, 44.3, 46.8, 48.2, 50.9, 53.1)

pear <- cor.test(cor_x, cor_y, method = "pearson")
spear <- cor.test(cor_x, cor_y, method = "spearman", exact = FALSE)
kend <- cor.test(cor_x, cor_y, method = "kendall")

write_golden("pearson-correlation", "L2",
  list(software = "R", `function` = "stats::cor.test", packages = list("stats")),
  list(list(
    name = "weight_length_correlation",
    source = "synthetic bivariate data",
    data = list(x = cor_x, y = cor_y),
    n = list(total = length(cor_x)),
    cases = list(
      list(
        description = "Pearson correlation",
        rCode = "cor.test(x, y, method='pearson')",
        expected = list(
          r = list(value = safe_num(pear$estimate), tier = "tier2"),
          tStatistic = list(value = safe_num(pear$statistic), tier = "tier2"),
          pValue = list(value = safe_num(pear$p.value), tier = "tier2"),
          ci95Lower = list(value = safe_num(pear$conf.int[1]), tier = "tier3"),
          ci95Upper = list(value = safe_num(pear$conf.int[2]), tier = "tier3"),
          df = list(value = safe_num(pear$parameter), tier = "exact")
        )
      ),
      list(
        description = "Spearman correlation",
        rCode = "cor.test(x, y, method='spearman', exact=FALSE)",
        expected = list(
          rho = list(value = safe_num(spear$estimate), tier = "tier2"),
          sStatistic = list(value = safe_num(spear$statistic), tier = "tier2"),
          pValue = list(value = safe_num(spear$p.value), tier = "tier2")
        )
      ),
      list(
        description = "Kendall correlation",
        rCode = "cor.test(x, y, method='kendall')",
        expected = list(
          tau = list(value = safe_num(kend$estimate), tier = "tier2"),
          zStatistic = list(value = safe_num(kend$statistic), tier = "tier2"),
          pValue = list(value = safe_num(kend$p.value), tier = "tier2")
        )
      )
    )
  ))
)

# --- partial-correlation ---
library(ppcor)
pc_data <- mtcars[, c("mpg", "wt", "hp")]
pc_result <- ppcor::pcor(pc_data)

write_golden("partial-correlation", "L2",
  list(software = "R", `function` = "ppcor::pcor", packages = list("ppcor")),
  list(list(
    name = "mtcars_mpg_wt_hp",
    source = "R datasets::mtcars",
    data = list(
      mpg = mtcars$mpg,
      wt = mtcars$wt,
      hp = mtcars$hp
    ),
    n = list(total = nrow(mtcars)),
    cases = list(list(
      description = "Partial correlation (mpg-wt controlling hp)",
      rCode = "ppcor::pcor(mtcars[, c('mpg', 'wt', 'hp')])",
      expected = list(
        partialR_mpg_wt = list(value = safe_num(pc_result$estimate[1, 2]), tier = "tier2"),
        pValue_mpg_wt = list(value = safe_num(pc_result$p.value[1, 2]), tier = "tier2"),
        partialR_mpg_hp = list(value = safe_num(pc_result$estimate[1, 3]), tier = "tier2"),
        pValue_mpg_hp = list(value = safe_num(pc_result$p.value[1, 3]), tier = "tier2"),
        df = list(value = safe_num(pc_result$n - 2 - 1), tier = "exact")
      )
    ))
  ))
)

# =============================================================================
# SECTION 5: REGRESSION (7 methods)
# =============================================================================
cat("\n=== REGRESSION ===\n")

# --- simple-regression ---
reg_x <- c(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15)
reg_y <- c(2.3, 4.1, 6.5, 7.9, 10.3, 12.1, 14.5, 15.9, 18.2, 20.1, 22.4, 24.0, 26.3, 28.1, 30.5)
lm_simple <- lm(reg_y ~ reg_x)
lm_sum <- summary(lm_simple)

write_golden("simple-regression", "L1+L2",
  list(software = "R", `function` = "stats::lm", packages = list("stats")),
  list(list(
    name = "linear_data",
    source = "synthetic linear data",
    data = list(x = reg_x, y = reg_y),
    n = list(total = length(reg_x)),
    cases = list(list(
      description = "Simple linear regression",
      rCode = "summary(lm(y ~ x))",
      expected = list(
        intercept = list(value = safe_num(coef(lm_simple)[1]), tier = "tier2"),
        slope = list(value = safe_num(coef(lm_simple)[2]), tier = "tier2"),
        rSquared = list(value = safe_num(lm_sum$r.squared), tier = "tier2"),
        adjRSquared = list(value = safe_num(lm_sum$adj.r.squared), tier = "tier2"),
        fStatistic = list(value = safe_num(lm_sum$fstatistic[1]), tier = "tier2"),
        pValue = list(value = safe_num(pf(lm_sum$fstatistic[1], lm_sum$fstatistic[2], lm_sum$fstatistic[3], lower.tail = FALSE)), tier = "tier2"),
        residualSE = list(value = safe_num(lm_sum$sigma), tier = "tier2")
      )
    ))
  ))
)

# --- logistic-regression ---
set.seed(42)
log_x <- rnorm(100)
log_prob <- 1 / (1 + exp(-(0.5 + 1.2 * log_x)))
log_y <- rbinom(100, 1, log_prob)
log_fit <- glm(log_y ~ log_x, family = binomial(link = "logit"))
log_sum <- summary(log_fit)

write_golden("logistic-regression", "L2",
  list(software = "R", `function` = "stats::glm", packages = list("stats")),
  list(list(
    name = "binary_outcome",
    source = "synthetic binary data (seed=42)",
    data = list(x = log_x, y = log_y),
    n = list(total = 100),
    cases = list(list(
      description = "Logistic regression (y ~ x)",
      rCode = "glm(y ~ x, family=binomial(link='logit'))",
      expected = list(
        interceptCoef = list(value = safe_num(coef(log_fit)[1]), tier = "tier3"),
        slopeCoef = list(value = safe_num(coef(log_fit)[2]), tier = "tier3"),
        interceptPValue = list(value = safe_num(log_sum$coefficients[1, 4]), tier = "tier2"),
        slopePValue = list(value = safe_num(log_sum$coefficients[2, 4]), tier = "tier2"),
        interceptOR = list(value = safe_num(exp(coef(log_fit)[1])), tier = "tier3"),
        slopeOR = list(value = safe_num(exp(coef(log_fit)[2])), tier = "tier3"),
        aic = list(value = safe_num(log_fit$aic), tier = "tier3")
      )
    ))
  ))
)

# --- poisson-regression ---
pois_fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)
pois_sum <- summary(pois_fit)

write_golden("poisson-regression", "L2",
  list(software = "R", `function` = "stats::glm(poisson)", packages = list("stats")),
  list(list(
    name = "warpbreaks",
    source = "R datasets::warpbreaks",
    data = list(
      breaks = warpbreaks$breaks,
      wool = as.character(warpbreaks$wool),
      tension = as.character(warpbreaks$tension)
    ),
    n = list(total = nrow(warpbreaks)),
    cases = list(list(
      description = "Poisson regression (breaks ~ wool + tension)",
      rCode = "glm(breaks ~ wool + tension, family=poisson, data=warpbreaks)",
      expected = list(
        interceptCoef = list(value = safe_num(coef(pois_fit)[1]), tier = "tier3"),
        woolBCoef = list(value = safe_num(coef(pois_fit)[2]), tier = "tier3"),
        tensionMCoef = list(value = safe_num(coef(pois_fit)[3]), tier = "tier3"),
        tensionHCoef = list(value = safe_num(coef(pois_fit)[4]), tier = "tier3"),
        deviance = list(value = safe_num(pois_fit$deviance), tier = "tier3"),
        aic = list(value = safe_num(pois_fit$aic), tier = "tier3")
      )
    ))
  ))
)

# --- ordinal-regression ---
library(MASS)
set.seed(42)
ord_x <- rnorm(80)
ord_y <- ordered(cut(0.5 + ord_x + rnorm(80, 0, 0.5), breaks = c(-Inf, -0.5, 0.5, 1.5, Inf), labels = c("low", "medium", "high", "very_high")))
ord_fit <- polr(ord_y ~ ord_x, method = "logistic")
ord_sum <- summary(ord_fit)

write_golden("ordinal-regression", "L2",
  list(software = "R", `function` = "MASS::polr", packages = list("MASS")),
  list(list(
    name = "ordinal_outcome",
    source = "synthetic ordinal data (seed=42)",
    data = list(x = ord_x, y = as.character(ord_y)),
    n = list(total = 80),
    cases = list(list(
      description = "Ordinal logistic regression",
      rCode = "MASS::polr(y ~ x, method='logistic')",
      expected = list(
        slopeCoef = list(value = safe_num(ord_sum$coefficients[1, 1]), tier = "tier3"),
        aic = list(value = safe_num(ord_fit$deviance + 2 * (length(coef(ord_fit)) + length(ord_fit$zeta))), tier = "tier3")
      )
    ))
  ))
)

# --- stepwise-regression ---
step_fit <- step(lm(mpg ~ ., data = mtcars), direction = "both", trace = 0)
step_sum <- summary(step_fit)

write_golden("stepwise-regression", "L2",
  list(software = "R", `function` = "stats::step", packages = list("stats")),
  list(list(
    name = "mtcars_stepwise",
    source = "R datasets::mtcars",
    n = list(total = nrow(mtcars)),
    cases = list(list(
      description = "Stepwise regression (AIC-based, both directions)",
      rCode = "step(lm(mpg ~ ., data=mtcars), direction='both')",
      expected = list(
        finalR2 = list(value = safe_num(step_sum$r.squared), tier = "tier3"),
        finalAdjR2 = list(value = safe_num(step_sum$adj.r.squared), tier = "tier3"),
        finalAIC = list(value = safe_num(AIC(step_fit)), tier = "tier3"),
        selectedVarCount = list(value = length(coef(step_fit)) - 1, tier = "exact"),
        selectedVars = list(value = names(coef(step_fit))[-1], tier = "exact")
      )
    ))
  ))
)

# --- dose-response ---
library(drc)
dr_fit <- drm(rootl ~ conc, data = ryegrass, fct = LL.4())
dr_sum <- summary(dr_fit)
dr_coefs <- coef(dr_fit)

write_golden("dose-response", "L2",
  list(software = "R", `function` = "drc::drm", packages = list("drc")),
  list(list(
    name = "ryegrass",
    source = "drc::ryegrass",
    data = list(
      dose = ryegrass$conc,
      response = ryegrass$rootl
    ),
    n = list(total = nrow(ryegrass)),
    cases = list(list(
      description = "4-parameter log-logistic dose-response",
      rCode = "drc::drm(rootl ~ conc, data=ryegrass, fct=LL.4())",
      expected = list(
        hillSlope = list(value = safe_num(dr_coefs[1]), tier = "tier4"),
        bottom = list(value = safe_num(dr_coefs[2]), tier = "tier4"),
        top = list(value = safe_num(dr_coefs[3]), tier = "tier4"),
        ec50 = list(value = safe_num(dr_coefs[4]), tier = "tier4")
      )
    ))
  ))
)

# --- response-surface ---
if (requireNamespace("rsm", quietly = TRUE)) {
  library(rsm)
  cr_data <- ChemReact
  rsm_fit <- rsm(Yield ~ SO(Time, Temp), data = cr_data)
  # rsm objects inherit from lm — use summary() directly
  rsm_lm_sum <- summary.lm(rsm_fit)

  write_golden("response-surface", "L2",
    list(software = "R", `function` = "rsm::rsm", packages = list("rsm")),
    list(list(
      name = "ChemReact",
      source = "rsm::ChemReact",
      n = list(total = nrow(cr_data)),
      cases = list(list(
        description = "Response surface model (Yield ~ SO(Time, Temp))",
        rCode = "rsm::rsm(Yield ~ SO(Time, Temp), data=ChemReact)",
        expected = list(
          rSquared = list(value = safe_num(rsm_lm_sum$r.squared), tier = "tier3"),
          fStatistic = list(value = safe_num(rsm_lm_sum$fstatistic[1]), tier = "tier2"),
          pValue = list(value = safe_num(pf(rsm_lm_sum$fstatistic[1],
            rsm_lm_sum$fstatistic[2],
            rsm_lm_sum$fstatistic[3], lower.tail = FALSE)), tier = "tier2")
        )
      ))
    ))
  )
} else {
  cat("[SKIP] response-surface — rsm package not available\n")
}

# =============================================================================
# SECTION 6: CHI-SQUARE (2 methods)
# =============================================================================
cat("\n=== CHI-SQUARE ===\n")

# --- chi-square-goodness ---
observed_freq <- c(30, 25, 20, 15, 10)
expected_prop <- rep(1/5, 5)
csg <- chisq.test(observed_freq, p = expected_prop)

write_golden("chi-square-goodness", "L2",
  list(software = "R", `function` = "stats::chisq.test", packages = list("stats")),
  list(list(
    name = "frequency_distribution",
    source = "synthetic frequency data",
    data = list(observed = observed_freq, expectedProportions = expected_prop),
    n = list(total = sum(observed_freq)),
    cases = list(list(
      description = "Chi-square goodness of fit (uniform expected)",
      rCode = "chisq.test(observed, p=rep(1/5, 5))",
      expected = list(
        chiSquare = list(value = safe_num(csg$statistic), tier = "tier2"),
        pValue = list(value = safe_num(csg$p.value), tier = "tier2"),
        df = list(value = safe_num(csg$parameter), tier = "exact")
      )
    ))
  ))
)

# --- chi-square-independence ---
chi_matrix <- matrix(c(40, 30, 20, 10, 15, 35, 25, 25, 20, 20, 30, 30), nrow = 3, byrow = TRUE)
csi <- chisq.test(chi_matrix, correct = FALSE)
n_chi <- sum(chi_matrix)
min_dim <- min(nrow(chi_matrix), ncol(chi_matrix))
cramers_v <- sqrt(csi$statistic / (n_chi * (min_dim - 1)))

write_golden("chi-square-independence", "L2",
  list(software = "R", `function` = "stats::chisq.test", packages = list("stats")),
  list(list(
    name = "contingency_table",
    source = "synthetic contingency table",
    data = list(observedMatrix = list(c(40, 30, 20, 10), c(15, 35, 25, 25), c(20, 20, 30, 30))),
    n = list(total = n_chi),
    cases = list(list(
      description = "Chi-square independence test (no Yates correction)",
      rCode = "chisq.test(matrix, correct=FALSE)",
      expected = list(
        chiSquare = list(value = safe_num(csi$statistic), tier = "tier2"),
        pValue = list(value = safe_num(csi$p.value), tier = "tier2"),
        degreesOfFreedom = list(value = safe_num(csi$parameter), tier = "exact"),
        cramersV = list(value = safe_num(cramers_v), tier = "tier2")
      )
    ))
  ))
)

# =============================================================================
# SECTION 7: TIME SERIES (4 methods)
# =============================================================================
cat("\n=== TIME SERIES ===\n")

# --- arima ---
ap <- as.numeric(AirPassengers)
arima_fit <- arima(ap, order = c(1, 1, 1))
arima_forecast <- predict(arima_fit, n.ahead = 5)

write_golden("arima", "L2",
  list(software = "R", `function` = "stats::arima", packages = list("stats")),
  list(list(
    name = "AirPassengers",
    source = "R datasets::AirPassengers",
    data = list(values = ap),
    n = list(total = length(ap)),
    cases = list(list(
      description = "ARIMA(1,1,1) on AirPassengers",
      rCode = "arima(AirPassengers, order=c(1,1,1))",
      expected = list(
        ar1 = list(value = safe_num(coef(arima_fit)["ar1"]), tier = "tier3"),
        ma1 = list(value = safe_num(coef(arima_fit)["ma1"]), tier = "tier3"),
        aic = list(value = safe_num(arima_fit$aic), tier = "tier3"),
        forecast5 = list(value = as.numeric(arima_forecast$pred), tier = "tier4")
      )
    ))
  ))
)

# --- seasonal-decompose ---
ap_ts <- ts(ap, frequency = 12)
decomp <- decompose(ap_ts, type = "additive")
# Take the first 12 seasonal values and trend at midpoint
seasonal_values <- as.numeric(decomp$seasonal[1:12])
trend_mid <- as.numeric(decomp$trend[72])  # midpoint

write_golden("seasonal-decompose", "L2",
  list(software = "R", `function` = "stats::decompose", packages = list("stats")),
  list(list(
    name = "AirPassengers_decompose",
    source = "R datasets::AirPassengers",
    n = list(total = length(ap)),
    cases = list(list(
      description = "Additive decomposition (period=12)",
      rCode = "decompose(ts(AirPassengers, frequency=12), type='additive')",
      expected = list(
        seasonalPattern = list(value = seasonal_values, tier = "tier3"),
        trendMidpoint = list(value = safe_num(trend_mid), tier = "tier3")
      )
    ))
  ))
)

# --- stationarity-test ---
library(tseries)
nile_adf <- adf.test(Nile)

write_golden("stationarity-test", "L2",
  list(software = "R", `function` = "tseries::adf.test", packages = list("tseries")),
  list(list(
    name = "Nile",
    source = "R datasets::Nile",
    data = list(values = as.numeric(Nile)),
    n = list(total = length(Nile)),
    cases = list(list(
      description = "Augmented Dickey-Fuller test on Nile",
      rCode = "tseries::adf.test(Nile)",
      expected = list(
        adfStatistic = list(value = safe_num(nile_adf$statistic), tier = "tier2"),
        pValue = list(value = safe_num(nile_adf$p.value), tier = "tier2"),
        usedLag = list(value = safe_num(nile_adf$parameter), tier = "exact")
      )
    ))
  ))
)

# --- mann-kendall-test ---
library(trend)
env_data <- c(12.3, 12.8, 13.1, 13.5, 14.0, 14.2, 14.8, 15.1, 15.5, 16.0,
              16.3, 16.8, 17.1, 17.5, 18.0, 18.3, 18.8, 19.1, 19.5, 20.0)
mk <- mk.test(env_data)
# Sen's slope (manual for golden value)
n_mk <- length(env_data)
slopes_mk <- c()
for (i in 1:(n_mk-1)) {
  for (j in (i+1):n_mk) {
    slopes_mk <- c(slopes_mk, (env_data[j] - env_data[i]) / (j - i))
  }
}
sen_slope <- median(slopes_mk)

write_golden("mann-kendall-test", "L2",
  list(software = "R", `function` = "trend::mk.test", packages = list("trend")),
  list(list(
    name = "environmental_trend",
    source = "synthetic increasing environmental data",
    data = list(values = env_data),
    n = list(total = length(env_data)),
    cases = list(list(
      description = "Mann-Kendall trend test",
      rCode = "trend::mk.test(data)",
      expected = list(
        zStatistic = list(value = safe_num(mk$statistic), tier = "tier2"),
        pValue = list(value = safe_num(mk$p.value), tier = "tier2"),
        sScore = list(value = safe_num(mk$parameter["S"]), tier = "exact"),
        tau = list(value = safe_num(cor(1:n_mk, env_data, method = "kendall")), tier = "tier2"),
        senSlope = list(value = safe_num(sen_slope), tier = "tier3")
      )
    ))
  ))
)

# =============================================================================
# SECTION 8: SURVIVAL (2 methods) + ROC
# =============================================================================
cat("\n=== SURVIVAL & ROC ===\n")

library(survival)

# --- kaplan-meier ---
surv_data <- data.frame(
  time = c(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 3, 5, 7, 9, 2, 4, 6, 8, 10),
  status = c(1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1),
  group = factor(rep(c("A", "B"), each = 10))
)
km_fit <- survfit(Surv(time, status) ~ group, data = surv_data)
lr <- survdiff(Surv(time, status) ~ group, data = surv_data)

write_golden("kaplan-meier", "L2",
  list(software = "R", `function` = "survival::survfit", packages = list("survival")),
  list(list(
    name = "two_group_survival",
    source = "synthetic survival data",
    data = list(
      time = surv_data$time,
      status = surv_data$status,
      group = as.character(surv_data$group)
    ),
    n = list(groupA = 10, groupB = 10),
    cases = list(list(
      description = "Kaplan-Meier + log-rank test (2 groups)",
      rCode = "survfit(Surv(time, status) ~ group); survdiff(Surv(time, status) ~ group)",
      expected = list(
        logRankStatistic = list(value = safe_num(lr$chisq), tier = "tier2"),
        logRankPValue = list(value = safe_num(1 - pchisq(lr$chisq, 1)), tier = "tier2"),
        medianA = list(value = safe_num(summary(km_fit)$table["group=A", "median"]), tier = "tier2"),
        medianB = list(value = safe_num(summary(km_fit)$table["group=B", "median"]), tier = "tier2")
      )
    ))
  ))
)

# --- cox-regression ---
cox_data <- data.frame(
  time = c(4, 3, 1, 1, 2, 2, 3, 5, 4, 6, 2, 4, 6, 3, 5, 7, 6, 8, 5, 9),
  status = c(1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0),
  age = c(50, 60, 70, 55, 65, 45, 50, 40, 55, 60, 70, 65, 50, 55, 45, 40, 60, 50, 55, 45),
  treatment = c(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
)
cox_fit <- coxph(Surv(time, status) ~ age + treatment, data = cox_data)
cox_sum <- summary(cox_fit)

write_golden("cox-regression", "L2",
  list(software = "R", `function` = "survival::coxph", packages = list("survival")),
  list(list(
    name = "two_predictor_survival",
    source = "synthetic survival data with covariates",
    data = list(
      time = cox_data$time,
      status = cox_data$status,
      age = cox_data$age,
      treatment = cox_data$treatment
    ),
    n = list(total = 20),
    cases = list(list(
      description = "Cox proportional hazards (age + treatment)",
      rCode = "coxph(Surv(time, status) ~ age + treatment, data=d)",
      expected = list(
        ageCoef = list(value = safe_num(coef(cox_fit)["age"]), tier = "tier3"),
        treatmentCoef = list(value = safe_num(coef(cox_fit)["treatment"]), tier = "tier3"),
        ageHR = list(value = safe_num(exp(coef(cox_fit)["age"])), tier = "tier3"),
        treatmentHR = list(value = safe_num(exp(coef(cox_fit)["treatment"])), tier = "tier3"),
        agePValue = list(value = safe_num(cox_sum$coefficients["age", "Pr(>|z|)"]), tier = "tier2"),
        treatmentPValue = list(value = safe_num(cox_sum$coefficients["treatment", "Pr(>|z|)"]), tier = "tier2"),
        concordance = list(value = safe_num(cox_sum$concordance[1]), tier = "tier3")
      )
    ))
  ))
)

# --- roc-curve ---
library(pROC)
set.seed(42)
roc_actual <- c(rep(0, 50), rep(1, 50))
roc_scores <- c(rnorm(50, 0.3, 0.2), rnorm(50, 0.7, 0.2))
roc_obj <- roc(roc_actual, roc_scores, direction = "<", quiet = TRUE)
roc_best <- coords(roc_obj, "best", ret = c("threshold", "sensitivity", "specificity"))

write_golden("roc-curve", "L2",
  list(software = "R", `function` = "pROC::roc", packages = list("pROC")),
  list(list(
    name = "binary_classifier",
    source = "synthetic classification scores (seed=42)",
    data = list(actual = roc_actual, scores = roc_scores),
    n = list(positive = 50, negative = 50),
    cases = list(list(
      description = "ROC curve + AUC",
      rCode = "pROC::roc(actual, scores, direction='<')",
      expected = list(
        auc = list(value = safe_num(auc(roc_obj)), tier = "tier2"),
        optimalThreshold = list(value = safe_num(roc_best$threshold), tier = "tier3"),
        sensitivity = list(value = safe_num(roc_best$sensitivity), tier = "tier2"),
        specificity = list(value = safe_num(roc_best$specificity), tier = "tier2")
      )
    ))
  ))
)

# =============================================================================
# SECTION 9: MULTIVARIATE (3 methods)
# =============================================================================
cat("\n=== MULTIVARIATE ===\n")

# --- pca ---
iris_num <- iris[, 1:4]
pca_fit <- prcomp(iris_num, center = TRUE, scale. = TRUE)
pca_sum <- summary(pca_fit)

write_golden("pca", "L2",
  list(software = "R", `function` = "stats::prcomp", packages = list("stats")),
  list(list(
    name = "iris_pca",
    source = "R datasets::iris (numeric columns)",
    n = list(total = 150, variables = 4),
    cases = list(list(
      description = "PCA (centered + scaled)",
      rCode = "prcomp(iris[,1:4], center=TRUE, scale.=TRUE)",
      expected = list(
        explainedVarianceRatio = list(
          value = as.numeric(pca_sum$importance[2, ]),
          tier = "tier3"
        ),
        cumulativeVariance = list(
          value = as.numeric(pca_sum$importance[3, ]),
          tier = "tier3"
        ),
        pc1Loadings = list(
          value = as.numeric(pca_fit$rotation[, 1]),
          tier = "tier4"
        )
      )
    ))
  ))
)

# --- factor-analysis ---
library(psych)
fa_data <- iris[, 1:4]
fa_fit <- fa(fa_data, nfactors = 2, rotate = "varimax", fm = "pa")

write_golden("factor-analysis", "L2",
  list(software = "R", `function` = "psych::fa", packages = list("psych")),
  list(list(
    name = "iris_fa",
    source = "R datasets::iris (numeric columns)",
    n = list(total = 150, variables = 4),
    cases = list(list(
      description = "Factor analysis (2 factors, varimax, principal axis)",
      rCode = "psych::fa(iris[,1:4], nfactors=2, rotate='varimax', fm='pa')",
      expected = list(
        communalities = list(value = as.numeric(fa_fit$communality), tier = "tier3"),
        varianceExplained = list(value = as.numeric(fa_fit$Vaccounted[2, ]), tier = "tier3")
      )
    ))
  ))
)

# --- cluster ---
set.seed(42)
iris_scaled <- scale(iris[, 1:4])
km_fit_iris <- kmeans(iris_scaled, centers = 3, nstart = 25)

write_golden("cluster", "L2",
  list(software = "R", `function` = "stats::kmeans", packages = list("stats")),
  list(list(
    name = "iris_kmeans",
    source = "R datasets::iris (scaled)",
    n = list(total = 150, variables = 4, clusters = 3),
    cases = list(list(
      description = "K-means (k=3, nstart=25, seed=42)",
      rCode = "set.seed(42); kmeans(scale(iris[,1:4]), centers=3, nstart=25)",
      expected = list(
        withinSS = list(value = safe_num(km_fit_iris$tot.withinss), tier = "tier3"),
        betweenSS = list(value = safe_num(km_fit_iris$betweenss), tier = "tier3"),
        clusterSizes = list(value = as.numeric(km_fit_iris$size), tier = "exact")
      )
    ))
  ))
)

# --- discriminant-analysis ---
# MASS already loaded above (ordinal-regression section)
lda_fit <- lda(Species ~ ., data = iris)
lda_pred <- predict(lda_fit)
lda_accuracy <- mean(lda_pred$class == iris$Species)

write_golden("discriminant-analysis", "L2",
  list(software = "R", `function` = "MASS::lda", packages = list("MASS")),
  list(list(
    name = "iris_lda",
    source = "R datasets::iris",
    n = list(total = 150),
    cases = list(list(
      description = "Linear discriminant analysis",
      rCode = "MASS::lda(Species ~ ., data=iris)",
      expected = list(
        accuracy = list(value = safe_num(lda_accuracy), tier = "tier3"),
        priorSetosa = list(value = safe_num(lda_fit$prior["setosa"]), tier = "tier3"),
        priorVersicolor = list(value = safe_num(lda_fit$prior["versicolor"]), tier = "tier3"),
        priorVirginica = list(value = safe_num(lda_fit$prior["virginica"]), tier = "tier3")
      )
    ))
  ))
)

# =============================================================================
# SECTION 10: DIAGNOSTIC & OTHER (3 methods)
# =============================================================================
cat("\n=== DIAGNOSTIC & OTHER ===\n")

# --- normality-test ---
norm_data <- c(4.5, 5.2, 4.8, 5.1, 4.9, 5.3, 5.0, 4.7, 5.4, 4.6,
               5.2, 4.8, 5.1, 4.9, 5.3, 5.0, 4.7, 5.4, 4.6, 5.1)
sw <- shapiro.test(norm_data)

write_golden("normality-test", "L2",
  list(software = "R", `function` = "stats::shapiro.test", packages = list("stats")),
  list(list(
    name = "normal_sample",
    source = "synthetic near-normal data",
    data = list(values = norm_data),
    n = list(total = length(norm_data)),
    cases = list(list(
      description = "Shapiro-Wilk normality test",
      rCode = "shapiro.test(data)",
      expected = list(
        statistic = list(value = safe_num(sw$statistic), tier = "tier2"),
        pValue = list(value = safe_num(sw$p.value), tier = "tier2")
      )
    ))
  ))
)

# --- one-sample-proportion (different parameters from binomial-test) ---
prop_bt <- binom.test(72, 200, p = 0.4)
write_golden("one-sample-proportion", "L2",
  list(software = "R", `function` = "stats::binom.test", packages = list("stats")),
  list(list(
    name = "proportion_test",
    source = "synthetic count data (different from binomial-test)",
    n = list(successes = 72, total = 200),
    cases = list(list(
      description = "One-sample proportion test (exact binomial, H0: p=0.4)",
      rCode = "binom.test(72, 200, p=0.4)",
      expected = list(
        pValue = list(value = safe_num(prop_bt$p.value), tier = "tier2"),
        proportion = list(value = safe_num(prop_bt$estimate), tier = "tier2"),
        ci95Lower = list(value = safe_num(prop_bt$conf.int[1]), tier = "tier3"),
        ci95Upper = list(value = safe_num(prop_bt$conf.int[2]), tier = "tier3")
      )
    ))
  ))
)

# --- reliability-analysis ---
library(psych)
set.seed(42)
likert_data <- data.frame(
  item1 = sample(1:5, 50, replace = TRUE),
  item2 = sample(1:5, 50, replace = TRUE),
  item3 = sample(1:5, 50, replace = TRUE),
  item4 = sample(1:5, 50, replace = TRUE),
  item5 = sample(1:5, 50, replace = TRUE)
)
alpha_result <- psych::alpha(likert_data)

write_golden("reliability-analysis", "L2",
  list(software = "R", `function` = "psych::alpha", packages = list("psych")),
  list(list(
    name = "likert_scale",
    source = "synthetic Likert data (seed=42)",
    data = list(
      item1 = likert_data$item1,
      item2 = likert_data$item2,
      item3 = likert_data$item3,
      item4 = likert_data$item4,
      item5 = likert_data$item5
    ),
    n = list(respondents = 50, items = 5),
    cases = list(list(
      description = "Cronbach's alpha",
      rCode = "psych::alpha(items)",
      expected = list(
        cronbachAlpha = list(value = safe_num(alpha_result$total$raw_alpha), tier = "tier2"),
        nItems = list(value = 5, tier = "exact")
      )
    ))
  ))
)

# =============================================================================
# SECTION 11: DATA TOOLS (4 methods)
# =============================================================================
cat("\n=== DATA TOOLS ===\n")

# --- descriptive-stats ---
iris_sl <- iris$Sepal.Length
desc_mean <- mean(iris_sl)
desc_sd <- sd(iris_sl)
desc_median <- median(iris_sl)
desc_skew <- psych::skew(iris_sl)
desc_kurt <- psych::kurtosi(iris_sl)
desc_sem <- sd(iris_sl) / sqrt(length(iris_sl))

write_golden("descriptive-stats", "L2",
  list(software = "R", `function` = "base + psych", packages = list("stats", "psych")),
  list(list(
    name = "iris_sepal_length",
    source = "R datasets::iris$Sepal.Length",
    data = list(values = iris_sl),
    n = list(total = length(iris_sl)),
    cases = list(list(
      description = "Descriptive statistics for iris Sepal.Length",
      rCode = "mean, sd, median, skew, kurtosis, sem",
      expected = list(
        mean = list(value = safe_num(desc_mean), tier = "tier2"),
        sd = list(value = safe_num(desc_sd), tier = "tier2"),
        median = list(value = safe_num(desc_median), tier = "tier2"),
        skewness = list(value = safe_num(desc_skew), tier = "tier2"),
        kurtosis = list(value = safe_num(desc_kurt), tier = "tier2"),
        sem = list(value = safe_num(desc_sem), tier = "tier2"),
        n = list(value = length(iris_sl), tier = "exact")
      )
    ))
  ))
)

# --- explore-data ---
iris_sl_shapiro <- shapiro.test(iris_sl)
iris_sl_iqr <- IQR(iris_sl)
iris_sl_q1 <- quantile(iris_sl, 0.25)
iris_sl_q3 <- quantile(iris_sl, 0.75)
iris_sl_outliers <- sum(iris_sl < (iris_sl_q1 - 1.5 * iris_sl_iqr) |
                        iris_sl > (iris_sl_q3 + 1.5 * iris_sl_iqr))

write_golden("explore-data", "L2",
  list(software = "R", `function` = "base + stats", packages = list("stats")),
  list(list(
    name = "iris_sepal_length_explore",
    source = "R datasets::iris$Sepal.Length",
    n = list(total = length(iris_sl)),
    cases = list(list(
      description = "Data exploration (descriptives + normality + outliers)",
      rCode = "summary + shapiro.test + IQR outlier detection",
      expected = list(
        normalityPValue = list(value = safe_num(iris_sl_shapiro$p.value), tier = "tier2"),
        outlierCount = list(value = iris_sl_outliers, tier = "exact"),
        iqr = list(value = safe_num(iris_sl_iqr), tier = "tier2"),
        q1 = list(value = safe_num(iris_sl_q1), tier = "tier2"),
        q3 = list(value = safe_num(iris_sl_q3), tier = "tier2")
      )
    ))
  ))
)

# --- means-plot ---
iris_means <- tapply(iris$Sepal.Length, iris$Species, mean)
iris_sds <- tapply(iris$Sepal.Length, iris$Species, sd)
iris_ns <- tapply(iris$Sepal.Length, iris$Species, length)
iris_ses <- iris_sds / sqrt(iris_ns)
iris_ci_lower <- iris_means - qt(0.975, iris_ns - 1) * iris_ses
iris_ci_upper <- iris_means + qt(0.975, iris_ns - 1) * iris_ses

write_golden("means-plot", "L2",
  list(software = "R", `function` = "base::tapply + qt()", packages = list("stats")),
  list(list(
    name = "iris_species_means",
    source = "R datasets::iris",
    n = list(total = 150),
    cases = list(list(
      description = "Group means with 95% CI (Sepal.Length by Species)",
      rCode = "tapply(Sepal.Length, Species, mean); CI via t-distribution",
      expected = list(
        groupMeans = list(
          setosa = list(value = safe_num(iris_means["setosa"]), tier = "tier2"),
          versicolor = list(value = safe_num(iris_means["versicolor"]), tier = "tier2"),
          virginica = list(value = safe_num(iris_means["virginica"]), tier = "tier2")
        ),
        groupCILower = list(
          setosa = list(value = safe_num(iris_ci_lower["setosa"]), tier = "tier3"),
          versicolor = list(value = safe_num(iris_ci_lower["versicolor"]), tier = "tier3"),
          virginica = list(value = safe_num(iris_ci_lower["virginica"]), tier = "tier3")
        ),
        groupCIUpper = list(
          setosa = list(value = safe_num(iris_ci_upper["setosa"]), tier = "tier3"),
          versicolor = list(value = safe_num(iris_ci_upper["versicolor"]), tier = "tier3"),
          virginica = list(value = safe_num(iris_ci_upper["virginica"]), tier = "tier3")
        ),
        groupN = list(
          setosa = list(value = safe_num(iris_ns["setosa"]), tier = "exact"),
          versicolor = list(value = safe_num(iris_ns["versicolor"]), tier = "exact"),
          virginica = list(value = safe_num(iris_ns["virginica"]), tier = "exact")
        )
      )
    ))
  ))
)

# --- power-analysis ---
library(pwr)
pwr_t <- pwr.t.test(d = 0.5, sig.level = 0.05, power = 0.8, type = "two.sample")
pwr_anova <- pwr.anova.test(k = 3, f = 0.25, sig.level = 0.05, power = 0.8)
pwr_chi <- pwr.chisq.test(w = 0.3, df = 2, sig.level = 0.05, power = 0.8)

write_golden("power-analysis", "L2",
  list(software = "R", `function` = "pwr::pwr.*.test", packages = list("pwr")),
  list(list(
    name = "power_fixtures",
    source = "parameter fixtures",
    cases = list(
      list(
        description = "Power for two-sample t-test (d=0.5, alpha=0.05, power=0.8)",
        rCode = "pwr::pwr.t.test(d=0.5, sig.level=0.05, power=0.8, type='two.sample')",
        expected = list(
          requiredN = list(value = ceiling(pwr_t$n), tier = "exact"),
          exactN = list(value = safe_num(pwr_t$n), tier = "tier2")
        )
      ),
      list(
        description = "Power for one-way ANOVA (k=3, f=0.25, alpha=0.05, power=0.8)",
        rCode = "pwr::pwr.anova.test(k=3, f=0.25, sig.level=0.05, power=0.8)",
        expected = list(
          requiredN = list(value = ceiling(pwr_anova$n), tier = "exact"),
          exactN = list(value = safe_num(pwr_anova$n), tier = "tier2")
        )
      ),
      list(
        description = "Power for chi-square test (w=0.3, df=2, alpha=0.05, power=0.8)",
        rCode = "pwr::pwr.chisq.test(w=0.3, df=2, sig.level=0.05, power=0.8)",
        expected = list(
          requiredN = list(value = ceiling(pwr_chi$N), tier = "exact"),
          exactN = list(value = safe_num(pwr_chi$N), tier = "tier2")
        )
      )
    )
  ))
)

# =============================================================================
# NIST StRD Reference Values
# =============================================================================
cat("\n=== NIST StRD ===\n")

# --- NIST Norris (Linear Regression) ---
# Certified values from NIST StRD
# https://www.itl.nist.gov/div898/strd/lls/data/Norris.shtml
write_golden("nist-norris-linear", "L1",
  list(software = "NIST StRD", `function` = "Certified values", packages = list()),
  list(list(
    name = "Norris",
    source = "NIST StRD Linear Regression",
    url = "https://www.itl.nist.gov/div898/strd/lls/data/Norris.shtml",
    difficulty = "lower",
    cases = list(list(
      description = "Linear regression certified values",
      expected = list(
        intercept = list(value = -0.262323073774029, tier = "tier2"),
        slope = list(value = 1.00211681802045, tier = "tier2"),
        sdIntercept = list(value = 0.232818234301152, tier = "tier2"),
        sdSlope = list(value = 0.000429796848199937, tier = "tier2"),
        rSquared = list(value = 0.999993745883712, tier = "tier2"),
        residualSD = list(value = 0.884796396144373, tier = "tier2")
      )
    ))
  )),
  output_dir = nist_root
)

# --- NIST Pontius (Quadratic Regression) ---
write_golden("nist-pontius-quadratic", "L1",
  list(software = "NIST StRD", `function` = "Certified values", packages = list()),
  list(list(
    name = "Pontius",
    source = "NIST StRD Linear Regression",
    url = "https://www.itl.nist.gov/div898/strd/lls/data/Pontius.shtml",
    difficulty = "lower",
    cases = list(list(
      description = "Quadratic regression certified values",
      expected = list(
        b0 = list(value = 0.673565789473684e-03, tier = "tier2"),
        b1 = list(value = 0.732059160401003e-06, tier = "tier2"),
        b2 = list(value = -0.316081871345029e-14, tier = "tier2"),
        sdB0 = list(value = 0.107938612033077e-03, tier = "tier2"),
        sdB1 = list(value = 0.157817399981659e-09, tier = "tier2"),
        sdB2 = list(value = 0.486652849992036e-16, tier = "tier2"),
        residualSD = list(value = 0.205177424076185e-03, tier = "tier2")
      )
    ))
  )),
  output_dir = nist_root
)

# --- NIST AtmWtAg (ANOVA) ---
write_golden("nist-atmwtag-anova", "L1",
  list(software = "NIST StRD", `function` = "Certified values", packages = list()),
  list(list(
    name = "AtmWtAg",
    source = "NIST StRD ANOVA",
    url = "https://www.itl.nist.gov/div898/strd/anova/AtmWtAg.html",
    difficulty = "lower",
    cases = list(list(
      description = "One-way ANOVA certified values",
      expected = list(
        dfBetween = list(value = 1, tier = "exact"),
        dfWithin = list(value = 46, tier = "exact"),
        fStatistic = list(value = 1.59467335677930e+01, tier = "tier2"),
        ssBetween = list(value = 3.63834187500000e-09, tier = "tier2"),
        ssWithin = list(value = 1.04951729166667e-08, tier = "tier2"),
        msBetween = list(value = 3.63834187500000e-09, tier = "tier2"),
        msWithin = list(value = 2.28155932971014e-10, tier = "tier2"),
        rSquared = list(value = 2.57426544538321e-01, tier = "tier2"),
        residualSD = list(value = 1.51048314446410e-05, tier = "tier2")
      )
    ))
  )),
  output_dir = nist_root
)

# --- NIST Descriptive Statistics (StRD Univariate) ---
write_golden("nist-michelson-descriptive", "L1",
  list(software = "NIST StRD", `function` = "Certified values", packages = list()),
  list(list(
    name = "Michelson",
    source = "NIST StRD Univariate Summary Statistics",
    url = "https://www.itl.nist.gov/div898/strd/univ/Michelso.html",
    difficulty = "lower",
    cases = list(list(
      description = "Descriptive statistics certified values",
      expected = list(
        mean = list(value = 299.852400000000, tier = "tier2"),
        sd = list(value = 0.0790105478190518, tier = "tier2"),
        n = list(value = 100, tier = "exact")
      )
    ))
  )),
  output_dir = nist_root
)

# =============================================================================
# Summary
# =============================================================================
cat("\n============================\n")
cat("GENERATION COMPLETE\n")
cat("R reference files:", length(list.files(validation_root, pattern = "\\.json$")), "\n")
cat("NIST reference files:", length(list.files(nist_root, pattern = "\\.json$")), "\n")
cat("============================\n")
