#!/usr/bin/env python3
"""
Docling PDF Parser

IBM Research의 Docling을 사용하여 PDF 파일에서 텍스트를 추출
표, 수식, 구조 정보를 보존하여 Markdown 형식으로 반환
"""

import sys
import json
from pathlib import Path

def parse_pdf(file_path: str) -> dict:
    """
    Docling을 사용하여 PDF 파일 파싱

    Args:
        file_path: PDF 파일 경로

    Returns:
        dict: {
            "success": bool,
            "text": str (성공 시),
            "error": str (실패 시)
        }
    """
    try:
        # Docling import
        from docling.document_converter import DocumentConverter

        # PDF 파일 경로 확인
        pdf_path = Path(file_path)
        if not pdf_path.exists():
            return {
                "success": False,
                "error": f"File not found: {file_path}"
            }

        if pdf_path.suffix.lower() != '.pdf':
            return {
                "success": False,
                "error": f"Not a PDF file: {file_path}"
            }

        # Docling DocumentConverter 초기화
        converter = DocumentConverter()

        # PDF 변환 (PDF → Markdown)
        result = converter.convert(str(pdf_path))

        # Markdown 텍스트 추출
        markdown_text = result.document.export_to_markdown()

        return {
            "success": True,
            "text": markdown_text,
            "pages": len(result.document.pages) if hasattr(result.document, 'pages') else None
        }

    except ImportError as e:
        return {
            "success": False,
            "error": f"Docling not installed: {str(e)}. Please run: pip install docling"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to parse PDF: {str(e)}"
        }

def main():
    """
    CLI 진입점

    Usage:
        python docling_parser.py <pdf_file_path>
    """
    if len(sys.argv) != 2:
        error_result = {
            "success": False,
            "error": "Usage: python docling_parser.py <pdf_file_path>"
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)

    file_path = sys.argv[1]
    result = parse_pdf(file_path)

    # JSON으로 출력 (Node.js에서 파싱)
    print(json.dumps(result, ensure_ascii=False))

    # 실패 시 exit code 1
    if not result["success"]:
        sys.exit(1)

if __name__ == "__main__":
    main()
