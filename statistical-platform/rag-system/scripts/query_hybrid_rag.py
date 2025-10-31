# -*- coding: utf-8 -*-
"""
Hybrid RAG Query Engine (3-Tier Search)

Architecture:
  Stage 1: SQL Pre-filtering (780 -> ~38 candidates)
  Stage 2: BM25 Keyword Search (38 -> ~10 candidates)
  Stage 3: Vector Semantic Search (10 -> ~5 candidates)
  Stage 4: Reranking (weighted score combination)

Target Accuracy: 99% (vs 70-80% vector-only)

Usage:
  python query_hybrid_rag.py "두 그룹 평균 비교하는 방법"
  python query_hybrid_rag.py "scipy ttest_ind 함수 사용법" --library scipy
"""

import sys
import json
import sqlite3
import pickle
from pathlib import Path
from typing import List, Dict, Any, Optional
import requests
import numpy as np

# Paths
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "data"
CHUNKS_FILE = DATA_DIR / "chunks" / "chunks.json"
DB_PATH = DATA_DIR / "metadata.db"
BM25_INDEX_PATH = DATA_DIR / "bm25_index.pkl"
VECTOR_DB_PATH = DATA_DIR / "vector_db"

# Ollama settings
OLLAMA_ENDPOINT = "http://localhost:11434"
EMBEDDING_MODEL = "nomic-embed-text"
INFERENCE_MODEL = "qwen2.5:3b-instruct-q4_K_M"

# Weights for reranking (total = 1.0)
WEIGHT_SQL = 0.3
WEIGHT_BM25 = 0.3
WEIGHT_VECTOR = 0.4


