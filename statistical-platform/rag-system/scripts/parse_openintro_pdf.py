#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
OpenIntro Statistics 4판 PDF → Markdown 변환 스크립트 (Docling 사용)
- PDF 다운로드: https://www.openintro.org/book/os/
- 라이선스: CC BY-SA 3.0 (상업적 사용 가능)
- 통계 이론만 추출 (R 코드 제거)
- Docling: AI 기반 레이아웃 분석 (수식/표 보존 94%+)
"""

import sys
import io
import re
from pathlib import Path
from typing import Dict, List
from datetime import datetime

# Windows UTF-8 encoding fix
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

try:
    from docling.document_converter import DocumentConverter
    print(f"Docling imported successfully")
except ImportError:
    print("ERROR: Docling not installed. Install with: pip install docling")
    sys.exit(1)


# ===== OpenIntro Statistics 4판 챕터 정보 =====
OPENINTRO_CHAPTERS = {
    1: {
        "title": "Introduction to Data",
        "sections": ["Data Basics", "Sampling Principles", "Experimental Design"],
        "description": "데이터 기초, 표본 추출, 실험 설계 원리"
    },
    2: {
        "title": "Summarizing Data",
        "sections": ["Numerical Data", "Categorical Data"],
        "description": "기술통계, 수치형/범주형 데이터 요약"
    },
    3: {
        "title": "Probability",
        "sections": ["Defining Probability", "Conditional Probability"],
        "description": "확률 개념, 조건부 확률, 베이즈 정리"
    },
    4: {
        "title": "Distributions of Random Variables",
        "sections": ["Normal Distribution", "Binomial Distribution"],
        "description": "정규분포, 이항분포, 포아송 분포"
    },
    5: {
        "title": "Foundations for Inference",
        "sections": ["Point Estimates", "Confidence Intervals", "Hypothesis Testing"],
        "description": "추정, 신뢰구간, 가설검정 기초, 검정력"
    },
    6: {
        "title": "Inference for Categorical Data",
        "sections": ["Single Proportion", "Two Proportions", "Chi-square Tests"],
        "description": "비율 검정, 카이제곱 검정, 적합도 검정"
    },
    7: {
        "title": "Inference for Numerical Data",
        "sections": ["One Sample Mean", "Two Sample Means", "ANOVA"],
        "description": "t-검정, ANOVA, 비모수 검정"
    },
    8: {
        "title": "Introduction to Linear Regression",
        "sections": ["Fitting a Line", "Residuals", "Regression Inference"],
        "description": "단순 선형 회귀, 잔차 분석, 회귀 진단"
    },
    9: {
        "title": "Multiple and Logistic Regression",
        "sections": ["Multiple Regression", "Model Selection", "Logistic Regression"],
        "description": "다중 회귀, 모형 선택, 로지스틱 회귀"
    },
}


def remove_r_code_from_markdown(markdown: str) -> str:
    """
    Markdown에서 R 코드 패턴 제거 (통계 이론은 보존)

    제거 대상:
    - ```r ... ```
    - ```R ... ```
    - > code_line (R 콘솔 프롬프트)
    - library(), require()
    - 변수 할당 (<-)

    보존 대상:
    - LaTeX 수식 ($$...$$, $...$)
    - Markdown 표
    - 통계 이론 설명 텍스트
    """
    # 1. R 코드 블록 제거 (```r ... ```)
    markdown = re.sub(
        r'```[rR]\s*\n.*?```',
        '\n[R 코드 생략: 통계 이론만 제공]\n',
        markdown,
        flags=re.DOTALL
    )

    # 2. 인용 블록 내 R 콘솔 프롬프트 제거 (> code)
    # 예: "> x <- c(1,2,3)\n> mean(x)"
    markdown = re.sub(
        r'^>\s+[^>\n]*(<-|library|function|summary|plot|lm|glm|anova|t\.test)[^\n]*\n',
        '',
        markdown,
        flags=re.MULTILINE
    )

    # 3. library() 또는 require() 호출 제거
    markdown = re.sub(
        r'library\([^)]+\)|require\([^)]+\)',
        '[라이브러리 로드 생략]',
        markdown
    )

    # 4. 변수 할당 (<-) 제거
    markdown = re.sub(
        r'^\s*\w+\s*<-\s*[^\n]+$',
        '',
        markdown,
        flags=re.MULTILINE
    )

    # 5. R 함수 호출 패턴 제거 (통계 함수)
    stats_functions = [
        r't\.test', 'lm', 'glm', 'anova', 'summary',
        'plot', 'hist', 'boxplot', 'cor', 'cov'
    ]
    for func in stats_functions:
        markdown = re.sub(
            rf'{func}\([^)]*\)',
            f'[{func} 함수 생략]',
            markdown
        )

    # 6. 연속된 빈 줄 정리 (3줄 이상 → 2줄)
    markdown = re.sub(r'\n{3,}', '\n\n', markdown)

    return markdown


def extract_chapter_with_docling(
    pdf_path: Path,
    chapter_num: int,
    start_page: int,
    end_page: int
) -> str:
    """
    Docling으로 PDF 챕터 추출 (페이지 범위 지정)

    Args:
        pdf_path: PDF 파일 경로
        chapter_num: 챕터 번호 (1-9)
        start_page: 시작 페이지 (1-indexed)
        end_page: 끝 페이지 (1-indexed, inclusive)

    Returns:
        str: Markdown 형식 텍스트 (LaTeX 수식/표 보존)
    """
    try:
        print(f"  [Docling] Converting pages {start_page}-{end_page}...")

        # Docling DocumentConverter 초기화
        converter = DocumentConverter()

        # PDF → Docling Document 변환
        result = converter.convert(str(pdf_path))

        # Markdown 추출
        full_markdown = result.document.export_to_markdown()

        # TODO: Docling은 전체 PDF를 변환하므로 페이지 범위 필터링 필요
        # 현재는 전체 문서를 반환 (페이지 범위 필터링은 수동으로 처리)
        # 향후 개선: Docling API가 페이지 범위를 지원하면 적용

        print(f"  [Docling] Conversion complete: {len(full_markdown):,} characters")

        # R 코드 제거
        cleaned_markdown = remove_r_code_from_markdown(full_markdown)

        print(f"  [Cleaned] After R code removal: {len(cleaned_markdown):,} characters")

        return cleaned_markdown

    except Exception as e:
        print(f"ERROR extracting chapter {chapter_num} with Docling: {e}")
        return ""


def create_markdown_header(chapter_num: int, chapter_info: Dict, crawled_date: str) -> str:
    """Generate YAML frontmatter metadata header"""
    header = f"""---
