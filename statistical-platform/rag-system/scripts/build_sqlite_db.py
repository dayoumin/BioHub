"""
Vector Store DB 빌더 스크립트 (멀티 모델 지원)

크롤링된 111개 문서를 Vector Store DB로 변환합니다.
- SQLite 파일 안에 원본 문서 + 임베딩 벡터 저장 (하이브리드 DB)
- FTS5 전문 검색 + Vector 의미 검색 지원

실행:
    cd statistical-platform/rag-system
    python scripts/build_sqlite_db.py --model mxbai-embed-large
    python scripts/build_sqlite_db.py --model nomic-embed-text
    python scripts/build_sqlite_db.py --model qwen3-embedding:0.6b

출력:
    data/vector-{model}.db (Vector Store 데이터베이스)
    예: vector-mxbai-embed-large.db
"""

import os
import sys
import sqlite3
import json
import time
import argparse
from pathlib import Path
from typing import List, Dict, Optional
import hashlib
import struct
import requests

# Windows 콘솔 UTF-8 출력 강제
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 설정
SCRIPT_DIR = Path(__file__).parent
RAG_SYSTEM_DIR = SCRIPT_DIR.parent
DATA_DIR = RAG_SYSTEM_DIR / "data"
SCHEMA_PATH = RAG_SYSTEM_DIR / "schema.sql"

# Ollama 설정
OLLAMA_ENDPOINT = "http://localhost:11434"

# 글로벌 변수 (argparse로 설정됨)
EMBEDDING_MODEL = "mxbai-embed-large"  # 기본값
DB_PATH = DATA_DIR / "rag.db"  # 기본값

# 문서 디렉토리
DOC_DIRS = {
    "scipy": DATA_DIR / "scipy",
    "numpy": DATA_DIR / "numpy",
    "statsmodels": DATA_DIR / "statsmodels",
    "pingouin": DATA_DIR / "pingouin",
    "project": DATA_DIR / "project",
    "methodology": DATA_DIR / "methodology-guide",
    "openintro": DATA_DIR / "openintro"
}


def create_database():
    """데이터베이스 생성 및 스키마 적용"""
    print(f"[1/4] 데이터베이스 생성: {DB_PATH}")

    # 기존 DB 삭제 (재구축)
    if DB_PATH.exists():
        DB_PATH.unlink()
        print("  - 기존 DB 삭제됨")

    # 스키마 적용
    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        schema_sql = f.read()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.executescript(schema_sql)
    conn.commit()
    conn.close()

    print("  - 스키마 적용 완료")


def generate_doc_id(library: str, filename: str) -> str:
    """문서 ID 생성 (예: scipy_ttest_ind)"""
    # 파일명에서 .md 제거
    name = filename.replace('.md', '')
    # 특수 문자 제거 및 소문자 변환
    name = name.replace('-', '_').replace('.', '_').lower()
    return f"{library}_{name}"


def extract_title_from_content(content: str, filename: str) -> str:
    """Markdown에서 제목 추출"""
    lines = content.split('\n')

    # 첫 번째 # 헤더 찾기
    for line in lines:
        if line.startswith('# '):
            return line.replace('# ', '').strip()

    # 제목이 없으면 파일명 사용
    return filename.replace('.md', '').replace('_', ' ').replace('-', ' ').title()


def extract_summary(content: str, max_length: int = 200) -> str:
    """요약 생성 (첫 200자)"""
    # Markdown 헤더 제거
    lines = [line for line in content.split('\n') if not line.startswith('#')]
    text = ' '.join(lines).strip()

    # 첫 200자 추출
    if len(text) > max_length:
        return text[:max_length] + '...'
    return text


def categorize_document(library: str, doc_id: str, content: str) -> Optional[str]:
    """문서 카테고리 분류"""
    # 프로젝트 문서는 파일명에서 추출
    if library == "project":
        if "worker1" in doc_id:
            return "descriptive"
        elif "worker2" in doc_id:
            return "hypothesis"
        elif "worker3" in doc_id:
            return "nonparametric_anova"
        elif "worker4" in doc_id:
            return "regression_advanced"
        elif "statistical_methods" in doc_id:
            return "overview"

    # 방법론 가이드
    if library == "methodology":
        if "decision" in doc_id or "tree" in doc_id:
            return "guide_method_selection"
        elif "assumption" in doc_id:
            return "guide_assumptions"
        elif "interpretation" in doc_id:
            return "guide_interpretation"
        elif "comparison" in doc_id:
            return "guide_comparison"

    # SciPy/NumPy: 함수명으로 추정
    content_lower = content.lower()
    if any(word in content_lower for word in ["test", "검정", "hypothesis"]):
        return "hypothesis"
    elif any(word in content_lower for word in ["regression", "회귀"]):
        return "regression"
    elif any(word in content_lower for word in ["correlation", "상관"]):
        return "correlation"
    elif any(word in content_lower for word in ["anova", "분산"]):
        return "anova"
    elif any(word in content_lower for word in ["mean", "median", "std", "var"]):
        return "descriptive"

    return None