class HybridRAG:
    """3-Tier Hybrid RAG Query Engine"""

    def __init__(self):
        self.chunks: List[Dict[str, Any]] = []
        self.db_conn: Optional[sqlite3.Connection] = None
        self.bm25 = None
        self.bm25_chunks: List[Dict[str, Any]] = []

        # ChromaDB (lazy loading)
        self.chroma_client = None
        self.chroma_collection = None

    def load_data(self):
        """Load all data sources"""
        print("\n=== Loading Data ===")

        # 1. Load chunks.json
        with open(CHUNKS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            self.chunks = data if isinstance(data, list) else data.get("chunks", [])

        # Add chunk_id to each chunk (for matching with DB)
        for i, chunk in enumerate(self.chunks):
            chunk['chunk_id'] = f'chunk_{i}'

        print(f"Loaded {len(self.chunks)} chunks")

        # 2. Load SQLite DB
        self.db_conn = sqlite3.connect(DB_PATH)
        self.db_conn.row_factory = sqlite3.Row
        cursor = self.db_conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM function_metadata")
        db_count = cursor.fetchone()[0]
        print(f"SQLite DB: {db_count} records")

        # 3. Load BM25 index
        with open(BM25_INDEX_PATH, 'rb') as f:
            bm25_data = pickle.load(f)
            self.bm25 = bm25_data["bm25"]
            self.bm25_chunks = bm25_data["chunks"]

        # Add chunk_id to BM25 chunks if missing
        for i, chunk in enumerate(self.bm25_chunks):
            if 'chunk_id' not in chunk:
                chunk['chunk_id'] = f'chunk_{i}'

        print(f"BM25 Index: {len(self.bm25_chunks)} documents")

        # 4. Load ChromaDB (lazy)
        try:
            import chromadb
            from chromadb.config import Settings

            self.chroma_client = chromadb.PersistentClient(
                path=str(VECTOR_DB_PATH),
                settings=Settings(anonymized_telemetry=False)
            )
            self.chroma_collection = self.chroma_client.get_collection("statistical_docs")
            vector_count = self.chroma_collection.count()
            print(f"ChromaDB: {vector_count} vectors")

            if vector_count < 700:
                print(f"  [WARNING] Vector DB still generating ({vector_count}/780)")
        except Exception as e:
            print(f"  [WARNING] ChromaDB not ready: {e}")

    def stage1_sql_prefilter(
        self,
        query: str,
        library: Optional[str] = None,
        category: Optional[str] = None,
        function_name: Optional[str] = None
    ) -> List[str]:
        """
        Stage 1: SQL Pre-filtering

        Filter by:
        - library (scipy/numpy/statsmodels/pingouin)
        - category (hypothesis/regression/etc.)
        - function_name (partial match)

        Returns: List of chunk_ids
        """
        print("\n=== Stage 1: SQL Pre-filtering ===")

        cursor = self.db_conn.cursor()

        # Build SQL query
        conditions = []
        params = []

        if library:
            conditions.append("library = ?")
            params.append(library)

        if category:
            conditions.append("category = ?")
            params.append(category)

        if function_name:
            conditions.append("function_name LIKE ?")
            params.append(f"%{function_name}%")

        # If no explicit filters, try to extract from query
        if not conditions:
            query_lower = query.lower()

            # Library detection
            for lib in ["scipy", "numpy", "statsmodels", "pingouin"]:
                if lib in query_lower:
                    conditions.append("library = ?")
                    params.append(lib)
                    break

            # Category detection (keywords)
            category_keywords = {
                "hypothesis": ["test", "ttest", "anova", "chi-square", "wilcoxon"],
                "regression": ["regression", "linear", "logistic", "glm"],
                "correlation": ["correlation", "pearson", "spearman"],
                "descriptive": ["mean", "median", "std", "describe"]
            }

            for cat, keywords in category_keywords.items():
                if any(kw in query_lower for kw in keywords):
                    conditions.append("category = ?")
                    params.append(cat)
                    break

        # Execute query
        if conditions:
            sql = f"SELECT chunk_id FROM function_metadata WHERE {' AND '.join(conditions)}"
            cursor.execute(sql, params)
        else:
            # No filters - return all
            sql = "SELECT chunk_id FROM function_metadata"
            cursor.execute(sql)

        chunk_ids = [row[0] for row in cursor.fetchall()]

        print(f"SQL Filter: {len(self.chunks)} -> {len(chunk_ids)} candidates")
        print(f"  Query: {sql}")
        if params:
            print(f"  Params: {params}")

        return chunk_ids

    def stage2_bm25_search(self, query: str, candidate_ids: List[str], top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Stage 2: BM25 Keyword Search

        Returns: Top-K documents with BM25 scores
        """
        print("\n=== Stage 2: BM25 Keyword Search ===")

        # Filter BM25 chunks by candidate_ids
        candidate_chunks = [
            (i, chunk) for i, chunk in enumerate(self.bm25_chunks)
            if chunk["chunk_id"] in candidate_ids
        ]

        if not candidate_chunks:
            print("  [WARNING] No candidates after SQL filter")
            return []

        # Tokenize query
        query_tokens = query.lower().split()

        # Calculate BM25 scores for candidates only
        candidate_indices = [i for i, _ in candidate_chunks]

        # Get BM25 scores (manually calculate for subset)
        from rank_bm25 import BM25Okapi

        # Create mini BM25 index for candidates
        candidate_corpus = [
            self.bm25_chunks[i]["content"].lower().split()
            for i in candidate_indices
        ]

        if not candidate_corpus:
            return []

        mini_bm25 = BM25Okapi(candidate_corpus)
        scores = mini_bm25.get_scores(query_tokens)

        # Combine with chunk data
        results = []
        for idx, (orig_idx, chunk) in enumerate(candidate_chunks):
            results.append({
                "chunk": chunk,
                "bm25_score": float(scores[idx])
            })

        # Sort by BM25 score
        results.sort(key=lambda x: x["bm25_score"], reverse=True)

        # Top-K
        top_results = results[:top_k]

        print(f"BM25 Search: {len(candidate_chunks)} -> {len(top_results)} candidates")
        bm25_scores_str = [f"{r['bm25_score']:.2f}" for r in top_results[:3]]
        print(f"  Top-3 BM25 scores: {bm25_scores_str}")

        return top_results

    def stage3_vector_search(self, query: str, bm25_results: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Stage 3: Vector Semantic Search

        Returns: Top-K documents with vector similarity scores
        """
        print("\n=== Stage 3: Vector Semantic Search ===")

        if not self.chroma_collection:
            print("  [ERROR] ChromaDB not available")
            return bm25_results[:top_k]

        # Generate query embedding
        try:
            embed_response = requests.post(
                f"{OLLAMA_ENDPOINT}/api/embeddings",
                json={"model": EMBEDDING_MODEL, "prompt": query},
                timeout=30
            )
            query_embedding = embed_response.json()["embedding"]
        except Exception as e:
            print(f"  [ERROR] Embedding generation failed: {e}")
            return bm25_results[:top_k]

        # Get chunk IDs from BM25 results
        candidate_ids = set(r["chunk"]["chunk_id"] for r in bm25_results)

        # Query ChromaDB (no filter, we'll filter results)
        try:
            # Get more results than needed to ensure we find matches
            n_results_fetch = min(50, self.chroma_collection.count())
            results = self.chroma_collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results_fetch
            )

            # Combine vector scores with existing data
            vector_results = []
            for idx, chunk_id in enumerate(results["ids"][0]):
                # Only include if in BM25 candidates
                if chunk_id not in candidate_ids:
                    continue

                # Find matching BM25 result
                bm25_result = next((r for r in bm25_results if r["chunk"]["chunk_id"] == chunk_id), None)

                if bm25_result:
                    # Convert L2 distance to similarity (0-1 range, higher is better)
                    distance = results["distances"][0][idx]
                    similarity = 1.0 / (1.0 + distance)

                    vector_results.append({
                        "chunk": bm25_result["chunk"],
                        "bm25_score": bm25_result["bm25_score"],
                        "vector_score": similarity
                    })

                # Stop when we have enough results
                if len(vector_results) >= top_k:
                    break

            print(f"Vector Search: {len(bm25_results)} -> {len(vector_results)} candidates")
            if vector_results:
                vector_scores_str = [f"{r['vector_score']:.2f}" for r in vector_results[:3]]
                print(f"  Top-3 Vector scores: {vector_scores_str}")

            return vector_results[:top_k]

        except Exception as e:
            print(f"  [ERROR] Vector search failed: {e}")
            return bm25_results[:top_k]

    def stage4_reranking(self, vector_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Stage 4: Reranking with weighted scores

        Final Score = 0.3*SQL + 0.3*BM25 + 0.4*Vector
        """
        print("\n=== Stage 4: Reranking ===")

        if not vector_results:
            return []

        # Normalize scores to [0, 1]
        bm25_scores = [r["bm25_score"] for r in vector_results]
        vector_scores = [r["vector_score"] for r in vector_results]

        bm25_max = max(bm25_scores) if bm25_scores else 1.0
        bm25_min = min(bm25_scores) if bm25_scores else 0.0

        # Calculate final scores
        for result in vector_results:
            # Normalize BM25
            if bm25_max > bm25_min:
                norm_bm25 = (result["bm25_score"] - bm25_min) / (bm25_max - bm25_min)
            else:
                norm_bm25 = 1.0

            # SQL score (all candidates passed SQL filter = 1.0)
            sql_score = 1.0

            # Vector score (already similarity 0-1)
            vector_score = result["vector_score"]

            # Weighted combination
            final_score = (
                WEIGHT_SQL * sql_score +
                WEIGHT_BM25 * norm_bm25 +
                WEIGHT_VECTOR * vector_score
            )

            result["final_score"] = final_score

        # Sort by final score
        vector_results.sort(key=lambda x: x["final_score"], reverse=True)

        print(f"Reranking complete")
        final_scores_str = [f"{r['final_score']:.2f}" for r in vector_results[:3]]
        print(f"  Top-3 Final scores: {final_scores_str}")

        return vector_results

    def query(
        self,
        query: str,
        library: Optional[str] = None,
        category: Optional[str] = None,
        function_name: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Execute Hybrid 3-Tier RAG query

        Args:
            query: User query
            library: Filter by library (optional)
            category: Filter by category (optional)
            function_name: Filter by function name (optional)
            top_k: Number of results to return

        Returns:
            List of ranked results with scores
        """
        print(f"\n{'='*60}")
        print(f"QUERY: {query}")
        print(f"{'='*60}")

        # Stage 1: SQL Pre-filtering
        candidate_ids = self.stage1_sql_prefilter(query, library, category, function_name)

        if not candidate_ids:
            print("\n[WARNING] No candidates found after SQL filter")
            return []

        # Stage 2: BM25 Keyword Search
        bm25_results = self.stage2_bm25_search(query, candidate_ids, top_k=min(10, len(candidate_ids)))

        if not bm25_results:
            print("\n[WARNING] No candidates found after BM25 search")
            return []

        # Stage 3: Vector Semantic Search
        vector_results = self.stage3_vector_search(query, bm25_results, top_k=top_k)

        if not vector_results:
            print("\n[WARNING] No candidates found after Vector search")
            return bm25_results[:top_k]

        # Stage 4: Reranking
        final_results = self.stage4_reranking(vector_results)

        return final_results[:top_k]

    def generate_answer(self, query: str, context_docs: List[Dict[str, Any]]) -> str:
        """
        Generate final answer using Ollama inference model

        Args:
            query: User query
            context_docs: Retrieved documents

        Returns:
            Generated answer
        """
        print("\n=== Generating Answer ===")

        # Build context from top documents
        context = "\n\n".join([
            f"[Document {i+1}]\n{doc['chunk']['content'][:500]}..."
            for i, doc in enumerate(context_docs)
        ])

        # Build prompt
        prompt = f"""You are a statistical analysis expert. Answer the user's question based on the provided documentation.

Context:
{context}

Question: {query}

Answer (be specific and include function names if applicable):"""

        try:
            response = requests.post(
                f"{OLLAMA_ENDPOINT}/api/generate",
                json={
                    "model": INFERENCE_MODEL,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=60
            )

            result = response.json()
            answer = result.get("response", "")

            print(f"Answer generated ({len(answer)} characters)")

            return answer

        except Exception as e:
            print(f"  [ERROR] Answer generation failed: {e}")
            return f"Error generating answer: {e}"

    def close(self):
        """Close database connections"""
        if self.db_conn:
            self.db_conn.close()


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python query_hybrid_rag.py <query> [--library <lib>] [--category <cat>]")
        print("\nExample:")
        print("  python query_hybrid_rag.py \"두 그룹 평균 비교하는 방법\"")
        print("  python query_hybrid_rag.py \"scipy ttest_ind\" --library scipy")
        sys.exit(1)

    # Parse arguments
    query = sys.argv[1]
    library = None
    category = None

    for i in range(2, len(sys.argv), 2):
        if sys.argv[i] == "--library" and i + 1 < len(sys.argv):
            library = sys.argv[i + 1]
        elif sys.argv[i] == "--category" and i + 1 < len(sys.argv):
            category = sys.argv[i + 1]

    # Initialize Hybrid RAG
    rag = HybridRAG()
    rag.load_data()

    # Execute query
    results = rag.query(query, library=library, category=category)

    # Print results
    print(f"\n{'='*60}")
    print(f"RESULTS (Top {len(results)})")
    print(f"{'='*60}")

    for i, result in enumerate(results):
        chunk = result["chunk"]
        final_score = result.get('final_score', result.get('bm25_score', 0))
        print(f"\n[{i+1}] Score: {final_score:.3f}")
        print(f"    Library: {chunk['metadata'].get('library', 'unknown')}")
        print(f"    Function: {chunk['metadata'].get('title', 'N/A')}")
        print(f"    BM25: {result.get('bm25_score', 0):.2f} | Vector: {result.get('vector_score', 0):.2f}")
        print(f"    Preview: {chunk['content'][:150]}...")

    # Generate answer
    if results:
        answer = rag.generate_answer(query, results)
        print(f"\n{'='*60}")
        print(f"ANSWER")
        print(f"{'='*60}")
        print(answer)

    rag.close()


if __name__ == "__main__":
    main()
