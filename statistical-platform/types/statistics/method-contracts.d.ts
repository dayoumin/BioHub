export type CanonicalMethodId =
  | "calculateDescriptiveStats"
  | "normalityTest"
  | "homogeneityTest"
  | "oneSampleTTest"
  | "twoSampleTTest"
  | "pairedTTest"
  | "welchTTest"
  | "oneSampleProportionTest"
  | "oneWayANOVA"
  | "twoWayANOVA"
  | "manova"
  | "tukeyHSD"
  | "bonferroni"
  | "gamesHowell"
  | "simpleLinearRegression"
  | "multipleRegression"
  | "logisticRegression"
  | "correlationAnalysis"
  | "mannWhitneyU"
  | "wilcoxonSignedRank"
  | "kruskalWallis"
  | "dunnTest"
  | "chiSquareTest"
  | "pca"
  | "principalComponentAnalysis"
  | "kMeansClustering"
  | "hierarchicalClustering"
  | "timeSeriesDecomposition"
  | "arimaForecast"
  | "kaplanMeierSurvival"
  | "mixedEffectsModel"
  | "sarimaForecast"
  | "varModel"
  | "coxRegression"
  | "crosstabAnalysis"
  | "cronbachAlpha"

export type StatisticalMethodId =
  | CanonicalMethodId
  | "bonferroniPostHoc"
  | "gamesHowellPostHoc"

export type MethodIdMap = Record<StatisticalMethodId, CanonicalMethodId>

export type MethodParameterMap = {
  [K in CanonicalMethodId]: Record<string, unknown>
}

export type MethodResultMap = {
  [K in CanonicalMethodId]: unknown
}