def count_words(text: str) -> int:
    """단어 수 계산"""
    # 공백 기준 분리 (간단한 방법)
    return len(text.split())


def generate_embedding(text: str) -> Optional[List[float]]:
    """Ollama API를 통해 텍스트 임베딩 생성"""
    # 텍스트 길이 제한 (임베딩 모델은 보통 512 토큰 제한)
    MAX_CHARS = 2000
    truncated_text = text[:MAX_CHARS] if len(text) > MAX_CHARS else text

    try:
        response = requests.post(
            f"{OLLAMA_ENDPOINT}/api/embeddings",
            json={
                "model": EMBEDDING_MODEL,
                "prompt": truncated_text
            },
            timeout=30
        )

        if not response.ok:
            print(f"  ⚠️ 임베딩 생성 실패 ({response.status_code}): {response.text[:100]}")
            return None

        data = response.json()
        return data.get("embedding")

    except Exception as e:
        print(f"  ⚠️ 임베딩 생성 에러: {e}")
        return None


def embedding_to_blob(embedding: List[float]) -> bytes:
    """임베딩 벡터를 SQLite BLOB으로 변환 (float32 배열)"""
    # float32로 변환 (4바이트 * 1024 = 4096 바이트)
    return struct.pack(f'{len(embedding)}f', *embedding)


def blob_to_embedding(blob: bytes) -> List[float]:
    """SQLite BLOB을 임베딩 벡터로 복원"""
    # BLOB 크기로 차원 계산
    num_dimensions = len(blob) // 4  # 4바이트 = float32
    return list(struct.unpack(f'{num_dimensions}f', blob))


def load_documents() -> List[Dict]:
    """모든 문서 로드 및 임베딩 생성"""
    print(f"[2/5] 문서 로드 및 임베딩 생성 중...")

    documents = []
    current_time = int(time.time())
    embedding_success = 0
    embedding_failed = 0

    for library, doc_dir in DOC_DIRS.items():
        if not doc_dir.exists():
            print(f"  - {library}: 디렉토리 없음 (스킵)")
            continue

        md_files = list(doc_dir.glob("*.md"))
        print(f"  - {library}: {len(md_files)}개 파일 처리 중...")

        for idx, md_file in enumerate(md_files, 1):
            try:
                # 파일 읽기
                with open(md_file, 'r', encoding='utf-8') as f:
                    content = f.read()

                # 문서 ID 생성
                doc_id = generate_doc_id(library, md_file.name)

                # 메타데이터 추출
                title = extract_title_from_content(content, md_file.name)
                summary = extract_summary(content)
                category = categorize_document(library, doc_id, content)
                word_count = count_words(content)

                # 🔥 임베딩 생성 (Ollama API 호출)
                print(f"    [{idx}/{len(md_files)}] {doc_id[:30]:30} ... 임베딩 생성 중", end=" ")
                embedding = generate_embedding(content)

                if embedding:
                    embedding_blob = embedding_to_blob(embedding)
                    embedding_success += 1
                    print(f"✓ ({len(embedding)}차원)")
                else:
                    embedding_blob = None
                    embedding_failed += 1
                    print("✗")

                # 문서 객체 생성
                doc = {
                    "doc_id": doc_id,
                    "title": title,
                    "library": library,
                    "category": category,
                    "content": content,
                    "summary": summary,
                    "source_url": None,
                    "source_file": str(md_file.relative_to(RAG_SYSTEM_DIR)),
                    "created_at": current_time,
                    "updated_at": current_time,
                    "word_count": word_count,
                    "embedding": embedding_blob,
                    "embedding_model": EMBEDDING_MODEL if embedding_blob else None
                }

                documents.append(doc)

            except Exception as e:
                print(f"  ⚠️ 에러 ({md_file.name}): {e}")

    print(f"\n  ✓ 총 {len(documents)}개 문서 로드 완료")
    print(f"  ✓ 임베딩 성공: {embedding_success}개 | 실패: {embedding_failed}개")
    return documents


