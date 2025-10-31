#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import io

# Windows UTF-8 encoding fix
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from crawl4ai import AsyncWebCrawler
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Dict, List


# NumPy 함수 목록 (20개)
NUMPY_FUNCTIONS = {
    # A. 기본 통계 (8개)
    "mean": "평균",
    "median": "중위수",
    "std": "표준편차",
    "var": "분산",
    "min": "최솟값",
    "max": "최댓값",
    "sum": "합계",
    "percentile": "백분위수",

    # B. 배열 조작 (6개)
    "array": "배열 생성",
    "concatenate": "배열 결합",
    "reshape": "배열 재구성",
    "transpose": "전치",
    "where": "조건부 선택",
    "isnan": "NaN 확인",

    # C. 선형대수 (3개)
    "linalg.eig": "고유값/고유벡터",
    "linalg.svd": "특이값 분해 (SVD)",
    "linalg.inv": "역행렬",

    # D. 수학 함수 (3개)
    "sqrt": "제곱근",
    "log": "자연로그",
    "exp": "지수함수",
}

# 이미 크롤링 완료된 샘플 (제외)
ALREADY_CRAWLED = ["mean", "percentile"]

# 크롤링 대상 (20 - 2 = 18개)
TO_CRAWL = {k: v for k, v in NUMPY_FUNCTIONS.items() if k not in ALREADY_CRAWLED}


def create_markdown_header(function_name: str, description: str, crawled_date: str) -> str:
    """Generate YAML frontmatter metadata header"""
    # linalg 함수는 URL 경로가 다름
    if function_name.startswith("linalg."):
        url = f"https://numpy.org/doc/stable/reference/generated/numpy.{function_name}.html"
    else:
        url = f"https://numpy.org/doc/stable/reference/generated/numpy.{function_name}.html"

    header = f"""---
title: numpy.{function_name}
description: {description}
source: {url}
library: numpy
version: 2.1.2
license: BSD 3-Clause
copyright: (c) 2005-2024, NumPy Developers
crawled_date: {crawled_date}
---

# numpy.{function_name}

**Description**: {description}

**Original Documentation**: [numpy.{function_name}]({url})

---

"""
    return header


async def crawl_single_function(
    function_name: str,
    description: str,
    output_dir: Path,
    crawled_date: str
) -> Dict[str, any]:
    """Single NumPy function documentation crawler"""
    url = f"https://numpy.org/doc/stable/reference/generated/numpy.{function_name}.html"

    # 파일명에서 점(.)을 언더스코어(_)로 변경 (linalg.eig → linalg_eig.md)
    safe_filename = function_name.replace(".", "_")
    output_path = output_dir / f"{safe_filename}.md"

    try:
        print(f"[CRAWL] {function_name} ({description})")

        async with AsyncWebCrawler(verbose=False) as crawler:
            result = await crawler.arun(url=url)
            markdown_content = result.markdown

            # Add metadata header
            header = create_markdown_header(function_name, description, crawled_date)
            full_content = header + markdown_content

            # Save to file
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(full_content)

            chars = len(full_content)
            print(f"[OK] {function_name}: {chars:,} characters")

            return {
                "success": True,
                "function": function_name,
                "chars": chars,
                "error": None
            }

    except Exception as e:
        error_msg = str(e)
        print(f"[ERROR] {function_name}: {error_msg}")

        return {
            "success": False,
            "function": function_name,
            "chars": 0,
            "error": error_msg
        }


async def crawl_numpy_batch(delay_seconds: float = 1.0):
    """NumPy 함수 배치 크롤링"""
    print("Starting NumPy batch crawler...")
    print(f"Python: {sys.version}")
    print(f"Platform: {sys.platform}")
    print()

    # Setup
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    output_dir = project_root / "data" / "numpy"
    output_dir.mkdir(parents=True, exist_ok=True)

    crawled_date = datetime.now().strftime("%Y-%m-%d")

    print("=" * 60)
    print("NumPy Batch Crawler")
    print("=" * 60)
    print(f"Total functions: {len(TO_CRAWL)}")
    print(f"Output directory: {output_dir.absolute()}")
    print(f"Crawled date: {crawled_date}")
    print(f"Delay: {delay_seconds}s")
    print("=" * 60)
    print()

    # Crawl with progress indicators
    results: List[Dict] = []

    for i, (function_name, description) in enumerate(TO_CRAWL.items(), 1):
        print(f"[{i}/{len(TO_CRAWL)}] ", end="")

        result = await crawl_single_function(
            function_name,
            description,
            output_dir,
            crawled_date
        )
        results.append(result)

        # Delay between requests (except last one)
        if i < len(TO_CRAWL):
            await asyncio.sleep(delay_seconds)

    # Summary
    print()
    print("=" * 60)
    print("Crawling Summary")
    print("=" * 60)

    success_count = sum(1 for r in results if r["success"])
    failed_count = len(results) - success_count
    total_chars = sum(r["chars"] for r in results)

    print(f"Total: {len(results)}")
    print(f"Success: {success_count} ({success_count/len(results)*100:.1f}%)")
    print(f"Failed: {failed_count}")
    print(f"Total characters: {total_chars:,}")
    print()

    # Save log
    log_path = project_root / "data" / f"crawl_log_numpy_{crawled_date}.txt"
    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"NumPy Crawling Log - {crawled_date}\n")
        f.write("=" * 60 + "\n\n")

        for r in results:
            if r["success"]:
                f.write(f"[SUCCESS] {r['function']}: {r['chars']:,} chars\n")
            else:
                f.write(f"[FAILED] {r['function']}: {r['error']}\n")

        f.write("\n" + "=" * 60 + "\n")
        f.write(f"Total: {len(results)}\n")
        f.write(f"Success: {success_count}\n")
        f.write(f"Failed: {failed_count}\n")
        f.write(f"Total characters: {total_chars:,}\n")

    print(f"Log saved: {log_path.absolute()}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(crawl_numpy_batch())
