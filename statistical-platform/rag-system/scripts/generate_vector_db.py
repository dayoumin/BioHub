# -*- coding: utf-8 -*-
"""
Generate ChromaDB Vector Database for Hybrid RAG

This script:
1. Load 780 chunks from chunks.json
2. Generate embeddings using Ollama nomic-embed-text
3. Save to ChromaDB (Vector Search)

Requirements:
- chromadb
- requests (for Ollama API)
- ollama server running (localhost:11434)
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Any
import time
import requests

# ChromaDB import
try:
    import chromadb
    from chromadb.config import Settings
except ImportError:
    print("ERROR: chromadb not installed")
    print("Install: pip install chromadb")
    sys.exit(1)

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
CHUNKS_FILE = PROJECT_ROOT / "data" / "chunks" / "chunks.json"
VECTOR_DB_PATH = PROJECT_ROOT / "data" / "vector_db"

# Ollama settings
OLLAMA_ENDPOINT = "http://localhost:11434"
EMBEDDING_MODEL = "nomic-embed-text"

print("=" * 60)
print("ChromaDB Vector Database Generation")
print("=" * 60)
print(f"Ollama endpoint: {OLLAMA_ENDPOINT}")
print(f"Embedding model: {EMBEDDING_MODEL}")
print(f"Chunks file: {CHUNKS_FILE}")
print(f"Vector DB path: {VECTOR_DB_PATH}")
print("=" * 60)

# Check Ollama server
print("\nChecking Ollama server...")
try:
    response = requests.get(f"{OLLAMA_ENDPOINT}/api/tags", timeout=5)
    if response.status_code == 200:
        models = response.json().get("models", [])
        model_names = [m.get("name", "") for m in models]
        if any(EMBEDDING_MODEL in name for name in model_names):
            print(f"SUCCESS: Ollama server online ({EMBEDDING_MODEL} available)")
        else:
            print(f"ERROR: {EMBEDDING_MODEL} model not found")
            print(f"Available models: {model_names}")
            sys.exit(1)
    else:
        print(f"ERROR: Ollama server returned {response.status_code}")
        sys.exit(1)
except requests.exceptions.ConnectionError:
    print(f"ERROR: Cannot connect to Ollama server at {OLLAMA_ENDPOINT}")
    print("Please start Ollama: ollama serve")
    sys.exit(1)

# Load chunks
print("\nLoading chunks...")
if not CHUNKS_FILE.exists():
    print(f"ERROR: Chunks file not found: {CHUNKS_FILE}")
    sys.exit(1)

with open(CHUNKS_FILE, 'r', encoding='utf-8') as f:
    chunks_data = json.load(f)

chunks: List[Dict[str, Any]] = chunks_data if isinstance(chunks_data, list) else chunks_data.get("chunks", [])
print(f"SUCCESS: Loaded {len(chunks)} chunks")

# Initialize ChromaDB
print("\nInitializing ChromaDB...")
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
    print("WARNING: Deleted existing collection")
except Exception:
    pass

# Create collection
collection = client.create_collection(
    name="statistical_docs",
    metadata={"description": "Statistical documentation from SciPy/NumPy/statsmodels/pingouin"}
)
print("SUCCESS: ChromaDB collection created")

# Generate embeddings and add to ChromaDB
print(f"\nGenerating embeddings for {len(chunks)} chunks...")
print("This may take 30-60 minutes depending on Ollama performance...")

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
    batch_embeddings = []

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
                print(f"  ERROR: Embedding failed for {chunk_id}: HTTP {embed_response.status_code}")
                failed += 1
                continue

            embedding_data = embed_response.json()
            embedding = embedding_data.get("embedding", [])

            if not embedding:
                print(f"  ERROR: Empty embedding for {chunk_id}")
                failed += 1
                continue

            # Add to batch
            batch_documents.append(content)
            batch_metadatas.append(metadata)
            batch_ids.append(chunk_id)
            batch_embeddings.append(embedding)

            processed += 1

        except Exception as e:
            print(f"  ERROR: Exception for {chunk_id}: {str(e)}")
            failed += 1

    # Add batch to ChromaDB
    if batch_documents:
        try:
            collection.add(
                documents=batch_documents,
                embeddings=batch_embeddings,
                metadatas=batch_metadatas,
                ids=batch_ids
            )
        except Exception as e:
            print(f"  ERROR: ChromaDB batch save failed: {str(e)}")
            failed += len(batch_documents)
            processed -= len(batch_documents)

    # Progress report every 10 batches
    if (batch_idx + 1) % 10 == 0 or batch_idx == total_batches - 1:
        elapsed = time.time() - start_time
        rate = processed / elapsed if elapsed > 0 else 0
        eta = (len(chunks) - processed) / rate if rate > 0 else 0

        print(f"  Progress: {processed}/{len(chunks)} ({processed/len(chunks)*100:.1f}%)")
        print(f"    Rate: {rate:.1f} chunks/sec | ETA: {eta/60:.1f} min | Failed: {failed}")

# Final summary
end_time = time.time()
elapsed = end_time - start_time

print("\n" + "=" * 60)
print("Embedding Generation Complete!")
print("=" * 60)
print(f"  Success: {processed}/{len(chunks)} ({processed/len(chunks)*100:.1f}%)")
print(f"  Failed: {failed}")
print(f"  Total time: {elapsed:.1f}s ({elapsed/60:.1f} min)")
print(f"  Rate: {processed/elapsed:.1f} chunks/sec")
print("=" * 60)

# Verify ChromaDB
print("\nVerifying ChromaDB...")
count = collection.count()
print(f"  Stored vectors: {count}")

if count != processed:
    print(f"  WARNING: Vector count ({count}) != processed chunks ({processed})")
else:
    print(f"  SUCCESS: All embeddings saved correctly")

# Test query
print("\nTesting Vector Search...")
test_query = "scipy t-test hypothesis testing"

try:
    # Generate query embedding
    query_embed_response = requests.post(
        f"{OLLAMA_ENDPOINT}/api/embeddings",
        json={
            "model": EMBEDDING_MODEL,
            "prompt": test_query
        },
        timeout=30
    )

    if query_embed_response.status_code == 200:
        query_embedding = query_embed_response.json()["embedding"]

        # Query ChromaDB
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=5
        )

        print(f"Test query: \"{test_query}\"")
        print(f"Top 5 results:")
        for i, (doc_id, distance, metadata) in enumerate(zip(
            results["ids"][0],
            results["distances"][0],
            results["metadatas"][0]
        ), 1):
            title = metadata.get("title", "Unknown")
            library = metadata.get("library", "Unknown")
            similarity = 1.0 - distance  # Convert distance to similarity
            print(f"  {i}. {library}: {title} (similarity: {similarity:.3f})")

    else:
        print(f"  ERROR: Query embedding failed: HTTP {query_embed_response.status_code}")

except Exception as e:
    print(f"  ERROR: Test query failed: {str(e)}")

# Final summary
print("\n" + "=" * 60)
print("ChromaDB Vector Database Complete!")
print("=" * 60)
print(f"  Vector DB path: {VECTOR_DB_PATH}")
print(f"  Total vectors: {count}")
print(f"  Collection: statistical_docs")
print("=" * 60)
print("\nStep 3/3 Complete (Vector Semantic Search)")
print("  Next: Hybrid Query Engine Implementation")
