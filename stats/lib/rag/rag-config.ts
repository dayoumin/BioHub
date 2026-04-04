/**
 * RAG 설정 관리
 * StorageService를 통해 사용자 설정을 읽어 RAGServiceConfig로 변환
 */

import { RAGServiceConfig } from './rag-service'
import { StorageService } from '../services/storage-service'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

/**
 * localStorage에서 RAG 설정을 로드하여 RAGServiceConfig로 반환
 *
 * 우선순위:
 * 1. localStorage (사용자 설정, StorageService 통과)
 * 2. 환경변수 (기본값)
 */
export function loadRAGConfig(): RAGServiceConfig {
  const config: RAGServiceConfig = {}

  // Ollama Endpoint
  const ollamaEndpoint = StorageService.getItem(STORAGE_KEYS.rag.ollamaEndpoint)
  if (ollamaEndpoint) {
    config.ollamaEndpoint = ollamaEndpoint
  }

  // Embedding Model
  const embeddingModel = StorageService.getItem(STORAGE_KEYS.rag.embeddingModel)
  if (embeddingModel) {
    config.embeddingModel = embeddingModel
  }

  // Inference Model (LLM)
  const inferenceModel = StorageService.getItem(STORAGE_KEYS.rag.inferenceModel)
  if (inferenceModel) {
    config.inferenceModel = inferenceModel
  }

  // Top-K 검색 결과 수
  const topK = StorageService.getItem(STORAGE_KEYS.rag.topK)
  if (topK) {
    config.topK = parseInt(topK, 10)
  }

  return config
}

/**
 * RAG 설정을 localStorage에 저장
 */
export function saveRAGConfig(config: Partial<RAGServiceConfig>): void {
  if (config.ollamaEndpoint !== undefined) {
    StorageService.setItem(STORAGE_KEYS.rag.ollamaEndpoint, config.ollamaEndpoint)
  }

  if (config.embeddingModel !== undefined) {
    StorageService.setItem(STORAGE_KEYS.rag.embeddingModel, config.embeddingModel)
  }

  if (config.inferenceModel !== undefined) {
    StorageService.setItem(STORAGE_KEYS.rag.inferenceModel, config.inferenceModel)
  }

  if (config.topK !== undefined) {
    StorageService.setItem(STORAGE_KEYS.rag.topK, String(config.topK))
  }
}
