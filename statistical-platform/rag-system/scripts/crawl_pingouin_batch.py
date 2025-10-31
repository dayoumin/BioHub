#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import io

# Windows UTF-8 encoding fix
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import asyncio
from pathlib import Path
from datetime import datetime
from typing import Dict, List
from crawl4ai import AsyncWebCrawler


# pingouin Functions Used in Worker 1-2
PINGOUIN_FUNCTIONS = {
    # A. Effect Size - 1개
    "compute_effsize": "효과 크기 계산 (Cohen's d, Hedges' g 등)",

    # B. Reliability - 1개
    "cronbach_alpha": "크론바흐 알파 (신뢰도)",

    # Additional common pingouin functions (for future reference)
    # "partial_corr": "부분 상관계수",
    # "rm_corr": "반복측정 상관분석",
    # "power_ttest": "t-검정 검정력 분석",
}


def create_markdown_header(function_name: str, description: str, crawled_date: str) -> str:
    """
    Create YAML frontmatter header for pingouin documentation

    Args:
        function_name: Function name (e.g., "cronbach_alpha")
        description: Korean description
        crawled_date: Date of crawling (YYYY-MM-DD)

    Returns:
        Markdown header with YAML frontmatter
    """
    # pingouin-stats.org 문서 URL 패턴
    # 예: cronbach_alpha → https://pingouin-stats.org/generated/pingouin.cronbach_alpha.html
    url = f"https://pingouin-stats.org/generated/pingouin.{function_name}.html"

    header = f"""---
title: pingouin.{function_name}
description: {description}
source: {url}
library: pingouin
version: 0.5.6
license: GPL-3.0
copyright: (c) 2018-2024, Raphael Vallat
crawled_date: {crawled_date}
---

# pingouin.{function_name}

**Description**: {description}

**Original Documentation**: [pingouin.{function_name}]({url})

⚠️ **License Notice**: pingouin is licensed under GPL-3.0 (Copyleft). Commercial use requires compliance with GPL terms.

---

"""
    return header


async def crawl_single_function(
    function_name: str,
    description: str,
    output_dir: Path,
    crawled_date: str
) -> Dict[str, any]:
    """
    Crawl a single pingouin function documentation page

    Args:
        function_name: Function name (e.g., "cronbach_alpha")
        description: Korean description
        output_dir: Output directory for Markdown files
        crawled_date: Date of crawling (YYYY-MM-DD)

    Returns:
        Result dictionary with success status and metadata
    """
    url = f"https://pingouin-stats.org/generated/pingouin.{function_name}.html"
    output_path = output_dir / f"{function_name}.md"

    try:
        print(f"[CRAWL] {function_name} ({description})")

        async with AsyncWebCrawler(verbose=False) as crawler:
            result = await crawler.arun(url=url)
            markdown_content = result.markdown

            # Add YAML frontmatter header
            header = create_markdown_header(function_name, description, crawled_date)
            full_content = header + markdown_content

            # Write to file
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


async def crawl_all_functions(output_dir: Path, crawled_date: str) -> None:
    """
    Crawl all pingouin functions in PINGOUIN_FUNCTIONS dictionary

    Args:
        output_dir: Output directory for Markdown files
        crawled_date: Date of crawling (YYYY-MM-DD)
    """
    print(f"🚀 pingouin Documentation Crawler")
    print(f"📅 Date: {crawled_date}")
    print(f"📁 Output: {output_dir}")
    print(f"📊 Total functions: {len(PINGOUIN_FUNCTIONS)}")
    print("=" * 60)

    results: List[Dict] = []

    # Crawl each function with rate limiting (1 second delay)
    for idx, (function_name, description) in enumerate(PINGOUIN_FUNCTIONS.items(), 1):
        print(f"\n[{idx}/{len(PINGOUIN_FUNCTIONS)}] ", end="")

        result = await crawl_single_function(
            function_name=function_name,
            description=description,
            output_dir=output_dir,
            crawled_date=crawled_date
        )

        results.append(result)

        # Rate limiting: 1 second delay between requests
        if idx < len(PINGOUIN_FUNCTIONS):
            await asyncio.sleep(1.0)

    # Summary
    print("\n" + "=" * 60)
    print("📋 Summary")
    print("=" * 60)

    success_count = sum(1 for r in results if r["success"])
    failed_count = len(results) - success_count
    total_chars = sum(r["chars"] for r in results)

    print(f"✅ Success: {success_count}/{len(results)}")
    print(f"❌ Failed: {failed_count}/{len(results)}")
    print(f"📝 Total characters: {total_chars:,}")

    if failed_count > 0:
        print("\n⚠️ Failed functions:")
        for r in results:
            if not r["success"]:
                print(f"  - {r['function']}: {r['error']}")

    # Save log file
    log_path = output_dir.parent / f"crawl_log_pingouin_{crawled_date}.txt"
    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"pingouin Crawling Log - {crawled_date}\n")
        f.write("=" * 60 + "\n\n")

        for r in results:
            status = "[SUCCESS]" if r["success"] else "[FAILED]"
            if r["success"]:
                f.write(f"{status} {r['function']}: {r['chars']:,} chars\n")
            else:
                f.write(f"{status} {r['function']}: {r['error']}\n")

        f.write("\n" + "=" * 60 + "\n")
        f.write(f"Total: {len(results)}\n")
        f.write(f"Success: {success_count}\n")
        f.write(f"Failed: {failed_count}\n")
        f.write(f"Total characters: {total_chars:,}\n")

    print(f"\n💾 Log saved: {log_path}")


def main():
    """Main entry point"""
    # Paths
    script_dir = Path(__file__).parent
    output_dir = script_dir.parent / "data" / "pingouin"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Date
    crawled_date = datetime.now().strftime("%Y-%m-%d")

    # Run async crawler
    asyncio.run(crawl_all_functions(output_dir, crawled_date))

    print("\n✅ pingouin crawling complete!")


if __name__ == "__main__":
    main()
