/**
 * RAG 문서 관리 페이지
 *
 * 경로: /rag/documents
 */

import { DocumentManager } from '@/components/rag/document-manager'

export default function RAGDocumentsPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <DocumentManager />
    </div>
  )
}
