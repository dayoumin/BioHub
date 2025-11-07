/**
 * IndexedDB Storage for RAG User Documents
 *
 * 사용자가 추가/수정한 문서를 브라우저 영구 저장소에 저장
 * - 원본 DB와 분리 관리
 * - 새로고침 후에도 유지
 * - CRUD 작업 지원
 *
 * **Version 2 업데이트** (Phase 3):
 * - embeddings 스토어 추가 (청크 기반 임베딩 저장)
 */

export interface StoredDocument {
  doc_id: string
  title: string
  content: string
  library: string
  category: string | null
  summary: string | null
  created_at: number
  updated_at: number
}

/**
 * 청크 임베딩 스토어 (Phase 3)
 *
 * schema.sql의 embeddings 테이블과 동일한 구조
 */
export interface StoredEmbedding {
  id?: number // Auto-increment (optional for put)
  doc_id: string
  chunk_index: number
  chunk_text: string
  chunk_tokens: number
  embedding: ArrayBuffer // BLOB (Float32Array → ArrayBuffer)
  embedding_model: string
  created_at: number
}

const DB_NAME = 'RAGSystemDB'
const DOCUMENTS_STORE = 'userDocuments'
const EMBEDDINGS_STORE = 'embeddings'
const DB_VERSION = 3 // Version 3: embedding_model 인덱스 추가

/**
 * IndexedDB 초기화
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('IndexedDB 열기 실패'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      const oldVersion = event.oldVersion

      // Version 1: userDocuments 스토어 생성
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
          const docStore = db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'doc_id' })

          // 인덱스 생성
          docStore.createIndex('library', 'library', { unique: false })
          docStore.createIndex('created_at', 'created_at', { unique: false })

          console.log('[IndexedDB] userDocuments 스토어 생성 완료')
        }
      }

      // Version 2: embeddings 스토어 생성 (Phase 3)
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(EMBEDDINGS_STORE)) {
          const embStore = db.createObjectStore(EMBEDDINGS_STORE, {
            keyPath: 'id',
            autoIncrement: true,
          })

          // 인덱스 생성
          embStore.createIndex('doc_id', 'doc_id', { unique: false })
          embStore.createIndex('doc_chunk', ['doc_id', 'chunk_index'], { unique: true })
          embStore.createIndex('embedding_model', 'embedding_model', { unique: false })
          embStore.createIndex('created_at', 'created_at', { unique: false })

          console.log('[IndexedDB] embeddings 스토어 생성 완료')
        }
      }
    }
  })
}

/**
 * IndexedDB Storage 클래스
 */
