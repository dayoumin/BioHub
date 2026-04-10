/**
 * 코드 템플릿 레지스트리
 *
 * methodId → { R, python } 매핑.
 * 지원하지 않는 메서드는 null 반환.
 */

import type { CodeLanguage, CodeTemplate, CodeTemplatePair } from '../code-template-types'
import { getMethodByIdOrAlias } from '@/lib/constants/statistical-methods'

import { tTestR, tTestPython, pairedTR, pairedTPython, oneSampleTR, oneSampleTPython } from './t-test'
import { anovaR, anovaPython } from './anova'
import { correlationR, correlationPython } from './correlation'
import { regressionR, regressionPython } from './regression'
import { mannWhitneyR, mannWhitneyPython, wilcoxonR, wilcoxonPython, kruskalWallisR, kruskalWallisPython } from './nonparametric'
import { chiSquareIndependenceR, chiSquareIndependencePython, chiSquareGoodnessR, chiSquareGoodnessPython } from './chi-square'
import { normalityR, normalityPython } from './normality'

// ─── 레지스트리 ───

const REGISTRY: Record<string, CodeTemplatePair> = {
  // T-Test (3)
  't-test': { R: tTestR, python: tTestPython },
  'two-sample-t': { R: tTestR, python: tTestPython },
  'welch-t': { R: tTestR, python: tTestPython },
  'paired-t': { R: pairedTR, python: pairedTPython },
  'one-sample-t': { R: oneSampleTR, python: oneSampleTPython },

  // ANOVA (1)
  'anova': { R: anovaR, python: anovaPython },
  'one-way-anova': { R: anovaR, python: anovaPython },

  // Correlation (1)
  'correlation': { R: correlationR, python: correlationPython },
  'pearson-correlation': { R: correlationR, python: correlationPython },

  // Regression (1)
  'regression': { R: regressionR, python: regressionPython },
  'simple-regression': { R: regressionR, python: regressionPython },

  // Nonparametric (3)
  'mann-whitney': { R: mannWhitneyR, python: mannWhitneyPython },
  'wilcoxon': { R: wilcoxonR, python: wilcoxonPython },
  'kruskal-wallis': { R: kruskalWallisR, python: kruskalWallisPython },

  // Chi-Square (2)
  'chi-square-independence': { R: chiSquareIndependenceR, python: chiSquareIndependencePython },
  'chi-square-goodness': { R: chiSquareGoodnessR, python: chiSquareGoodnessPython },

  // Normality (1)
  'normality-test': { R: normalityR, python: normalityPython },
}

// ─── 공개 API ───

function normalizeSupportedMethodId(methodId: string): string {
  if (methodId in REGISTRY) {
    return methodId
  }

  const canonicalId = getMethodByIdOrAlias(methodId)?.id
  return canonicalId && canonicalId in REGISTRY ? canonicalId : methodId
}

/** methodId + 언어로 템플릿 조회. 미지원 시 null. */
export function getCodeTemplate(
  methodId: string,
  language: CodeLanguage,
): CodeTemplate | null {
  const pair = REGISTRY[normalizeSupportedMethodId(methodId)]
  return pair?.[language] ?? null
}

/** 코드 내보내기를 지원하는 메서드 ID 목록 */
export function getSupportedMethodIds(): string[] {
  return Object.keys(REGISTRY)
}

/** 메서드가 코드 내보내기를 지원하는지 확인 */
export function isMethodSupported(methodId: string): boolean {
  return normalizeSupportedMethodId(methodId) in REGISTRY
}
