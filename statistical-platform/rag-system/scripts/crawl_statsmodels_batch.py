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


# statsmodels Functions Used in Worker 3-4
STATSMODELS_FUNCTIONS = {
    # A. General Linear Models (statsmodels.api) - 7개
    "statsmodels.regression.linear_model.OLS": "Ordinary Least Squares 회귀",
    "statsmodels.discrete.discrete_model.Logit": "로지스틱 회귀 (이진)",
    "statsmodels.discrete.discrete_model.MNLogit": "다항 로지스틱 회귀",
    "statsmodels.discrete.discrete_model.Probit": "프로빗 회귀",
    "statsmodels.genmod.generalized_linear_model.GLM": "일반화 선형 모델",
    "statsmodels.tools.tools.add_constant": "상수항 추가 (헬퍼)",
    "statsmodels.formula.api.ols": "OLS 회귀 (formula API)",

    # B. ANOVA - 3개
    "statsmodels.stats.anova.anova_lm": "선형 모델 ANOVA",
    "statsmodels.stats.anova.AnovaRM": "반복측정 ANOVA",
    "statsmodels.multivariate.manova.MANOVA": "다변량 분산분석",

    # C. 비모수 검정 - 1개
    "statsmodels.sandbox.stats.runs.runstest_1samp": "Runs Test (단일표본)",

    # D. 분할표 분석 - 2개
    "statsmodels.stats.contingency_tables.mcnemar": "McNemar 검정",
    "statsmodels.stats.contingency_tables.cochrans_q": "Cochran's Q 검정",

    # E. 검정 통계량 - 2개
    "statsmodels.stats.stattools.durbinWatson": "Durbin-Watson 검정",
    "statsmodels.stats.weightstats.ztest": "Z-검정 (평균)",

    # F. 시계열 분석 - 8개
    "statsmodels.tsa.arima.model.ARIMA": "ARIMA 모델",
    "statsmodels.tsa.seasonal.seasonal_decompose": "계절성 분해",
    "statsmodels.tsa.statespace.sarimax.SARIMAX": "SARIMA 모델",
    "statsmodels.tsa.stattools.adfuller": "Augmented Dickey-Fuller 검정",
    "statsmodels.tsa.stattools.acf": "자기상관함수 (ACF)",
    "statsmodels.tsa.stattools.pacf": "부분자기상관함수 (PACF)",
    "statsmodels.tsa.vector_ar.var_model.VAR": "벡터 자기회귀 모델",
    "statsmodels.tsa.stattools.kpss": "KPSS 정상성 검정",

    # G. 고급 회귀 - 3개
    "statsmodels.regression.mixed_linear_model.MixedLM": "혼합효과 모델",
    "statsmodels.duration.hazard_regression.PHReg": "Cox 비례위험 회귀",
    "statsmodels.miscmodels.ordinal_model.OrderedModel": "순서형 로지스틱 회귀",

    # H. GLM Families - 2개
    "statsmodels.genmod.families.family.Poisson": "포아송 분포 (GLM)",
    "statsmodels.genmod.families.family.NegativeBinomial": "음이항 분포 (GLM)",
}


def create_markdown_header(module_path: str, description: str, crawled_date: str) -> str:
    """
    Create YAML frontmatter header for statsmodels documentation

    Args:
        module_path: Full module path (e.g., "statsmodels.api.OLS")
        description: Korean description
        crawled_date: Date of crawling (YYYY-MM-DD)

    Returns:
        Markdown header with YAML frontmatter
    """
    # statsmodels.org 문서 URL 패턴
    # 예: statsmodels.regression.linear_model.OLS → https://www.statsmodels.org/stable/generated/statsmodels.regression.linear_model.OLS.html
    url = f"https://www.statsmodels.org/stable/generated/{module_path}.html"

    header = f"""---
title: {module_path}
description: {description}
source: {url}
library: statsmodels
version: 0.14.4
license: BSD 3-Clause
copyright: (c) 2009-2024, statsmodels Developers
crawled_date: {crawled_date}
---

# {module_path}

**Description**: {description}

**Original Documentation**: [{module_path}]({url})

---

"""
    return header


async def crawl_single_function(
    module_path: str,
    description: str,
    output_dir: Path,
    crawled_date: str
) -> Dict[str, any]:
    """
    Crawl a single statsmodels function documentation page

    Args:
        module_path: Full module path (e.g., "statsmodels.api.OLS")
        description: Korean description
        output_dir: Output directory for Markdown files
        crawled_date: Date of crawling (YYYY-MM-DD)

    Returns:
        Result dictionary with success status and metadata
    """
    url = f"https://www.statsmodels.org/stable/generated/{module_path}.html"

    # 파일명: statsmodels.api.OLS → statsmodels_api_OLS.md
    safe_filename = module_path.replace(".", "_")
    output_path = output_dir / f"{safe_filename}.md"

    try:
        print(f"[CRAWL] {module_path} ({description})")

        async with AsyncWebCrawler(verbose=False) as crawler:
            result = await crawler.arun(url=url)
            markdown_content = result.markdown

            # Add YAML frontmatter header
            header = create_markdown_header(module_path, description, crawled_date)
            full_content = header + markdown_content

            # Write to file
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(full_content)

            chars = len(full_content)
            print(f"[OK] {module_path}: {chars:,} characters")

            return {
                "success": True,
                "module": module_path,
                "chars": chars,
                "error": None
            }

    except Exception as e:
        error_msg = str(e)
        print(f"[ERROR] {module_path}: {error_msg}")

        return {
            "success": False,
            "module": module_path,
            "chars": 0,
            "error": error_msg
        }


async def crawl_all_functions(output_dir: Path, crawled_date: str) -> None:
    """
    Crawl all statsmodels functions in STATSMODELS_FUNCTIONS dictionary

    Args:
        output_dir: Output directory for Markdown files
        crawled_date: Date of crawling (YYYY-MM-DD)
    """
    print(f"🚀 statsmodels Documentation Crawler")
    print(f"📅 Date: {crawled_date}")
    print(f"📁 Output: {output_dir}")
    print(f"📊 Total functions: {len(STATSMODELS_FUNCTIONS)}")
    print("=" * 60)

    results: List[Dict] = []

    # Crawl each function with rate limiting (1 second delay)
    for idx, (module_path, description) in enumerate(STATSMODELS_FUNCTIONS.items(), 1):
        print(f"\n[{idx}/{len(STATSMODELS_FUNCTIONS)}] ", end="")

        result = await crawl_single_function(
            module_path=module_path,
            description=description,
            output_dir=output_dir,
            crawled_date=crawled_date
        )

        results.append(result)

        # Rate limiting: 1 second delay between requests
        if idx < len(STATSMODELS_FUNCTIONS):
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
                print(f"  - {r['module']}: {r['error']}")

    # Save log file
    log_path = output_dir.parent / f"crawl_log_statsmodels_{crawled_date}.txt"
    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"statsmodels Crawling Log - {crawled_date}\n")
        f.write("=" * 60 + "\n\n")

        for r in results:
            status = "[SUCCESS]" if r["success"] else "[FAILED]"
            if r["success"]:
                f.write(f"{status} {r['module']}: {r['chars']:,} chars\n")
            else:
                f.write(f"{status} {r['module']}: {r['error']}\n")

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
    output_dir = script_dir.parent / "data" / "statsmodels"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Date
    crawled_date = datetime.now().strftime("%Y-%m-%d")

    # Run async crawler
    asyncio.run(crawl_all_functions(output_dir, crawled_date))

    print("\n✅ statsmodels crawling complete!")


if __name__ == "__main__":
    main()
