/**
 * RAG 모델 관리 페이지
 *
 * 경로: /rag/models
 */

import { ModelManager } from '@/components/rag/model-manager/ModelManager'

export default function RAGModelsPage() {
  return (
    <div className="container max-w-4xl py-6">
      <ModelManager />
    </div>
  )
}
