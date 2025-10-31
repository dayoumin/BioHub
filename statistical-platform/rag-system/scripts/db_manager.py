"""
SQLite DB Manager - CRUD Operations

DB에 문서를 추가, 수정, 삭제하는 유틸리티 스크립트

사용법:
    # 문서 추가
    python db_manager.py add --doc-id scipy_test --title "Test" --library scipy --content "..."

    # 문서 수정
    python db_manager.py update --doc-id scipy_test --content "Updated content"

    # 문서 삭제
    python db_manager.py delete --doc-id scipy_test

    # 문서 조회
    python db_manager.py get --doc-id scipy_test
"""

import os
import sys
import sqlite3
import time
import argparse
from pathlib import Path
from typing import Optional, Dict, Any

# Windows 콘솔 UTF-8 출력 강제
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 설정
SCRIPT_DIR = Path(__file__).parent
RAG_SYSTEM_DIR = SCRIPT_DIR.parent
DATA_DIR = RAG_SYSTEM_DIR / "data"
DB_PATH = DATA_DIR / "rag.db"


class DBManager:
    """SQLite DB Manager"""

    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path

        if not self.db_path.exists():
            raise FileNotFoundError(f"DB 파일이 존재하지 않습니다: {self.db_path}")

    def add_document(
        self,
        doc_id: str,
        title: str,
        library: str,
        content: str,
        category: Optional[str] = None,
        summary: Optional[str] = None,
        source_url: Optional[str] = None,
        source_file: Optional[str] = None
    ) -> bool:
        """문서 추가"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            current_time = int(time.time())
            word_count = len(content.split())

            cursor.execute("""
                INSERT INTO documents (
                    doc_id, title, library, category,
                    content, summary,
                    source_url, source_file,
                    created_at, updated_at, word_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id, title, library, category,
                content, summary,
                source_url, source_file,
                current_time, current_time, word_count
            ))

            conn.commit()
            conn.close()

            print(f"✓ 문서 추가 완료: {doc_id}")
            return True

        except sqlite3.IntegrityError as e:
            print(f"✗ 에러: 문서 ID '{doc_id}'가 이미 존재합니다")
            return False
        except Exception as e:
            print(f"✗ 에러: {e}")
            return False

    def update_document(
        self,
        doc_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        category: Optional[str] = None,
        summary: Optional[str] = None
    ) -> bool:
        """문서 수정"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # 기존 문서 확인
            cursor.execute("SELECT * FROM documents WHERE doc_id = ?", (doc_id,))
            if not cursor.fetchone():
                print(f"✗ 에러: 문서 ID '{doc_id}'를 찾을 수 없습니다")
                conn.close()
                return False

            # 업데이트할 필드 동적 생성
            updates = []
            params = []

            if title is not None:
                updates.append("title = ?")
                params.append(title)

            if content is not None:
                updates.append("content = ?")
                params.append(content)
                updates.append("word_count = ?")
                params.append(len(content.split()))

            if category is not None:
                updates.append("category = ?")
                params.append(category)

            if summary is not None:
                updates.append("summary = ?")
                params.append(summary)

            # updated_at 필드 추가
            updates.append("updated_at = ?")
            params.append(int(time.time()))

            params.append(doc_id)

            sql = f"UPDATE documents SET {', '.join(updates)} WHERE doc_id = ?"
            cursor.execute(sql, params)

            conn.commit()
            conn.close()

            print(f"✓ 문서 수정 완료: {doc_id}")
            return True

        except Exception as e:
            print(f"✗ 에러: {e}")
            return False

    def delete_document(self, doc_id: str) -> bool:
        """문서 삭제"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # 기존 문서 확인
            cursor.execute("SELECT * FROM documents WHERE doc_id = ?", (doc_id,))
            if not cursor.fetchone():
                print(f"✗ 에러: 문서 ID '{doc_id}'를 찾을 수 없습니다")
                conn.close()
                return False

            cursor.execute("DELETE FROM documents WHERE doc_id = ?", (doc_id,))

            conn.commit()
            conn.close()

            print(f"✓ 문서 삭제 완료: {doc_id}")
            return True

        except Exception as e:
            print(f"✗ 에러: {e}")
            return False

    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """문서 조회"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute("SELECT * FROM documents WHERE doc_id = ?", (doc_id,))
            row = cursor.fetchone()

            conn.close()

            if row:
                return dict(row)
            else:
                print(f"✗ 문서 ID '{doc_id}'를 찾을 수 없습니다")
                return None

        except Exception as e:
            print(f"✗ 에러: {e}")
            return None

    def list_documents(self, library: Optional[str] = None, limit: int = 10) -> None:
        """문서 목록 조회"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            if library:
                cursor.execute("""
                    SELECT doc_id, title, library, category, word_count
                    FROM documents
                    WHERE library = ?
                    ORDER BY created_at DESC
                    LIMIT ?
                """, (library, limit))
            else:
                cursor.execute("""
                    SELECT doc_id, title, library, category, word_count
                    FROM documents
                    ORDER BY created_at DESC
                    LIMIT ?
                """, (limit,))

            rows = cursor.fetchall()

            if rows:
                print(f"\n📚 문서 목록 (최근 {len(rows)}개):")
                print("-" * 80)
                for row in rows:
                    doc_id, title, lib, cat, wc = row
                    cat_str = cat if cat else "N/A"
                    print(f"  {doc_id:30} | {title:30} | {lib:10} | {cat_str:15} | {wc:,}자")
                print("-" * 80)
            else:
                print("문서가 없습니다")

            conn.close()

        except Exception as e:
            print(f"✗ 에러: {e}")

    def verify_fts_sync(self) -> None:
        """FTS5 동기화 확인"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # documents 테이블 문서 수
            cursor.execute("SELECT COUNT(*) FROM documents")
            doc_count = cursor.fetchone()[0]

            # FTS 테이블 문서 수
            cursor.execute("SELECT COUNT(*) FROM documents_fts")
            fts_count = cursor.fetchone()[0]

            if doc_count == fts_count:
                print(f"✓ FTS5 동기화 확인: {doc_count}개 문서")
            else:
                print(f"✗ FTS5 동기화 불일치: documents={doc_count}, fts={fts_count}")

            conn.close()

        except Exception as e:
            print(f"✗ 에러: {e}")


def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(description="SQLite DB Manager - CRUD Operations")
    subparsers = parser.add_subparsers(dest='command', help='명령어')

    # add 명령어
    add_parser = subparsers.add_parser('add', help='문서 추가')
    add_parser.add_argument('--doc-id', required=True, help='문서 ID')
    add_parser.add_argument('--title', required=True, help='제목')
    add_parser.add_argument('--library', required=True, help='라이브러리 (scipy, numpy, etc.)')
    add_parser.add_argument('--content', required=True, help='내용')
    add_parser.add_argument('--category', help='카테고리 (선택)')
    add_parser.add_argument('--summary', help='요약 (선택)')
    add_parser.add_argument('--source-url', help='원본 URL (선택)')
    add_parser.add_argument('--source-file', help='원본 파일 경로 (선택)')

    # update 명령어
    update_parser = subparsers.add_parser('update', help='문서 수정')
    update_parser.add_argument('--doc-id', required=True, help='문서 ID')
    update_parser.add_argument('--title', help='제목 (선택)')
    update_parser.add_argument('--content', help='내용 (선택)')
    update_parser.add_argument('--category', help='카테고리 (선택)')
    update_parser.add_argument('--summary', help='요약 (선택)')

    # delete 명령어
    delete_parser = subparsers.add_parser('delete', help='문서 삭제')
    delete_parser.add_argument('--doc-id', required=True, help='문서 ID')

    # get 명령어
    get_parser = subparsers.add_parser('get', help='문서 조회')
    get_parser.add_argument('--doc-id', required=True, help='문서 ID')

    # list 명령어
    list_parser = subparsers.add_parser('list', help='문서 목록')
    list_parser.add_argument('--library', help='라이브러리 필터 (선택)')
    list_parser.add_argument('--limit', type=int, default=10, help='최대 개수 (기본: 10)')

    # verify 명령어
    verify_parser = subparsers.add_parser('verify', help='FTS5 동기화 확인')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    try:
        manager = DBManager()

        if args.command == 'add':
            manager.add_document(
                doc_id=args.doc_id,
                title=args.title,
                library=args.library,
                content=args.content,
                category=args.category,
                summary=args.summary,
                source_url=args.source_url,
                source_file=args.source_file
            )

        elif args.command == 'update':
            manager.update_document(
                doc_id=args.doc_id,
                title=args.title,
                content=args.content,
                category=args.category,
                summary=args.summary
            )

        elif args.command == 'delete':
            manager.delete_document(args.doc_id)

        elif args.command == 'get':
            doc = manager.get_document(args.doc_id)
            if doc:
                print("\n📄 문서 정보:")
                print("-" * 80)
                for key, value in doc.items():
                    if key == 'content':
                        print(f"  {key}: {value[:100]}...")
                    else:
                        print(f"  {key}: {value}")
                print("-" * 80)

        elif args.command == 'list':
            manager.list_documents(library=args.library, limit=args.limit)

        elif args.command == 'verify':
            manager.verify_fts_sync()

    except FileNotFoundError as e:
        print(f"✗ {e}")
        print("먼저 build_sqlite_db.py를 실행하여 DB를 생성하세요")
        exit(1)
    except Exception as e:
        print(f"✗ 예상치 못한 에러: {e}")
        import traceback
        traceback.print_exc()
        exit(1)


if __name__ == "__main__":
    main()
