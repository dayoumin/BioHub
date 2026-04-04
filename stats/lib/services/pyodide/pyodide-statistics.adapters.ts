import * as Generated from '@/lib/generated/method-types.generated'

export interface ClusterAnalysisOptions {
  nClusters?: number
  method?: 'kmeans' | 'hierarchical' | 'dbscan'
  linkage?: 'ward' | 'complete' | 'average' | 'single'
  distance?: 'euclidean' | 'manhattan' | 'cosine'
}

export interface ClusterAnalysisLegacyAliases {
  clusters: number[]
  centers: number[][]
}

export type ClusterAnalysisAdapterResult =
  Generated.ClusterAnalysisResult & ClusterAnalysisLegacyAliases

/**
 * cluster_analysis 결과에 UI 하위호환 alias를 부여한다.
 */
export async function clusterAnalysisAdapter(
  data: number[][],
  options: ClusterAnalysisOptions = {}
): Promise<ClusterAnalysisAdapterResult> {
  const {
    nClusters = 3,
    method = 'kmeans',
    linkage = 'ward',
    distance = 'euclidean'
  } = options

  const result = await Generated.clusterAnalysis(
    data,
    method,
    nClusters,
    linkage,
    distance
  )

  return {
    ...result,
    clusters: result.clusterAssignments,
    centers: result.centroids
  }
}
