/**
 * Entity 히스토리 배치 로더
 *
 * 프로젝트 상세 페이지에서 entity ref를 resolve하기 위해
 * 각 도메인 저장소에서 히스토리를 로드하는 중앙 함수.
 *
 * === 새 entityKind 추가 시 ===
 * Full support: EntityKindDescriptors + ENTITY_LOADERS + resolveEntities() switch
 * Generic-only: _GENERIC_ONLY_KINDS에 등록
 * → 누락 시 컴파일 에러 발생
 *
 * 이 파일과 entity-resolver.ts 두 곳만 수정하면 됨.
 * ProjectDetailContent 등 소비자는 변경 불필요.
 */

import type { ProjectEntityRef } from '@/lib/types/research'
import type { ResolveOptions, EntityLoaderEntry } from './entity-resolver'
import { getAllHistory } from '@/lib/utils/storage'
import { listProjects as listGraphProjects } from '@/lib/graph-studio/project-storage'
import { loadAnalysisHistory } from '@/lib/genetics/analysis-history'
import { loadBioToolHistory } from '@/lib/bio-tools/bio-tool-history'

// ── 로더 레지스트리 ──

/**
 * 구현된 entityKind별 로더 목록.
 * full support 추가 시 여기 + entity-resolver.ts EntityKindDescriptors에 엔트리 추가.
 */
const ENTITY_LOADERS: readonly EntityLoaderEntry[] = [
  { kind: 'analysis', optionKey: 'analysisHistory', load: getAllHistory },
  { kind: 'figure', optionKey: 'graphProjects', load: listGraphProjects },
  { kind: 'blast-result', optionKey: 'blastHistory', load: loadAnalysisHistory },
  { kind: 'bio-tool-result', optionKey: 'bioToolHistory', load: loadBioToolHistory },
]

// ── 공개 API ──

/**
 * ref 배열에서 필요한 entityKind만 식별해 해당 저장소를 배치 로드.
 * 반환값을 그대로 resolveEntities()에 전달하면 된다.
 *
 * @example
 * const refs = listProjectEntityRefs(projectId)
 * const options = await loadEntityHistories(refs)
 * const resolved = resolveEntities(refs, options)
 */
export async function loadEntityHistories(
  refs: ProjectEntityRef[],
): Promise<ResolveOptions> {
  const kindsPresent = new Set(refs.map(r => r.entityKind))

  const needed = ENTITY_LOADERS.filter(entry => kindsPresent.has(entry.kind))

  const results = await Promise.all(needed.map(entry => entry.load()))

  const options: ResolveOptions = {}
  needed.forEach((entry, i) => {
    ;(options as Record<string, unknown>)[entry.optionKey] = results[i]
  })

  return options
}