title: "Chapter {chapter_num}: {chapter_info['title']}"
description: {chapter_info['description']}
source: https://www.openintro.org/book/os/
library: OpenIntro Statistics 4e
category: statistics-theory
license: CC BY-SA 3.0
copyright: OpenIntro Project (www.openintro.org)
crawled_date: {crawled_date}
parser: Docling (IBM Research)
note: 통계 이론 및 개념만 포함. R 코드는 제거되었습니다.
---

# Chapter {chapter_num}: {chapter_info['title']}

**설명**: {chapter_info['description']}

**원본 출처**: [OpenIntro Statistics 4e](https://www.openintro.org/book/os/)

**라이선스**: CC BY-SA 3.0 (상업적 사용 가능)

**파싱 도구**: Docling (AI 기반 레이아웃 분석, 수식/표 보존)

---

"""
    return header


def parse_openintro_pdf(pdf_path: Path, output_dir: Path, chapter_pages: Dict[int, tuple]):
    """
    OpenIntro Statistics PDF 파싱 (Docling 사용)

    Args:
        pdf_path: PDF 파일 경로
        output_dir: 출력 디렉토리
        chapter_pages: 챕터별 페이지 범위 {chapter_num: (start, end)}
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    crawled_date = datetime.now().strftime("%Y-%m-%d")

    print("=" * 70)
    print("OpenIntro Statistics 4e PDF Parser (Docling)")
    print("=" * 70)
    print(f"PDF path: {pdf_path}")
    print(f"Output directory: {output_dir}")
    print(f"Crawled date: {crawled_date}")
    print(f"Parser: Docling (AI-based layout analysis)")
    print("=" * 70)
    print()

    results = []

    for chapter_num, chapter_info in OPENINTRO_CHAPTERS.items():
        if chapter_num not in chapter_pages:
            print(f"[SKIP] Chapter {chapter_num}: 페이지 범위 미지정")
            continue

        start_page, end_page = chapter_pages[chapter_num]

        print(f"[PARSE] Chapter {chapter_num}: {chapter_info['title']} (pages {start_page}-{end_page})")

        # Docling으로 텍스트 추출
        chapter_text = extract_chapter_with_docling(pdf_path, chapter_num, start_page, end_page)

        if not chapter_text:
            print(f"[ERROR] Chapter {chapter_num}: 텍스트 추출 실패")
            results.append({"chapter": chapter_num, "success": False})
            continue

        # 메타데이터 헤더 추가
        header = create_markdown_header(chapter_num, chapter_info, crawled_date)
        full_content = header + chapter_text

        # 파일 저장
        output_path = output_dir / f"chapter{chapter_num:02d}-{chapter_info['title'].lower().replace(' ', '-')}.md"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(full_content)

        chars = len(full_content)
        print(f"[OK] Chapter {chapter_num}: {chars:,} characters → {output_path.name}")
        print()

        results.append({"chapter": chapter_num, "success": True, "chars": chars})

    # Summary
    print()
    print("=" * 70)
    print("Parsing Summary")
    print("=" * 70)

    success_count = sum(1 for r in results if r["success"])
    total_chars = sum(r.get("chars", 0) for r in results)

    print(f"Total chapters: {len(results)}")
    print(f"Success: {success_count}")
    print(f"Failed: {len(results) - success_count}")
    print(f"Total characters: {total_chars:,}")
    print("=" * 70)

    return results


if __name__ == "__main__":
    print("OpenIntro Statistics 4e PDF Parser (Docling)")
    print(f"Python: {sys.version}")
    print()

    # 설정
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    # PDF 파일 경로 (사용자가 다운로드 필요)
    pdf_path = project_root / "data" / "openintro-statistics-4e.pdf"

    if not pdf_path.exists():
        print("=" * 70)
        print("PDF 파일을 다운로드해주세요:")
        print("1. https://www.openintro.org/book/os/ 접속")
        print("2. 'FREE -- OpenIntro Statistics PDF' 클릭")
        print("3. 다운로드한 PDF를 다음 경로에 저장:")
        print(f"   {pdf_path}")
        print("=" * 70)
        sys.exit(1)

    output_dir = project_root / "data" / "openintro"

    # 챕터별 페이지 범위 (수동 설정 필요)
    # TODO: PDF의 목차를 보고 실제 페이지 번호 입력
    chapter_pages = {
        1: (10, 40),    # Chapter 1: Intro to Data (예시)
        2: (41, 70),    # Chapter 2: Summarizing Data (예시)
        3: (71, 100),   # Chapter 3: Probability (예시)
        4: (101, 130),  # Chapter 4: Distributions (예시)
        5: (131, 180),  # Chapter 5: Foundations for Inference (예시)
        6: (181, 210),  # Chapter 6: Inference for Categorical Data (예시)
        7: (211, 250),  # Chapter 7: Inference for Numerical Data (예시)
        8: (251, 290),  # Chapter 8: Linear Regression (예시)
        9: (291, 330),  # Chapter 9: Multiple & Logistic Regression (예시)
    }

    print("⚠️  WARNING: 챕터 페이지 범위를 확인해주세요!")
    print("PDF를 열어서 각 챕터의 실제 시작/끝 페이지를 확인 후,")
    print("스크립트의 chapter_pages 딕셔너리를 수정하세요.")
    print()
    print("⚠️  NOTE: Docling은 전체 PDF를 한 번에 변환합니다.")
    print("페이지 범위 필터링은 현재 수동으로 처리됩니다.")
    print()
    input("계속하려면 Enter를 눌러주세요...")

    # 파싱 실행
    results = parse_openintro_pdf(pdf_path, output_dir, chapter_pages)

    sys.exit(0 if all(r["success"] for r in results) else 1)
