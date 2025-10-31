#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
SciPy 함수 배치 크롤링 스크립트
- 총 41개 함수 중 나머지 38개 크롤링 (샘플 3개 제외)
- 1초 간격 순차 크롤링 (서버 부하 고려)
- UTF-8 인코딩 보장
- 에러 발생 시 로그 기록
"""

import sys
import io
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List

# Windows UTF-8 encoding fix
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from crawl4ai import AsyncWebCrawler


# ===== SciPy 함수 목록 (41개) =====
SCIPY_FUNCTIONS = {
    # A. 가설검정 (14개)
    "ttest_ind": "독립표본 t-검정",
    "ttest_rel": "대응표본 t-검정",
    "ttest_1samp": "단일표본 t-검정",
    "mannwhitneyu": "Mann-Whitney U 검정",
    "wilcoxon": "Wilcoxon Signed-Rank 검정",
    "kruskal": "Kruskal-Wallis 검정",
    "friedmanchisquare": "Friedman 검정",
    "f_oneway": "일원 ANOVA",
    "chi2_contingency": "카이제곱 독립성 검정",
    "chisquare": "카이제곱 적합도 검정",
    "fisher_exact": "Fisher's Exact Test",
    "kstest": "Kolmogorov-Smirnov 검정",
    "shapiro": "Shapiro-Wilk 정규성 검정",
    "levene": "Levene 등분산 검정",

    # B. 상관분석 (4개)
    "pearsonr": "Pearson 상관계수",
    "spearmanr": "Spearman 순위상관",
    "kendalltau": "Kendall's tau",
    "pointbiserialr": "Point-biserial 상관",

    # C. 회귀분석 (3개)
    "linregress": "단순 선형 회귀",
    "theilslopes": "Theil-Sen 회귀",
    "siegelslopes": "Siegel 반복중위수 회귀",

    # D. 분포 관련 (8개)
    "norm": "정규분포 (cdf, ppf 등)",  # norm.cdf, norm.ppf
    "t": "t-분포 (ppf 등)",  # t.ppf
    "chi2": "카이제곱 분포 (ppf 등)",  # chi2.ppf
    "f": "F-분포 (ppf 등)",  # f.ppf
    "binom_test": "이항검정",
    "poisson_means_test": "포아송 평균 검정",
    "normaltest": "D'Agostino-Pearson 정규성 검정",
    "jarque_bera": "Jarque-Bera 정규성 검정",

    # E. 기타 통계량 (12개)
    "sem": "표준오차 (Standard Error of Mean)",
    "zscore": "Z-score 표준화",
    "skew": "왜도 (Skewness)",
    "kurtosis": "첨도 (Kurtosis)",
    "iqr": "사분위수 범위 (IQR)",
    "entropy": "Shannon 엔트로피",
    "rankdata": "순위 변환",
    "percentileofscore": "백분위 점수",
    "trim_mean": "절사평균 (Trimmed Mean)",
    "gmean": "기하평균 (Geometric Mean)",
    "hmean": "조화평균 (Harmonic Mean)",
    "mode": "최빈값 (Mode)",
}

# 이미 크롤링 완료된 샘플 (제외)
ALREADY_CRAWLED = ["ttest_ind", "mannwhitneyu", "f_oneway"]

# 크롤링 대상 (41 - 3 = 38개)
TO_CRAWL = {k: v for k, v in SCIPY_FUNCTIONS.items() if k not in ALREADY_CRAWLED}


def create_markdown_header(function_name: str, description: str, crawled_date: str) -> str:
    """Generate YAML frontmatter metadata header"""
    url = f"https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.{function_name}.html"

    header = f"""---
title: scipy.stats.{function_name}
description: {description}
source: {url}
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: {crawled_date}
---

# scipy.stats.{function_name}

**Description**: {description}

**Original Documentation**: [scipy.stats.{function_name}]({url})

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
    단일 SciPy 함수 문서 크롤링

    Returns:
        dict: {"success": bool, "function": str, "chars": int, "error": str}
    """
    url = f"https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.{function_name}.html"
    output_path = output_dir / f"{function_name}.md"

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


async def crawl_scipy_batch(delay_seconds: float = 1.0):
    """
    SciPy 함수 배치 크롤링

    Args:
        delay_seconds: 크롤링 간 대기 시간 (기본 1초)
    """
    # Setup
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    output_dir = project_root / "data" / "scipy"
    output_dir.mkdir(parents=True, exist_ok=True)

    crawled_date = datetime.now().strftime("%Y-%m-%d")

    print("=" * 60)
    print("SciPy Batch Crawler")
    print("=" * 60)
    print(f"Total functions: {len(TO_CRAWL)}")
    print(f"Output directory: {output_dir}")
    print(f"Crawled date: {crawled_date}")
    print(f"Delay: {delay_seconds}s")
    print("=" * 60)
    print()

    # Crawl
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

    # Failed functions
    if failed_count > 0:
        print("Failed functions:")
        for result in results:
            if not result["success"]:
                print(f"  - {result['function']}: {result['error']}")
        print()

    # Save log
    log_path = project_root / "data" / f"crawl_log_scipy_{crawled_date}.txt"
    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"SciPy Crawling Log - {crawled_date}\n")
        f.write("=" * 60 + "\n\n")

        for result in results:
            status = "SUCCESS" if result["success"] else "FAILED"
            f.write(f"[{status}] {result['function']}: {result['chars']:,} chars\n")
            if result["error"]:
                f.write(f"  Error: {result['error']}\n")

        f.write(f"\n" + "=" * 60 + "\n")
        f.write(f"Total: {len(results)}\n")
        f.write(f"Success: {success_count}\n")
        f.write(f"Failed: {failed_count}\n")
        f.write(f"Total characters: {total_chars:,}\n")

    print(f"Log saved: {log_path}")
    print("=" * 60)

    return results


if __name__ == "__main__":
    print("Starting SciPy batch crawler...")
    print(f"Python: {sys.version}")
    print(f"Platform: {sys.platform}")
    print()

    # Run crawler
    results = asyncio.run(crawl_scipy_batch(delay_seconds=1.0))

    # Exit code
    failed_count = sum(1 for r in results if not r["success"])
    sys.exit(0 if failed_count == 0 else 1)
