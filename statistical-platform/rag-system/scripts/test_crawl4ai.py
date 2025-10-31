"""
Crawl4AI Sample Test Script

목적: SciPy/NumPy 문서 크롤링 테스트 (5개 샘플)
작성일: 2025-10-31
"""

import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime

# Windows UTF-8 encoding fix
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from crawl4ai import AsyncWebCrawler


# 크롤링 대상 5개 샘플
SAMPLE_URLS = {
    "scipy_ttest_ind": {
        "url": "https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html",
        "library": "scipy",
        "function": "ttest_ind",
        "description": "독립표본 t-검정",
    },
    "scipy_mannwhitneyu": {
        "url": "https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html",
        "library": "scipy",
        "function": "mannwhitneyu",
        "description": "Mann-Whitney U 검정",
    },
    "scipy_f_oneway": {
        "url": "https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html",
        "library": "scipy",
        "function": "f_oneway",
        "description": "일원 ANOVA",
    },
    "numpy_mean": {
        "url": "https://numpy.org/doc/stable/reference/generated/numpy.mean.html",
        "library": "numpy",
        "function": "mean",
        "description": "평균 계산",
    },
    "numpy_percentile": {
        "url": "https://numpy.org/doc/stable/reference/generated/numpy.percentile.html",
        "library": "numpy",
        "function": "percentile",
        "description": "백분위수 계산",
    },
}


def create_markdown_header(metadata: dict, crawled_date: str) -> str:
    """
    크롤링 문서의 메타데이터 헤더 생성

    Args:
        metadata: URL 메타데이터 딕셔너리
        crawled_date: 크롤링 날짜 (YYYY-MM-DD)

    Returns:
        Markdown 형식 헤더 문자열
    """
    library = metadata["library"]
    function = metadata["function"]

    if library == "scipy":
        license_text = "BSD 3-Clause"
        copyright_text = "(c) 2001-2024, SciPy Developers"
        version = "1.14.1"
    elif library == "numpy":
        license_text = "BSD 3-Clause"
        copyright_text = "(c) 2005-2024, NumPy Developers"
        version = "2.1.2"
    else:
        license_text = "Unknown"
        copyright_text = "Unknown"
        version = "Unknown"

    header = f"""---
title: {library}.{function}
description: {metadata['description']}
source: {metadata['url']}
library: {library}
version: {version}
license: {license_text}
copyright: {copyright_text}
crawled_date: {crawled_date}
---

# {library}.{function}

**Description**: {metadata['description']}

**Original Documentation**: [{library}.{function}]({metadata['url']})

---

"""
    return header


async def crawl_documentation(url: str, metadata: dict, output_path: Path) -> dict:
    """
    단일 문서 크롤링 및 저장

    Args:
        url: 크롤링할 URL
        metadata: URL 메타데이터
        output_path: 저장 경로

    Returns:
        크롤링 결과 딕셔너리
    """
    result = {
        "url": url,
        "function": metadata["function"],
        "success": False,
        "error": None,
        "content_length": 0,
        "file_path": None,
    }

    try:
        print(f"\n[CRAWL] {metadata['function']} ({metadata['description']})")
        print(f"  URL: {url}")

        async with AsyncWebCrawler(verbose=False) as crawler:
            # 크롤링 실행
            crawl_result = await crawler.arun(
                url=url,
                # 옵션: JavaScript 실행, 대기 시간 등
                # js_code="window.scrollTo(0, document.body.scrollHeight);",
                # wait_for=2,
            )

            if not crawl_result.success:
                result["error"] = "Crawl failed"
                print(f"  [ERROR] Crawl failed")
                return result

            # Markdown 변환
            markdown_content = crawl_result.markdown

            if not markdown_content:
                result["error"] = "Empty content"
                print(f"  [ERROR] Empty content")
                return result

            # 메타데이터 헤더 추가
            crawled_date = datetime.now().strftime("%Y-%m-%d")
            header = create_markdown_header(metadata, crawled_date)
            full_content = header + markdown_content

            # 파일 저장
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(full_content)

            result["success"] = True
            result["content_length"] = len(full_content)
            result["file_path"] = str(output_path)

            print(f"  [OK] {len(full_content):,} characters")
            print(f"  [SAVE] {output_path}")

    except Exception as e:
        result["error"] = str(e)
        print(f"  [ERROR] {e}")

    return result


async def main():
    """
    메인 크롤링 함수: 5개 샘플 크롤링
    """
    print("=" * 80)
    print("Crawl4AI Sample Test - SciPy & NumPy Documentation")
    print("=" * 80)
    print(f"\nTarget: {len(SAMPLE_URLS)} sample documents")
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # 출력 디렉토리 설정
    base_path = Path(__file__).parent.parent / "data"

    # 크롤링 결과 저장
    results = []

    for key, metadata in SAMPLE_URLS.items():
        library = metadata["library"]
        function = metadata["function"]

        # 출력 경로: data/{library}/{function}.md
        output_path = base_path / library / f"{function}.md"

        # 크롤링 실행
        result = await crawl_documentation(
            url=metadata["url"],
            metadata=metadata,
            output_path=output_path
        )

        results.append(result)

        # 다음 요청 전 1초 대기 (서버 부하 방지)
        await asyncio.sleep(1)

    # 결과 요약
    print("\n" + "=" * 80)
    print("Crawling Summary")
    print("=" * 80)

    success_count = sum(1 for r in results if r["success"])
    total_chars = sum(r["content_length"] for r in results if r["success"])

    print(f"\n[SUCCESS] {success_count}/{len(results)}")
    print(f"[TOTAL] {total_chars:,} characters")
    print(f"[OUTPUT] {base_path}")

    # 실패한 항목 출력
    failed = [r for r in results if not r["success"]]
    if failed:
        print(f"\n[FAILED] {len(failed)}")
        for r in failed:
            print(f"  - {r['function']}: {r['error']}")

    # 성공한 항목 파일 목록
    if success_count > 0:
        print(f"\n[FILES] Crawled files:")
        for r in results:
            if r["success"]:
                print(f"  - {r['file_path']}")

    print(f"\nEnd time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)


if __name__ == "__main__":
    # 비동기 실행
    asyncio.run(main())
