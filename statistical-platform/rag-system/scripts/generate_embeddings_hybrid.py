"""
Generate embeddings for chunks and save to ChromaDB with BM25 index (Hybrid Search)

이 스크립트는:
1. chunks.json에서 780개 청크 로드
2. Ollama nomic-embed-text로 임베딩 생성 → ChromaDB (Vector Search)
3. BM25 인덱스 생성 → JSON 파일 (Keyword Search)

Hybrid Search = Vector Search + BM25 Keyword Search + Reranking

Requirements:
- ollama (localhost:11434)
- chromadb
- rank-bm25
- requests
"""

import json
import os
import sys
from pathlib import Path
import time
from typing import List, Dict, Any
import requests
import pickle

# ChromaDB import
try:
    import chromadb
    from chromadb.config import Settings
except ImportError:
    print("❌ chromadb not installed. Run: pip install chromadb")
    sys.exit(1)

# BM25 import
try:
    from rank_bm25 import BM25Okapi
except ImportError:
    print("❌ rank-bm25 not installed. Run: pip install rank-bm25")
    sys.exit(1)

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CHUNKS_FILE = PROJECT_ROOT / "data" / "chunks" / "chunks.json"
VECTOR_DB_PATH = PROJECT_ROOT / "data" / "vector_db"
BM25_INDEX_PATH = PROJECT_ROOT / "data" / "bm25_index.pkl"

# Ollama settings
OLLAMA_ENDPOINT = "http://localhost:11434"
EMBEDDING_MODEL = "nomic-embed-text"

print("🚀 Hybrid Search 인덱스 생성 시작")
print("=" * 60)
print("📋 구성:")
print("  1. Vector Search: ChromaDB (Ollama nomic-embed-text)")
print("  2. Keyword Search: BM25 (rank-bm25)")
print("  3. Reranking: Alpha 가중치 결합")
print("=" * 60)
print(f"Ollama 엔드포인트: {OLLAMA_ENDPOINT}")
print(f"임베딩 모델: {EMBEDDING_MODEL}")
print(f"청크 파일: {CHUNKS_FILE}")
print(f"Vector DB 경로: {VECTOR_DB_PATH}")
print(f"BM25 인덱스 경로: {BM25_INDEX_PATH}")
print("=" * 60)

# Check Ollama server
print("\n🔍 Ollama 서버 확인 중...")
try:
    response = requests.get(f"{OLLAMA_ENDPOINT}/api/tags")
    if response.status_code == 200:
        models = response.json().get("models", [])
        model_names = [m.get("name", "") for m in models]
        if EMBEDDING_MODEL in model_names:
            print(f"✅ Ollama 서버 연결 성공 ({EMBEDDING_MODEL} 사용 가능)")
        else:
            print(f"⚠️ {EMBEDDING_MODEL} 모델이 없습니다.")
            print(f"다운로드: ollama pull {EMBEDDING_MODEL}")
            sys.exit(1)
    else:
        print(f"❌ Ollama 서버 응답 오류: {response.status_code}")
        sys.exit(1)
except requests.exceptions.ConnectionError:
    print(f"❌ Ollama 서버에 연결할 수 없습니다.")
    print(f"Ollama를 실행하세요: ollama serve")
    sys.exit(1)

# Load chunks
print(f"\n📚 청크 로딩 중...")
if not CHUNKS_FILE.exists():
    print(f"❌ 청크 파일이 없습니다: {CHUNKS_FILE}")
    print("먼저 semantic_chunker.py를 실행하세요.")
    sys.exit(1)

with open(CHUNKS_FILE, 'r', encoding='utf-8') as f:
    chunks_data = json.load(f)

chunks: List[Dict[str, Any]] = chunks_data.get("chunks", [])
print(f"✅ 총 {len(chunks)}개 청크 로드 완료")

# ============================================================
# Part 1: BM25 Index 생성 (Keyword Search)
# ============================================================
print(f"\n🔤 Part 1: BM25 인덱스 생성 중...")
print(f"  BM25는 키워드 기반 검색 (TF-IDF 개선 버전)")

# Tokenize documents for BM25
tokenized_corpus = []
for chunk in chunks:
    content = chunk.get("content", "")
    # Simple tokenization (lowercase + split by whitespace)
    tokens = content.lower().split()
    tokenized_corpus.append(tokens)

# Create BM25 index
bm25 = BM25Okapi(tokenized_corpus)

# Save BM25 index
with open(BM25_INDEX_PATH, 'wb') as f:
    pickle.dump({
        "bm25": bm25,
        "chunks": chunks  # Save chunks for retrieval
    }, f)

print(f"✅ BM25 인덱스 생성 완료")
print(f"  - 저장 위치: {BM25_INDEX_PATH}")
print(f"  - 인덱스 크기: {BM25_INDEX_PATH.stat().st_size / 1024 / 1024:.2f} MB")

# ============================================================
# Part 2: Vector DB 생성 (Semantic Search)
# ============================================================
print(f"\n🔢 Part 2: Vector DB 생성 중...")
print(f"  ChromaDB는 의미 기반 검색 (임베딩 유사도)")

# Initialize ChromaDB
VECTOR_DB_PATH.mkdir(parents=True, exist_ok=True)

