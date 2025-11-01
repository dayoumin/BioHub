#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
벡터 임베딩 생성 스크립트 (Ollama)

SQLite DB의 문서들을 청크로 나누고 Ollama로 임베딩 생성
embeddings 테이블에 저장

실행:
    cd statistical-platform/rag-system
    python scripts/generate_embeddings.py
"""

import sys
import io
import sqlite3
import json
import time
from pathlib import Path
from typing import List, Dict
import requests

# Windows UTF-8 encoding fix
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 설정
SCRIPT_DIR = Path(__file__).parent
RAG_SYSTEM_DIR = SCRIPT_DIR.parent
DATA_DIR = RAG_SYSTEM_DIR / "data"
DB_PATH = DATA_DIR / "rag.db"

OLLAMA_ENDPOINT = "http://localhost:11434"
EMBEDDING_MODEL = "nomic-embed-text"  # 기본 임베딩 모델
CHUNK_SIZE = 500  # 토큰 수 (대략 500 단어)
CHUNK_OVERLAP = 50  # 겹침 토큰 수


def check_ollama_server():
    """Ollama 서버 연결 확인"""
    try:
        response = requests.get(f"{OLLAMA_ENDPOINT}/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get('models', [])
            model_names = [m['name'] for m in models]
            print(f"✓ Ollama 서버 연결 성공 ({len(models)}개 모델)")

            # 임베딩 모델 확인
            if EMBEDDING_MODEL in model_names:
                print(f"✓ 임베딩 모델 '{EMBEDDING_MODEL}' 사용 가능")
                return True
            else:
                print(f"⚠️ 임베딩 모델 '{EMBEDDING_MODEL}' 없음")
                print(f"   사용 가능한 모델: {', '.join(model_names)}")
                print(f"\n   다운로드: ollama pull {EMBEDDING_MODEL}")
                return False
        else:
            print(f"❌ Ollama 서버 응답 오류: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ Ollama 서버 연결 실패: {OLLAMA_ENDPOINT}")
        print("   서버 시작: ollama serve")
        return False
    except Exception as e:
        print(f"❌ Ollama 서버 확인 중 오류: {e}")
        return False


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """
    텍스트를 청크로 나누기 (단어 기준)

    Args:
        text: 원본 텍스트
        chunk_size: 청크 크기 (단어 수)
        overlap: 겹침 크기 (단어 수)

    Returns:
        List[str]: 청크 리스트
    """
    words = text.split()
    chunks = []

    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = ' '.join(words[start:end])
        chunks.append(chunk)

        # 다음 청크 시작 위치 (겹침 고려)
        start += chunk_size - overlap

        # 마지막 청크 처리
        if end >= len(words):
            break

    return chunks


def generate_embedding(text: str) -> List[float]:
    """
    Ollama API로 임베딩 생성

    Args:
        text: 임베딩할 텍스트

    Returns:
        List[float]: 임베딩 벡터 (768 dimensions for nomic-embed-text)
    """
    try:
        response = requests.post(
            f"{OLLAMA_ENDPOINT}/api/embeddings",
            json={
                "model": EMBEDDING_MODEL,
                "prompt": text
            },
            timeout=30
        )

        if response.status_code == 200:
            embedding = response.json()['embedding']
            return embedding
        else:
            print(f"  ⚠️ 임베딩 생성 실패: {response.status_code}")
            return []
    except Exception as e:
        print(f"  ⚠️ 임베딩 API 오류: {e}")
        return []


def serialize_embedding(embedding: List[float]) -> bytes:
    """
    임베딩 벡터를 BLOB로 직렬화 (JSON)

    Args:
        embedding: 임베딩 벡터

    Returns:
        bytes: JSON 직렬화된 바이트
    """
    return json.dumps(embedding).encode('utf-8')


def load_documents(db_path: Path) -> List[Dict]:
    """
    SQLite DB에서 모든 문서 로드

    Returns:
        List[Dict]: 문서 리스트
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT doc_id, title, content, library
        FROM documents
        ORDER BY id
    """)

    documents = []
    for row in cursor.fetchall():
        documents.append({
            'doc_id': row[0],
            'title': row[1],
            'content': row[2],
            'library': row[3]
        })

    conn.close()
    return documents


def insert_embeddings(db_path: Path, embeddings_data: List[Dict]):
    """
    임베딩 데이터를 DB에 삽입

    Args:
        db_path: DB 경로
        embeddings_data: 임베딩 데이터 리스트
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 기존 임베딩 삭제 (재생성)
    cursor.execute("DELETE FROM embeddings")

    # 새 임베딩 삽입
    for item in embeddings_data:
        cursor.execute("""
            INSERT INTO embeddings (
                doc_id, chunk_index, chunk_text, chunk_tokens,
                embedding, embedding_model, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            item['doc_id'],
            item['chunk_index'],
            item['chunk_text'],
            item['chunk_tokens'],
            item['embedding'],
            item['embedding_model'],
            item['created_at']
        ))

    conn.commit()
    conn.close()


def main():
    """메인 함수"""
    print("=" * 50)
    print("RAG System - 벡터 임베딩 생성 (Ollama)")
    print("=" * 50)
    print()

    # 1. Ollama 서버 확인
    print("[1/5] Ollama 서버 확인 중...")
    if not check_ollama_server():
        print("\n❌ Ollama 서버를 먼저 시작하세요:")
        print("   1. 터미널에서 'ollama serve' 실행")
        print(f"   2. 모델 다운로드: ollama pull {EMBEDDING_MODEL}")
        return 1
    print()

    # 2. 문서 로드
    print("[2/5] 문서 로드 중...")
    documents = load_documents(DB_PATH)
    print(f"  → {len(documents)}개 문서 로드 완료\n")

    # 3. 청크 생성 및 임베딩
    print(f"[3/5] 청크 생성 및 임베딩 중 (모델: {EMBEDDING_MODEL})...")
    embeddings_data = []
    current_time = int(time.time())

    total_chunks = 0
    for doc_idx, doc in enumerate(documents, 1):
        doc_id = doc['doc_id']
        content = doc['content']

        # 청크 생성
        chunks = chunk_text(content, CHUNK_SIZE, CHUNK_OVERLAP)
        total_chunks += len(chunks)

        print(f"  [{doc_idx}/{len(documents)}] {doc_id} ({len(chunks)}개 청크)")

        # 각 청크에 대해 임베딩 생성
        for chunk_idx, chunk in enumerate(chunks):
            # 임베딩 생성
            embedding = generate_embedding(chunk)

            if not embedding:
                print(f"    ⚠️ 청크 {chunk_idx} 임베딩 생성 실패 (스킵)")
                continue

            # 임베딩 데이터 저장
            embeddings_data.append({
                'doc_id': doc_id,
                'chunk_index': chunk_idx,
                'chunk_text': chunk,
                'chunk_tokens': len(chunk.split()),  # 단어 수
                'embedding': serialize_embedding(embedding),
                'embedding_model': EMBEDDING_MODEL,
                'created_at': current_time
            })

            # Rate limiting (Ollama 서버 부하 방지)
            time.sleep(0.1)

    print(f"\n  ✓ 총 {total_chunks}개 청크 임베딩 완료\n")

    # 4. DB 삽입
    print(f"[4/5] 임베딩 DB 삽입 중...")
    insert_embeddings(DB_PATH, embeddings_data)
    print(f"  ✓ {len(embeddings_data)}개 임베딩 삽입 완료\n")

    # 5. 통계 출력
    print("[5/5] 통계 생성 중...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 라이브러리별 임베딩 통계
    cursor.execute("""
        SELECT d.library, COUNT(e.id) as chunk_count
        FROM documents d
        LEFT JOIN embeddings e ON d.doc_id = e.doc_id
        GROUP BY d.library
    """)

    print("\n📊 임베딩 통계:")
    print("-" * 50)
    for row in cursor.fetchall():
        library, chunk_count = row
        print(f"  {library:15} | {chunk_count:4}개 청크")

    # 전체 통계
    cursor.execute("SELECT COUNT(*) FROM embeddings")
    total_embeddings = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(DISTINCT doc_id) FROM embeddings")
    total_docs = cursor.fetchone()[0]

    print("-" * 50)
    print(f"  {'TOTAL':15} | {total_embeddings:4}개 청크")
    print(f"\n✓ 문서: {total_docs}개")
    print(f"✓ 평균 청크/문서: {total_embeddings / total_docs:.1f}개")

    # DB 파일 크기
    db_size = DB_PATH.stat().st_size / (1024 * 1024)  # MB
    print(f"✓ DB 크기: {db_size:.2f} MB")

    conn.close()

    print()
    print("=" * 50)
    print("✅ 임베딩 생성 완료!")
    print(f"   위치: {DB_PATH}")
    print("=" * 50)

    return 0


if __name__ == "__main__":
    sys.exit(main())