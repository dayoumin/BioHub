import type { ProjectEntityKind } from '@biohub/types'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import {
  getBioToolSupplementaryWriterPolicy,
  getSupplementaryWriterPolicy,
} from './document-writing-supplementary-policy'
import { isDedicatedBioToolWritingSourceResult } from './document-writing-source-registry'

export type DocumentWritingSourceReadinessStatus = 'ready' | 'review' | 'stale'

export interface DocumentWritingSourceReadiness {
  status: DocumentWritingSourceReadinessStatus
  label: string
  detail: string
}

interface AnalysisSourceReadinessInput {
  sourceKind: 'analysis'
  sectionId?: string
  needsReassemble?: boolean
}

interface FigureSourceReadinessInput {
  sourceKind: 'figure'
  needsReassemble?: boolean
}

interface SupplementarySourceReadinessInput {
  sourceKind: 'supplementary'
  entityKind?: ProjectEntityKind
  needsReassemble?: boolean
  bioTool?: {
    toolId: string
    results: unknown
  }
}

export type DocumentWritingSourceReadinessInput =
  | AnalysisSourceReadinessInput
  | FigureSourceReadinessInput
  | SupplementarySourceReadinessInput

function staleReadiness(): DocumentWritingSourceReadiness {
  return {
    status: 'stale',
    label: '재조립 필요',
    detail: '원본 자료 변경이 감지되었습니다. 재조립 후 자동 작성 내용을 다시 확인하세요.',
  }
}

function getAnalysisReadiness(sectionId: string | undefined): DocumentWritingSourceReadiness {
  if (sectionId === 'methods') {
    return {
      status: 'ready',
      label: 'Methods 자동 작성 가능',
      detail: '분석 방법, 변수 매핑, 옵션을 source-backed Methods 초안으로 반영할 수 있습니다.',
    }
  }

  if (sectionId === 'results') {
    return {
      status: 'ready',
      label: 'Results 자동 작성 가능',
      detail: '저장된 통계 결과와 paper draft를 source-backed Results 초안으로 반영할 수 있습니다.',
    }
  }

  return {
    status: 'ready',
    label: '원본 분석 연결됨',
    detail: '통계 결과를 문서 source로 추적하며, 섹션 성격에 맞는 자동 작성에 사용할 수 있습니다.',
  }
}

function getFigureReadiness(): DocumentWritingSourceReadiness {
  return {
    status: 'review',
    label: '그래프 확인 필요',
    detail: '캡션과 패턴 요약은 반영할 수 있지만, 시각적 해석과 강조점은 사용자가 확인해야 합니다.',
  }
}

function getBioToolReadiness(
  bioTool: SupplementarySourceReadinessInput['bioTool'],
): DocumentWritingSourceReadiness {
  if (!bioTool) {
    return {
      status: 'review',
      label: '보조 결과 확인 필요',
      detail: '원본 결과 snapshot을 찾을 수 없어 자동 작성 범위를 보수적으로 제한합니다.',
    }
  }

  const tool = getBioToolById(bioTool.toolId)
  if (!tool) {
    return {
      status: 'review',
      label: 'Bio-Tool 확인 필요',
      detail: '등록되지 않은 Bio-Tool 결과입니다. writer 정책을 먼저 확인해야 합니다.',
    }
  }

  const policy = getBioToolSupplementaryWriterPolicy(tool.id)
  if (
    policy?.stage === 'dedicated'
    && isDedicatedBioToolWritingSourceResult(tool.id, bioTool.results)
  ) {
    return {
      status: 'ready',
      label: '전용 writer 사용',
      detail: '검증된 결과 shape의 수치와 라벨만 supplementary 초안에 반영합니다.',
    }
  }

  if (policy?.stage === 'dedicated') {
    return {
      status: 'review',
      label: '결과 shape 확인 필요',
      detail: '전용 writer는 있지만 저장된 결과가 type guard를 통과하지 못했습니다. worker/API 반환 키와 저장 snapshot을 확인하세요.',
    }
  }

  return {
    status: 'review',
    label: '공통 fallback',
    detail: '전용 writer 정책이 없어 입력 파일과 원본 링크 중심으로만 보수적으로 작성합니다.',
  }
}

function getSupplementaryReadiness(entityKind: ProjectEntityKind | undefined): DocumentWritingSourceReadiness {
  if (!entityKind) {
    return {
      status: 'review',
      label: '보조 결과 확인 필요',
      detail: 'entity kind를 확인할 수 없어 자동 작성 범위를 보수적으로 제한합니다.',
    }
  }

  const policy = getSupplementaryWriterPolicy(entityKind)
  if (policy?.stage === 'dedicated') {
    return {
      status: 'review',
      label: '제한 writer 확인',
      detail: '원본 수치와 식별 가능한 라벨만 반영하며, 생물학적 해석은 사용자가 확인해야 합니다.',
    }
  }

  return {
    status: 'review',
    label: '공통 fallback',
    detail: '전용 writer가 없어 원본 링크와 최소 메타데이터 중심으로만 작성합니다.',
  }
}

export function getDocumentWritingSourceReadiness(
  input: DocumentWritingSourceReadinessInput,
): DocumentWritingSourceReadiness {
  if (input.needsReassemble) {
    return staleReadiness()
  }

  switch (input.sourceKind) {
    case 'analysis':
      return getAnalysisReadiness(input.sectionId)
    case 'figure':
      return getFigureReadiness()
    case 'supplementary':
      if (input.bioTool) {
        return getBioToolReadiness(input.bioTool)
      }
      return getSupplementaryReadiness(input.entityKind)
  }
}
