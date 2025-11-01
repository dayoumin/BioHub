/**
 * IndexedDB Storage for RAG User Documents
 *
 * 사용자가 추가/수정한 문서를 브라우저 영구 저장소에 저장
 * - 원본 DB와 분리 관리
 * - 새로고침 후에도 유지
 * - CRUD 작업 지원
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

const DB_NAME = 'RAGSystemDB'
const STORE_NAME = 'userDocuments'
const DB_VERSION = 1

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

      // Object Store 생성 (없으면)
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'doc_id' })

        // 인덱스 생성
        objectStore.createIndex('library', 'library', { unique: false })
        objectStore.createIndex('created_at', 'created_at', { unique: false })

        console.log('[IndexedDB] Object Store 생성 완료')
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
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

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
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)

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
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)

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
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

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
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

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
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)

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
}