def insert_documents(documents: List[Dict]):
    """문서를 DB에 삽입 (임베딩 포함)"""
    print(f"[3/5] 문서 DB 삽입 중...")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    for doc in documents:
        cursor.execute("""
            INSERT INTO documents (
                doc_id, title, library, category,
                content, summary,
                source_url, source_file,
                created_at, updated_at, word_count,
                embedding, embedding_model
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            doc["doc_id"],
            doc["title"],
            doc["library"],
            doc["category"],
            doc["content"],
            doc["summary"],
            doc["source_url"],
            doc["source_file"],
            doc["created_at"],
            doc["updated_at"],
            doc["word_count"],
            doc["embedding"],
            doc["embedding_model"]
        ))

    conn.commit()
    conn.close()

    print(f"  ✓ {len(documents)}개 문서 삽입 완료")


def generate_statistics():
    """DB 통계 생성"""
    print(f"[4/5] DB 통계 생성 중...")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 라이브러리별 통계
    cursor.execute("""
        SELECT library, COUNT(*) as count, SUM(word_count) as total_words
        FROM documents
        GROUP BY library
    """)

    print("\n📊 문서 통계:")
    print("-" * 50)
    for row in cursor.fetchall():
        library, count, total_words = row
        print(f"  {library:15} | {count:3}개 | {total_words:,}자")

    # 전체 통계
    cursor.execute("SELECT COUNT(*), SUM(word_count) FROM documents")
    total_docs, total_words = cursor.fetchone()
    print("-" * 50)
    print(f"  {'TOTAL':15} | {total_docs:3}개 | {total_words:,}자")

    # FTS 테이블 확인
    cursor.execute("SELECT COUNT(*) FROM documents_fts")
    fts_count = cursor.fetchone()[0]
    print(f"\n✓ FTS 인덱스: {fts_count}개 문서")

    # 임베딩 통계
    cursor.execute("SELECT COUNT(*) FROM documents WHERE embedding IS NOT NULL")
    embedding_count = cursor.fetchone()[0]
    print(f"✓ 임베딩: {embedding_count}개 문서 ({EMBEDDING_MODEL})")

    # DB 파일 크기
    db_size = DB_PATH.stat().st_size / (1024 * 1024)  # MB
    print(f"✓ DB 크기: {db_size:.2f} MB")

    conn.close()


def main():
    """메인 함수"""
    global EMBEDDING_MODEL, DB_PATH

    # 명령줄 인자 파싱
    parser = argparse.ArgumentParser(
        description='RAG System - SQLite DB Builder (멀티 모델 지원)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
예제:
  python scripts/build_sqlite_db.py --model mxbai-embed-large
  python scripts/build_sqlite_db.py --model nomic-embed-text
  python scripts/build_sqlite_db.py --model qwen3-embedding:0.6b
        '''
    )
    parser.add_argument(
        '--model',
        type=str,
        default='mxbai-embed-large',
        help='Ollama 임베딩 모델 (기본: mxbai-embed-large)'
    )

    args = parser.parse_args()

    # 글로벌 변수 설정
    EMBEDDING_MODEL = args.model

    # 모델명에서 파일명으로 변환 (콜론 제거)
    model_filename = args.model.replace(':', '-')
    # Vector Store DB 파일명 (vector- 접두사로 명확화)
    DB_PATH = DATA_DIR / f"vector-{model_filename}.db"

    print("=" * 60)
    print("RAG System - SQLite DB Builder (Multi-Model Support)")
    print(f"Embedding Model: {EMBEDDING_MODEL}")
    print("=" * 60)
    print()

    # Ollama 서버 확인
    print("[0/5] Ollama 서버 확인 중...")
    try:
        response = requests.get(f"{OLLAMA_ENDPOINT}/api/tags", timeout=5)
        if response.ok:
            print(f"  ✓ Ollama 서버 연결 성공 ({OLLAMA_ENDPOINT})")

            # 모델 설치 확인
            models_data = response.json()
            available_models = [m['name'] for m in models_data.get('models', [])]

            # 모델명 매칭 (버전 태그 고려)
            model_exists = any(
                EMBEDDING_MODEL in model_name or model_name.startswith(EMBEDDING_MODEL)
                for model_name in available_models
            )

            if model_exists:
                print(f"  ✓ 임베딩 모델 확인: {EMBEDDING_MODEL}")
            else:
                print(f"  ⚠️ 모델 '{EMBEDDING_MODEL}'이 설치되지 않았습니다.")
                print(f"  → 다음 명령어로 설치하세요: ollama pull {EMBEDDING_MODEL}")
                print(f"  → 사용 가능한 모델: {', '.join(available_models)}")
                exit(1)
        else:
            print(f"  ⚠️ Ollama 서버 응답 이상: {response.status_code}")
    except Exception as e:
        print(f"  ❌ Ollama 서버 연결 실패: {e}")
        print(f"  → 임베딩 생성이 스킵됩니다.")
    print()

    try:
        # 1. DB 생성
        create_database()

        # 2. 문서 로드 및 임베딩 생성
        documents = load_documents()

        # 3. DB 삽입
        insert_documents(documents)

        # 4. 통계 생성
        generate_statistics()

        print()
        print("=" * 60)
        print("✅ DB 빌드 완료!")
        print(f"   위치: {DB_PATH}")
        print(f"   임베딩 모델: {EMBEDDING_MODEL}")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ 에러 발생: {e}")
        import traceback
        traceback.print_exc()
        exit(1)


if __name__ == "__main__":
    main()