export class IndexedDBStorage {
  /**
   * 문서 추가/수정 (Upsert)
   */
  static async saveDocument(document: StoredDocument): Promise<void> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DOCUMENTS_STORE], 'readwrite')
      const store = transaction.objectStore(DOCUMENTS_STORE)

      const request = store.put(document)

      request.onsuccess = () => {
        console.log(`[IndexedDB] 문서 저장됨: ${document.doc_id}`)
        resolve()
      }

      request.onerror = () => {
        reject(new Error(`문서 저장 실패: ${document.doc_id}`))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  }

  /**
   * 문서 조회
   */
  static async getDocument(docId: string): Promise<StoredDocument | null> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DOCUMENTS_STORE], 'readonly')
      const store = transaction.objectStore(DOCUMENTS_STORE)

      const request = store.get(docId)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        reject(new Error(`문서 조회 실패: ${docId}`))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  }

  /**
   * 모든 문서 조회
   */
  static async getAllDocuments(): Promise<StoredDocument[]> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DOCUMENTS_STORE], 'readonly')
      const store = transaction.objectStore(DOCUMENTS_STORE)

      const request = store.getAll()

      request.onsuccess = () => {
        console.log(`[IndexedDB] ${request.result.length}개 문서 로드됨`)
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error('문서 목록 조회 실패'))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  }

  /**
   * 문서 삭제
   */
  static async deleteDocument(docId: string): Promise<void> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DOCUMENTS_STORE], 'readwrite')
      const store = transaction.objectStore(DOCUMENTS_STORE)

      const request = store.delete(docId)

      request.onsuccess = () => {
        console.log(`[IndexedDB] 문서 삭제됨: ${docId}`)
        resolve()
      }

      request.onerror = () => {
        reject(new Error(`문서 삭제 실패: ${docId}`))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  }

  /**
   * 모든 문서 삭제 (재구축 시 사용)
   */
  static async clearAllDocuments(): Promise<void> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DOCUMENTS_STORE], 'readwrite')
      const store = transaction.objectStore(DOCUMENTS_STORE)

      const request = store.clear()

      request.onsuccess = () => {
        console.log('[IndexedDB] 모든 문서 삭제됨')
        resolve()
      }

      request.onerror = () => {
        reject(new Error('모든 문서 삭제 실패'))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  }

  /**
   * 문서 개수 조회
   */
  static async getDocumentCount(): Promise<number> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DOCUMENTS_STORE], 'readonly')
      const store = transaction.objectStore(DOCUMENTS_STORE)

      const request = store.count()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error('문서 개수 조회 실패'))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  }

  // ==================== Embeddings 관련 메서드 (Phase 3) ====================

  /**
   * 임베딩 추가/수정 (Upsert)
   */
  static async saveEmbedding(embedding: StoredEmbedding): Promise<number> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EMBEDDINGS_STORE], 'readwrite')
      const store = transaction.objectStore(EMBEDDINGS_STORE)

      const request = store.put(embedding)

      request.onsuccess = () => {
        const id = request.result as number
        console.log(`[IndexedDB] 임베딩 저장됨: doc=${embedding.doc_id}, chunk=${embedding.chunk_index}, id=${id}`)
        resolve(id)
      }

      request.onerror = () => {
        reject(new Error(`임베딩 저장 실패: ${embedding.doc_id} chunk ${embedding.chunk_index}`))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  }

  /**
   * 특정 문서의 모든 임베딩 조회
   */
  static async getEmbeddingsByDocId(docId: string): Promise<StoredEmbedding[]> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EMBEDDINGS_STORE], 'readonly')
      const store = transaction.objectStore(EMBEDDINGS_STORE)
      const index = store.index('doc_id')

      const request = index.getAll(docId)

      request.onsuccess = () => {
        const embeddings = request.result
        console.log(`[IndexedDB] 문서 ${docId}: ${embeddings.length}개 임베딩 로드됨`)
        resolve(embeddings)
      }

      request.onerror = () => {
        reject(new Error(`임베딩 조회 실패: ${docId}`))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  }

  /**
   * 모든 임베딩 조회
   */
  static async getAllEmbeddings(): Promise<StoredEmbedding[]> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EMBEDDINGS_STORE], 'readonly')
      const store = transaction.objectStore(EMBEDDINGS_STORE)

      const request = store.getAll()

      request.onsuccess = () => {
        console.log(`[IndexedDB] ${request.result.length}개 임베딩 로드됨`)
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error('임베딩 목록 조회 실패'))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  }

  /**
   * 특정 모델의 모든 임베딩 조회 (청크 기반 검색용)
   */
  static async getEmbeddingsByModel(embeddingModel: string): Promise<StoredEmbedding[]> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EMBEDDINGS_STORE], 'readonly')
      const store = transaction.objectStore(EMBEDDINGS_STORE)
      const index = store.index('embedding_model')

      const request = index.getAll(embeddingModel)

      request.onsuccess = () => {
        const embeddings = request.result
        console.log(`[IndexedDB] 모델 ${embeddingModel}: ${embeddings.length}개 임베딩 로드됨`)
        resolve(embeddings)
      }

      request.onerror = () => {
        reject(new Error(`임베딩 조회 실패 (모델: ${embeddingModel})`))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  }

  /**
   * 특정 문서의 모든 임베딩 삭제
   */
  static async deleteEmbeddingsByDocId(docId: string): Promise<void> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EMBEDDINGS_STORE], 'readwrite')
      const store = transaction.objectStore(EMBEDDINGS_STORE)
      const index = store.index('doc_id')

      const request = index.getAllKeys(docId)

      request.onsuccess = () => {
        const keys = request.result

        if (keys.length === 0) {
          console.log(`[IndexedDB] 삭제할 임베딩 없음: ${docId}`)
          resolve()
          return
        }

        let deletedCount = 0
        keys.forEach((key) => {
          const deleteRequest = store.delete(key)
          deleteRequest.onsuccess = () => {
            deletedCount++
            if (deletedCount === keys.length) {
              console.log(`[IndexedDB] 임베딩 삭제됨: ${docId} (${deletedCount}개)`)
              resolve()
            }
          }
          deleteRequest.onerror = () => {
            reject(new Error(`임베딩 삭제 실패: ${docId}`))
          }
        })
      }

      request.onerror = () => {
        reject(new Error(`임베딩 키 조회 실패: ${docId}`))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  }

  /**
   * 모든 임베딩 삭제 (재구축 시 사용)
   */
  static async clearAllEmbeddings(): Promise<void> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EMBEDDINGS_STORE], 'readwrite')
      const store = transaction.objectStore(EMBEDDINGS_STORE)

      const request = store.clear()

      request.onsuccess = () => {
        console.log('[IndexedDB] 모든 임베딩 삭제됨')
        resolve()
      }

      request.onerror = () => {
        reject(new Error('모든 임베딩 삭제 실패'))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  }

  /**
   * 임베딩 개수 조회
   */
  static async getEmbeddingCount(): Promise<number> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EMBEDDINGS_STORE], 'readonly')
      const store = transaction.objectStore(EMBEDDINGS_STORE)

      const request = store.count()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error('임베딩 개수 조회 실패'))
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  }

  /**
   * 배치 임베딩 저장 (트랜잭션 최적화)
   */
  static async saveEmbeddingsBatch(embeddings: StoredEmbedding[]): Promise<number[]> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EMBEDDINGS_STORE], 'readwrite')
      const store = transaction.objectStore(EMBEDDINGS_STORE)

      const ids: number[] = []
      let completed = 0

      embeddings.forEach((embedding, index) => {
        const request = store.put(embedding)

        request.onsuccess = () => {
          ids[index] = request.result as number
          completed++

          if (completed === embeddings.length) {
            console.log(`[IndexedDB] 배치 임베딩 저장 완료: ${embeddings.length}개`)
            resolve(ids)
          }
        }

        request.onerror = () => {
          reject(new Error(`배치 임베딩 저장 실패: index ${index}`))
        }
      })

      transaction.oncomplete = () => {
        db.close()
      }
    })
  }
}
