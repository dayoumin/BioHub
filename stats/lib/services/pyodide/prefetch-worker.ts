/**
 * Pyodide Worker Prefetch
 *
 * 메서드 선택 시점에 해당 Worker의 추가 패키지를 미리 로드합니다.
 * 사용자가 변수 매핑(Step 3)하는 동안 패키지 로드가 완료되어
 * 분석 실행 시 대기 시간을 줄입니다.
 *
 * - Worker 1: 추가 패키지 없음 (prefetch 불필요)
 * - Worker 2: statsmodels + pandas
 * - Worker 3: statsmodels + pandas + scikit-learn
 * - Worker 4: statsmodels + scikit-learn
 * - Worker 5: scikit-learn
 */

import { PyodideCoreService } from './core/pyodide-core.service'
import type { StatisticalMethod } from '@/types/analysis'
import { getMethodByAlias } from '@/lib/constants/statistical-methods'
import { logger } from '@/lib/utils/logger'

/**
 * StatisticalMethod.category → Worker 번호 매핑
 *
 * 실제 callWorkerMethod 호출 패턴 기반 (pyodide-core.service.ts 참조):
 * - Worker 1: descriptive, normality, outlier, cronbach, bonferroni
 * - Worker 2: t-test, chi-square, correlation, z-test, levene
 * - Worker 3: nonparametric, ANOVA, post-hoc
 * - Worker 4: regression, PCA, factor, cluster
 * - Worker 5: survival
 *
 * 일부 카테고리는 여러 Worker에 걸쳐 있으므로,
 * 추가 패키지가 필요한 가장 큰 Worker를 prefetch 합니다.
 */
const CATEGORY_WORKER_MAP: Record<string, (1 | 2 | 3 | 4 | 5)[]> = {
  'descriptive': [1],
  't-test': [2],
  'chi-square': [2],
  'correlation': [2],       // Worker 2 (일반), partial은 Worker 2+statsmodels
  'anova': [3],             // Worker 3 (one-way, two-way, repeated, ancova, manova)
  'nonparametric': [3],     // Worker 3 (mann-whitney, wilcoxon, kruskal 등)
  'regression': [4],        // Worker 4 (linear, multiple, logistic)
  'multivariate': [4],      // Worker 4 (PCA, factor, cluster, discriminant)
  'timeseries': [4],        // Worker 4 (ARIMA, seasonal, stationarity)
  'survival': [5],          // Worker 5 (kaplan-meier, cox, roc)
  'psychometrics': [1],     // Worker 1 (cronbach)
  'design': [1],            // Worker 1
  'other': [1],             // Worker 1
}

/**
 * 메서드 선택 시 해당 Worker의 추가 패키지를 백그라운드로 미리 로드
 *
 * - 실패해도 무시 (callWorkerMethod 시점에 재시도됨)
 * - Pyodide가 초기화되지 않았으면 스킵
 * - Worker 1은 추가 패키지 없으므로 스킵
 */
export function prefetchWorkerForMethod(method: StatisticalMethod): void {
  const coreService = PyodideCoreService.getInstance()

  // Pyodide가 아직 초기화되지 않았으면 prefetch 무의미
  if (!coreService.isInitialized()) return

  // Primary: method.category로 직접 조회.
  // Fallback: canonical entry category (category가 stale하거나 legacy alias가 id에만 남은 경우 방어).
  const canonicalCategory = getMethodByAlias(method.id)?.category
  const workers =
    CATEGORY_WORKER_MAP[method.category] ??
    (canonicalCategory ? CATEGORY_WORKER_MAP[canonicalCategory] : undefined)
  if (!workers) return

  for (const workerNum of workers) {
    // Worker 1은 추가 패키지 없음
    if (workerNum === 1) continue

    logger.info(`[Prefetch] Worker ${workerNum} 패키지 미리 로드 시작`, {
      methodId: method.id,
      category: method.category
    })

    coreService.ensureWorkerLoaded(workerNum).catch((err: unknown) => {
      // prefetch 실패는 치명적이지 않음 — 분석 실행 시 재시도됨
      const message = err instanceof Error ? err.message : String(err)
      logger.warn(`[Prefetch] Worker ${workerNum} prefetch 실패 (분석 시 재시도):`, message)
    })
  }
}