client = chromadb.PersistentClient(
    path=str(VECTOR_DB_PATH),
    settings=Settings(
        anonymized_telemetry=False,
        allow_reset=True
    )
)

# Delete existing collection if any
try:
    client.delete_collection("statistical_docs")
    print("  ⚠️ 기존 컬렉션 삭제됨")
except Exception:
    pass

# Create collection
collection = client.create_collection(
    name="statistical_docs",
    metadata={"description": "Statistical documentation from SciPy/NumPy/statsmodels/pingouin"}
)
print(f"✅ ChromaDB 컬렉션 생성 완료")

# Generate embeddings and add to ChromaDB
print(f"\n  임베딩 생성 중... (총 {len(chunks)}개 청크)")

batch_size = 10  # Process in batches
total_batches = (len(chunks) + batch_size - 1) // batch_size

start_time = time.time()
processed = 0
failed = 0

for batch_idx in range(total_batches):
    batch_start = batch_idx * batch_size
    batch_end = min((batch_idx + 1) * batch_size, len(chunks))
    batch_chunks = chunks[batch_start:batch_end]

    # Prepare batch data
    batch_documents = []
    batch_metadatas = []
    batch_ids = []

    for idx, chunk in enumerate(batch_chunks):
        chunk_id = f"chunk_{batch_start + idx}"
        content = chunk.get("content", "")
        metadata = chunk.get("metadata", {})

        # Generate embedding using Ollama
        try:
            embed_response = requests.post(
                f"{OLLAMA_ENDPOINT}/api/embeddings",
                json={
                    "model": EMBEDDING_MODEL,
                    "prompt": content
                },
                timeout=30
            )

            if embed_response.status_code != 200:
                print(f"  ERROR: Embedding failed (Chunk {chunk_id}): HTTP {embed_response.status_code}")
                failed += 1
                continue

            embedding_data = embed_response.json()
            embedding = embedding_data.get("embedding", [])

            if not embedding:
                print(f"  ERROR: Empty embedding (Chunk {chunk_id})")
                failed += 1
                continue

            # Add to batch
            batch_documents.append(content)
            batch_metadatas.append(metadata)
            batch_ids.append(chunk_id)

            processed += 1

        except Exception as e:
            print(f"  ❌ 임베딩 생성 오류 (Chunk {chunk_id}): {str(e)}")
            failed += 1

    # Add batch to ChromaDB
    if batch_documents:
        try:
            collection.add(
                documents=batch_documents,
                metadatas=batch_metadatas,
                ids=batch_ids
            )
        except Exception as e:
            print(f"  ❌ ChromaDB 저장 오류 (Batch {batch_idx+1}): {str(e)}")
            failed += len(batch_documents)
            processed -= len(batch_documents)

    # Progress
    if (batch_idx + 1) % 10 == 0:
        elapsed = time.time() - start_time
        rate = processed / elapsed if elapsed > 0 else 0
        eta = (len(chunks) - processed) / rate if rate > 0 else 0
        print(f"    진행: {processed}/{len(chunks)} ({processed/len(chunks)*100:.1f}%) | {rate:.1f} chunks/sec | ETA: {eta/60:.1f}분")

# Final summary
end_time = time.time()
elapsed = end_time - start_time

print(f"\n✅ Vector DB 생성 완료")
print(f"  - 성공: {processed}/{len(chunks)} ({processed/len(chunks)*100:.1f}%)")
print(f"  - 실패: {failed}")
print(f"  - 소요 시간: {elapsed:.1f}초 ({elapsed/60:.1f}분)")
print(f"  - 처리 속도: {processed/elapsed:.1f} chunks/sec")

# Verify ChromaDB
print(f"\n🔍 ChromaDB 검증 중...")
count = collection.count()
print(f"  ✅ 저장된 벡터 수: {count}")

if count != processed:
    print(f"  ⚠️ 경고: 저장된 벡터 수({count})와 처리된 청크 수({processed})가 다릅니다!")
else:
    print(f"  ✅ 모든 임베딩이 정상적으로 저장되었습니다!")

# ============================================================
# Final Summary
# ============================================================
print("\n" + "=" * 60)
print("✅ Hybrid Search 인덱스 생성 완료!")
print("=" * 60)
print("📊 생성된 인덱스:")
print(f"  1. Vector DB (ChromaDB): {count}개 벡터")
print(f"     - 경로: {VECTOR_DB_PATH}")
print(f"     - 용도: 의미 기반 검색 (임베딩 유사도)")
print(f"  2. BM25 Index: {len(tokenized_corpus)}개 문서")
print(f"     - 경로: {BM25_INDEX_PATH}")
print(f"     - 용도: 키워드 기반 검색 (TF-IDF)")
print("=" * 60)
print("📝 사용 방법:")
print("  1. 사용자 쿼리 입력")
print("  2. Vector Search → Top K 결과 (의미 유사도)")
print("  3. BM25 Search → Top K 결과 (키워드 매칭)")
print("  4. Reranking → Alpha 가중치 결합")
print("     - Final Score = alpha * vector_score + (1-alpha) * bm25_score")
print("     - 권장: alpha = 0.7 (Vector 70%, BM25 30%)")
print("=" * 60)
print("\n✅ Week 2 Day 3-4 완료!")
print("  다음 단계: Hybrid RAG 쿼리 테스트 (Week 2 Day 5)")
